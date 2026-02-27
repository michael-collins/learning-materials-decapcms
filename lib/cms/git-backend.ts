/**
 * Git Backend — GitHub API abstraction for CMS operations.
 *
 * Encapsulates all GitHub REST API interactions used by the CMS:
 * - Reading files from the repo
 * - Writing files (direct commit or branch + PR)
 * - Branch and PR management
 *
 * All methods require a valid GitHub access token.
 */

export interface GitBackendConfig {
  /** Repository owner */
  owner: string
  /** Repository name */
  repo: string
  /** Default branch (e.g., 'main') */
  branch: string
  /** GitHub access token */
  token: string
}

export interface GitCommitResult {
  mode: 'direct' | 'editorial'
  branch: string
  sha?: string
  prUrl?: string
  prNumber?: number
}

export interface GitFileInfo {
  sha: string
  content: string
  encoding: string
  path: string
  size: number
}

function makeHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }
}

/**
 * Create a git backend instance for a specific repo and token.
 */
export function createGitBackend(config: GitBackendConfig) {
  const { owner, repo, branch: mainBranch, token } = config
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`
  const headers = makeHeaders(token)

  /**
   * Get the latest commit SHA on a branch.
   */
  async function getBranchSha(branch: string = mainBranch): Promise<string> {
    const res = await $fetch<any>(`${apiBase}/git/ref/heads/${branch}`, { headers })
    return res.object.sha
  }

  /**
   * Get a file from the repository.
   * Returns null if the file doesn't exist.
   */
  async function getFile(path: string, branch: string = mainBranch): Promise<GitFileInfo | null> {
    try {
      const res = await $fetch<any>(`${apiBase}/contents/${path}?ref=${branch}`, { headers })
      return {
        sha: res.sha,
        content: res.content,
        encoding: res.encoding,
        path: res.path,
        size: res.size,
      }
    } catch (err: any) {
      if (err.statusCode === 404 || err.status === 404) return null
      throw err
    }
  }

  /**
   * Create a new branch from the latest commit on the default branch.
   */
  async function createBranch(branchName: string): Promise<string> {
    const sha = await getBranchSha()
    await $fetch(`${apiBase}/git/refs`, {
      method: 'POST',
      headers,
      body: { ref: `refs/heads/${branchName}`, sha },
    })
    return sha
  }

  /**
   * Write (create or update) a file in the repository.
   */
  async function writeFile(options: {
    path: string
    content: string // base64-encoded
    message: string
    branch?: string
    existingSha?: string
  }): Promise<{ sha: string }> {
    const res = await $fetch<any>(`${apiBase}/contents/${options.path}`, {
      method: 'PUT',
      headers,
      body: {
        message: options.message,
        content: options.content,
        branch: options.branch || mainBranch,
        ...(options.existingSha ? { sha: options.existingSha } : {}),
      },
    })
    return { sha: res.content?.sha }
  }

  /**
   * Delete a file from the repository.
   */
  async function deleteFile(options: {
    path: string
    message: string
    sha: string
    branch?: string
  }): Promise<void> {
    await $fetch(`${apiBase}/contents/${options.path}`, {
      method: 'DELETE',
      headers,
      body: {
        message: options.message,
        sha: options.sha,
        branch: options.branch || mainBranch,
      },
    })
  }

  /**
   * Create a Pull Request.
   */
  async function createPullRequest(options: {
    title: string
    head: string
    base?: string
    body?: string
    labels?: string[]
  }): Promise<{ url: string; number: number }> {
    const res = await $fetch<any>(`${apiBase}/pulls`, {
      method: 'POST',
      headers,
      body: {
        title: options.title,
        head: options.head,
        base: options.base || mainBranch,
        body: options.body || '',
      },
    })

    // Add labels if provided
    if (options.labels?.length && res.number) {
      try {
        await $fetch(`${apiBase}/issues/${res.number}/labels`, {
          method: 'POST',
          headers,
          body: { labels: options.labels },
        })
      } catch {
        // Labels are non-critical, don't fail the PR creation
      }
    }

    return {
      url: res.html_url,
      number: res.number,
    }
  }

  /**
   * Commit a file directly to the default branch.
   */
  async function commitDirect(options: {
    path: string
    content: string // base64-encoded
    message: string
    isNew: boolean
  }): Promise<GitCommitResult> {
    // Get existing file SHA if editing
    let existingSha: string | undefined
    if (!options.isNew) {
      const existing = await getFile(options.path)
      existingSha = existing?.sha
    }

    const result = await writeFile({
      path: options.path,
      content: options.content,
      message: options.message,
      existingSha,
    })

    return {
      mode: 'direct',
      branch: mainBranch,
      sha: result.sha,
    }
  }

  /**
   * Create a branch, commit a file, and open a PR (editorial workflow).
   */
  async function commitEditorial(options: {
    path: string
    content: string // base64-encoded
    message: string
    branchName: string
    prTitle: string
    prBody?: string
    isNew: boolean
    labels?: string[]
  }): Promise<GitCommitResult> {
    // 1. Create branch
    await createBranch(options.branchName)

    // 2. Get existing file SHA if editing
    let existingSha: string | undefined
    if (!options.isNew) {
      const existing = await getFile(options.path)
      existingSha = existing?.sha
    }

    // 3. Commit file to the branch
    await writeFile({
      path: options.path,
      content: options.content,
      message: options.message,
      branch: options.branchName,
      existingSha,
    })

    // 4. Create PR
    const pr = await createPullRequest({
      title: options.prTitle,
      head: options.branchName,
      body: options.prBody,
      labels: options.labels,
    })

    return {
      mode: 'editorial',
      branch: options.branchName,
      prUrl: pr.url,
      prNumber: pr.number,
    }
  }

  /**
   * Upload a binary file (e.g., media) via the Contents API.
   * Creates the file as a base64-encoded commit.
   */
  async function uploadFile(options: {
    path: string
    content: Buffer | Uint8Array
    message: string
    branch?: string
  }): Promise<{ sha: string; path: string }> {
    const base64 = Buffer.from(options.content).toString('base64')

    // Check if file already exists
    const existing = await getFile(options.path, options.branch)

    const result = await writeFile({
      path: options.path,
      content: base64,
      message: options.message,
      branch: options.branch,
      existingSha: existing?.sha,
    })

    return { sha: result.sha, path: options.path }
  }

  /**
   * List files in a directory using the GitHub Contents API.
   * Returns name, path, sha, and size for each file entry.
   */
  async function listDirectory(dirPath: string, branch: string = mainBranch): Promise<Array<{
    name: string
    path: string
    sha: string
    size: number
    type: 'file' | 'dir'
  }>> {
    try {
      const res = await $fetch<any[]>(`${apiBase}/contents/${dirPath}?ref=${branch}`, { headers })
      return res.map((entry: any) => ({
        name: entry.name,
        path: entry.path,
        sha: entry.sha,
        size: entry.size,
        type: entry.type as 'file' | 'dir',
      }))
    } catch (err: any) {
      if (err.statusCode === 404 || err.status === 404) return []
      throw err
    }
  }

  /**
   * Commit multiple files in a single atomic commit using the Git Data API.
   *
   * Uses the tree/commit API to batch all changes into one commit:
   * 1. Get the latest commit SHA and its tree
   * 2. Create blobs for each file
   * 3. Create a new tree with all changes
   * 4. Create a commit
   * 5. Update the branch ref
   */
  async function commitMultiple(options: {
    files: Array<{ path: string; content: string /* base64-encoded */ }>
    message: string
    branch?: string
  }): Promise<GitCommitResult> {
    const targetBranch = options.branch || mainBranch

    // 1. Get latest commit SHA on the target branch
    const latestCommitSha = await getBranchSha(targetBranch)

    // 2. Get the tree SHA from the latest commit
    const commitData = await $fetch<any>(`${apiBase}/git/commits/${latestCommitSha}`, { headers })
    const baseTreeSha = commitData.tree.sha

    // 3. Create blobs for each file
    const treeEntries = await Promise.all(
      options.files.map(async (file) => {
        const blobRes = await $fetch<any>(`${apiBase}/git/blobs`, {
          method: 'POST',
          headers,
          body: {
            content: file.content,
            encoding: 'base64',
          },
        })
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blobRes.sha,
        }
      }),
    )

    // 4. Create a new tree
    const treeRes = await $fetch<any>(`${apiBase}/git/trees`, {
      method: 'POST',
      headers,
      body: {
        base_tree: baseTreeSha,
        tree: treeEntries,
      },
    })

    // 5. Create a commit
    const newCommitRes = await $fetch<any>(`${apiBase}/git/commits`, {
      method: 'POST',
      headers,
      body: {
        message: options.message,
        tree: treeRes.sha,
        parents: [latestCommitSha],
      },
    })

    // 6. Update the branch ref
    await $fetch(`${apiBase}/git/refs/heads/${targetBranch}`, {
      method: 'PATCH',
      headers,
      body: {
        sha: newCommitRes.sha,
      },
    })

    return {
      mode: 'direct',
      branch: targetBranch,
      sha: newCommitRes.sha,
    }
  }

  return {
    getBranchSha,
    getFile,
    createBranch,
    writeFile,
    deleteFile,
    createPullRequest,
    commitDirect,
    commitEditorial,
    uploadFile,
    listDirectory,
    commitMultiple,
  }
}

/**
 * Helper: parse an 'owner/repo' string into parts.
 */
export function parseRepo(repoStr: string): { owner: string; repo: string } {
  const [owner, repo] = repoStr.split('/')
  if (!owner || !repo) {
    throw new Error(`Invalid repo format: "${repoStr}". Expected "owner/repo".`)
  }
  return { owner, repo }
}
