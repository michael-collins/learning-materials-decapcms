/**
 * POST /api/cms/content/save
 *
 * Save content to GitHub via the GitHub API.
 *
 * In editorial workflow mode:
 * - Default: creates branch + commit + PR (draft)
 * - publishMode: 'direct' commits straight to main (bypasses editorial)
 *
 * Body:
 * - collection: collection name
 * - slug: content item slug
 * - frontmatter: object of frontmatter fields
 * - body: markdown body content
 * - isNew: boolean
 * - token: GitHub PAT
 * - message: optional commit message
 * - publishMode: 'draft' | 'direct' (default: uses config publish_mode)
 */
import matter from 'gray-matter'
import {
  parseDecapConfigFromFile,
  findCollection,
  getPathPattern,
} from '~/lib/cms/config-parser'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const {
    collection: collectionName,
    slug,
    frontmatter,
    body: content,
    isNew,
    token,
    message: commitMessage,
    publishMode,
  } = body

  if (!collectionName || !slug || !token) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: collection, slug, token',
    })
  }

  const config = parseDecapConfigFromFile()
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

  if (pathPattern) {
    const resolvedPath = pathPattern.replace('{{slug}}', slug)
    repoFilePath = `${collection.folder}/${resolvedPath}.${ext}`
  } else {
    repoFilePath = `${collection.folder}/${slug}.${ext}`
  }

  // Build file content
  const fileContent = matter.stringify(content || '', frontmatter || {})
  const encodedContent = Buffer.from(fileContent).toString('base64')

  const { repo, branch: mainBranch } = config.backend
  const [owner, repoName] = repo.split('/')
  const useEditorialWorkflow = publishMode === 'direct'
    ? false
    : publishMode === 'draft'
      ? true
      : config.publish_mode === 'editorial_workflow'

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }

  const apiBase = `https://api.github.com/repos/${owner}/${repoName}`

  try {
    if (useEditorialWorkflow) {
      // ─── Editorial Workflow: branch → commit → PR ───

      // 1. Get the latest commit SHA on main
      const refRes = await $fetch<any>(`${apiBase}/git/ref/heads/${mainBranch}`, { headers })
      const mainSha = refRes.object.sha

      // 2. Create a new branch
      const branchName = `cms/${collectionName}/${slug}-${Date.now()}`
      await $fetch(`${apiBase}/git/refs`, {
        method: 'POST',
        headers,
        body: { ref: `refs/heads/${branchName}`, sha: mainSha },
      })

      // 3. Get existing file SHA (if editing)
      let existingFileSha: string | undefined
      if (!isNew) {
        try {
          const fileRes = await $fetch<any>(
            `${apiBase}/contents/${repoFilePath}?ref=${mainBranch}`,
            { headers }
          )
          existingFileSha = fileRes.sha
        } catch {
          // File doesn't exist yet, that's ok
        }
      }

      // 4. Commit the file to the branch
      const defaultMessage = isNew
        ? `feat: create ${collectionName}/${slug}`
        : `feat: update ${collectionName}/${slug}`

      await $fetch(`${apiBase}/contents/${repoFilePath}`, {
        method: 'PUT',
        headers,
        body: {
          message: commitMessage || defaultMessage,
          content: encodedContent,
          branch: branchName,
          ...(existingFileSha ? { sha: existingFileSha } : {}),
        },
      })

      // 5. Create a Pull Request
      const prTitle = isNew
        ? `Create ${collection.label}: ${frontmatter?.title || slug}`
        : `Update ${collection.label}: ${frontmatter?.title || slug}`

      const prRes = await $fetch<any>(`${apiBase}/pulls`, {
        method: 'POST',
        headers,
        body: {
          title: prTitle,
          head: branchName,
          base: mainBranch,
          body: `Submitted via Custom CMS\n\n**Collection:** ${collection.label}\n**Slug:** ${slug}\n**Action:** ${isNew ? 'Created' : 'Updated'}`,
        },
      })

      return {
        success: true,
        mode: 'editorial',
        collection: collectionName,
        slug,
        branch: branchName,
        prUrl: prRes.html_url,
        prNumber: prRes.number,
      }
    } else {
      // ─── Direct Commit to main ───

      // Get existing file SHA (if editing)
      let existingFileSha: string | undefined
      if (!isNew) {
        try {
          const fileRes = await $fetch<any>(
            `${apiBase}/contents/${repoFilePath}?ref=${mainBranch}`,
            { headers }
          )
          existingFileSha = fileRes.sha
        } catch {
          // File doesn't exist
        }
      }

      const defaultMessage = isNew
        ? `feat: create ${collectionName}/${slug}`
        : `feat: update ${collectionName}/${slug}`

      await $fetch(`${apiBase}/contents/${repoFilePath}`, {
        method: 'PUT',
        headers,
        body: {
          message: commitMessage || defaultMessage,
          content: encodedContent,
          branch: mainBranch,
          ...(existingFileSha ? { sha: existingFileSha } : {}),
        },
      })

      return {
        success: true,
        mode: 'direct',
        collection: collectionName,
        slug,
        branch: mainBranch,
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
