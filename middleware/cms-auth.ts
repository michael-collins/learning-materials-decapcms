/**
 * CMS auth middleware.
 * Redirects unauthenticated users to the CMS login page.
 * Only applies to /cms routes (except /cms/login).
 */
export default defineNuxtRouteMiddleware((to) => {
  // Only guard /cms routes (except login)
  if (!to.path.startsWith('/cms') || to.path === '/cms/login') {
    return
  }

  // On server, skip — auth check happens client-side
  if (import.meta.server) return

  const token = localStorage.getItem('cms-github-token')
  if (!token) {
    return navigateTo('/cms/login')
  }
})
