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
 */
import { readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, join, extname } from 'node:path'

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

  const targetDir = resolve(process.cwd(), 'public', folder)

  if (!existsSync(targetDir)) {
    return { files: [], folder, total: 0 }
  }

  const entries = readdirSync(targetDir, { withFileTypes: true })
  const files: MediaFile[] = []
  const folders: string[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue

    if (entry.isDirectory()) {
      folders.push(entry.name)
      continue
    }

    if (!entry.isFile()) continue

    const ext = extname(entry.name)
    const fileType = getFileType(ext)

    // Apply type filter
    if (typeFilter !== 'all' && fileType !== typeFilter) continue

    // Apply search filter
    if (searchQuery && !entry.name.toLowerCase().includes(searchQuery)) continue

    const fullPath = join(targetDir, entry.name)
    const stats = statSync(fullPath)

    files.push({
      name: entry.name,
      path: `/${folder}/${entry.name}`,
      size: stats.size,
      type: fileType,
      ext,
      modified: stats.mtime.toISOString(),
      contentType: getMimeType(ext),
    })
  }

  // Sort by modified date (newest first)
  files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())

  return {
    files,
    folders,
    folder,
    total: files.length,
  }
})
