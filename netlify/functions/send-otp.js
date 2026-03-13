const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let body
  try { body = JSON.parse(event.body) }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) } }

  const { action, email, code, user_id } = body

  // ── SEND: generate and email a 6-digit OTP ──
  if (action === 'send') {
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) }

    const otp        = String(Math.floor(100000 + Math.random() * 900000))
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

    // Delete any old codes for this email first
    await supabase.from('login_otp').delete().eq('email', email)

    // Insert new code
    const { error: insertErr } = await supabase.from('login_otp').insert({
      email, code: otp, expires_at, used: false
    })
    if (insertErr) return { statusCode: 500, body: JSON.stringify({ error: insertErr.message }) }

    // Send via SendGrid
    const sendgridKey = process.env.SENDGRID_API_KEY
    if (!sendgridKey) return { statusCode: 500, body: JSON.stringify({ error: 'SendGrid not configured' }) }

    const emailRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from:    { email: 'info@midpointcorp.com', name: 'BLE Worldwide' },
        subject: 'Your BLE Worldwide Login Code',
        content: [{ type: 'text/html', value: `
          <!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
          <body style="font-family:Arial,sans-serif;background:#f0f4fb;margin:0;padding:20px">
            <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
              <div style="background:linear-gradient(135deg,#12103a,#221c6e,#0e3060);padding:30px;text-align:center">
                <div style="font-size:40px;margin-bottom:8px">&#x1F310;</div>
                <h1 style="color:white;font-size:22px;margin:0;font-weight:900">BLE Worldwide</h1>
              </div>
              <div style="padding:32px;text-align:center">
                <p style="color:#555;font-size:14px;margin:0 0 20px">Your one-time login verification code is:</p>
                <div style="background:#f0f4fb;border-radius:14px;padding:24px;display:inline-block;margin:0 auto">
                  <span style="font-size:42px;font-weight:900;color:#12103a;letter-spacing:10px;font-family:monospace">${otp}</span>
                </div>
                <p style="color:#999;font-size:12px;margin:20px 0 0">This code expires in 10 minutes. Do not share it with anyone.</p>
              </div>
              <div style="background:#f8f9ff;padding:16px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #e4e9f5">
                BLE Worldwide &middot; If you did not request this code, ignore this email.
              </div>
            </div>
          </body></html>
        ` }],
      })
    })

    if (!emailRes.ok && emailRes.status !== 202) {
      const err = await emailRes.json().catch(() => ({}))
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email: ' + JSON.stringify(err) }) }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  }

  // ── VERIFY: check the code ──
  if (action === 'verify') {
    if (!email || !code) return { statusCode: 400, body: JSON.stringify({ error: 'Email and code required' }) }

    const { data: rows } = await supabase
      .from('login_otp')
      .select('*')
      .eq('email', email)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!rows || rows.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No code found. Please request a new one.' }) }
    }

    const row = rows[0]

    if (new Date(row.expires_at) < new Date()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Code expired. Please request a new one.' }) }
    }

    if (row.code !== code.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Incorrect code. Please try again.' }) }
    }

    // Mark as used
    await supabase.from('login_otp').update({ used: true }).eq('id', row.id)

    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) }
}
