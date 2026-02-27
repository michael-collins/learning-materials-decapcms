/**
 * Move / rename a file within public/uploads.
 *
 * Body: { source: string, destination: string, updateReferences?: boolean, token?: string }
 *   source           — current path relative to public/ (e.g. "uploads/image.png")
 *   destination      — new path relative to public/ (e.g. "uploads/images/image.png")
 *   updateReferences — if true, rewrite all content file references from old → new path
 *   token            — GitHub PAT (optional, used in production mode)
 *
 * Both source and destination must be within uploads/.
 *
 * In dev mode:  uses local filesystem operations.
 * In production: uses GitHub API — reads the file, rewrites content references,
 *                and commits all changes atomically via commitMultiple.
 */
import { existsSync, renameSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, normalize, dirname, join, relative } from 'node:path'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { extractAuthToken } from '~/server/utils/auth'

interface UpdatedFile {
  file: string
  replacements: number
}

/**
 * Replace all occurrences of an old media path with a new one in a string.
 * Handles both "/uploads/foo.png" and "uploads/foo.png" variants.
 */
function replacePathInContent(
  content: string,
  oldPath: string,
  newPath: string,
): { updated: string; count: number } {
  const oldWithSlash = oldPath.startsWith('/') ? oldPath : `/${oldPath}`
  const oldWithoutSlash = oldWithSlash.slice(1)
  const newWithSlash = newPath.startsWith('/') ? newPath : `/${newPath}`
  const newWithoutSlash = newWithSlash.slice(1)

  let count = 0
  let updated = content

  // Replace "/uploads/old" → "/uploads/new" (with leading slash)
  if (updated.includes(oldWithSlash)) {
    const parts = updated.split(oldWithSlash)
    count += parts.length - 1
    updated = parts.join(newWithSlash)
  }

  // Replace "uploads/old" → "uploads/new" (without leading slash)
  // Only match standalone "uploads/..." not preceded by "/"
  if (updated.includes(oldWithoutSlash)) {
    const lines = updated.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      let result = ''
      let pos = 0
      while (pos < line.length) {
        const idx = line.indexOf(oldWithoutSlash, pos)
        if (idx === -1) {
          result += line.slice(pos)
          break
        }
        if (idx > 0 && line[idx - 1] === '/') {
          result += line.slice(pos, idx + oldWithoutSlash.length)
          pos = idx + oldWithoutSlash.length
        } else {
          count++
          result += line.slice(pos, idx) + newWithoutSlash
          pos = idx + oldWithoutSlash.length
        }
      }
      lines[i] = result
    }
    updated = lines.join('\n')
  }

  return { updated, count }
}

/**
 * Local-only: recursively scan content/ and rewrite references on disk.
 */
