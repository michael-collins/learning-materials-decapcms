/**
 * POST /api/cms/content/sync-check
 *
 * Compare a local content file with its GitHub counterpart to detect
 * sync conflicts before publishing. Returns one of:
 *
 * - 'in-sync'       — local and remote are identical
 * - 'local-only'    — file exists locally but not on GitHub
 * - 'remote-only'   — file exists on GitHub but not locally
 * - 'diverged'      — both sides changed (potential conflict)
 *
 * When status is 'diverged', the response includes parsed frontmatter
 * and body for both versions so the client can display a conflict
 * resolution interface.
 *
 * Auth: Token resolved from OAuth cookie or request body.
 *
 * Body:
 * - collection: collection name
 * - slug: content item slug
 * - token?: PAT (optional, falls back to OAuth cookie)
 */
import { createHash } from 'node:crypto'
import matter from 'gray-matter'
import { findCollection, getPathPattern } from '~/lib/cms/config-parser'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { createLocalBackend } from '~/lib/cms/local-backend'
import { parseCmsConfigFromFile } from '~/server/utils/config-parser-server'
import { extractAuthToken } from '~/server/utils/auth'

function contentHash(content: string): string {
  return createHash('sha256').update(content.trim()).digest('hex')
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { collection: collectionName, slug, token: bodyToken } = body

  if (!collectionName || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: collection, slug',
    })
  }

  const token = extractAuthToken(event, bodyToken)
  const config = parseCmsConfigFromFile()
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

  // Read local file
  const local = createLocalBackend({ rootDir: process.cwd() })
  const localContent = local.readFile(relativePath)

  // Read remote file from GitHub
  const { owner, repo } = parseRepo(config.backend.repo)
  const git = createGitBackend({
    owner,
    repo,
    branch: config.backend.branch,
    token,
  })

  const remoteFile = await git.getFile(relativePath)

  // Determine sync status
  const localExists = localContent !== null
  const remoteExists = remoteFile !== null

  if (!localExists && !remoteExists) {
    return {
      status: 'in-sync' as const,
      message: 'File does not exist in either location.',
      localExists: false,
      remoteExists: false,
    }
  }

  if (localExists && !remoteExists) {
    return {
      status: 'local-only' as const,
      message: 'File exists locally but not on GitHub. Publishing will create it.',
      localExists: true,
      remoteExists: false,
    }
  }

  if (!localExists && remoteExists) {
    return {
      status: 'remote-only' as const,
      message: 'File exists on GitHub but not locally. Pull to sync.',
      localExists: false,
      remoteExists: true,
      remoteSha: remoteFile.sha,
    }
  }

  // Both exist — compare content
  const remoteContent = Buffer.from(remoteFile!.content, 'base64').toString('utf-8')
  const localHash = contentHash(localContent!)
  const remoteHash = contentHash(remoteContent)

  if (localHash === remoteHash) {
    return {
      status: 'in-sync' as const,
      message: 'Local and GitHub versions are identical.',
      localExists: true,
      remoteExists: true,
      remoteSha: remoteFile!.sha,
    }
  }

  // Content differs — parse frontmatter and body for both versions
  // so the client can show a conflict resolution interface.
  const localParsed = matter(localContent!)
  const remoteParsed = matter(remoteContent)

  return {
    status: 'diverged' as const,
    message: 'Local and GitHub versions differ. Review before publishing.',
    localExists: true,
    remoteExists: true,
    remoteSha: remoteFile!.sha,
    localHash,
    remoteHash,
    // Parsed content for conflict resolution
    local: {
      frontmatter: localParsed.data,
      body: localParsed.content.trim(),
    },
    remote: {
      frontmatter: remoteParsed.data,
      body: remoteParsed.content.trim(),
    },
  }
})
