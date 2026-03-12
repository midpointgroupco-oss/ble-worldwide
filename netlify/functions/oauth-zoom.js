const { createClient } = require('@supabase/supabase-js')

const ZOOM_CLIENT_ID     = process.env.ZOOM_CLIENT_ID
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET
const SITE_URL           = process.env.SITE_URL || 'https://bleworldwide.netlify.app'
const REDIRECT_URI       = `${SITE_URL}/.netlify/functions/oauth-zoom`

const supabase = () => createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

exports.handler = async (event) => {
  const { code, state, error } = event.queryStringParameters || {}

  // Step 1 — redirect to Zoom authorization
  if (!code && !error) {
    const userId = state || ''
    const scopes = 'meeting:write:meeting meeting:read:meeting user:read:user'
    const url = `https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&state=${userId}`
    return { statusCode: 302, headers: { Location: url }, body: '' }
  }

  if (error) {
    return { statusCode: 302, headers: { Location: `${SITE_URL}/teacher/meetings?oauth_error=zoom` }, body: '' }
  }

  // Step 2 — exchange code for token
  try {
    const creds = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')
    const tokenRes = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
    })
    const tokens = await tokenRes.json()
    if (tokens.error) throw new Error(tokens.error)

    // Get Zoom user info
    const meRes = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    })
    const me = await meRes.json()

    // Upsert token in Supabase
    const db = supabase()
    await db.from('oauth_tokens').upsert({
      user_id:       state,
      platform:      'zoom',
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at:    tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      account_email: me.email || null,
      account_name:  me.display_name || null,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    return { statusCode: 302, headers: { Location: `${SITE_URL}/teacher/meetings?oauth_success=zoom` }, body: '' }
  } catch (e) {
    console.error('Zoom OAuth error:', e)
    return { statusCode: 302, headers: { Location: `${SITE_URL}/teacher/meetings?oauth_error=zoom` }, body: '' }
  }
}
