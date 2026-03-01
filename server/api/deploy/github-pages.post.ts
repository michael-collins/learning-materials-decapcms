/**
 * POST /api/deploy/github-pages
 *
 * Creates a new GitHub repository under the authenticated user's account,
 * pushes the provided book HTML files via the Git tree API,
 * and enables GitHub Pages on the default branch.
 *
 * Body: { repoName: string, description?: string, files: Record<string, string>, token?: string }
 * Returns: { repoUrl: string, pagesUrl: string, login: string, actionsUrl: string }
 */
import { extractAuthToken } from '~/server/utils/auth'

/** Helper to call GitHub API */
async function ghFetch<T = any>(
  token: string,
  path: string,
  opts: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: any } = {}
): Promise<T> {
  return await ($fetch as any)(`https://api.github.com${path}`, {
    method: opts.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    ...(opts.body ? { body: opts.body } : {}),
  }) as T
}

/** Sleep helper */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    repoName: string
    description?: string
    files: Record<string, string>
    binaryFiles?: Record<string, string> // path → base64-encoded content
    token?: string
  }>(event)

  if (!body?.repoName) {
    throw createError({ statusCode: 400, message: 'repoName is required' })
  }

  if (!body?.files || Object.keys(body.files).length === 0) {
    throw createError({ statusCode: 400, message: 'files map is required' })
  }

  // Validate repo name (GitHub rules: alphanumeric, hyphens, underscores, dots)
  if (!/^[\w.\-]+$/.test(body.repoName)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid repository name. Use letters, numbers, hyphens, underscores, or dots.',
    })
  }

  const token = extractAuthToken(event, body.token)

  // Get authenticated user's login
  const me = await ghFetch<{ login: string }>(token, '/user')
  const login = me.login
  const repoPath = `${login}/${body.repoName}`

  // 1. Create a new repository
  try {
    await ghFetch(token, '/user/repos', {
      method: 'POST',
      body: {
        name: body.repoName,
        description: body.description || 'Book deployed to GitHub Pages',
        auto_init: true, // Creates an initial commit so we have a branch to work with
        private: false,
        has_issues: false,
        has_wiki: false,
        has_projects: false,
      },
    })
  } catch (e: any) {
    const msg = e?.data?.message || e?.message || 'Unknown error'
    if (msg.includes('name already exists')) {
      throw createError({
        statusCode: 409,
        message: `A repository named "${body.repoName}" already exists on your account.`,
      })
    }
    throw createError({
      statusCode: 502,
      message: `Failed to create repository: ${msg}`,
    })
  }

  // 2. Wait for repo to be ready
  let defaultBranch = 'main'
  let ready = false
  for (let i = 0; i < 15; i++) {
    await sleep(1000)
    try {
      const repo = await ghFetch<{ default_branch: string }>(token, `/repos/${repoPath}`)
      defaultBranch = repo.default_branch || 'main'
      ready = true
      break
    } catch {
      // Not ready yet
    }
  }
  if (!ready) {
    throw createError({
      statusCode: 504,
      message: 'Repository creation is taking longer than expected. Check your GitHub account.',
    })
  }

  // 3. Get the latest commit SHA on default branch
  let latestCommitSha: string
  try {
    const ref = await ghFetch<{ object: { sha: string } }>(
      token,
      `/repos/${repoPath}/git/ref/heads/${defaultBranch}`
    )
    latestCommitSha = ref.object.sha
  } catch (e: any) {
    throw createError({
      statusCode: 502,
      message: 'Failed to get repository ref. The repo may still be initializing.',
    })
  }

  // 4. Create blobs for each file
  const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = []

  for (const [filePath, content] of Object.entries(body.files)) {
    const blob = await ghFetch<{ sha: string }>(token, `/repos/${repoPath}/git/blobs`, {
      method: 'POST',
      body: {
        content: Buffer.from(content).toString('base64'),
        encoding: 'base64',
      },
    })
    treeItems.push({
      path: filePath,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    })
  }

  // 4b. Create blobs for binary files (media uploads — already base64-encoded)
  if (body.binaryFiles) {
    for (const [filePath, base64Content] of Object.entries(body.binaryFiles)) {
      const blob = await ghFetch<{ sha: string }>(token, `/repos/${repoPath}/git/blobs`, {
        method: 'POST',
        body: {
          content: base64Content,
          encoding: 'base64',
        },
      })
      treeItems.push({
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      })
    }
  }

  // 5. Create a tree with all the files
  const tree = await ghFetch<{ sha: string }>(token, `/repos/${repoPath}/git/trees`, {
    method: 'POST',
    body: {
      base_tree: latestCommitSha, // Include the initial commit's tree (README)
      tree: treeItems,
    },
  })

  // 6. Create a commit
  const commit = await ghFetch<{ sha: string }>(token, `/repos/${repoPath}/git/commits`, {
    method: 'POST',
    body: {
      message: 'Deploy book to GitHub Pages',
      tree: tree.sha,
      parents: [latestCommitSha],
    },
  })

  // 7. Update the default branch ref to point to the new commit
  await ghFetch(token, `/repos/${repoPath}/git/refs/heads/${defaultBranch}`, {
    method: 'PATCH',
    body: {
      sha: commit.sha,
    },
  })

  // 8. Enable GitHub Pages on the default branch (root)
  try {
    await ghFetch(token, `/repos/${repoPath}/pages`, {
      method: 'POST',
      body: {
        source: {
          branch: defaultBranch,
          path: '/',
        },
      },
    })
  } catch (e: any) {
    // Pages might already be enabled, try updating
    if (e?.statusCode === 409 || e?.data?.message?.includes('already')) {
      try {
        await ghFetch(token, `/repos/${repoPath}/pages`, {
          method: 'PUT',
          body: {
            source: {
              branch: defaultBranch,
              path: '/',
            },
          },
        })
      } catch {
        // Non-fatal — user can enable Pages manually
      }
    }
  }

  const pagesUrl = `https://${login}.github.io/${body.repoName}/`
  const repoUrl = `https://github.com/${repoPath}`
  const actionsUrl = `${repoUrl}/actions`

  // 9. Set the homepage URL on the repo so it shows on the front page
  try {
    await ghFetch(token, `/repos/${repoPath}`, {
      method: 'PATCH',
      body: {
        homepage: pagesUrl,
      },
    })
  } catch {
    // Non-fatal — user can set it manually
  }

  return {
    repoUrl,
    pagesUrl,
    actionsUrl,
    login,
  }
})
