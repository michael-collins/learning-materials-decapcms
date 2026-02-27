/**
 * POST /api/cms/content/batch-sync-check
 *
 * Scan one or more collection folders and compare local files against
 * GitHub, returning a list of files that differ.
 *
 * Uses git blob SHA comparison — computes the git-compatible SHA-1 hash
 * of each local file and compares it to the SHA from the GitHub Contents API,
 * so we only need ONE API call per collection (directory listing).
 *
 * Body:
 * - collections?: string[]  — collection names to check (all if omitted)
 * - token?: string          — PAT (optional, falls back to OAuth cookie)
 *
 * Response:
 * - changes: Array<{ collection, slug, path, status, title? }>
 * - summary: { total, modified, added, deleted }
 */
import { createHash } from 'node:crypto'
import matter from 'gray-matter'
import { findCollection, getPathPattern } from '~/lib/cms/config-parser'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { createLocalBackend } from '~/lib/cms/local-backend'
import { parseCmsConfigFromFile } from '~/server/utils/config-parser-server'
import { extractAuthToken } from '~/server/utils/auth'

/**
 * Compute a git blob SHA-1 hash (same algorithm as git).
 * Format: sha1("blob <size>\0<content>")
 */
function gitBlobSha(content: string): string {
  const buf = Buffer.from(content)
  const header = `blob ${buf.length}\0`
  return createHash('sha1')
    .update(header)
    .update(buf)
    .digest('hex')
}

export interface BatchChangeEntry {
  collection: string
  slug: string
  path: string
  status: 'modified' | 'added' | 'deleted'
  title?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { collections: requestedCollections, token: bodyToken } = body

  const token = extractAuthToken(event, bodyToken)
  const config = parseCmsConfigFromFile()
  const { owner, repo } = parseRepo(config.backend.repo)

  const git = createGitBackend({
    owner,
    repo,
    branch: config.backend.branch,
    token,
  })

  const local = createLocalBackend({ rootDir: process.cwd() })

  // Determine which collections to scan
  const collectionNames: string[] = requestedCollections?.length
    ? requestedCollections
    : config.collections
        .filter((c: any) => c.folder) // Only folder collections
        .map((c: any) => c.name)

  // Pre-fetch the full repo tree once (recursive) — shared across all collections
  let fullTree: Array<{ path: string; sha: string }> = []
  try {
    fullTree = await git.listTree('')  // empty prefix = root
  } catch {
    // If tree can't be fetched, everything will show as "added"
  }

  const changes: BatchChangeEntry[] = []

  for (const collectionName of collectionNames) {
    const collection = findCollection(config, collectionName)
    if (!collection?.folder) continue

    const ext = collection.extension || 'md'
    const pathPattern = getPathPattern(collection)

    // List local files
    const localFiles = local.listFiles(collection.folder, {
      recursive: true,
      extensions: [`.${ext}`],
    }).filter(f => !f.isDirectory)

    // Filter the pre-fetched tree to this collection's folder
    const prefix = collection.folder.endsWith('/')
      ? collection.folder
      : `${collection.folder}/`
    const remoteEntries = fullTree.filter(
      e => e.path.startsWith(prefix) && e.path.endsWith(`.${ext}`)
    )

    // Build maps for comparison
    const remoteByPath = new Map(remoteEntries.map(e => [e.path, e.sha]))
    const localByPath = new Map<string, { content: string; path: string }>()

    for (const file of localFiles) {
      const content = local.readFile(file.path)
      if (content !== null) {
        localByPath.set(file.path, { content, path: file.path })
      }
    }

    // Compare: files in local but not remote (added), files in both but different (modified)
    for (const [filePath, fileData] of localByPath) {
      const localSha = gitBlobSha(fileData.content)
      const remoteSha = remoteByPath.get(filePath)

      let slug = filePath
        .replace(`${collection.folder}/`, '')
        .replace(new RegExp(`\\.${ext}$`), '')

      // Handle path patterns (e.g., {{slug}}/index)
      if (pathPattern) {
        const suffix = pathPattern.replace('{{slug}}', '').replace(/^\//, '')
        if (suffix && slug.endsWith(`/${suffix}`)) {
          slug = slug.replace(new RegExp(`/${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
        }
      }

      // Try to extract title from frontmatter
      let title: string | undefined
      try {
        const parsed = matter(fileData.content)
        title = parsed.data?.title
      } catch {
        // ignore parse errors
      }

      if (!remoteSha) {
        // File exists locally but not remotely
        changes.push({
          collection: collectionName,
          slug,
          path: filePath,
          status: 'added',
          title,
        })
      } else if (localSha !== remoteSha) {
        // File content differs
        changes.push({
          collection: collectionName,
          slug,
          path: filePath,
          status: 'modified',
          title,
        })
      }
      // If SHAs match, the file is in sync — skip
    }

    // Compare: files on remote but not local (deleted)
    for (const [filePath] of remoteByPath) {
      if (!localByPath.has(filePath)) {
        let slug = filePath
          .replace(`${collection.folder}/`, '')
          .replace(new RegExp(`\\.${ext}$`), '')

        if (pathPattern) {
          const suffix = pathPattern.replace('{{slug}}', '').replace(/^\//, '')
          if (suffix && slug.endsWith(`/${suffix}`)) {
            slug = slug.replace(new RegExp(`/${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
          }
        }

        changes.push({
          collection: collectionName,
          slug,
          path: filePath,
          status: 'deleted',
        })
      }
    }
  }

  // Sort: modified first, then added, then deleted
  const statusOrder = { modified: 0, added: 1, deleted: 2 }
  changes.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

  return {
    changes,
    summary: {
      total: changes.length,
      modified: changes.filter(c => c.status === 'modified').length,
      added: changes.filter(c => c.status === 'added').length,
      deleted: changes.filter(c => c.status === 'deleted').length,
    },
  }
})
