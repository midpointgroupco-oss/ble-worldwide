const { createClient } = require('@supabase/supabase-js')

const TEAMS_CLIENT_ID     = process.env.TEAMS_CLIENT_ID
const TEAMS_CLIENT_SECRET = process.env.TEAMS_CLIENT_SECRET
const TEAMS_TENANT_ID     = process.env.TEAMS_TENANT_ID || 'common'
const SITE_URL            = process.env.SITE_URL || 'https://bleworldwide.netlify.app'
const REDIRECT_URI        = `${SITE_URL}/.netlify/functions/oauth-teams`

const SCOPES = 'OnlineMeetings.ReadWrite User.Read offline_access'

const supabase = () => createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

exports.handler = async (event) => {
  const { code, state, error } = event.queryStringParameters || {}

  // Step 1 — redirect to Microsoft authorization
  if (!code && !error) {
    const url = new URL(`https://login.microsoftonline.com/${TEAMS_TENANT_ID}/oauth2/v2.0/authorize`)
    url.searchParams.set('client_id',     TEAMS_CLIENT_ID)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('redirect_uri',  REDIRECT_URI)
    url.searchParams.set('scope',         SCOPES)
    url.searchParams.set('response_mode', 'query')
    url.searchParams.set('state',         state || '')
    return { statusCode: 302, headers: { Location: url.toString() }, body: '' }
  }

  if (error) {
    return { statusCode: 302, headers: { Location: `${SITE_URL}/teacher/meetings?oauth_error=teams` }, body: '' }
  }

  // Step 2 — exchange code for tokens
  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${TEAMS_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     TEAMS_CLIENT_ID,
        client_secret: TEAMS_CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code',
        scope:         SCOPES,
      }).toString()
    })
    const tokens = await tokenRes.json()
    if (tokens.error) throw new Error(tokens.error_description || tokens.error)

    // Get user info from Microsoft Graph
    const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    })
    const me = await meRes.json()

    const db = supabase()
    await db.from('oauth_tokens').upsert({
      user_id:       state,
      platform:      'teams',
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at:    tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      account_email: me.mail || me.userPrincipalName || null,
      account_name:  me.displayName || null,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    return { statusCode: 302, headers: { Location: `${SITE_URL}/teacher/meetings?oauth_success=teams` }, body: '' }
  } catch (e) {
    console.error('Teams OAuth error:', e)
    return { statusCode: 302, headers: { Location: `${SITE_URL}/teacher/meetings?oauth_error=teams` }, body: '' }
  }
}
