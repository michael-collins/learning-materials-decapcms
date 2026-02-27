/**
 * Server utility to extract the GitHub auth token from a request.
 *
 * Supports two auth methods (in priority order):
 * 1. OAuth session — token stored in httpOnly 'cms-session' cookie
 * 2. PAT mode — token passed in the request body (backward compat)
 *
 * @param event - H3 event
 * @param bodyToken - Optional token from the request body (PAT mode)
 * @returns The GitHub access token
 * @throws 401 if no token is available
 */
import type { H3Event } from 'h3'

export function extractAuthToken(event: H3Event, bodyToken?: string): string {
  // 1. Check for OAuth session cookie
  const sessionRaw = getCookie(event, 'cms-session')
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw) as { token: string }
      if (session.token) return session.token
    } catch {
      // Fall through to PAT mode
    }
  }

  // 2. Check for PAT in request body or query param
  if (bodyToken) return bodyToken

  // 3. Check for token in query params (used by GET endpoints)
  const query = getQuery(event)
  if (query.token && typeof query.token === 'string') return query.token

  throw createError({
    statusCode: 401,
    message: 'Not authenticated. Log in via GitHub OAuth or provide a Personal Access Token.',
  })
}
