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
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import matter from 'gray-matter'
import {
  findCollection,
  getPathPattern,
} from '~/lib/cms/config-parser'
import { parseDecapConfigFromFile } from '~/server/utils/config-parser-server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { collection: collectionName, slug, frontmatter, body: content, isNew } = body

  if (!collectionName || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: collection, slug',
    })
  }

  const config = parseDecapConfigFromFile()
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

  // Build the file path
  const pathPattern = getPathPattern(collection)
  const ext = collection.extension || 'md'

  let filePath: string
  if (pathPattern) {
    const resolvedPath = pathPattern.replace('{{slug}}', slug)
    filePath = resolve(process.cwd(), collection.folder, `${resolvedPath}.${ext}`)
  } else {
    filePath = resolve(process.cwd(), collection.folder, `${slug}.${ext}`)
  }

  // Prevent overwriting existing files when creating new content
  if (isNew && existsSync(filePath)) {
    throw createError({
      statusCode: 409,
      message: `A file already exists at "${filePath}". Choose a different slug.`,
    })
  }

  // Build the markdown file content using gray-matter
  const fileContent = matter.stringify(content || '', frontmatter || {})

  // Ensure the directory exists
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // Write the file
  writeFileSync(filePath, fileContent, 'utf-8')

  return {
    success: true,
    path: filePath,
    collection: collectionName,
    slug,
  }
})
