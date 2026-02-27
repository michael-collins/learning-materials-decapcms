/**
 * Composable for batch publishing — scan for local changes across
 * collections and push them all to GitHub in a single commit.
 *
 * Provides:
 * - scanChanges() — detect which files differ from GitHub
 * - publishSelected() — push selected files in one atomic commit
 * - Reactive state for scanning, publishing, progress, and results
 */
import { ref, readonly, computed } from 'vue'

export interface ChangeEntry {
  collection: string
  slug: string
  path: string
  status: 'modified' | 'added' | 'deleted'
  title?: string
  selected: boolean
}

export interface BatchPublishResult {
  mode: 'direct' | 'editorial'
  branch: string
  sha?: string
  prUrl?: string
  prNumber?: number
  fileCount: number
}

export function useBatchPublish() {
  const { getToken } = useCmsAuth()

  const changes = ref<ChangeEntry[]>([])
  const scanning = ref(false)
  const publishing = ref(false)
  const scanError = ref<string | null>(null)
  const publishError = ref<string | null>(null)
  const lastResult = ref<BatchPublishResult | null>(null)

  const summary = computed(() => ({
    total: changes.value.length,
    modified: changes.value.filter(c => c.status === 'modified').length,
    added: changes.value.filter(c => c.status === 'added').length,
    deleted: changes.value.filter(c => c.status === 'deleted').length,
    selected: changes.value.filter(c => c.selected).length,
  }))

  const hasChanges = computed(() => changes.value.length > 0)
  const hasSelection = computed(() => changes.value.some(c => c.selected))

  /**
   * Scan collections for local changes vs GitHub.
   */
  async function scanChanges(collections?: string[]): Promise<void> {
    scanning.value = true
    scanError.value = null
    changes.value = []
    lastResult.value = null

    try {
      const token = getToken()
      const res = await $fetch<{
        changes: Array<{
          collection: string
          slug: string
          path: string
          status: 'modified' | 'added' | 'deleted'
          title?: string
        }>
        summary: { total: number; modified: number; added: number; deleted: number }
      }>('/api/cms/content/batch-sync-check', {
        method: 'POST',
        body: { collections, token },
      })

      changes.value = res.changes.map(c => ({
        ...c,
        selected: c.status !== 'deleted', // Pre-select modified + added
      }))
    } catch (err: any) {
      scanError.value = err.data?.message || err.message || 'Failed to scan for changes'
    } finally {
      scanning.value = false
    }
  }

  /**
   * Publish the selected files to GitHub in a single commit.
   */
  async function publishSelected(options?: {
    message?: string
    publishMode?: 'direct' | 'draft'
  }): Promise<BatchPublishResult | null> {
    const selected = changes.value.filter(c => c.selected && c.status !== 'deleted')

    if (selected.length === 0) {
      publishError.value = 'No files selected for publishing'
      return null
    }

    publishing.value = true
    publishError.value = null

    try {
      const token = getToken()
      const result = await $fetch<BatchPublishResult>('/api/cms/content/batch-publish', {
        method: 'POST',
        body: {
          files: selected.map(c => ({ collection: c.collection, slug: c.slug })),
          message: options?.message,
          publishMode: options?.publishMode,
          token,
        },
      })

      lastResult.value = result

      // Remove published files from the changes list
      const publishedPaths = new Set(selected.map(c => c.path))
      changes.value = changes.value.filter(c => !publishedPaths.has(c.path))

      return result
    } catch (err: any) {
      publishError.value = err.data?.message || err.message || 'Batch publish failed'
      return null
    } finally {
      publishing.value = false
    }
  }

  /**
   * Toggle selection of a single change entry.
   */
  function toggleSelection(path: string) {
    const entry = changes.value.find(c => c.path === path)
    if (entry) entry.selected = !entry.selected
  }

  /**
   * Select or deselect all changes.
   */
  function selectAll(selected: boolean) {
    for (const entry of changes.value) {
      if (entry.status !== 'deleted') {
        entry.selected = selected
      }
    }
  }

  return {
    changes: readonly(changes),
    scanning: readonly(scanning),
    publishing: readonly(publishing),
    scanError: readonly(scanError),
    publishError: readonly(publishError),
    lastResult: readonly(lastResult),
    summary,
    hasChanges,
    hasSelection,
    scanChanges,
    publishSelected,
    toggleSelection,
    selectAll,
  }
}
