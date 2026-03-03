/**
 * GET /api/cms/auth/session
 *
 * Returns the current CMS session from the httpOnly cookie.
 * Returns null values if no session exists.
 */
export default defineEventHandler((event) => {
  const raw = getCookie(event, 'cms-session')

  if (!raw) {
    return {
      authenticated: false,
      user: null,
    }
  }

  try {
    const session = JSON.parse(raw) as {
      token: string
      login: string
      name: string
      avatarUrl: string
      githubId: number
      createdAt: number
    }

    // Check if session is expired (7 days)
    const maxAge = 7 * 24 * 60 * 60 * 1000
    if (Date.now() - session.createdAt > maxAge) {
      // Clear expired session
      deleteCookie(event, 'cms-session', { path: '/' })
      return {
        authenticated: false,
        user: null,
      }
    }

    return {
      authenticated: true,
      user: {
        login: session.login,
        name: session.name,
        avatarUrl: session.avatarUrl,
        githubId: session.githubId,
      },
    }
  } catch {
    // Corrupted cookie
    deleteCookie(event, 'cms-session', { path: '/' })
    return {
      authenticated: false,
      user: null,
    }
  }
})
