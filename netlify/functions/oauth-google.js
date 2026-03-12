const { createClient } = require('@supabase/supabase-js')

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const SITE_URL             = process.env.SITE_URL || 'https://bleworldwide.netlify.app'
const REDIRECT_URI         = `${SITE_URL}/.netlify/functions/oauth-google`

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

const supabase = () => createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

exports.handler = async (event) => {
  const { code, state, error } = event.queryStringParameters || {}

  // Step 1 — redirect to Google authorization
  if (!code && !error) {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id',     GOOGLE_CLIENT_ID)
    url.searchParams.set('redirect_uri',  REDIRECT_URI)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope',         SCOPES)
    url.searchParams.set('access_type',   'offline')
    url.searchParams.set('prompt',        'consent')
    url.searchParams.set('state',         state || '')
    return { statusCode: 302, headers: { Location: url.toString() }, body: '' }
  }

  if (error) {
    return { statusCode: 302, headers: { Location: `${SITE_URL}/teacher/meetings?oauth_error=google` }, body: '' }
  }

  // Step 2 — exchange code for tokens
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code',
      }).toString()
    })
    const tokens = await tokenRes.json()
    if (tokens.error) throw new Error(tokens.error_description || tokens.error)

    // Get user info
    const meRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    })
    const me = await meRes.json()

    const db = supabase()
    await db.from('oauth_tokens').upsert({
      user_id:       state,
      platform:      'google_meet',
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at:    tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      account_email: me.email || null,
      account_name:  me.name  || null,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    return { statusCode: 302, headers: { Location: `${SITE_URL}/teacher/meetings?oauth_success=google` }, body: '' }
  } catch (e) {
    console.error('Google OAuth error:', e)
    return { statusCode: 302, headers: { Location: `${SITE_URL}/teacher/meetings?oauth_error=google` }, body: '' }
  }
}
