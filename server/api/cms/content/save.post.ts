/**
 * POST /api/cms/content/save
 *
 * Save content to GitHub via the GitHub API.
 *
 * In editorial workflow mode:
 * - Default: creates branch + commit + PR (draft)
 * - publishMode: 'direct' commits straight to main (bypasses editorial)
 *
 * Auth: Token is resolved from either the OAuth session cookie
 * or the `token` field in the request body (PAT mode).
 *
 * Body:
 * - collection: collection name
 * - slug: content item slug
 * - frontmatter: object of frontmatter fields
 * - body: markdown body content
 * - isNew: boolean
 * - token: GitHub PAT (optional — used as fallback if no OAuth session)
 * - message: optional commit message
 * - publishMode: 'draft' | 'direct' (default: uses config publish_mode)
 */
import matter from 'gray-matter'
import {
  findCollection,
  getPathPattern,
} from '~/lib/cms/config-parser'
import { createGitBackend, parseRepo } from '~/lib/cms/git-backend'
import { getCmsConfig } from '~/server/utils/config-parser-server'
import { extractAuthToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const {
    collection: collectionName,
    slug,
    frontmatter,
    body: content,
    isNew,
    token: bodyToken,
    message: commitMessage,
    publishMode,
    version,
  } = body

  if (!collectionName || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: collection, slug',
    })
  }

  // Resolve token from OAuth session cookie or request body
  const token = extractAuthToken(event, bodyToken)

  const config = await getCmsConfig()
  const collection = findCollection(config, collectionName)

  if (!collection?.folder) {
    throw createError({
      statusCode: 404,
      message: `Folder collection "${collectionName}" not found`,
    })
  }

  // Build the file path in the repo
  const pathPattern = getPathPattern(collection)
  const ext = collection.extension || 'md'
  let repoFilePath: string

  if (version) {
    // Version-specific file: content/{collection}/{slug}/v/{version}.md
    repoFilePath = `${collection.folder}/${slug}/v/${version}.${ext}`
  } else if (pathPattern) {
    const resolvedPath = pathPattern.replace('{{slug}}', slug)
    repoFilePath = `${collection.folder}/${resolvedPath}.${ext}`
  } else {
    repoFilePath = `${collection.folder}/${slug}.${ext}`
  }

  // Build file content
  const fileContent = matter.stringify(content || '', frontmatter || {})
  const encodedContent = Buffer.from(fileContent).toString('base64')

  const { owner, repo } = parseRepo(config.backend.repo)
  const mainBranch = config.backend.branch

  const useEditorialWorkflow = publishMode === 'direct'
    ? false
    : publishMode === 'draft'
      ? true
      : config.publish_mode === 'editorial_workflow'

  // Create git backend instance
  const git = createGitBackend({ owner, repo, branch: mainBranch, token })

  try {
    if (useEditorialWorkflow) {
      // ─── Editorial Workflow: branch → commit → PR ───
      const branchName = `cms/${collectionName}/${slug}-${Date.now()}`
      const defaultMessage = isNew
        ? `feat: create ${collectionName}/${slug}`
        : `feat: update ${collectionName}/${slug}`

      const prTitle = isNew
        ? `Create ${collection.label}: ${frontmatter?.title || slug}`
        : `Update ${collection.label}: ${frontmatter?.title || slug}`

      const result = await git.commitEditorial({
        path: repoFilePath,
        content: encodedContent,
        message: commitMessage || defaultMessage,
        branchName,
        prTitle,
        prBody: `Submitted via Custom CMS\n\n**Collection:** ${collection.label}\n**Slug:** ${slug}\n**Action:** ${isNew ? 'Created' : 'Updated'}`,
        isNew: isNew ?? false,
        labels: ['cms', 'draft', collectionName],
      })

      return {
        success: true,
        mode: result.mode,
        collection: collectionName,
        slug,
        branch: result.branch,
        prUrl: result.prUrl,
        prNumber: result.prNumber,
      }
    } else {
      // ─── Direct Commit to main ───
      const defaultMessage = isNew
        ? `feat: create ${collectionName}/${slug}`
        : `feat: update ${collectionName}/${slug}`

      const result = await git.commitDirect({
        path: repoFilePath,
        content: encodedContent,
        message: commitMessage || defaultMessage,
        isNew: isNew ?? false,
      })

      return {
        success: true,
        mode: result.mode,
        collection: collectionName,
        slug,
        branch: result.branch,
      }
    }
  } catch (err: any) {
    const status = err.statusCode || err.status || 500
    const msg = err.data?.message || err.message || 'GitHub API error'

    throw createError({
      statusCode: status,
      message: `Failed to save to GitHub: ${msg}`,
    })
  }
})
