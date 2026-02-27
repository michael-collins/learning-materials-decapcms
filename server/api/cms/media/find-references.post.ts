/**
 * Scan all content files for references to a given media path.
 *
 * Body: { path: string, token?: string }
 *   path  — the media path to search for (e.g. "/uploads/image.png")
 *   token — GitHub PAT (optional, used in production mode)
 *
 * Returns: { references: Array<{ file: string, line: number, context: string }> }
 *
 * In dev mode, scans local filesystem.
 * In production, fetches content files from GitHub via the Git Trees + Blobs API.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { extractAuthToken } from '~/server/utils/auth'

interface Reference {
  /** Content file path relative to project root (e.g. "content/exercises/foo/index.md") */
  file: string
  /** 1-based line number */
  line: number
  /** Trimmed line content for context */
  context: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const mediaPath = (body?.path as string) || ''

  if (!mediaPath) {
    throw createError({ statusCode: 400, statusMessage: 'Media path is required' })
  }

  // Normalise: search for both "/uploads/foo.png" and "uploads/foo.png"
  const withSlash = mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`
  const withoutSlash = withSlash.slice(1)

  // ─── Local dev mode ─────────────────────────────────────
  if (import.meta.dev) {
    const projectRoot = process.cwd()
    const contentDir = resolve(projectRoot, 'content')
    const references: Reference[] = []

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
          scanLocalFile(fullPath, projectRoot, references)
        }
      }
    }

    function scanLocalFile(filePath: string, root: string, refs: Reference[]) {
      let content: string
      try {
        content = readFileSync(filePath, 'utf-8')
      } catch {
        return
      }
      const lines = content.split('\n')
      const relPath = relative(root, filePath)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!
        if (line.includes(withSlash) || line.includes(withoutSlash)) {
          refs.push({
            file: relPath,
            line: i + 1,
            context: line.trim().slice(0, 200),
          })
        }
      }
    }

    walk(contentDir)
    return { references }
  }

  // ─── Production mode (GitHub API) ──────────────────────
  const token = extractAuthToken(event, body?.token)
  const config = useRuntimeConfig()
  const repoStr = (config.public as any).cmsRepo || 'michael-collins/learning-materials-decapcms'
  const { owner, repo } = parseRepo(repoStr)
  const branch = (config.public as any).cmsBranch || 'main'

  const git = createGitBackend({ owner, repo, branch, token })

  // Get the full tree and filter to content files
  const tree = await git.listTree('content')
  const contentFiles = tree.filter(
    (f) => f.type === 'blob' && (
      f.path.endsWith('.md') || f.path.endsWith('.yaml') ||
      f.path.endsWith('.yml') || f.path.endsWith('.json')
    ),
  )

  const references: Reference[] = []

  // Fetch and scan each content file (parallelised in batches to stay within rate limits)
  const BATCH_SIZE = 10
  for (let i = 0; i < contentFiles.length; i += BATCH_SIZE) {
    const batch = contentFiles.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (entry) => {
        try {
          const file = await git.getFile(entry.path)
          if (!file) return []
          const content = Buffer.from(file.content, 'base64').toString('utf-8')
          const lines = content.split('\n')
          const refs: Reference[] = []
          for (let j = 0; j < lines.length; j++) {
            const line = lines[j]!
            if (line.includes(withSlash) || line.includes(withoutSlash)) {
              refs.push({
                file: entry.path,
                line: j + 1,
                context: line.trim().slice(0, 200),
              })
            }
          }
          return refs
        } catch {
          return []
        }
      }),
    )
    references.push(...results.flat())
  }

  return { references }
})
