/**
 * POST /api/cms/content/discard
 *
 * Discard changes for one or more files by restoring them to their
 * committed/remote state.
 *
 * **Development (local git repo available):**
 * - modified/deleted → `git checkout HEAD -- <path>`
 * - added (untracked) → delete from disk
 *
 * **Production / Netlify (no local files):**
 * Returns an error — discard is a local-only operation.
 * (In production, the batch-sync-check compares deploy vs HEAD;
 *  there's no working tree to discard from.)
 *
 * Body:
 * - files: Array<{ path: string, status: 'modified' | 'added' | 'deleted' }>
 *
 * Response:
 * - discarded: number — count of files discarded
 * - errors: Array<{ path: string, message: string }> — any failures
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { files } = body

  if (!files?.length) {
    throw createError({
      statusCode: 400,
      message: 'No files specified for discard',
    })
  }

  // Only works locally — check for working tree
  const hasLocalFiles = existsSync(join(process.cwd(), 'content'))
  if (!hasLocalFiles) {
    throw createError({
      statusCode: 400,
      message: 'Discard is only available in local development mode.',
    })
  }

  // Dynamically import node:child_process and node:fs so the module
  // itself can still be loaded in serverless environments.
  const { execSync } = await import('node:child_process')
  const { unlinkSync, readdirSync, rmdirSync } = await import('node:fs')
  const { resolve, dirname } = await import('node:path')

  const cwd = process.cwd()
  const errors: Array<{ path: string; message: string }> = []
  let discarded = 0

  for (const file of files) {
    const { path: filePath, status } = file
    try {
      // Safety: ensure the path is relative and doesn't escape the project
      if (filePath.startsWith('/') || filePath.includes('..')) {
        errors.push({ path: filePath, message: 'Invalid file path' })
        continue
      }

      if (status === 'added') {
        // File is untracked — delete it from disk
        const fullPath = resolve(cwd, filePath)
        if (existsSync(fullPath)) {
          unlinkSync(fullPath)
          // Clean up empty parent directories
          try {
            let dir = dirname(fullPath)
            while (dir !== cwd && dir.length > cwd.length) {
              const entries = readdirSync(dir)
              if (entries.length === 0) {
                rmdirSync(dir)
                dir = dirname(dir)
              } else {
                break
              }
            }
          } catch { /* ignore cleanup errors */ }
        }
        discarded++
      } else if (status === 'modified' || status === 'deleted') {
        // Restore from HEAD
        execSync(`git checkout HEAD -- "${filePath}"`, { cwd, encoding: 'utf-8' })
        discarded++
      } else {
        errors.push({ path: filePath, message: `Unknown status: ${status}` })
      }
    } catch (err: any) {
      errors.push({ path: filePath, message: err.message || 'Failed to discard' })
    }
  }

  return {
    discarded,
    errors,
  }
})
