/**
 * Composable for managing CMS editorial drafts.
 *
 * Fetches open draft PRs from GitHub that were created by the CMS
 * (branches prefixed with cms/). Provides actions to publish (merge),
 * discard (close + delete branch), and view drafts.
 */
import { ref, readonly, computed } from 'vue'

export interface CmsDraft {
  id: number
  number: number
  title: string
  state: string         // 'open'
  draft: boolean        // GitHub draft PR flag
  createdAt: string
  updatedAt: string
  branch: string
  collection: string
  slug: string
  url: string
  user: {
    login: string
    avatarUrl: string
  }
  labels: string[]
  filesChanged: number
  mergeable: boolean | null
  reviewStatus: 'pending' | 'approved' | 'changes_requested' | 'none'
}

export function useCmsDrafts() {
  const { getToken, user } = useCmsAuth()
  const { config } = useCmsConfig()

  const drafts = ref<CmsDraft[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const actionLoading = ref<number | null>(null) // PR number being acted on

  const repo = computed(() => config.value?.backend?.repo || '')
  const mainBranch = computed(() => config.value?.backend?.branch || 'main')
  const apiBase = computed(() => {
    const [owner, repoName] = repo.value.split('/')
    return `https://api.github.com/repos/${owner}/${repoName}`
  })

  function getHeaders() {
    const token = getToken()
    if (!token) throw new Error('Not authenticated')
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    }
  }

  /**
   * Parse collection + slug from a CMS branch name.
   * Format: cms/{collection}/{slug}-{timestamp}
   */
  function parseBranch(branch: string): { collection: string; slug: string } {
    const match = branch.match(/^cms\/([^/]+)\/(.+?)(?:-[a-z0-9]+)?$/)
    if (match) {
      return { collection: match[1], slug: match[2] }
    }
    return { collection: 'unknown', slug: branch }
  }

  /**
   * Determine review status from PR reviews.
   */
  function getReviewStatus(reviews: any[]): CmsDraft['reviewStatus'] {
    if (!reviews || reviews.length === 0) return 'none'
    // Latest review wins
    const latest = reviews[reviews.length - 1]
    switch (latest.state) {
      case 'APPROVED': return 'approved'
      case 'CHANGES_REQUESTED': return 'changes_requested'
      default: return 'pending'
    }
  }

  /**
   * Fetch all open draft PRs created by the CMS.
   */
  async function fetchDrafts() {
    if (!repo.value) return

    loading.value = true
    error.value = null

    try {
      const headers = getHeaders()

      // Fetch open PRs — filter by cms/ prefix after
      const prs = await $fetch<any[]>(`${apiBase.value}/pulls`, {
        headers,
        params: {
          state: 'open',
          sort: 'updated',
          direction: 'desc',
          per_page: 50,
        },
      })

      // Filter PRs that come from cms/ branches
      const cmsPrs = prs.filter((pr: any) => pr.head?.ref?.startsWith('cms/'))

      drafts.value = cmsPrs.map((pr: any): CmsDraft => {
        const { collection, slug } = parseBranch(pr.head.ref)
        return {
          id: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.state,
          draft: pr.draft ?? false,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          branch: pr.head.ref,
          collection,
          slug,
          url: pr.html_url,
          user: {
            login: pr.user?.login || 'unknown',
            avatarUrl: pr.user?.avatar_url || '',
          },
          labels: (pr.labels || []).map((l: any) => l.name),
          filesChanged: pr.changed_files || 0,
          mergeable: pr.mergeable,
          reviewStatus: 'none', // Will be enriched if needed
        }
      })
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Failed to fetch drafts'
    } finally {
      loading.value = false
    }
  }

  /**
   * Publish a draft — merge the PR into main.
   */
  async function publishDraft(prNumber: number) {
    actionLoading.value = prNumber
    try {
      const headers = getHeaders()
      await $fetch(`${apiBase.value}/pulls/${prNumber}/merge`, {
        method: 'PUT',
        headers,
        body: {
          merge_method: 'squash',
        },
      })

      // Remove from local list
      drafts.value = drafts.value.filter((d) => d.number !== prNumber)
      return { success: true }
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Failed to merge PR'
      throw new Error(msg)
    } finally {
      actionLoading.value = null
    }
  }

  /**
   * Discard a draft — close the PR and delete the branch.
   */
  async function discardDraft(prNumber: number) {
    actionLoading.value = prNumber

    const draft = drafts.value.find((d) => d.number === prNumber)
    if (!draft) return

    try {
      const headers = getHeaders()

      // 1. Close the PR
      await $fetch(`${apiBase.value}/pulls/${prNumber}`, {
        method: 'PATCH',
        headers,
        body: { state: 'closed' },
      })

      // 2. Delete the branch
      try {
        await $fetch(`${apiBase.value}/git/refs/heads/${draft.branch}`, {
          method: 'DELETE',
          headers,
        })
      } catch {
        // Branch deletion failure is non-critical
        console.warn(`Could not delete branch ${draft.branch}`)
      }

      // Remove from local list
      drafts.value = drafts.value.filter((d) => d.number !== prNumber)
      return { success: true }
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Failed to discard draft'
      throw new Error(msg)
    } finally {
      actionLoading.value = null
    }
  }

  /**
   * Update an existing draft — commit new changes to the same PR branch.
   */
  async function updateDraft(prNumber: number, options: {
    filePath: string
    content: string
    message?: string
  }) {
    actionLoading.value = prNumber

    const draft = drafts.value.find((d) => d.number === prNumber)
    if (!draft) throw new Error('Draft not found')

    try {
      const headers = getHeaders()

      // Get existing file SHA on the branch
      let existingSha: string | undefined
      try {
        const fileRes = await $fetch<any>(
          `${apiBase.value}/contents/${options.filePath}?ref=${draft.branch}`,
          { headers }
        )
        existingSha = fileRes.sha
      } catch {
        // File doesn't exist yet
      }

      const encoded = btoa(unescape(encodeURIComponent(options.content)))

      await $fetch(`${apiBase.value}/contents/${options.filePath}`, {
        method: 'PUT',
        headers,
        body: {
          message: options.message || `Update ${draft.collection}/${draft.slug}`,
          content: encoded,
          branch: draft.branch,
          ...(existingSha ? { sha: existingSha } : {}),
        },
      })

      return { success: true }
    } catch (err: any) {
      throw new Error(err.data?.message || err.message || 'Failed to update draft')
    } finally {
      actionLoading.value = null
    }
  }

  return {
    drafts: readonly(drafts),
    loading: readonly(loading),
    error: readonly(error),
    actionLoading: readonly(actionLoading),
    fetchDrafts,
    publishDraft,
    discardDraft,
    updateDraft,
  }
}
