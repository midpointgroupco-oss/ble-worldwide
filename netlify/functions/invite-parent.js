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

  const siteUrl = process.env.SITE_URL || 'https://bleworldwide.netlify.app'

  let body
  try { body = JSON.parse(event.body) }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) } }

  const { student_name, student_grade, guardian_name, guardian_email, school_message,
          parentEmail, parentName, studentName, studentId } = body

  const _guardian_email = guardian_email || parentEmail
  const _guardian_name  = guardian_name  || parentName
  const _student_name   = student_name   || studentName

  if (!_guardian_email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Guardian email is required' }) }
  }

  try {
    const tempPassword = 'BLE-' + Math.random().toString(36).slice(2, 8).toUpperCase()

    // Try to create the user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email:         _guardian_email,
      password:      tempPassword,
      email_confirm: true,
      user_metadata: { full_name: _guardian_name || 'Parent/Guardian', role: 'parent' }
    })

    let userId = authData?.user?.id

    // If already exists — look them up and update their password
    if (authError && authError.message.includes('already been registered')) {
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users?.find(u => u.email === _guardian_email)
      if (existing) {
        userId = existing.id
        await supabase.auth.admin.updateUserById(userId, {
          password:      tempPassword,
          email_confirm: true,
        })
      }
    } else if (authError) {
      throw authError
    }

    // Always upsert profile so role is set correctly
    if (userId) {
      await supabase.from('profiles').upsert({
        id:        userId,
        full_name: _guardian_name || 'Parent/Guardian',
        role:      'parent',
        email:     _guardian_email,
      }, { onConflict: 'id' })

      if (studentId) {
        try {
          await supabase.from('students')
            .update({ guardian_auth_id: userId })
            .eq('id', studentId)
        } catch (_) {}
      }
    }

    // Send email via SendGrid
    let emailSent  = false
    let emailError = null
    const sendgridKey = process.env.SENDGRID_API_KEY

    if (sendgridKey) {
      try {
        const emailRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${sendgridKey}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: _guardian_email }] }],
            from:    { email: 'info@midpointcorp.com', name: 'BLE Worldwide' },
            subject: `Portal Access for ${_student_name} — BLE Worldwide`,
            content: [{ type: 'text/html', value: buildEmailHTML({
              guardian_name:  _guardian_name || 'Parent/Guardian',
              student_name:   _student_name,
              student_grade,
              guardian_email: _guardian_email,
              temp_password:  tempPassword,
              login_url:      `${siteUrl}/login`,
              school_message: school_message || 'Welcome to BLE Worldwide! We are excited to have your child as part of our global learning community.',
            })}],
          }),
        })
        emailSent  = emailRes.ok || emailRes.status === 202
        if (!emailSent) {
          const errData = await emailRes.json().catch(() => ({}))
          emailError = JSON.stringify(errData)
        }
      } catch (e) {
        emailError = e.message
      }
    } else {
      emailError = 'SENDGRID_API_KEY not set'
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success:       true,
        temp_password: tempPassword,
        email_sent:    emailSent,
        email_error:   emailError,
        message:       `Parent account ready for ${_guardian_email}`,
      }),
    }

  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: err.message || 'Something went wrong' }) }
  }
}

function buildEmailHTML({ guardian_name, student_name, student_grade, guardian_email, temp_password, login_url, school_message }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;background:#f0f4fb;margin:0;padding:20px}
  .container{max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .header{background:linear-gradient(135deg,#12103a,#221c6e,#0e3060);padding:36px 32px;text-align:center}
  .header h1{color:white;font-size:26px;margin:0 0 4px;font-weight:900}
  .header p{color:rgba(255,255,255,0.5);font-size:13px;margin:0}
  .globe{font-size:48px;margin-bottom:12px;display:block}
  .body{padding:32px}
  .body h2{color:#12103a;font-size:20px;margin:0 0 12px}
  .body p{color:#555;font-size:14px;line-height:1.6;margin:0 0 16px}
  .student-card{background:#f0f4fb;border-radius:12px;padding:16px 20px;margin:20px 0}
  .label{font-size:10px;font-weight:700;color:#7a82a0;text-transform:uppercase;letter-spacing:0.5px}
  .value{font-size:16px;font-weight:800;color:#12103a;margin-top:2px}
  .creds{background:#e6fff9;border:1.5px solid #b0eedd;border-radius:12px;padding:16px 20px;margin:20px 0}
  .cred-row{display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px}
  .cred-label{color:#555}
  .cred-value{font-weight:700;color:#12103a;font-family:monospace}
  .btn{display:block;background:linear-gradient(135deg,#00c9b1,#3b9eff);color:white;text-decoration:none;text-align:center;padding:14px 24px;border-radius:12px;font-weight:800;font-size:15px;margin:24px 0}
  .warning{background:#fff9e6;border:1px solid #ffe599;border-radius:10px;padding:12px 16px;font-size:12px;color:#b07800;margin-top:16px}
  .footer{background:#f8f9ff;padding:20px 32px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #e4e9f5}
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="globe">&#x1F310;</span>
      <h1>BLE Worldwide</h1>
      <p>Global Homeschool Management Platform</p>
    </div>
    <div class="body">
      <h2>Welcome, ${guardian_name}!</h2>
      <p>${school_message}</p>
      <div class="student-card">
        <div class="label">Enrolled Student</div>
        <div class="value">${student_name}</div>
        <div class="label" style="margin-top:10px">Grade Level</div>
        <div class="value">${student_grade} Grade</div>
      </div>
      <p>Your parent portal account is ready. Use the credentials below to log in and track your child&#39;s progress.</p>
      <div class="creds">
        <div class="cred-row"><span class="cred-label">Email</span><span class="cred-value">${guardian_email}</span></div>
        <div class="cred-row"><span class="cred-label">Temporary Password</span><span class="cred-value">${temp_password}</span></div>
      </div>
      <a href="${login_url}" class="btn">Access Parent Portal &#x2192;</a>
      <div class="warning">&#x26A0; Please change your password after your first login.</div>
    </div>
    <div class="footer">BLE Worldwide &middot; Global Homeschool Platform<br/>Contact your school administrator with any questions.</div>
  </div>
</body>
</html>`
}
