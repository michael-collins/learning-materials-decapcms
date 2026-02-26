/**
 * Create a folder inside public/uploads (or a subfolder thereof).
 *
 * Body: { folder: string, name: string }
 *   folder — parent directory relative to public/ (e.g. "uploads" or "uploads/images")
 *   name   — new folder name (alphanumeric, hyphens, underscores)
 */
import { mkdirSync, existsSync } from 'node:fs'
import { resolve, normalize } from 'node:path'

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({
      statusCode: 501,
      statusMessage: 'Folder creation via GitHub API not yet implemented. Use local development mode.',
    })
  }

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
    path: `${normalizedParent}/${safeName}`,
  }
})
