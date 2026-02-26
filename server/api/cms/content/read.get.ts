/**
 * GET /api/cms/content/read
 *
 * Read a raw content file (markdown with frontmatter) from the filesystem.
 * Used in development mode (local_backend) to load existing content for editing.
 *
 * Query params:
 * - collection: collection name
 * - slug: content item slug
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { findCollection, getPathPattern } from '~/lib/cms/config-parser'
import { parseDecapConfigFromFile } from '~/server/utils/config-parser-server'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const collectionName = query.collection as string
  const slug = query.slug as string

  if (!collectionName || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Missing required query params: collection, slug',
    })
  }

  const config = parseDecapConfigFromFile()
  const collection = findCollection(config, collectionName)

  if (!collection) {
    throw createError({
      statusCode: 404,
      message: `Collection "${collectionName}" not found in config`,
    })
  }

  if (!collection.folder) {
    throw createError({
      statusCode: 400,
      message: `Collection "${collectionName}" is not a folder collection`,
    })
  }

  // Build the file path using the path pattern from config
  const pathPattern = getPathPattern(collection)
  const ext = collection.extension || 'md'

  let filePath: string
  if (pathPattern) {
    // e.g., "{{slug}}/index" → "{slug}/index.md"
    const resolvedPath = pathPattern.replace('{{slug}}', slug)
    filePath = resolve(process.cwd(), collection.folder, `${resolvedPath}.${ext}`)
  } else {
    filePath = resolve(process.cwd(), collection.folder, `${slug}.${ext}`)
  }

  if (!existsSync(filePath)) {
    throw createError({
      statusCode: 404,
      message: `File not found: ${filePath}`,
    })
  }

  const raw = readFileSync(filePath, 'utf-8')

  return {
    raw,
    path: filePath,
    collection: collectionName,
    slug,
  }
})
