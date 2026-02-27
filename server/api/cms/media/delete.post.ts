/**
 * Media delete API endpoint.
 *
 * Deletes a file from public/ directory.
 * In dev mode:  removes file from local filesystem.
 * In production: deletes file from GitHub repo via Contents API.
 *
 * Body: { path: string, token?: string }
 *   path  — e.g., '/uploads/image-abc123.png'
 *   token — GitHub PAT (optional, used in production mode)
 */
import { unlinkSync, existsSync } from 'node:fs'
import { resolve, normalize } from 'node:path'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { extractAuthToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const filePath = body?.path as string

  if (!filePath) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No file path provided',
    })
  }

  // Security: prevent path traversal
  const normalizedPath = normalize(filePath).replace(/^\//, '')
  if (normalizedPath.includes('..') || !normalizedPath.startsWith('uploads/')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid file path. Only files in /uploads/ can be deleted.',
    })
  }

  // ── Production: delete from GitHub via API ──
  if (!import.meta.dev) {
    const token = extractAuthToken(event, body?.token)
    const config = useRuntimeConfig()
    const { owner, repo } = parseRepo(config.public.cmsRepo as string)
    const branch = (config.public.cmsBranch as string) || 'main'

    const git = createGitBackend({ owner, repo, branch, token })

    // Repo path: file lives at public/<normalizedPath>
    const repoPath = `public/${normalizedPath}`
    const fileName = normalizedPath.split('/').pop() || normalizedPath

    // Get the file's SHA (required by the Contents API DELETE)
    const existing = await git.getFile(repoPath)
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'File not found in repository',
      })
    }

    try {
      await git.deleteFile({
        path: repoPath,
        message: `media: delete ${fileName}`,
        sha: existing.sha,
      })
    } catch (err: any) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to delete file from GitHub: ${err.message}`,
      })
    }

    return {
      success: true,
      deleted: filePath,
    }
  }

  // ── Dev mode: delete from local filesystem ──
  const fullPath = resolve(process.cwd(), 'public', normalizedPath)

  if (!existsSync(fullPath)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'File not found',
    })
  }

  try {
    unlinkSync(fullPath)
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to delete file: ${err.message}`,
    })
  }

  return {
    success: true,
    deleted: filePath,
  }
})