function rewriteReferencesLocal(
  contentDir: string,
  projectRoot: string,
  oldPath: string,
  newPath: string,
): UpdatedFile[] {
  const updatedFiles: UpdatedFile[] = []

  function walk(dir: string) {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      let stat
      try {
        stat = statSync(fullPath)
      } catch {
        continue
      }
      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (entry.endsWith('.md') || entry.endsWith('.yaml') || entry.endsWith('.yml') || entry.endsWith('.json')) {
        processFile(fullPath)
      }
    }
  }

  function processFile(filePath: string) {
    let content: string
    try {
      content = readFileSync(filePath, 'utf-8')
    } catch {
      return
    }
    const { updated, count } = replacePathInContent(content, oldPath, newPath)
    if (count > 0) {
      writeFileSync(filePath, updated, 'utf-8')
      updatedFiles.push({
        file: relative(projectRoot, filePath),
        replacements: count,
      })
    }
  }

  walk(contentDir)
  return updatedFiles
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const source = (body?.source as string) || ''
  const destination = (body?.destination as string) || ''
  const updateReferences = body?.updateReferences !== false // default true

  if (!source || !destination) {
    throw createError({ statusCode: 400, statusMessage: 'Both source and destination paths are required' })
  }

  // Normalise and validate
  const normSrc = normalize(source).replace(/^\//, '')
  const normDst = normalize(destination).replace(/^\//, '')

  if (normSrc.includes('..') || !normSrc.startsWith('uploads')) {
    throw createError({ statusCode: 403, statusMessage: 'Source must be within /uploads/' })
  }
  if (normDst.includes('..') || !normDst.startsWith('uploads')) {
    throw createError({ statusCode: 403, statusMessage: 'Destination must be within /uploads/' })
  }

  // ─── Local dev mode ─────────────────────────────────────
  if (import.meta.dev) {
    const projectRoot = process.cwd()
    const srcFull = resolve(projectRoot, 'public', normSrc)
    const dstFull = resolve(projectRoot, 'public', normDst)

    if (!existsSync(srcFull)) {
      throw createError({ statusCode: 404, statusMessage: 'Source file not found' })
    }
    if (existsSync(dstFull)) {
      throw createError({ statusCode: 409, statusMessage: 'A file already exists at the destination' })
    }

    const dstDir = dirname(dstFull)
    if (!existsSync(dstDir)) {
      mkdirSync(dstDir, { recursive: true })
    }

    try {
      renameSync(srcFull, dstFull)
    } catch (err: any) {
      throw createError({ statusCode: 500, statusMessage: `Failed to move file: ${err.message}` })
    }

    let updatedFiles: UpdatedFile[] = []
    if (updateReferences) {
      const contentDir = resolve(projectRoot, 'content')
      updatedFiles = rewriteReferencesLocal(contentDir, projectRoot, normSrc, normDst)
    }

    return {
      success: true,
      from: `/${normSrc}`,
      to: `/${normDst}`,
      updatedReferences: updatedFiles,
    }
  }

  // ─── Production mode (GitHub API) ──────────────────────
  const token = extractAuthToken(event, body?.token)
  const config = useRuntimeConfig()
  const repoStr = (config.public as any).cmsRepo || 'michael-collins/learning-materials-decapcms'
  const { owner, repo } = parseRepo(repoStr)
  const branch = (config.public as any).cmsBranch || 'main'

  const git = createGitBackend({ owner, repo, branch, token })

  // Media files are stored under public/ in the repo
  const srcRepoPath = `public/${normSrc}`
  const dstRepoPath = `public/${normDst}`

  // 1. Verify source exists on GitHub
  const sourceFile = await git.getFile(srcRepoPath)
  if (!sourceFile) {
    throw createError({ statusCode: 404, statusMessage: 'Source file not found in repository' })
  }

  // 2. Verify destination doesn't exist
  const destFile = await git.getFile(dstRepoPath)
  if (destFile) {
    throw createError({ statusCode: 409, statusMessage: 'A file already exists at the destination in the repository' })
  }

  // 3. Build the commit: new file at destination + delete old file
  const filesToCommit: Array<{ path: string; content: string }> = [
    { path: dstRepoPath, content: sourceFile.content }, // already base64-encoded
  ]
  const filesToDelete: Array<{ path: string }> = [
    { path: srcRepoPath },
  ]

  // 4. If updateReferences, scan content files and rewrite paths
  const updatedFiles: UpdatedFile[] = []
  if (updateReferences) {
    const tree = await git.listTree('content')
    const contentFiles = tree.filter(
      (f) => f.type === 'blob' && (
        f.path.endsWith('.md') || f.path.endsWith('.yaml') ||
        f.path.endsWith('.yml') || f.path.endsWith('.json')
      ),
    )

    // Process in batches to respect rate limits
    const BATCH_SIZE = 10
    for (let i = 0; i < contentFiles.length; i += BATCH_SIZE) {
      const batch = contentFiles.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(
        batch.map(async (entry) => {
          try {
            const file = await git.getFile(entry.path)
            if (!file) return null
            const content = Buffer.from(file.content, 'base64').toString('utf-8')
            const { updated, count } = replacePathInContent(content, normSrc, normDst)
            if (count > 0) {
              return { path: entry.path, newContent: updated, replacements: count }
            }
            return null
          } catch {
            return null
          }
        }),
      )

      for (const result of results) {
        if (result) {
          filesToCommit.push({
            path: result.path,
            content: Buffer.from(result.newContent, 'utf-8').toString('base64'),
          })
          updatedFiles.push({
            file: result.path,
            replacements: result.replacements,
          })
        }
      }
    }
  }

  // 5. Commit everything atomically
  const fileName = normSrc.split('/').pop() || normSrc
  const refMsg = updatedFiles.length > 0
    ? ` and update ${updatedFiles.reduce((s, f) => s + f.replacements, 0)} reference(s) in ${updatedFiles.length} file(s)`
    : ''
  const commitMessage = `media: move ${fileName} to ${normDst}${refMsg}`

  try {
    await git.commitMultiple({
      files: filesToCommit,
      deletions: filesToDelete,
      message: commitMessage,
    })
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to commit move to GitHub: ${err.message || err}`,
    })
  }

  return {
    success: true,
    from: `/${normSrc}`,
    to: `/${normDst}`,
    updatedReferences: updatedFiles,
  }
})
