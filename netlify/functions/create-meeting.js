const { createClient } = require('@supabase/supabase-js')

const SITE_URL = process.env.SITE_URL || 'https://bleworldwide.netlify.app'

const supabaseAdmin = () => createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Token refresh helpers ─────────────────────────────────────────────────────

async function refreshZoomToken(refresh_token) {
  const creds = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')
  const res = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${refresh_token}`
  })
  return res.json()
}

async function refreshGoogleToken(refresh_token) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token,
      grant_type:    'refresh_token',
    }).toString()
  })
  return res.json()
}

async function refreshTeamsToken(refresh_token) {
  const tenant = process.env.TEAMS_TENANT_ID || 'common'
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.TEAMS_CLIENT_ID,
      client_secret: process.env.TEAMS_CLIENT_SECRET,
      refresh_token,
      grant_type:    'refresh_token',
      scope:         'OnlineMeetings.ReadWrite User.Read offline_access',
    }).toString()
  })
  return res.json()
}

// ── Get valid access token (refresh if expired) ───────────────────────────────

async function getAccessToken(db, userId, platform) {
  const { data: row } = await db.from('oauth_tokens')
    .select('*').eq('user_id', userId).eq('platform', platform).single()

  if (!row) throw new Error(`No ${platform} account connected. Please connect your account first.`)

  const isExpired = row.expires_at && new Date(row.expires_at) < new Date(Date.now() + 60000)

  if (isExpired && row.refresh_token) {
    let refreshed
    if (platform === 'zoom')        refreshed = await refreshZoomToken(row.refresh_token)
    if (platform === 'google_meet') refreshed = await refreshGoogleToken(row.refresh_token)
    if (platform === 'teams')       refreshed = await refreshTeamsToken(row.refresh_token)

    if (refreshed?.access_token) {
      await db.from('oauth_tokens').update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || row.refresh_token,
        expires_at: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId).eq('platform', platform)
      return refreshed.access_token
    }
    throw new Error(`Failed to refresh ${platform} token. Please reconnect your account.`)
  }

  return row.access_token
}

// ── Platform meeting creators ─────────────────────────────────────────────────

async function createZoomMeeting(token, { title, scheduled_at, duration_min, notes }) {
  const body = {
    topic:    title,
    type:     scheduled_at ? 2 : 3, // 2=scheduled, 3=recurring/instant
    duration: duration_min || 60,
    agenda:   notes || '',
    settings: {
      host_video:      true,
      participant_video: true,
      waiting_room:    true,
      join_before_host: false,
    }
  }
  if (scheduled_at) body.start_time = new Date(scheduled_at).toISOString()

  const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (data.code && data.code !== 201) throw new Error(data.message || 'Zoom API error')
  return {
    join_url:  data.join_url,
    host_url:  data.start_url,
    meeting_id: String(data.id),
    password:  data.password,
  }
}

async function createGoogleMeeting(token, { title, scheduled_at, duration_min, notes }) {
  const start = scheduled_at ? new Date(scheduled_at) : new Date(Date.now() + 3600000)
  const end   = new Date(start.getTime() + (duration_min || 60) * 60000)

  const body = {
    summary:     title,
    description: notes || '',
    start: { dateTime: start.toISOString(), timeZone: 'UTC' },
    end:   { dateTime: end.toISOString(),   timeZone: 'UTC' },
    conferenceData: {
      createRequest: {
        requestId:             `ble-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    }
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'Google API error')
  const meetLink = data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri
  return {
    join_url:   meetLink || data.htmlLink,
    host_url:   data.htmlLink,
    meeting_id: data.id,
  }
}

async function createTeamsMeeting(token, { title, scheduled_at, duration_min, notes }) {
  const start = scheduled_at ? new Date(scheduled_at) : new Date(Date.now() + 3600000)
  const end   = new Date(start.getTime() + (duration_min || 60) * 60000)

  const body = {
    subject:    title,
    startDateTime: start.toISOString(),
    endDateTime:   end.toISOString(),
  }

  const res = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'Teams API error')
  return {
    join_url:   data.joinWebUrl,
    host_url:   data.joinWebUrl,
    meeting_id: data.id,
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let body
  try { body = JSON.parse(event.body) }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) } }

  const { userId, platform, title, scheduled_at, duration_min, notes } = body

  if (!userId || !platform || !title) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: userId, platform, title' }) }
  }

  const db = supabaseAdmin()

  try {
    const token = await getAccessToken(db, userId, platform)
    const meetingData = { title, scheduled_at, duration_min, notes }

    let result
    if (platform === 'zoom')        result = await createZoomMeeting(token, meetingData)
    if (platform === 'google_meet') result = await createGoogleMeeting(token, meetingData)
    if (platform === 'teams')       result = await createTeamsMeeting(token, meetingData)

    if (!result) {
      return { statusCode: 400, body: JSON.stringify({ error: `Unsupported platform: ${platform}` }) }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    }

  } catch (e) {
    console.error('create-meeting error:', e)
    return { statusCode: 500, body: JSON.stringify({ error: e.message || 'Failed to create meeting' }) }
  }
}
