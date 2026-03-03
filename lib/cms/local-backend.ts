/**
 * Local Backend — Filesystem abstraction for CMS operations.
 *
 * Provides the same logical operations as git-backend.ts but
 * operates on the local filesystem. Used in development mode
 * when `local_backend: true` is set in config.yml.
 *
 * All operations are synchronous filesystem calls — no network.
 */
import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  renameSync,
} from 'node:fs'
import { resolve, dirname, join, extname, relative } from 'node:path'

export interface LocalBackendConfig {
  /** Base directory for content (typically process.cwd()) */
  rootDir: string
}

export interface LocalWriteResult {
  path: string
  fullPath: string
}

/**
 * Create a local backend instance for filesystem operations.
 */
export function createLocalBackend(config: LocalBackendConfig) {
  const { rootDir } = config

  /**
   * Resolve a relative path to an absolute path within the project.
   */
  function resolvePath(relativePath: string): string {
    return resolve(rootDir, relativePath)
  }

  /**
   * Read a file from the filesystem.
   * Returns null if the file doesn't exist.
   */
  function readFile(relativePath: string): string | null {
    const fullPath = resolvePath(relativePath)
    if (!existsSync(fullPath)) return null
    return readFileSync(fullPath, 'utf-8')
  }

  /**
   * Read a binary file from the filesystem.
   * Returns null if the file doesn't exist.
   */
  function readBinaryFile(relativePath: string): Buffer | null {
    const fullPath = resolvePath(relativePath)
    if (!existsSync(fullPath)) return null
    return readFileSync(fullPath) as Buffer
  }

  /**
   * Write a file to the filesystem.
   * Creates directories as needed.
   */
  function writeFile(relativePath: string, content: string): LocalWriteResult {
    const fullPath = resolvePath(relativePath)
    const dir = dirname(fullPath)

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    writeFileSync(fullPath, content, 'utf-8')

    return { path: relativePath, fullPath }
  }

  /**
   * Write a binary file to the filesystem.
   * Creates directories as needed.
   */
  function writeBinaryFile(relativePath: string, content: Buffer | Uint8Array): LocalWriteResult {
    const fullPath = resolvePath(relativePath)
    const dir = dirname(fullPath)

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    writeFileSync(fullPath, content)

    return { path: relativePath, fullPath }
  }

  /**
   * Delete a file from the filesystem.
   * Returns true if the file was deleted, false if it didn't exist.
   */
  function deleteFile(relativePath: string): boolean {
    const fullPath = resolvePath(relativePath)
    if (!existsSync(fullPath)) return false
    unlinkSync(fullPath)
    return true
  }

  /**
   * Check if a file exists.
   */
  function fileExists(relativePath: string): boolean {
    return existsSync(resolvePath(relativePath))
  }

  /**
   * Move/rename a file.
   */
  function moveFile(fromPath: string, toPath: string): LocalWriteResult {
    const fullFrom = resolvePath(fromPath)
    const fullTo = resolvePath(toPath)
    const toDir = dirname(fullTo)

    if (!existsSync(fullFrom)) {
      throw new Error(`Source file not found: ${fullFrom}`)
    }

    if (!existsSync(toDir)) {
      mkdirSync(toDir, { recursive: true })
    }

    renameSync(fullFrom, fullTo)

    return { path: toPath, fullPath: fullTo }
  }

  /**
   * List files in a directory.
   */
  function listFiles(relativePath: string, options?: {
    recursive?: boolean
    extensions?: string[]
  }): Array<{ name: string; path: string; size: number; modified: Date; isDirectory: boolean }> {
    const fullPath = resolvePath(relativePath)
    if (!existsSync(fullPath)) return []

    const results: Array<{ name: string; path: string; size: number; modified: Date; isDirectory: boolean }> = []

    function scan(dir: string) {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        const entryPath = join(dir, entry.name)
        const relPath = relative(rootDir, entryPath)

        if (entry.isDirectory()) {
          results.push({
            name: entry.name,
            path: relPath,
            size: 0,
            modified: statSync(entryPath).mtime,
            isDirectory: true,
          })
          if (options?.recursive) scan(entryPath)
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase()
          if (options?.extensions && !options.extensions.includes(ext)) continue

          const stats = statSync(entryPath)
          results.push({
            name: entry.name,
            path: relPath,
            size: stats.size,
            modified: stats.mtime,
            isDirectory: false,
          })
        }
      }
    }

    scan(fullPath)
    return results
  }

  /**
   * Ensure a directory exists, creating it if necessary.
   */
  function ensureDir(relativePath: string): void {
    const fullPath = resolvePath(relativePath)
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true })
    }
  }

  return {
    resolvePath,
    readFile,
    readBinaryFile,
    writeFile,
    writeBinaryFile,
    deleteFile,
    fileExists,
    moveFile,
    listFiles,
    ensureDir,
  }
}
