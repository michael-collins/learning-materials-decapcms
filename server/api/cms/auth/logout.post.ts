/**
 * POST /api/cms/auth/logout
 *
 * Clears the CMS session cookie.
 */
export default defineEventHandler((event) => {
  deleteCookie(event, 'cms-session', { path: '/' })

  return { success: true }
})
