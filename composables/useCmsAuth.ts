/**
 * CMS Authentication composable.
 *
 * Phase 0: Simple token-based auth supporting:
 *   - GitHub Personal Access Token (stored in localStorage)
 *   - Environment variable token (for server-side operations)
 *
 * Phase 2+ will add full GitHub OAuth flow.
 */
import { ref, computed, readonly } from 'vue'

interface CmsUser {
  login: string
  name: string
  avatarUrl: string
  token: string
}

const TOKEN_KEY = 'cms-github-token'

// Shared state across all instances
const user = ref<CmsUser | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

export function useCmsAuth() {
  const isAuthenticated = computed(() => !!user.value)

  /**
   * Validate a GitHub token and fetch user info
   */
  async function validateToken(token: string): Promise<CmsUser> {
    const res = await $fetch<{ login: string; name: string; avatar_url: string }>(
      'https://api.github.com/user',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    return {
      login: res.login,
      name: res.name || res.login,
      avatarUrl: res.avatar_url,
      token,
    }
  }

  /**
   * Log in with a GitHub Personal Access Token
   */
  async function loginWithToken(token: string) {
    isLoading.value = true
    error.value = null

    try {
      user.value = await validateToken(token)
      if (import.meta.client) {
        localStorage.setItem(TOKEN_KEY, token)
      }
    } catch (e: any) {
      error.value = e.statusCode === 401
        ? 'Invalid token. Please check your GitHub Personal Access Token.'
        : `Authentication failed: ${e.message || 'Unknown error'}`
      throw new Error(error.value)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Restore session from localStorage
   */
  async function restoreSession() {
    if (import.meta.server || user.value) return

    const savedToken = localStorage.getItem(TOKEN_KEY)
    if (!savedToken) return

    isLoading.value = true
    try {
      user.value = await validateToken(savedToken)
    } catch {
      // Token expired or revoked — clear it
      localStorage.removeItem(TOKEN_KEY)
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Log out and clear stored token
   */
  function logout() {
    user.value = null
    error.value = null
    if (import.meta.client) {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  /**
   * Get the current auth token (for API calls)
   */
  function getToken(): string | null {
    return user.value?.token ?? null
  }

  return {
    user: readonly(user),
    isAuthenticated,
    isLoading: readonly(isLoading),
    error: readonly(error),
    loginWithToken,
    restoreSession,
    logout,
    getToken,
  }
}
