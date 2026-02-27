/**
 * GET /api/cms/content/read
 *
 * Read a raw content file (markdown with frontmatter).
 * - In development: reads from the local filesystem via local-backend
 * - In production (Netlify): reads from GitHub API via git-backend
 *
 * Query params:
 * - collection: collection name
 * - slug: content item slug
 * - token: (optional) GitHub PAT for auth in production
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { findCollection, getPathPattern } from '~/lib/cms/config-parser'
import { createLocalBackend } from '~/lib/cms/local-backend'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { getCmsConfig } from '~/server/utils/config-parser-server'
import { extractAuthToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const collectionName = query.collection as string
  const slug = query.slug as string

  if (!collectionName || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Missing required query params: collection, slug',
    })
  }

  const config = await getCmsConfig()
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

  // Determine if we have local content files (dev mode) or need GitHub API (production)
  const hasLocalFiles = existsSync(join(process.cwd(), 'content'))

  let raw: string

  if (hasLocalFiles) {
    // Dev mode: read from local filesystem
    const local = createLocalBackend({ rootDir: process.cwd() })
    const localContent = local.readFile(relativePath)
    if (localContent === null) {
      throw createError({
        statusCode: 404,
        message: `File not found locally: ${relativePath}`,
      })
    }
    raw = localContent
  } else {
    // Production mode: read from GitHub API
    const token = extractAuthToken(event, query.token as string | undefined)
    const backend = config.backend || {}
    const { owner, repo } = parseRepo(backend.repo || '')
    const branch = backend.branch || 'main'

    const git = createGitBackend({ owner, repo, branch, token })
    const file = await git.getFile(relativePath)

    if (!file) {
      throw createError({
        statusCode: 404,
        message: `File not found on GitHub: ${relativePath}`,
      })
    }

    // Decode base64 content from GitHub API
    raw = Buffer.from(file.content, 'base64').toString('utf-8')
  }

  // Parse frontmatter server-side so the client doesn't need gray-matter
  // (gray-matter uses Node.js Buffer which is not available in the browser)
  const parsed = matter(raw)

  return {
    raw,
    frontmatter: parsed.data,
    body: parsed.content.trim(),
    path: relativePath,
    collection: collectionName,
    slug,
  }
})
