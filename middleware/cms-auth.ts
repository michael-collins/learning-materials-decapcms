/**
 * CMS auth middleware.
 * Redirects unauthenticated users to the CMS login page.
 * Only applies to /cms routes (except /cms/login).
 *
 * Supports two auth methods:
 *   1. OAuth session — server-side cookie (checked via API)
 *   2. PAT — token in localStorage (client-side check)
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Only guard /cms routes (except login)
  if (!to.path.startsWith('/cms') || to.path === '/cms/login') {
    return
  }

  // On server, skip — auth check happens client-side
  if (import.meta.server) return

  // Check PAT in localStorage (fast, synchronous)
  const token = localStorage.getItem('cms-github-token')
  if (token) return

  // Check for OAuth session cookie via server API
  try {
    const session = await $fetch<{ authenticated: boolean }>('/api/cms/auth/session')
    if (session.authenticated) return
  } catch {
    // API error — fall through to redirect
  }

  return navigateTo('/cms/login')
})
