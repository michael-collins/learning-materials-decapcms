/**
 * Media upload API endpoint — LOCAL DEV ONLY.
 *
 * In production, the client uploads directly to the GitHub Contents API
 * (see composables/useCmsUpload.ts). This endpoint is only used in local
 * development to write files to the local public/uploads directory.
 *
 * Accepts multipart form data: file: File, folder?: string
 * Returns: { path: string, filename: string, size: number }
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, join, extname } from 'node:path'

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
  const hasLocalFiles = existsSync(resolve(process.cwd(), 'content'))

  if (!hasLocalFiles) {
    throw createError({
      statusCode: 400,
      message: 'File uploads in production go directly to GitHub from the browser. This endpoint is for local development only.',
    })
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
