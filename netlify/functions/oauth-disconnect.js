const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let body
  try { body = JSON.parse(event.body) }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) } }

  const { userId, platform } = body
  if (!userId || !platform) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId or platform' }) }
  }

  const db = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  await db.from('oauth_tokens').delete().eq('user_id', userId).eq('platform', platform)
  return { statusCode: 200, body: JSON.stringify({ success: true }) }
}
