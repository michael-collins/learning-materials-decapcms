/**
 * POST /api/cms/content/create-version
 *
 * Create a new version of a content item. This:
 * 1. Reads the current index.md
 * 2. Copies it to v/{currentVersion}.md with versionStatus: 'archived'
 * 3. Updates the index.md with the new version number
 *
 * Body:
 * - collection: collection name (e.g., "articles")
 * - slug: content item slug
 * - newVersion: new semver string (e.g., "2.0.0")
 * - changelog: optional description of changes
 *
 * This is a local-only operation (development mode).
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { collection, slug, newVersion, changelog } = body

  if (!collection || !slug || !newVersion) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: collection, slug, newVersion',
    })
  }

  // Validate semver format
  if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    throw createError({
      statusCode: 400,
      message: 'newVersion must be a valid semantic version (X.Y.Z)',
    })
  }

  // Only works locally
  const hasLocalFiles = existsSync(join(process.cwd(), 'content'))
  if (!hasLocalFiles) {
    throw createError({
      statusCode: 400,
      message: 'Version creation is only available in local development mode.',
    })
  }

  // Dynamic imports for Netlify compatibility
  const { readFileSync, writeFileSync, mkdirSync } = await import('node:fs')
  const { resolve, dirname } = await import('node:path')
  const matter = (await import('gray-matter')).default

  const cwd = process.cwd()

  // Determine the index file path
  const indexPath = resolve(cwd, `content/${collection}/${slug}/index.md`)

  if (!existsSync(indexPath)) {
    throw createError({
      statusCode: 404,
      message: `Content not found: ${collection}/${slug}/index.md`,
    })
  }

  // Read the current content
  const rawContent = readFileSync(indexPath, 'utf-8')
  const parsed = matter(rawContent)
  const currentVersion = parsed.data.version || '1.0.0'

  // Prevent creating a snapshot if the new version is the same as current
  if (newVersion === currentVersion) {
    throw createError({
      statusCode: 400,
      message: `New version (${newVersion}) is the same as the current version (${currentVersion}).`,
    })
  }

  // Check if a snapshot already exists for the current version
  const snapshotDir = resolve(cwd, `content/${collection}/${slug}/v`)
  const snapshotPath = resolve(snapshotDir, `${currentVersion}.md`)

  if (existsSync(snapshotPath)) {
    throw createError({
      statusCode: 409,
      message: `A version snapshot for ${currentVersion} already exists. The current version may have already been archived.`,
    })
  }

  // Also check if the new version already exists as a snapshot
  const newVersionSnapshotPath = resolve(snapshotDir, `${newVersion}.md`)
  if (existsSync(newVersionSnapshotPath)) {
    throw createError({
      statusCode: 409,
      message: `A snapshot for version ${newVersion} already exists. Choose a different version number.`,
    })
  }

  // 1. Create the version snapshot of the CURRENT content
  mkdirSync(snapshotDir, { recursive: true })

  const snapshotFrontmatter = {
    ...parsed.data,
    version: currentVersion,
    versionStatus: 'archived',
    _snapshotCreatedAt: new Date().toISOString(),
  }

  const snapshotContent = matter.stringify(parsed.content || '', snapshotFrontmatter)
  writeFileSync(snapshotPath, snapshotContent, 'utf-8')

  // 2. Update the index.md with the new version
  const updatedFrontmatter: Record<string, any> = {
    ...parsed.data,
    version: newVersion,
    versionStatus: 'latest',
  }

  // Add changelog if provided
  if (changelog) {
    updatedFrontmatter.changelog = changelog
  }

  const updatedContent = matter.stringify(parsed.content || '', updatedFrontmatter)
  writeFileSync(indexPath, updatedContent, 'utf-8')

  // 3. List all existing version snapshots
  const { readdirSync } = await import('node:fs')
  const existingVersions: string[] = []
  if (existsSync(snapshotDir)) {
    const files = readdirSync(snapshotDir)
    for (const file of files) {
      if (/^\d+\.\d+\.\d+\.md$/.test(file)) {
        existingVersions.push(file.replace('.md', ''))
      }
    }
  }

  return {
    success: true,
    collection,
    slug,
    previousVersion: currentVersion,
    newVersion,
    snapshotPath: `content/${collection}/${slug}/v/${currentVersion}.md`,
    existingVersions: [...existingVersions].sort(),
  }
})
