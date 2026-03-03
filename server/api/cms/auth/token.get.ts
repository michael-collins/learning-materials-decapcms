/**
 * GET /api/cms/auth/token
 *
 * Returns the GitHub token from the server-side session cookie.
 * This endpoint is only accessible server-side (the token is never
 * directly exposed to the client in OAuth mode).
 *
 * Used by the CMS save operations that need the token for GitHub API calls.
 * The client sends requests to save endpoints, and those endpoints
 * read the token from the cookie — the client doesn't need to know the token.
 */
export default defineEventHandler((event) => {
  const raw = getCookie(event, 'cms-session')

  if (!raw) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    })
  }

  try {
    const session = JSON.parse(raw) as { token: string }
    return { token: session.token }
  } catch {
    throw createError({
      statusCode: 401,
      message: 'Invalid session',
    })
  }
})
