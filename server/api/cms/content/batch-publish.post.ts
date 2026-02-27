/**
 * POST /api/cms/content/batch-publish
 *
 * Publish multiple files to GitHub in a single atomic commit.
 * Uses the Git Data API (trees + commits) so all changes appear
 * as one commit rather than N individual ones.
 *
 * Body:
 * - files: Array<{ collection: string, slug: string }>
 * - message?: string — custom commit message
 * - publishMode?: 'direct' | 'draft'
 * - token?: string — PAT (optional, falls back to OAuth cookie)
 *
 * Response:
 * - mode: 'direct' | 'editorial'
 * - branch: string
 * - sha?: string
 * - prUrl?: string
 * - prNumber?: number
 * - fileCount: number
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { findCollection, getPathPattern } from '~/lib/cms/config-parser'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { createLocalBackend } from '~/lib/cms/local-backend'
import { getCmsConfig } from '~/server/utils/config-parser-server'
import { extractAuthToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const {
    files,
    message: commitMessage,
    publishMode,
    token: bodyToken,
  } = body

  if (!files?.length) {
    throw createError({
      statusCode: 400,
      message: 'No files specified for batch publish',
    })
  }

  const token = extractAuthToken(event, bodyToken)
  const config = await getCmsConfig()
  const { owner, repo } = parseRepo(config.backend.repo)
  const mainBranch = config.backend.branch

  const git = createGitBackend({ owner, repo, branch: mainBranch, token })

  // Check if local content files are available
  const firstCollection = findCollection(config, files[0]?.collection)
  const hasLocalFiles = firstCollection?.folder
    ? existsSync(resolve(process.cwd(), firstCollection.folder))
    : false

  if (!hasLocalFiles) {
    throw createError({
      statusCode: 400,
      message: 'Batch publish is not available in production. Content is saved directly to GitHub via the editor.',
    })
  }

  const local = createLocalBackend({ rootDir: process.cwd() })

  // Resolve file paths and read content
  const filesToCommit: Array<{ path: string; content: string }> = []
  const collectionSlugs: string[] = []

  for (const { collection: collectionName, slug } of files) {
    const collection = findCollection(config, collectionName)
    if (!collection?.folder) {
      throw createError({
        statusCode: 404,
        message: `Collection "${collectionName}" not found`,
      })
    }

    // Build the file path
    const pathPattern = getPathPattern(collection)
    const ext = collection.extension || 'md'
    let relativePath: string

    if (pathPattern) {
      relativePath = `${collection.folder}/${pathPattern.replace('{{slug}}', slug)}.${ext}`
    } else {
      relativePath = `${collection.folder}/${slug}.${ext}`
    }

    // Read local content
    const content = local.readFile(relativePath)
    if (content === null) {
      throw createError({
        statusCode: 404,
        message: `Local file not found: ${relativePath}`,
      })
    }

    const encoded = Buffer.from(content).toString('base64')
    filesToCommit.push({ path: relativePath, content: encoded })
    collectionSlugs.push(`${collectionName}/${slug}`)
  }

  const useEditorial = publishMode === 'direct'
    ? false
    : publishMode === 'draft'
      ? true
      : config.publish_mode === 'editorial_workflow'

  // Build commit message
  const defaultMessage = filesToCommit.length === 1
    ? `feat: update ${collectionSlugs[0]}`
    : `feat: update ${filesToCommit.length} files\n\n${collectionSlugs.map(s => `- ${s}`).join('\n')}`
  const message = commitMessage || defaultMessage

  try {
    if (useEditorial) {
      // Editorial: create branch → commit all files → open PR
      const branchName = `cms/batch-${Date.now()}`
      await git.createBranch(branchName)

      await git.commitMultiple({
        files: filesToCommit,
        message,
        branch: branchName,
      })

      const pr = await git.createPullRequest({
        title: `CMS: Update ${filesToCommit.length} files`,
        head: branchName,
        body: `Batch publish of ${filesToCommit.length} files:\n\n${collectionSlugs.map(s => `- \`${s}\``).join('\n')}`,
        labels: ['cms', 'batch'],
      })

      return {
        mode: 'editorial',
        branch: branchName,
        prUrl: pr.url,
        prNumber: pr.number,
        fileCount: filesToCommit.length,
      }
    } else {
      // Direct: commit all files to main in one commit
      const result = await git.commitMultiple({
        files: filesToCommit,
        message,
      })

      return {
        mode: 'direct',
        branch: result.branch,
        sha: result.sha,
        fileCount: filesToCommit.length,
      }
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      message: `Batch publish failed: ${err.message || 'Unknown error'}`,
    })
  }
})
