/**
 * GET /api/cms/auth/callback
 *
 * GitHub OAuth callback handler.
 * Exchanges the authorization code for an access token,
 * fetches user profile, and sets a session cookie.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string | undefined
  const state = query.state as string | undefined

  if (!code) {
    throw createError({
      statusCode: 400,
      message: 'Missing authorization code from GitHub',
    })
  }

  // Validate CSRF state
  const savedState = getCookie(event, 'cms-oauth-state')
  if (!state || state !== savedState) {
    throw createError({
      statusCode: 403,
      message: 'Invalid OAuth state. Possible CSRF attack.',
    })
  }

  // Clear the state cookie
  deleteCookie(event, 'cms-oauth-state', { path: '/' })

  const config = useRuntimeConfig()

  // Exchange code for access token
  const tokenRes = await $fetch<{
    access_token: string
    token_type: string
    scope: string
    error?: string
    error_description?: string
  }>('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: {
      client_id: config.public.githubClientId,
      client_secret: config.githubClientSecret,
      code,
    },
  })

  if (tokenRes.error || !tokenRes.access_token) {
    throw createError({
      statusCode: 401,
      message: `GitHub OAuth error: ${tokenRes.error_description || tokenRes.error || 'Failed to exchange code'}`,
    })
  }

  // Fetch GitHub user profile
  const userProfile = await $fetch<{
    login: string
    name: string | null
    avatar_url: string
    id: number
  }>('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenRes.access_token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  // Build session payload (stored in httpOnly cookie as JSON)
  const session = {
    token: tokenRes.access_token,
    login: userProfile.login,
    name: userProfile.name || userProfile.login,
    avatarUrl: userProfile.avatar_url,
    githubId: userProfile.id,
    createdAt: Date.now(),
  }

  // Set secure httpOnly session cookie
  setCookie(event, 'cms-session', JSON.stringify(session), {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  // Redirect to CMS dashboard
  return sendRedirect(event, '/cms')
})
