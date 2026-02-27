/**
 * CMS Authentication composable.
 *
 * Supports two authentication methods:
 *   1. GitHub OAuth — "Login with GitHub" button → server-side OAuth flow
 *      - Token stored in httpOnly session cookie (server-side)
 *      - Client only sees user profile, never the token
 *   2. GitHub Personal Access Token — manual PAT entry
 *      - Token stored in localStorage (client-side)
 *      - Used as fallback / development mode
 *
 * The composable exposes a unified interface regardless of auth method.
 */
import { ref, computed, readonly } from 'vue'

export interface CmsUser {
  login: string
  name: string
  avatarUrl: string
  /** Auth method used */
  authMethod: 'oauth' | 'pat'
}

const TOKEN_KEY = 'cms-github-token'

// Shared state across all instances
const user = ref<CmsUser | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const _patToken = ref<string | null>(null)
/** Tracks the in-flight restoreSession() promise so multiple callers can await the same one */
let _restorePromise: Promise<void> | null = null

export function useCmsAuth() {
  const isAuthenticated = computed(() => !!user.value)

  /**
   * Check if GitHub OAuth is configured (client ID available)
   */
  const isOAuthAvailable = computed(() => {
    const config = useRuntimeConfig()
    return !!config.public.githubClientId
  })

  /**
   * Initiate GitHub OAuth login.
   * Redirects the browser to the OAuth endpoint which then redirects to GitHub.
   */
  function loginWithOAuth() {
    window.location.href = '/api/cms/auth/github'
  }

  /**
   * Validate a GitHub PAT and fetch user info
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
      authMethod: 'pat',
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
      _patToken.value = token
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
   * Restore session from either OAuth cookie or localStorage PAT.
   * Called on app mount and CMS page navigation.
   * Deduplicates concurrent calls — safe to call from multiple components.
   */
  async function restoreSession() {
    if (import.meta.server) return
    // Already authenticated
    if (user.value) return
    // If a restore is already in-flight, wait for it
    if (_restorePromise) return _restorePromise

    _restorePromise = _doRestore()
    try {
      await _restorePromise
    } finally {
      _restorePromise = null
    }
  }

  async function _doRestore() {
    isLoading.value = true
    try {
      // 1. Check for OAuth session (server-side cookie)
      const session = await $fetch<{
        authenticated: boolean
        user: { login: string; name: string; avatarUrl: string; githubId: number } | null
      }>('/api/cms/auth/session')

      if (session.authenticated && session.user) {
        user.value = {
          login: session.user.login,
          name: session.user.name,
          avatarUrl: session.user.avatarUrl,
          authMethod: 'oauth',
        }
        return
      }

      // 2. Fallback: check localStorage for PAT
      const savedToken = localStorage.getItem(TOKEN_KEY)
      if (!savedToken) return

      user.value = await validateToken(savedToken)
      _patToken.value = savedToken
    } catch {
      // Token expired or revoked — clear it
      localStorage.removeItem(TOKEN_KEY)
      _patToken.value = null
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Log out — clears both OAuth session and PAT
   */
  async function logout() {
    // Clear OAuth session cookie via server
    try {
      await $fetch('/api/cms/auth/logout', { method: 'POST' })
    } catch {
      // Ignore errors (e.g., no session to clear)
    }

    // Clear PAT from localStorage
    if (import.meta.client) {
      localStorage.removeItem(TOKEN_KEY)
    }

    user.value = null
    _patToken.value = null
    error.value = null
  }

  /**
   * Get the current auth token for API calls.
   *
   * - OAuth mode: returns null (token is in httpOnly cookie, server reads it directly)
   * - PAT mode: returns the PAT string
   *
   * API endpoints should use `extractAuthToken()` server-side to get the token
   * from either the cookie or the request body.
   */
  function getToken(): string | null {
    return _patToken.value ?? null
  }

  return {
    user: readonly(user),
    isAuthenticated,
    isOAuthAvailable,
    isLoading: readonly(isLoading),
    error: readonly(error),
    loginWithOAuth,
    loginWithToken,
    restoreSession,
    logout,
    getToken,
  }
}
