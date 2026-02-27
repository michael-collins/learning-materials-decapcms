/**
 * Media upload API endpoint.
 *
 * Handles file uploads to the public/uploads directory.
 *
 * Two modes:
 * 1. JSON body (production / Netlify) — client sends base64-encoded file data:
 *    { filename: string, content: string (base64), folder?: string, token?: string }
 * 2. Multipart form data (dev mode) — standard file upload:
 *    file: File, folder?: string
 *
 * Returns: { path: string, filename: string, size: number }
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, join, extname } from 'node:path'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { extractAuthToken } from '~/server/utils/auth'
import { getCmsConfig } from '~/server/utils/config-parser-server'

function sanitizeFilename(originalFilename: string) {
  const ext = extname(originalFilename)
  const baseName = originalFilename
    .replace(ext, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const timestamp = Date.now().toString(36)
  return { safeFilename: `${baseName}-${timestamp}${ext}`, ext }
}

export default defineEventHandler(async (event) => {
  const ct = getHeader(event, 'content-type') || ''
  const hasLocalFiles = existsSync(resolve(process.cwd(), 'content'))

  // ── JSON body path (production on Netlify) ──
  if (ct.includes('application/json') || !hasLocalFiles) {
    // If someone sends multipart to the JSON path (stale client), give a clear error
    if (ct.includes('multipart/form-data')) {
      throw createError({
        statusCode: 400,
        message: 'Multipart uploads are not supported in production. Please hard-refresh your browser (Cmd+Shift+R) to get the updated client.',
      })
    }

    const body = await readBody(event)

    if (!body?.filename || !body?.content) {
      throw createError({
        statusCode: 400,
        message: `Missing required fields: filename, content (base64). Received keys: ${body ? Object.keys(body).join(', ') : 'null body'}`,
      })
    }

    const originalFilename = body.filename as string
    const base64Content = body.content as string
    const folder = (body.folder as string) || 'uploads'
    const normalizedFolder = folder.replace(/\.\./g, '').replace(/^\//, '')
    const { safeFilename } = sanitizeFilename(originalFilename)
    const publicPath = `/${normalizedFolder}/${safeFilename}`

    try {
      const token = extractAuthToken(event, body.token)
      const config = await getCmsConfig()
      const backend = config.backend || {}
      const { owner, repo } = parseRepo(backend.repo || '')
      const branch = backend.branch || 'main'

      const git = createGitBackend({ owner, repo, branch, token })
      const repoPath = `public/${normalizedFolder}/${safeFilename}`

      // Write file directly via Contents API (content is already base64)
      await git.writeFile({
        path: repoPath,
        content: base64Content,
        message: `media: upload ${safeFilename}`,
      })

      const fileSize = Math.ceil(base64Content.length * 3 / 4)
      return {
        path: publicPath,
        filename: safeFilename,
        originalFilename,
        size: fileSize,
        contentType: body.contentType || 'application/octet-stream',
      }
    } catch (err: any) {
      throw createError({
        statusCode: err.statusCode || 500,
        message: `Upload failed: ${err.message || err}`,
      })
    }
  }

  // ── Multipart form data path (local dev) ──
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file provided' })
  }

  const fileEntry = formData.find((entry) => entry.name === 'file')
  const folderEntry = formData.find((entry) => entry.name === 'folder')

  if (!fileEntry || !fileEntry.data || !fileEntry.filename) {
    throw createError({ statusCode: 400, message: 'No file data found in upload' })
  }

  const folder = folderEntry?.data?.toString() || 'uploads'
  const normalizedFolder = folder.replace(/\.\./g, '').replace(/^\//, '')
  const { safeFilename } = sanitizeFilename(fileEntry.filename)
  const publicPath = `/${normalizedFolder}/${safeFilename}`

  const targetDir = resolve(process.cwd(), 'public', normalizedFolder)
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  const targetPath = join(targetDir, safeFilename)
  try {
    writeFileSync(targetPath, fileEntry.data)
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to write file: ${err.message}`,
    })
  }

  return {
    path: publicPath,
    filename: safeFilename,
    originalFilename: fileEntry.filename,
    size: fileEntry.data.length,
    contentType: fileEntry.type || 'application/octet-stream',
  }
})
