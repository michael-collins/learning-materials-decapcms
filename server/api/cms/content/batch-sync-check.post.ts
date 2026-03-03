/**
 * POST /api/cms/content/batch-sync-check
 *
 * Scan one or more collection folders and compare local files against
 * GitHub, returning a list of files that differ.
 *
 * Works in two modes:
 *
 * **Development (local files available):**
 * Compares working-tree files against the locally committed HEAD using
 * git blob SHA-1 hashes. Only flags truly uncommitted changes — not
 * branch-vs-branch differences when config.backend.branch differs
 * from the checked-out branch.
 *
 * **Production / Netlify (no local files):**
 * Compares the tree at the deploy commit (COMMIT_REF) against the
 * current branch HEAD. Shows what changed since the last deploy.
 *
 * Body:
 * - collections?: string[]  — collection names to check (all if omitted)
 * - token?: string          — PAT (optional, falls back to OAuth cookie)
 *
 * Response:
 * - changes: Array<{ collection, slug, path, status, title? }>
 * - summary: { total, modified, added, deleted }
 * - mode: 'local' | 'deployed'   — which comparison mode was used
 */
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import matter from 'gray-matter'
import { findCollection, getPathPattern } from '~/lib/cms/config-parser'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { createLocalBackend } from '~/lib/cms/local-backend'
import { getCmsConfig } from '~/server/utils/config-parser-server'
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

/**
 * Extract slug from a file path, handling path patterns like {{slug}}/index.
 */
