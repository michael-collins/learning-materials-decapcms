/**
 * Create a folder inside public/uploads (or a subfolder thereof).
 *
 * Body: { folder: string, name: string, token?: string }
 *   folder — parent directory relative to public/ (e.g. "uploads" or "uploads/images")
 *   name   — new folder name (alphanumeric, hyphens, underscores)
 *   token  — GitHub PAT (optional, used in production mode)
 *
 * In dev mode:  creates the directory on the local filesystem.
 * In production: commits a .gitkeep file to GitHub (git doesn't track empty dirs).
 */
import { mkdirSync, existsSync } from 'node:fs'
import { resolve, normalize } from 'node:path'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { extractAuthToken } from '~/server/utils/auth'
import { getCmsConfig } from '~/server/utils/config-parser-server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parentFolder = (body?.folder as string) || 'uploads'
  const folderName = (body?.name as string) || ''

  if (!folderName) {
    throw createError({ statusCode: 400, statusMessage: 'Folder name is required' })
  }

  // Sanitize folder name
  const safeName = folderName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '')

  if (!safeName) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid folder name after sanitization' })
  }

  // Security: ensure parent stays under uploads/
  const normalizedParent = normalize(parentFolder).replace(/^\//, '')
  if (normalizedParent.includes('..') || !normalizedParent.startsWith('uploads')) {
    throw createError({ statusCode: 403, statusMessage: 'Folders must be within /uploads/' })
  }

  const folderPath = `${normalizedParent}/${safeName}`

  // ── Production: commit a .gitkeep to GitHub via API ──
  const hasLocalFiles = existsSync(resolve(process.cwd(), 'content'))
  if (!hasLocalFiles) {
    const token = extractAuthToken(event, body?.token)
    const config = await getCmsConfig()
    const backend = config.backend || {}
    const { owner, repo } = parseRepo(backend.repo || '')
    const branch = backend.branch || 'main'

    const git = createGitBackend({ owner, repo, branch, token })

    // Repo path: public/<parent>/<name>/.gitkeep
    const gitkeepPath = `public/${folderPath}/.gitkeep`

    // Check if folder already has files (i.e. already exists)
    const existing = await git.getFile(gitkeepPath)
    if (existing) {
      throw createError({ statusCode: 409, statusMessage: `Folder "${safeName}" already exists` })
    }

    try {
      // Commit an empty .gitkeep to create the folder in the repo
      const emptyContent = Buffer.from('').toString('base64')
      await git.writeFile({
        path: gitkeepPath,
        content: emptyContent,
        message: `media: create folder ${folderPath}`,
      })
    } catch (err: any) {
      // If it's a 422, the file may already exist (race condition or existing folder)
      if (err.statusCode === 422 || err.status === 422) {
        throw createError({ statusCode: 409, statusMessage: `Folder "${safeName}" already exists` })
      }
      throw createError({ statusCode: 500, statusMessage: `Failed to create folder on GitHub: ${err.message}` })
    }

    return {
      success: true,
      name: safeName,
      path: folderPath,
    }
  }

  // ── Dev mode: create directory on local filesystem ──
  const targetDir = resolve(process.cwd(), 'public', normalizedParent, safeName)

  // Ensure it doesn't already exist
  if (existsSync(targetDir)) {
    throw createError({ statusCode: 409, statusMessage: `Folder "${safeName}" already exists` })
  }

  try {
    mkdirSync(targetDir, { recursive: true })
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: `Failed to create folder: ${err.message}` })
  }

  return {
    success: true,
    name: safeName,
    path: folderPath,
  }
})
