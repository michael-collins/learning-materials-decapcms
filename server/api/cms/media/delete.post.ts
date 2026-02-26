/**
 * Media delete API endpoint.
 *
 * Deletes a file from public/ directory.
 * Only available in development mode.
 *
 * Body: { path: string } — e.g., '/uploads/image-abc123.png'
 */
import { unlinkSync, existsSync } from 'node:fs'
import { resolve, normalize } from 'node:path'

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({
      statusCode: 501,
      statusMessage: 'Media deletion via GitHub API not yet implemented. Use local development mode.',
    })
  }

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
