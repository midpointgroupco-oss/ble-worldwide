const sgMail = require('@sendgrid/mail')
const { createClient } = require('@supabase/supabase-js')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const FROM     = 'BLE Worldwide <noreply@bleworldwide.edu>'
const SITE     = process.env.SITE_URL || 'https://bleworldwide.netlify.app'

// Inline branded template
function buildHtml(title, body, audience) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#12103a,#221c6e);padding:22px 28px;border-radius:14px 14px 0 0">
      <div style="color:white;font-size:20px;font-weight:900">🏫 BLE Worldwide</div>
      <div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:2px">School Announcement</div>
    </div>
    <div style="background:#f8f9fa;padding:28px;border-radius:0 0 14px 14px;border:1px solid #eee;border-top:none">
      <div style="background:white;border-radius:12px;padding:20px;border-left:4px solid #00c9b1;margin-bottom:20px">
        <div style="font-size:17px;font-weight:900;color:#1a1a2e;margin-bottom:10px">${title}</div>
        <div style="font-size:14px;color:#444;line-height:1.75;white-space:pre-wrap">${body}</div>
      </div>
      <div style="text-align:center">
        <a href="${SITE}/parent" style="background:linear-gradient(135deg,#00c9b1,#0097a7);color:white;padding:13px 30px;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px">View Portal →</a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0 12px">
      <p style="font-size:11px;color:#999;text-align:center;margin:0">BLE Worldwide &bull; Sent to: ${audience} &bull; Automated announcement</p>
    </div>
  </div>`
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' }
  try {
    const { announcement_id } = JSON.parse(event.body)

    // Load announcement
    const { data: ann } = await supabase.from('announcements').select('*').eq('id', announcement_id).single()
    if (!ann) return { statusCode:404, body: JSON.stringify({ error:'Announcement not found' }) }

    // Get recipients based on audience
    let emails = []
    if (ann.audience === 'all' || ann.audience === 'parents') {
      const { data: parents } = await supabase.from('profiles').select('email,full_name').eq('role','parent')
      emails.push(...(parents||[]).map(p=>({ email:p.email, name:p.full_name })))
    }
    if (ann.audience === 'all' || ann.audience === 'students') {
      const { data: studs } = await supabase.from('profiles').select('email,full_name').eq('role','student')
      emails.push(...(studs||[]).map(s=>({ email:s.email, name:s.full_name })))
    }
    if (ann.audience === 'staff') {
      const { data: staff } = await supabase.from('profiles').select('email,full_name').in('role',['teacher','admin'])
      emails.push(...(staff||[]).map(s=>({ email:s.email, name:s.full_name })))
    }

    // Deduplicate
    const unique = [...new Map(emails.filter(e=>e.email).map(e=>[e.email,e])).values()]

    if (unique.length === 0) {
      await supabase.from('announcements').update({ email_sent:true, email_sent_at:new Date().toISOString(), email_count:0 }).eq('id', announcement_id)
      return { statusCode:200, body: JSON.stringify({ sent:0, note:'No recipients found' }) }
    }

    const html = buildHtml(ann.title, ann.body||ann.content||'', ann.audience||'all')

    // Send in batches of 100 (SendGrid limit per call)
    let sent = 0
    for (let i=0; i<unique.length; i+=100) {
      const batch = unique.slice(i, i+100)
      const msgs  = batch.map(r=>({ to: r.email, from: FROM, subject:`📢 ${ann.title} – BLE Worldwide`, html }))
      await sgMail.send(msgs)
      sent += batch.length
    }

    await supabase.from('announcements').update({ email_sent:true, email_sent_at:new Date().toISOString(), email_count:sent }).eq('id', announcement_id)

    return { statusCode:200, body: JSON.stringify({ sent }) }
  } catch(err) {
    console.error('Blast error:', err?.response?.body || err)
    return { statusCode:500, body: JSON.stringify({ error: err.message }) }
  }
}
