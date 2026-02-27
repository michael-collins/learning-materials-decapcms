/**
 * POST /api/cms/content/pull
 *
 * Pull (download) a file from GitHub and overwrite the local copy.
 * Used to sync local content with remote changes before editing or
 * to resolve conflicts.
 *
 * Auth: Token resolved from OAuth cookie or request body.
 *
 * Body:
 * - collection: collection name
 * - slug: content item slug
 * - token?: PAT (optional, falls back to OAuth cookie)
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { findCollection, getPathPattern } from '~/lib/cms/config-parser'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { createLocalBackend } from '~/lib/cms/local-backend'
import { getCmsConfig } from '~/server/utils/config-parser-server'
import { extractAuthToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Pull writes to local filesystem — only available in dev mode
  const hasLocalFiles = existsSync(join(process.cwd(), 'content'))
  if (!hasLocalFiles) {
    throw createError({
      statusCode: 400,
      message: 'Pull is only available in local development mode.',
    })
  }

  const body = await readBody(event)
  const { collection: collectionName, slug, token: bodyToken } = body

  if (!collectionName || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: collection, slug',
    })
  }

  const token = extractAuthToken(event, bodyToken)
  const config = await getCmsConfig()
  const collection = findCollection(config, collectionName)

  if (!collection?.folder) {
    throw createError({
      statusCode: 404,
      message: `Collection "${collectionName}" not found`,
    })
  }

  // Build the file path
  const pathPattern = getPathPattern(collection)
  const ext = collection.extension || 'md'
  let relativePath: string
  if (pathPattern) {
    relativePath = `${collection.folder}/${pathPattern.replace('{{slug}}', slug)}.${ext}`
  } else {
    relativePath = `${collection.folder}/${slug}.${ext}`
  }

  // Fetch file from GitHub
  const { owner, repo } = parseRepo(config.backend.repo)
  const git = createGitBackend({
    owner,
    repo,
    branch: config.backend.branch,
    token,
  })

  const remoteFile = await git.getFile(relativePath)
  if (!remoteFile) {
    throw createError({
      statusCode: 404,
      message: `File "${relativePath}" not found on GitHub (${config.backend.branch} branch).`,
    })
  }

  // Decode and write locally
  const content = Buffer.from(remoteFile.content, 'base64').toString('utf-8')
  const local = createLocalBackend({ rootDir: process.cwd() })
  local.writeFile(relativePath, content)

  return {
    success: true,
    path: relativePath,
    remoteSha: remoteFile.sha,
    message: `Pulled latest version from GitHub.`,
  }
})
