/**
 * GET /api/cms/auth/github
 *
 * Initiates the GitHub OAuth flow.
 * Redirects the user to GitHub's authorization page.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const clientId = config.public.githubClientId

  if (!clientId) {
    throw createError({
      statusCode: 500,
      message: 'GitHub OAuth not configured. Set GITHUB_CLIENT_ID environment variable.',
    })
  }

  const redirectUri = `${config.public.siteUrl}/api/cms/auth/callback`

  // Generate a random state parameter for CSRF protection
  const state = crypto.randomUUID()

  // Store state in a short-lived cookie for validation on callback
  setCookie(event, 'cms-oauth-state', state, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo user:email',
    state,
  })

  return sendRedirect(event, `https://github.com/login/oauth/authorize?${params}`)
})
