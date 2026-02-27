/**
 * GET /api/cms/content/versions
 *
 * List all version snapshots for a content item.
 *
 * Query params:
 * - collection: collection name (e.g., "articles")
 * - slug: content item slug (e.g., "3d-career-development")
 *
 * Returns:
 * - currentVersion: the version in index.md
 * - versions: array of { version, versionStatus, createdAt }
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

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
  if (!hasLocalFiles) {
    throw createError({
      statusCode: 400,
      message: 'Version listing is only available in local development mode.',
    })
  }

  const { readFileSync, readdirSync } = await import('node:fs')
  const { resolve } = await import('node:path')
  const matter = (await import('gray-matter')).default

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
          // Skip unreadable files
          versions.push({
            version: file.replace('.md', ''),
            versionStatus: 'archived',
          })
        }
      }
    }
  }

  // Sort versions descending (newest first)
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

  return {
    collection,
    slug,
    currentVersion,
    versions,
  }
})