function extractSlug(filePath: string, collectionFolder: string, ext: string, pathPattern: string | null): string {
  let slug = filePath
    .replace(`${collectionFolder}/`, '')
    .replace(new RegExp(`\\.${ext}$`), '')

  if (pathPattern) {
    const suffix = pathPattern.replace('{{slug}}', '').replace(/^\//, '')
    if (suffix && slug.endsWith(`/${suffix}`)) {
      slug = slug.replace(new RegExp(`/${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
    }
  }
  return slug
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { collections: requestedCollections, token: bodyToken } = body

  const token = extractAuthToken(event, bodyToken)
  const config = await getCmsConfig()
  const { owner, repo } = parseRepo(config.backend.repo)

  const git = createGitBackend({
    owner,
    repo,
    branch: config.backend.branch,
    token,
  })

  // Determine which collections to scan
  const collectionNames: string[] = requestedCollections?.length
    ? requestedCollections
    : config.collections
        .filter((c: any) => c.folder)
        .map((c: any) => c.name)

  // Check if local content files are available (development mode)
  const hasLocalFiles = collectionNames.some((name) => {
    const collection = findCollection(config, name)
    if (!collection?.folder) return false
    return existsSync(resolve(process.cwd(), collection.folder))
  })

  if (hasLocalFiles) {
    // ── Development mode: compare local filesystem vs GitHub ──
    return await scanLocalVsRemote(git, config, collectionNames)
  } else {
    // ── Production mode: compare deploy commit vs current HEAD ──
    const runtimeConfig = useRuntimeConfig()
    const deployCommitRef = runtimeConfig.deployCommitRef as string

    if (!deployCommitRef) {
      return {
        changes: [],
        summary: { total: 0, modified: 0, added: 0, deleted: 0 },
        mode: 'deployed',
        message: 'No deploy commit reference available. Changes will appear after your next Netlify deploy.',
      }
    }

    return await scanDeployedVsRemote(git, config, collectionNames, deployCommitRef)
  }
})

// ─── Development mode: compare working tree against local git HEAD ───

/**
 * Parse the output of `git ls-tree -r HEAD` into an array of {path, sha}.
 * Each line is formatted as: <mode> <type> <sha>\t<path>
 */
function parseGitLsTree(output: string): Array<{ path: string; sha: string }> {
  return output
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const tabIndex = line.indexOf('\t')
      if (tabIndex === -1) return null
      const meta = line.slice(0, tabIndex)
      const path = line.slice(tabIndex + 1)
      const sha = meta.split(/\s+/)[2]
      return sha ? { path, sha } : null
    })
    .filter((e): e is { path: string; sha: string } => e !== null)
}

async function scanLocalVsRemote(
  git: ReturnType<typeof createGitBackend>,
  config: any,
  collectionNames: string[]
) {
  const local = createLocalBackend({ rootDir: process.cwd() })

  // Use the local git repo HEAD tree instead of fetching from GitHub.
  // This ensures we only flag working-tree changes (uncommitted edits),
  // not branch-vs-branch differences caused by config.backend.branch
  // pointing to a different branch than what's checked out locally.
  let headTree: Array<{ path: string; sha: string }> = []
  try {
    const cwd = process.cwd()
    const output = execSync('git ls-tree -r HEAD', { cwd, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
    headTree = parseGitLsTree(output)
  } catch {
    // If local git isn't available, fall back to GitHub tree
    try {
      headTree = await git.listTree('')
    } catch {
      // If tree can't be fetched, everything will show as "added"
    }
  }

  const changes: BatchChangeEntry[] = []

  for (const collectionName of collectionNames) {
    const collection = findCollection(config, collectionName)
    if (!collection?.folder) continue

    const ext = collection.extension || 'md'
    const pathPattern = getPathPattern(collection)

    const localFiles = local.listFiles(collection.folder, {
      recursive: true,
      extensions: [`.${ext}`],
    }).filter(f => !f.isDirectory)

    const prefix = collection.folder.endsWith('/')
      ? collection.folder
      : `${collection.folder}/`
    const committedEntries = headTree.filter(
      e => e.path.startsWith(prefix) && e.path.endsWith(`.${ext}`)
    )

    const committedByPath = new Map(committedEntries.map(e => [e.path, e.sha]))
    const localByPath = new Map<string, { content: string; path: string }>()

    for (const file of localFiles) {
      const content = local.readFile(file.path)
      if (content !== null) {
        localByPath.set(file.path, { content, path: file.path })
      }
    }

    for (const [filePath, fileData] of localByPath) {
      const localSha = gitBlobSha(fileData.content)
      const committedSha = committedByPath.get(filePath)
      const slug = extractSlug(filePath, collection.folder, ext, pathPattern)

      let title: string | undefined
      try {
        const parsed = matter(fileData.content)
        title = parsed.data?.title
      } catch { /* ignore */ }

      if (!committedSha) {
        changes.push({ collection: collectionName, slug, path: filePath, status: 'added', title })
      } else if (localSha !== committedSha) {
        changes.push({ collection: collectionName, slug, path: filePath, status: 'modified', title })
      }
    }

    for (const [filePath] of committedByPath) {
      if (!localByPath.has(filePath)) {
        const slug = extractSlug(filePath, collection.folder, ext, pathPattern)
        changes.push({ collection: collectionName, slug, path: filePath, status: 'deleted' })
      }
    }
  }

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
    mode: 'local' as const,
  }
}

// ─── Production mode: compare deploy tree vs current HEAD tree ───

async function scanDeployedVsRemote(
  git: ReturnType<typeof createGitBackend>,
  config: any,
  collectionNames: string[],
  deployCommitRef: string
) {
  const branch = config.backend.branch

  let deployTree: Array<{ path: string; sha: string }> = []
  let headTree: Array<{ path: string; sha: string }> = []

  try {
    deployTree = await git.listTree('', deployCommitRef)
  } catch {
    return {
      changes: [],
      summary: { total: 0, modified: 0, added: 0, deleted: 0 },
      mode: 'deployed' as const,
      message: 'Could not fetch the deploy commit tree. The deploy commit may have been rebased.',
    }
  }

  try {
    headTree = await git.listTree('', branch)
  } catch {
    return {
      changes: [],
      summary: { total: 0, modified: 0, added: 0, deleted: 0 },
      mode: 'deployed' as const,
      message: 'Could not fetch the current branch tree.',
    }
  }

  const changes: BatchChangeEntry[] = []

  for (const collectionName of collectionNames) {
    const collection = findCollection(config, collectionName)
    if (!collection?.folder) continue

    const ext = collection.extension || 'md'
    const pathPattern = getPathPattern(collection)
    const prefix = collection.folder.endsWith('/')
      ? collection.folder
      : `${collection.folder}/`

    const deployEntries = deployTree.filter(
      e => e.path.startsWith(prefix) && e.path.endsWith(`.${ext}`)
    )
    const headEntries = headTree.filter(
      e => e.path.startsWith(prefix) && e.path.endsWith(`.${ext}`)
    )

    const deployByPath = new Map(deployEntries.map(e => [e.path, e.sha]))
    const headByPath = new Map(headEntries.map(e => [e.path, e.sha]))

    for (const [filePath, headSha] of headByPath) {
      const deploySha = deployByPath.get(filePath)
      const slug = extractSlug(filePath, collection.folder, ext, pathPattern)

      if (!deploySha) {
        changes.push({ collection: collectionName, slug, path: filePath, status: 'added' })
      } else if (headSha !== deploySha) {
        changes.push({ collection: collectionName, slug, path: filePath, status: 'modified' })
      }
    }

    for (const [filePath] of deployByPath) {
      if (!headByPath.has(filePath)) {
        const slug = extractSlug(filePath, collection.folder, ext, pathPattern)
        changes.push({ collection: collectionName, slug, path: filePath, status: 'deleted' })
      }
    }
  }

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
    mode: 'deployed' as const,
  }
}
