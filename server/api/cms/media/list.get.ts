/**
 * Media list API endpoint.
 *
 * Lists all files in a directory under public/ (defaults to public/uploads).
 * Returns file metadata: name, path, size, type, modified date.
 *
 * Query params:
 *  - folder: subdirectory within public/ (default: 'uploads')
 *  - type: filter by file type ('image' | 'document' | '3d' | 'video' | 'all')
 *  - search: filename search query
 *  - recursive: if 'true', search recursively in all subfolders
 *
 * In dev mode:  reads from local filesystem.
 * In production: uses GitHub Git Trees API to list files from the repo.
 */
import { readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, join, extname, relative, basename, posix } from 'node:path'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { extractAuthToken } from '~/server/utils/auth'
import { getCmsConfig } from '~/server/utils/config-parser-server'

interface MediaFile {
  name: string
  path: string     // public URL path
  size: number
  type: string     // 'image' | 'document' | '3d' | 'video' | 'audio' | 'other'
  ext: string
  modified: string // ISO date
  contentType: string
}

const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.ico', '.bmp', '.tiff'])
const videoExts = new Set(['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'])
const audioExts = new Set(['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg'])
const threeDExts = new Set(['.gltf', '.glb', '.obj', '.fbx', '.stl', '.3ds', '.usdz'])
const docExts = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.json', '.xml', '.md'])

function getFileType(ext: string): string {
  const e = ext.toLowerCase()
  if (imageExts.has(e)) return 'image'
  if (videoExts.has(e)) return 'video'
  if (audioExts.has(e)) return 'audio'
  if (threeDExts.has(e)) return '3d'
  if (docExts.has(e)) return 'document'
  return 'other'
}

function getMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.avif': 'image/avif', '.ico': 'image/x-icon',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac',
    '.pdf': 'application/pdf', '.json': 'application/json',
    '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary',
    '.obj': 'model/obj', '.stl': 'model/stl',
  }
  return mimeMap[ext.toLowerCase()] || 'application/octet-stream'
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const folder = (query.folder as string) || 'uploads'
  const typeFilter = (query.type as string) || 'all'
  const searchQuery = ((query.search as string) || '').toLowerCase()
  const recursive = query.recursive === 'true'

  // Security: prevent traversal outside public/
  const normalizedFolder = folder.replace(/\.\./g, '').replace(/^\//, '')

  // ── Production: list from GitHub via Git Trees API ──
  const hasLocalFiles = existsSync(resolve(process.cwd(), 'content'))
  if (!hasLocalFiles) {
    const token = extractAuthToken(event)
    const config = await getCmsConfig()
    const backend = config.backend || {}
    const { owner, repo } = parseRepo(backend.repo || '')
    const branch = backend.branch || 'main'

    const git = createGitBackend({ owner, repo, branch, token })

    // The repo stores media at public/<folder> (e.g. public/uploads)
    const repoPrefix = `public/${normalizedFolder}`

    const treeEntries = await git.listTree(repoPrefix, branch)

    const files: MediaFile[] = []
    const foldersSet = new Set<string>()

    for (const entry of treeEntries) {
      // entry.path is the full repo path, e.g. "public/uploads/images/photo.jpg"
      // Derive the relative path within the target folder
      const relativeToFolder = entry.path.slice(repoPrefix.length + 1) // "images/photo.jpg"
      const segments = relativeToFolder.split('/')
      const fileName = segments[segments.length - 1]

      // Skip hidden files
      if (fileName.startsWith('.')) continue

      // If the file is in a subfolder
      if (segments.length > 1) {
        // Track immediate child folders
        foldersSet.add(segments[0])

        // Only include files in subfolders if recursive mode
        if (!recursive) continue
      }

      const ext = posix.extname(fileName)
      const fileType = getFileType(ext)

      // Apply type filter
      if (typeFilter !== 'all' && fileType !== typeFilter) continue

      // Apply search filter
      if (searchQuery && !fileName.toLowerCase().includes(searchQuery)) continue

      // Public URL: strip "public" prefix → "/uploads/images/photo.jpg"
      const publicPath = '/' + entry.path.replace(/^public\//, '')

      files.push({
        name: fileName,
        path: publicPath,
        size: entry.size,
        type: fileType,
        ext,
        modified: new Date().toISOString(), // Git Trees API doesn't provide dates
        contentType: getMimeType(ext),
      })
    }

    // Sort by name since we don't have modification dates from Git Trees
    files.sort((a, b) => a.name.localeCompare(b.name))

    return {
      files,
      folders: Array.from(foldersSet).sort(),
      folder: normalizedFolder,
      total: files.length,
    }
  }

  // ── Dev mode: read from local filesystem ──
  const targetDir = resolve(process.cwd(), 'public', normalizedFolder)

  if (!existsSync(targetDir)) {
    return { files: [], folders: [], folder: normalizedFolder, total: 0 }
  }

  const files: MediaFile[] = []
  const folders: string[] = []
  const publicRoot = resolve(process.cwd(), 'public')

  function scanDir(dir: string, isRoot: boolean) {
    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue

      if (entry.isDirectory()) {
        if (isRoot) folders.push(entry.name)
        if (recursive) scanDir(join(dir, entry.name), false)
        continue
      }

      if (!entry.isFile()) continue

      const ext = extname(entry.name)
      const fileType = getFileType(ext)

      // Apply type filter
      if (typeFilter !== 'all' && fileType !== typeFilter) continue

      // Apply search filter
      if (searchQuery && !entry.name.toLowerCase().includes(searchQuery)) continue

      const fullPath = join(dir, entry.name)
      const stats = statSync(fullPath)
      const relativePath = '/' + relative(publicRoot, fullPath).replace(/\\/g, '/')

      files.push({
        name: entry.name,
        path: relativePath,
        size: stats.size,
        type: fileType,
        ext,
        modified: stats.mtime.toISOString(),
        contentType: getMimeType(ext),
      })
    }
  }

  scanDir(targetDir, true)

  // Sort by modified date (newest first)
  files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())

  return {
    files,
    folders,
    folder: normalizedFolder,
    total: files.length,
  }
})
