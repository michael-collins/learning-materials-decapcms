/**
 * GET /api/cms/content/versions
 *
 * List all version snapshots for a content item.
 * - In development: reads from the local filesystem
 * - In production (Netlify): reads from GitHub API
 *
 * Query params:
 * - collection: collection name (e.g., "articles")
 * - slug: content item slug (e.g., "3d-career-development")
 * - token: (optional) GitHub PAT for auth in production
 *
 * Returns:
 * - currentVersion: the version in index.md
 * - versions: array of { version, versionStatus, createdAt }
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { getCmsConfig } from '~/server/utils/config-parser-server'
import { extractAuthToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { collection, slug } = query as { collection: string; slug: string }

  if (!collection || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Missing required query params: collection, slug',
    })
  }

  const hasLocalFiles = existsSync(join(process.cwd(), 'content'))

  if (hasLocalFiles) {
    return await getVersionsLocal(collection, slug)
  } else {
    return await getVersionsGitHub(event, query, collection, slug)
  }
})

/**
 * Local filesystem mode — read index.md and v/*.md from disk
 */
async function getVersionsLocal(collection: string, slug: string) {
  const { readFileSync, readdirSync } = await import('node:fs')
  const { resolve } = await import('node:path')

  const cwd = process.cwd()
  const indexPath = resolve(cwd, `content/${collection}/${slug}/index.md`)

  if (!existsSync(indexPath)) {
    throw createError({
      statusCode: 404,
      message: `Content not found: ${collection}/${slug}/index.md`,
    })
  }

  // Read current version from index.md
  const rawContent = readFileSync(indexPath, 'utf-8')
  const parsed = matter(rawContent)
  const currentVersion = parsed.data.version || '1.0.0'

  // Read all archived version snapshots
  const snapshotDir = resolve(cwd, `content/${collection}/${slug}/v`)
  const versions = readSnapshotsFromDir(snapshotDir, readFileSync, readdirSync, resolve)

  sortVersionsDesc(versions)

  return { collection, slug, currentVersion, versions }
}

/**
 * GitHub API mode — fetch index.md and list v/ directory from GitHub
 */
async function getVersionsGitHub(
  event: any,
  query: Record<string, any>,
  collection: string,
  slug: string,
) {
  const config = await getCmsConfig()
  const token = extractAuthToken(event, query.token as string | undefined)
  const backend = config.backend || {}
  const { owner, repo } = parseRepo(backend.repo || '')
  const branch = backend.branch || 'main'

  const git = createGitBackend({ owner, repo, branch, token })

  // Read index.md from GitHub
  const indexPath = `content/${collection}/${slug}/index.md`
  const indexFile = await git.getFile(indexPath)

  if (!indexFile) {
    throw createError({
      statusCode: 404,
      message: `Content not found on GitHub: ${indexPath}`,
    })
  }

  const rawContent = Buffer.from(indexFile.content, 'base64').toString('utf-8')
  const parsed = matter(rawContent)
  const currentVersion = parsed.data.version || '1.0.0'

  // List v/ directory from GitHub
  const vDirPath = `content/${collection}/${slug}/v`
  const vEntries = await git.listDirectory(vDirPath)

  const versions: Array<{
    version: string
    versionStatus: string
    createdAt?: string
    title?: string
  }> = []

  // Fetch each version snapshot file
  for (const entry of vEntries) {
    if (entry.type === 'file' && /^\d+\.\d+\.\d+\.md$/.test(entry.name)) {
      try {
        const file = await git.getFile(entry.path)
        if (file) {
          const raw = Buffer.from(file.content, 'base64').toString('utf-8')
          const snap = matter(raw)
          versions.push({
            version: snap.data.version || entry.name.replace('.md', ''),
            versionStatus: snap.data.versionStatus || 'archived',
            createdAt: snap.data._snapshotCreatedAt || snap.data.date,
            title: snap.data.title,
          })
        }
      } catch {
        versions.push({
          version: entry.name.replace('.md', ''),
          versionStatus: 'archived',
        })
      }
    }
  }

  sortVersionsDesc(versions)

  return { collection, slug, currentVersion, versions }
}

/**
 * Read snapshot files from a local directory
 */
function readSnapshotsFromDir(
  snapshotDir: string,
  readFileSync: typeof import('node:fs').readFileSync,
  readdirSync: typeof import('node:fs').readdirSync,
  resolve: (...args: string[]) => string,
) {
  const versions: Array<{
    version: string
    versionStatus: string
    createdAt?: string
    title?: string
  }> = []

  if (existsSync(snapshotDir)) {
    const files = readdirSync(snapshotDir)
    for (const file of files) {
      if (/^\d+\.\d+\.\d+\.md$/.test(file)) {
        try {
          const filePath = resolve(snapshotDir, file)
          const content = readFileSync(filePath, 'utf-8')
          const snap = matter(content)
          versions.push({
            version: snap.data.version || file.replace('.md', ''),
            versionStatus: snap.data.versionStatus || 'archived',
            createdAt: snap.data._snapshotCreatedAt || snap.data.date,
            title: snap.data.title,
          })
        } catch {
          versions.push({
            version: file.replace('.md', ''),
            versionStatus: 'archived',
          })
        }
      }
    }
  }

  return versions
}

/**
 * Sort versions descending (newest first) by semver
 */
function sortVersionsDesc(versions: Array<{ version: string }>) {
  versions.sort((a, b) => {
    const partsA = a.version.split('.').map(Number)
    const partsB = b.version.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      const va = partsA[i] ?? 0
      const vb = partsB[i] ?? 0
      if (va !== vb) return vb - va
    }
    return 0
  })
}
