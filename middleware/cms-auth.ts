/**
 * CMS auth middleware.
 * Redirects unauthenticated users to the CMS login page.
 * Only applies to /cms routes (except /cms/login).
 *
 * Also triggers session restoration so the PAT token is available
 * by the time the page's onMounted fires.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Only guard /cms routes (except login)
  if (!to.path.startsWith('/cms') || to.path === '/cms/login') {
    return
  }

  // On server, skip — auth check happens client-side
  if (import.meta.server) return

  const { restoreSession, isAuthenticated } = useCmsAuth()

  // Restore session (validates PAT or OAuth cookie, sets _patToken + user)
  await restoreSession()

  // If still not authenticated after restore, redirect to login
  if (!isAuthenticated.value) {
    return navigateTo('/cms/login')
  }
})
