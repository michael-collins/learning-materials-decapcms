/**
 * Composable for saving CMS content.
 *
 * Handles the full save flow:
 * - In dev mode (local_backend): saves directly to filesystem
 * - In production: saves via GitHub API (branch + PR in editorial workflow)
 * - "Publish to GitHub" — always pushes to GitHub, even in local backend mode
 *
 * Provides loading/error/success states and result metadata (PR URL, etc.).
 */
import { ref, readonly } from 'vue'

interface SaveResult {
  success: boolean
  mode: 'local' | 'editorial' | 'direct'
  collection: string
  slug: string
  path?: string
  branch?: string
  prUrl?: string
  prNumber?: number
}

export function useCmsSave() {
  const { config } = useCmsConfig()
  const { getToken } = useCmsAuth()

  const saving = ref(false)
  const publishing = ref(false)
  const error = ref<string | null>(null)
  const lastResult = ref<SaveResult | null>(null)

  const isLocalBackend = computed(() => {
    // In dev mode, use local backend if config says so
    return import.meta.dev && (config.value?.localBackend ?? false)
  })

  /**
   * Save content (create or update).
   * Routes to local filesystem in dev mode, GitHub API in production.
   */
  async function save(options: {
    collection: string
    slug: string
    frontmatter: Record<string, any>
    body: string
    isNew?: boolean
    commitMessage?: string
    /** Override publish mode: 'draft' (branch+PR) or 'direct' (commit to main) */
    publishMode?: 'draft' | 'direct'
  }): Promise<SaveResult> {
    saving.value = true
    error.value = null
    lastResult.value = null

    try {
      let result: SaveResult

      if (isLocalBackend.value) {
        // ─── Local filesystem save ───
        const res = await $fetch<any>('/api/cms/content/save-local', {
          method: 'POST',
          body: {
            collection: options.collection,
            slug: options.slug,
            frontmatter: options.frontmatter,
            body: options.body,
            isNew: options.isNew ?? false,
          },
        })

        result = {
          success: true,
          mode: 'local',
          collection: options.collection,
          slug: options.slug,
          path: res.path,
        }
      } else {
        // ─── GitHub API save ───
        result = await _saveToGitHub(options)
      }

      lastResult.value = result
      return result
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Save failed'
      error.value = msg
      throw new Error(msg)
    } finally {
      saving.value = false
    }
  }

  /**
   * Publish content to GitHub — always uses the GitHub API,
   * even when running with local backend in dev mode.
   *
   * This lets developers save locally (fast iteration) and then
   * push to the repo when ready.
   */
  async function publishToGitHub(options: {
    collection: string
    slug: string
    frontmatter: Record<string, any>
    body: string
    isNew?: boolean
    commitMessage?: string
    publishMode?: 'draft' | 'direct'
  }): Promise<SaveResult> {
    publishing.value = true
    error.value = null

    try {
      const result = await _saveToGitHub(options)
      lastResult.value = result
      return result
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Publish to GitHub failed'
      error.value = msg
      throw new Error(msg)
    } finally {
      publishing.value = false
    }
  }

  /**
   * Internal: saves content via the GitHub API endpoint.
   */
  async function _saveToGitHub(options: {
    collection: string
    slug: string
    frontmatter: Record<string, any>
    body: string
    isNew?: boolean
    commitMessage?: string
    publishMode?: 'draft' | 'direct'
  }): Promise<SaveResult> {
    const token = getToken()
    // token may be null for OAuth (server reads from cookie)

    const res = await $fetch<any>('/api/cms/content/save', {
      method: 'POST',
      body: {
        collection: options.collection,
        slug: options.slug,
        frontmatter: options.frontmatter,
        body: options.body,
        isNew: options.isNew ?? false,
        token,
        message: options.commitMessage,
        publishMode: options.publishMode,
      },
    })

    return {
      success: true,
      mode: res.mode,
      collection: options.collection,
      slug: options.slug,
      branch: res.branch,
      prUrl: res.prUrl,
      prNumber: res.prNumber,
    }
  }

  /**
   * Load raw content for editing (reads from filesystem via API)
   */
  async function loadRaw(collection: string, slug: string) {
    try {
      const res = await $fetch<{ raw: string }>('/api/cms/content/read', {
        params: { collection, slug },
      })
      return res.raw
    } catch (err: any) {
      throw new Error(err.data?.message || err.message || 'Failed to load content')
    }
  }

  return {
    save,
    publishToGitHub,
    loadRaw,
    saving: readonly(saving),
    publishing: readonly(publishing),
    error: readonly(error),
    lastResult: readonly(lastResult),
    isLocalBackend,
  }
}
