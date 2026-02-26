/**
 * Move / rename a file within public/uploads.
 *
 * Body: { source: string, destination: string }
 *   source      — current path relative to public/ (e.g. "uploads/image.png")
 *   destination — new path relative to public/ (e.g. "uploads/images/image.png")
 *
 * Both source and destination must be within uploads/.
 */
import { existsSync, renameSync, mkdirSync } from 'node:fs'
import { resolve, normalize, dirname } from 'node:path'

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({
      statusCode: 501,
      statusMessage: 'File move via GitHub API not yet implemented. Use local development mode.',
    })
  }

  const body = await readBody(event)
  const source = (body?.source as string) || ''
  const destination = (body?.destination as string) || ''

  if (!source || !destination) {
    throw createError({ statusCode: 400, statusMessage: 'Both source and destination paths are required' })
  }

  // Normalise and validate
  const normSrc = normalize(source).replace(/^\//, '')
  const normDst = normalize(destination).replace(/^\//, '')

  if (normSrc.includes('..') || !normSrc.startsWith('uploads')) {
    throw createError({ statusCode: 403, statusMessage: 'Source must be within /uploads/' })
  }
  if (normDst.includes('..') || !normDst.startsWith('uploads')) {
    throw createError({ statusCode: 403, statusMessage: 'Destination must be within /uploads/' })
  }

  const srcFull = resolve(process.cwd(), 'public', normSrc)
  const dstFull = resolve(process.cwd(), 'public', normDst)

  if (!existsSync(srcFull)) {
    throw createError({ statusCode: 404, statusMessage: 'Source file not found' })
  }

  if (existsSync(dstFull)) {
    throw createError({ statusCode: 409, statusMessage: 'A file already exists at the destination' })
  }

  // Ensure destination directory exists
  const dstDir = dirname(dstFull)
  if (!existsSync(dstDir)) {
    mkdirSync(dstDir, { recursive: true })
  }

  try {
    renameSync(srcFull, dstFull)
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: `Failed to move file: ${err.message}` })
  }

  return {
    success: true,
    from: `/${normSrc}`,
    to: `/${normDst}`,
  }
})
