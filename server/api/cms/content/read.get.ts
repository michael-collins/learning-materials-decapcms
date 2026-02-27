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
import matter from 'gray-matter'
import { findCollection, getPathPattern } from '~/lib/cms/config-parser'
import { createLocalBackend } from '~/lib/cms/local-backend'
import { parseCmsConfigFromFile } from '~/server/utils/config-parser-server'

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

  const config = parseCmsConfigFromFile()
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

  // Build the relative file path using the path pattern from config
  const pathPattern = getPathPattern(collection)
  const ext = collection.extension || 'md'

  let relativePath: string
  if (pathPattern) {
    const resolvedPath = pathPattern.replace('{{slug}}', slug)
    relativePath = `${collection.folder}/${resolvedPath}.${ext}`
  } else {
    relativePath = `${collection.folder}/${slug}.${ext}`
  }

  const local = createLocalBackend({ rootDir: process.cwd() })
  const raw = local.readFile(relativePath)

  if (raw === null) {
    throw createError({
      statusCode: 404,
      message: `File not found: ${relativePath}`,
    })
  }

  // Parse frontmatter server-side so the client doesn't need gray-matter
  // (gray-matter uses Node.js Buffer which is not available in the browser)
  const parsed = matter(raw)

  return {
    raw,
    frontmatter: parsed.data,
    body: parsed.content.trim(),
    path: local.resolvePath(relativePath),
    collection: collectionName,
    slug,
  }
})
