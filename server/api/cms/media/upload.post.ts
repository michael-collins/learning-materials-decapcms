/**
 * Media upload API endpoint.
 *
 * Handles file uploads to the public/uploads directory.
 * In local dev: writes directly to filesystem.
 * In production: would commit to GitHub via API (future enhancement).
 *
 * Accepts multipart form data with:
 *  - file: the file to upload
 *  - folder: optional subfolder within public/ (defaults to 'uploads')
 *
 * Returns: { path: string, filename: string, size: number }
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, join, extname } from 'node:path'

export default defineEventHandler(async (event) => {
  // Only allow in development mode for now
  // Production uploads would go through GitHub API
  if (!import.meta.dev) {
    throw createError({
      statusCode: 501,
      statusMessage: 'Media upload via GitHub API not yet implemented. Use local development mode.',
    })
  }

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No file provided',
    })
  }

  // Extract file and folder from form data
  const fileEntry = formData.find((entry) => entry.name === 'file')
  const folderEntry = formData.find((entry) => entry.name === 'folder')

  if (!fileEntry || !fileEntry.data || !fileEntry.filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No file data found in upload',
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

  // Resolve the target directory
  const targetDir = resolve(process.cwd(), 'public', folder)

  // Ensure directory exists
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  const targetPath = join(targetDir, safeFilename)

  // Write file
  try {
    writeFileSync(targetPath, fileEntry.data)
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to write file: ${err.message}`,
    })
  }

  // Return the public path (relative to public/ so it works as an href)
  const publicPath = `/${folder}/${safeFilename}`

  return {
    path: publicPath,
    filename: safeFilename,
    originalFilename,
    size: fileEntry.data.length,
    contentType: fileEntry.type || 'application/octet-stream',
  }
})
