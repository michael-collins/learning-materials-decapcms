/**
 * POST /api/cms/content/delete
 *
 * Delete a content item (and its entire directory) from either the
 * local filesystem or GitHub.
 *
 * **Local backend:**
 * Removes the item directory (or single file) from disk, then runs
 * `git rm -r --cached` so the removal is staged.
 *
 * **GitHub backend:**
 * Lists every file under the item's directory via the Git Trees API,
 * then deletes them all in a single commit using commitMultiple.
 *
 * Body:
 * - collection: collection name
 * - slug: content item slug
 * - token: GitHub PAT (optional, falls back to OAuth session cookie)
 * - message: optional commit message
 *
 * Response:
 * - deleted: true
 */
import { existsSync } from 'node:fs'
import { findCollection, getPathPattern } from '~/lib/cms/config-parser'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { getCmsConfig } from '~/server/utils/config-parser-server'
import { extractAuthToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const {
    collection: collectionName,
    slug,
    token: bodyToken,
    message: commitMessage,
  } = body

  if (!collectionName || !slug) {
    throw createError({ statusCode: 400, message: 'Missing required fields: collection, slug' })
  }

  const config = await getCmsConfig()
  const collection = findCollection(config, collectionName)

  if (!collection?.folder) {
    throw createError({ statusCode: 404, message: `Collection "${collectionName}" not found` })
  }

  const ext = collection.extension || 'md'
  const pathPattern = getPathPattern(collection)

  // ─── Determine whether this item lives in a subdirectory ────────────────
  // e.g. path: "{{slug}}/index"  →  itemDir = content/books/{slug}/  (directory)
  //      path: "{{slug}}"        →  itemFile = content/articles/{slug}.md (single file)
  const isDirectory = pathPattern?.includes('/')

  const itemDir = `${collection.folder}/${slug}` // no trailing slash
  const itemFile = isDirectory
    ? null
    : `${collection.folder}/${pathPattern?.replace('{{slug}}', slug) ?? slug}.${ext}`

  // ─── Local filesystem delete ─────────────────────────────────────────────
  const hasLocalFiles = existsSync(process.cwd() + '/content')

  if (hasLocalFiles) {
    const { resolve } = await import('node:path')
    const { rmSync } = await import('node:fs')

    const cwd = process.cwd()
    const targetPath = isDirectory ? resolve(cwd, itemDir) : resolve(cwd, itemFile!)

    // Safety: ensure we stay inside the project
    if (!targetPath.startsWith(cwd)) {
      throw createError({ statusCode: 400, message: 'Invalid path' })
    }

    if (!existsSync(targetPath)) {
      throw createError({ statusCode: 404, message: 'Item not found on disk' })
    }

    // Remove from filesystem
    rmSync(targetPath, { recursive: true, force: true })

    // Also push the deletion to GitHub so it doesn't require a separate publish step.
    // Falls back to git-staging-only if no token is present.
    const token = extractAuthToken(event, bodyToken)
    if (token) {
      try {
        const { owner, repo } = parseRepo(config.backend.repo)
        const branch = config.backend.branch
        const git = createGitBackend({ owner, repo, branch, token })
        const message = commitMessage || `Delete ${collectionName}/${slug}`

        if (isDirectory) {
          const tree = await git.listTree(itemDir)
          const filePaths = tree.filter(f => f.type === 'blob').map(f => f.path)
          if (filePaths.length > 0) {
            await git.commitMultiple({
              files: [],
              deletions: filePaths.map(p => ({ path: p })),
              message,
              branch,
            })
          }
        } else {
          const fileInfo = await git.getFile(itemFile!)
          if (fileInfo) {
            await git.deleteFile({ path: itemFile!, message, sha: fileInfo.sha, branch })
          }
        }
      } catch {
        // GitHub deletion failing is non-fatal in local mode — the file is
        // already gone from disk. User can re-delete from GitHub manually
        // or via batch publish tooling.
      }
    } else {
      // No token — stage the removal in git so a later manual commit picks it up
      try {
        const { execSync } = await import('node:child_process')
        const gitTarget = isDirectory ? `${itemDir}/` : itemFile!
        execSync(`git rm -r --cached --ignore-unmatch "${gitTarget}"`, { cwd, stdio: 'pipe' })
      } catch {
        // Non-fatal
      }
    }

    return { deleted: true }
  }

  // ─── GitHub API delete ───────────────────────────────────────────────────
  const token = extractAuthToken(event, bodyToken)
  if (!token) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const { owner, repo } = parseRepo(config.backend.repo)
  const branch = config.backend.branch
  const git = createGitBackend({ owner, repo, branch, token })

  const message = commitMessage || `Delete ${collectionName}/${slug}`

  if (isDirectory) {
    // List every file under the item's directory, then delete them all at once
    let filePaths: string[] = []
    try {
      const tree = await git.listTree(itemDir)
      filePaths = tree.filter(f => f.type === 'blob').map(f => f.path)
    } catch {
      throw createError({ statusCode: 404, message: `Item "${slug}" not found on GitHub` })
    }

    if (filePaths.length === 0) {
      throw createError({ statusCode: 404, message: `No files found for "${slug}"` })
    }

    await git.commitMultiple({
      files: [],
      deletions: filePaths.map(p => ({ path: p })),
      message,
      branch,
    })
  } else {
    // Single file delete
    const fileInfo = await git.getFile(itemFile!)
    if (!fileInfo) {
      throw createError({ statusCode: 404, message: `Item "${slug}" not found on GitHub` })
    }
    await git.deleteFile({ path: itemFile!, message, sha: fileInfo.sha, branch })
  }

  return { deleted: true }
})
