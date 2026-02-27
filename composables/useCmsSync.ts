/**
 * Composable for content sync between local filesystem and GitHub.
 *
 * Provides:
 * - checkSync() — compare local vs remote content
 * - pullFromGitHub() — overwrite local with remote
 * - Parsed content for both versions when diverged (for conflict resolution)
 * - Reactive state for sync status, loading, errors
 */
import { ref, readonly } from 'vue'

export type SyncStatus = 'unknown' | 'checking' | 'in-sync' | 'local-only' | 'remote-only' | 'diverged' | 'error'

export interface SyncContentVersion {
  frontmatter: Record<string, any>
  body: string
}

export interface SyncResult {
  status: 'in-sync' | 'local-only' | 'remote-only' | 'diverged'
  message: string
  localExists: boolean
  remoteExists: boolean
  remoteSha?: string
  /** Parsed local content (only when diverged) */
  local?: SyncContentVersion
  /** Parsed remote content (only when diverged) */
  remote?: SyncContentVersion
}

export function useCmsSync() {
  const { getToken } = useCmsAuth()

  const syncStatus = ref<SyncStatus>('unknown')
  const syncMessage = ref('')
  const syncing = ref(false)
  const pulling = ref(false)
  const syncError = ref<string | null>(null)

  /** Parsed local content from the last diverged sync check */
  const localVersion = ref<SyncContentVersion | null>(null)
  /** Parsed remote content from the last diverged sync check */
  const remoteVersion = ref<SyncContentVersion | null>(null)

  /**
   * Check sync status between local and GitHub for a specific file.
   */
  async function checkSync(collection: string, slug: string): Promise<SyncResult> {
    syncStatus.value = 'checking'
    syncError.value = null
    localVersion.value = null
    remoteVersion.value = null

    try {
      const token = getToken()
      const result = await $fetch<SyncResult>('/api/cms/content/sync-check', {
        method: 'POST',
        body: { collection, slug, token },
      })

      syncStatus.value = result.status
      syncMessage.value = result.message

      // Store parsed content for conflict resolution
      if (result.status === 'diverged') {
        localVersion.value = result.local ?? null
        remoteVersion.value = result.remote ?? null
      }

      return result
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Sync check failed'
      syncStatus.value = 'error'
      syncError.value = msg
      syncMessage.value = msg
      throw new Error(msg)
    }
  }

  /**
   * Pull the latest version from GitHub, overwriting the local file.
   * Returns true if successful.
   */
  async function pullFromGitHub(collection: string, slug: string): Promise<boolean> {
    pulling.value = true
    syncError.value = null

    try {
      const token = getToken()
      await $fetch('/api/cms/content/pull', {
        method: 'POST',
        body: { collection, slug, token },
      })

      syncStatus.value = 'in-sync'
      syncMessage.value = 'Pulled latest version from GitHub.'
      localVersion.value = null
      remoteVersion.value = null
      return true
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Pull failed'
      syncError.value = msg
      return false
    } finally {
      pulling.value = false
    }
  }

  /**
   * Pre-publish sync check.
   * Returns { safe: true } if OK to publish, or { safe: false, ...details } if conflict detected.
   */
  async function prePublishCheck(collection: string, slug: string): Promise<{
    safe: boolean
    status: SyncStatus
    message: string
    isNew?: boolean
  }> {
    try {
      const result = await checkSync(collection, slug)

      switch (result.status) {
        case 'in-sync':
          return {
            safe: true,
            status: 'in-sync',
            message: 'Local and GitHub are in sync. Safe to publish.',
          }
        case 'local-only':
          return {
            safe: true,
            status: 'local-only',
            message: 'New file — will be created on GitHub.',
            isNew: true,
          }
        case 'remote-only':
          return {
            safe: false,
            status: 'remote-only',
            message: 'This file exists on GitHub but not locally. Pull it first.',
          }
        case 'diverged':
          return {
            safe: false,
            status: 'diverged',
            message: 'Local and GitHub versions differ. Your publish will overwrite the GitHub version.',
          }
        default:
          return { safe: true, status: 'unknown', message: '' }
      }
    } catch {
      // If sync check fails (e.g., no auth), let the user decide
      return {
        safe: false,
        status: 'error',
        message: syncError.value || 'Could not verify sync status. Proceed with caution.',
      }
    }
  }

  return {
    syncStatus: readonly(syncStatus),
    syncMessage: readonly(syncMessage),
    syncing: readonly(syncing),
    pulling: readonly(pulling),
    syncError: readonly(syncError),
    localVersion: readonly(localVersion),
    remoteVersion: readonly(remoteVersion),
    checkSync,
    pullFromGitHub,
    prePublishCheck,
  }
}
