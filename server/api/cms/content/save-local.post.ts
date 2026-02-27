/**
 * POST /api/cms/content/save-local
 *
 * Save content directly to the filesystem (local development only).
 * Writes a markdown file with frontmatter using gray-matter.
 *
 * Body:
 * - collection: collection name
 * - slug: content item slug (for editing) or new slug (for creation)
 * - frontmatter: object of frontmatter fields
 * - body: markdown body content
 * - isNew: boolean indicating new content creation
 */
import matter from 'gray-matter'
import {
  findCollection,
  getPathPattern,
} from '~/lib/cms/config-parser'
import { createLocalBackend } from '~/lib/cms/local-backend'
import { getCmsConfig } from '~/server/utils/config-parser-server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { collection: collectionName, slug, frontmatter, body: content, isNew } = body

  if (!collectionName || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: collection, slug',
    })
  }

  const config = await getCmsConfig()
  const collection = findCollection(config, collectionName)

  if (!collection) {
    throw createError({
      statusCode: 404,
      message: `Collection "${collectionName}" not found`,
    })
  }

  if (!collection.folder) {
    throw createError({
      statusCode: 400,
      message: `Collection "${collectionName}" is not a folder collection`,
    })
  }

  // Build the relative file path
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

  // Prevent overwriting existing files when creating new content
  if (isNew && local.fileExists(relativePath)) {
    throw createError({
      statusCode: 409,
      message: `A file already exists at "${relativePath}". Choose a different slug.`,
    })
  }

  // Build the markdown file content using gray-matter
  const fileContent = matter.stringify(content || '', frontmatter || {})

  // Write the file
  const result = local.writeFile(relativePath, fileContent)

  return {
    success: true,
    path: result.fullPath,
    collection: collectionName,
    slug,
  }
})
