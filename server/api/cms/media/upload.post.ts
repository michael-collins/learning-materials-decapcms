/**
 * Media upload API endpoint.
 *
 * Handles file uploads to the public/uploads directory.
 * In local dev: writes directly to filesystem.
 * In production: commits to GitHub via the Contents API.
 *
 * Accepts multipart form data with:
 *  - file: the file to upload
 *  - folder: optional subfolder within public/ (defaults to 'uploads')
 *
 * Returns: { path: string, filename: string, size: number }
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, join, extname } from 'node:path'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { extractAuthToken } from '~/server/utils/auth'
import { getCmsConfig } from '~/server/utils/config-parser-server'

export default defineEventHandler(async (event) => {
  let formData: Awaited<ReturnType<typeof readMultipartFormData>>
  try {
    formData = await readMultipartFormData(event)
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      statusMessage: `Failed to parse multipart form data: ${err.message}`,
    })
  }

  if (!formData || formData.length === 0) {
    // Debug: include content-type header to diagnose
    const ct = getHeader(event, 'content-type') || 'none'
    throw createError({
      statusCode: 400,
      statusMessage: `No file provided (content-type: ${ct}, formData: ${formData === null ? 'null' : 'empty'})`,
    })
  }

  // Extract file and folder from form data
  const fileEntry = formData.find((entry) => entry.name === 'file')
  const folderEntry = formData.find((entry) => entry.name === 'folder')

  if (!fileEntry || !fileEntry.data || !fileEntry.filename) {
    const names = formData.map(e => e.name).join(', ')
    throw createError({
      statusCode: 400,
      statusMessage: `No file data found in upload (fields: ${names})`,
    })
  }

  const folder = folderEntry?.data?.toString() || 'uploads'
  const originalFilename = fileEntry.filename

  // Sanitize filename: keep extension, slugify the name
  const ext = extname(originalFilename)
  const baseName = originalFilename
    .replace(ext, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Add timestamp to avoid collisions
  const timestamp = Date.now().toString(36)
  const safeFilename = `${baseName}-${timestamp}${ext}`

  // Security: ensure folder stays within uploads/
  const normalizedFolder = folder.replace(/\.\./g, '').replace(/^\//, '')

  // Public path (returned to the client as the media URL)
  const publicPath = `/${normalizedFolder}/${safeFilename}`

  // ── Production: commit to GitHub via API ──
  const hasLocalFiles = existsSync(resolve(process.cwd(), 'content'))
  if (!hasLocalFiles) {
    try {
      // Extract token from the form data or session cookie
      const tokenEntry = formData.find((entry) => entry.name === 'token')
      const bodyToken = tokenEntry?.data?.toString()
      const token = extractAuthToken(event, bodyToken)

      const config = await getCmsConfig()
      const backend = config.backend || {}
      const { owner, repo } = parseRepo(backend.repo || '')
      const branch = backend.branch || 'main'

      const git = createGitBackend({ owner, repo, branch, token })

      // Repo path: public/<folder>/<filename>
      const repoPath = `public/${normalizedFolder}/${safeFilename}`

      await git.uploadFile({
        path: repoPath,
        content: fileEntry.data,
        message: `media: upload ${safeFilename}`,
      })

      return {
        path: publicPath,
        filename: safeFilename,
        originalFilename,
        size: fileEntry.data.length,
        contentType: fileEntry.type || 'application/octet-stream',
      }
    } catch (err: any) {
      // Return a detailed JSON error body the client can display
      throw createError({
        statusCode: err.statusCode || 500,
        message: `Upload failed: ${err.message || err}`,
        data: { detail: String(err.data || err.statusMessage || err.message || err) },
      })
    }
  }

  // ── Dev mode: write to local filesystem ──
  const targetDir = resolve(process.cwd(), 'public', normalizedFolder)

  // Ensure directory exists
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  const targetPath = join(targetDir, safeFilename)

  try {
    writeFileSync(targetPath, fileEntry.data)
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to write file: ${err.message}`,
    })
  }

  return {
    path: publicPath,
    filename: safeFilename,
    originalFilename,
    size: fileEntry.data.length,
    contentType: fileEntry.type || 'application/octet-stream',
  }
})
