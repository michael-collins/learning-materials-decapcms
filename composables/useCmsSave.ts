/**
 * Composable for saving CMS content.
 *
 * Handles the full save flow:
 * - In dev mode (local_backend): saves directly to filesystem
 * - In production: saves via GitHub API (branch + PR in editorial workflow)
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
  const error = ref<string | null>(null)
  const lastResult = ref<SaveResult | null>(null)

  const isLocalBackend = computed(() => {
    // In dev mode, use local backend if config says so
    return import.meta.dev && (config.value?.localBackend ?? false)
  })

  /**
   * Save content (create or update)
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
        const token = getToken()
        if (!token) {
          throw new Error('Not authenticated. Please log in first.')
        }

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

        result = {
          success: true,
          mode: res.mode,
          collection: options.collection,
          slug: options.slug,
          branch: res.branch,
          prUrl: res.prUrl,
          prNumber: res.prNumber,
        }
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
    loadRaw,
    saving: readonly(saving),
    error: readonly(error),
    lastResult: readonly(lastResult),
    isLocalBackend,
  }
}
