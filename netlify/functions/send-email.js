const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const FROM    = 'BLE Worldwide <noreply@bleworldwide.edu>'
const SITE    = () => process.env.SITE_URL || 'https://bleworldwide.netlify.app'

const HEADER = (subtitle='Notification') => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#12103a,#221c6e);padding:22px 28px;border-radius:14px 14px 0 0;display:flex;align-items:center;gap:14px">
      <div style="width:42px;height:42px;border-radius:10px;background:rgba(0,201,177,.25);display:flex;align-items:center;justify-content:center;font-size:22px">🏫</div>
      <div>
        <div style="color:white;font-size:20px;font-weight:900;letter-spacing:-.3px">BLE Worldwide</div>
        <div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:1px">${subtitle}</div>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:28px;border-radius:0 0 14px 14px;border:1px solid #eee;border-top:none">`

const FOOTER = `
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0 16px">
      <p style="font-size:11px;color:#999;text-align:center;margin:0">BLE Worldwide &bull; This is an automated notification &bull; Do not reply to this email.</p>
    </div>
  </div>`

const BTN = (href, text) => `
  <div style="text-align:center;margin:22px 0">
    <a href="${href}" style="background:linear-gradient(135deg,#00c9b1,#0097a7);color:white;padding:13px 30px;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;display:inline-block;box-shadow:0 4px 14px rgba(0,201,177,.35)">${text}</a>
  </div>`

const INFO_BOX = (rows, borderColor='#e0e6f8') => `
  <div style="background:white;border-radius:12px;padding:16px 20px;margin:16px 0;border:1px solid ${borderColor}">
    ${rows.map(([k,v,color='#444'])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f5f5f5"><span style="color:#999;font-size:12px">${k}</span><span style="font-weight:700;font-size:13px;color:${color}">${v}</span></div>`).join('')}
  </div>`

const TEMPLATES = {

  report_card_published: ({ studentName, parentName, termName, gpa, siteUrl }) => ({
    subject: `📋 ${studentName}'s Report Card – ${termName} | BLE Worldwide`,
    html: HEADER('Report Card Ready') + `
      <p style="font-size:15px;color:#333;margin:0 0 6px">Hello ${parentName},</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 16px">${studentName}'s report card for <strong>${termName}</strong> is now available in the parent portal.</p>
      <div style="text-align:center;background:white;border-radius:12px;padding:20px;border:1px solid #e0e6f8;margin:16px 0">
        <div style="font-size:11px;color:#999;text-transform:uppercase;font-weight:700;letter-spacing:1px;margin-bottom:6px">Cumulative GPA</div>
        <div style="font-size:48px;font-weight:900;color:#00c9b1;line-height:1">${gpa||'—'}</div>
      </div>
      ${BTN((siteUrl||SITE())+'/parent/progress','View Report Card →')}
    ` + FOOTER
  }),

  grade_posted: ({ studentName, parentName, courseName, assignmentTitle, grade, points, maxPoints, siteUrl }) => ({
    subject: `📊 New Grade: ${assignmentTitle} – ${studentName}`,
    html: HEADER('Grade Posted') + `
      <p style="font-size:15px;color:#333;margin:0 0 6px">Hello ${parentName},</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 4px">A new grade has been posted for <strong>${studentName}</strong>.</p>
      ${INFO_BOX([['Course',courseName],['Assignment',assignmentTitle],['Score',`${points} / ${maxPoints} pts`],['Grade',grade,'#00c9b1']])}
      ${BTN((siteUrl||SITE())+'/parent/progress','View Progress →')}
    ` + FOOTER
  }),

  billing_due: ({ parentName, description, amount, dueDate, siteUrl }) => ({
    subject: `💳 Payment Due: ${description} – BLE Worldwide`,
    html: HEADER('Billing Notice') + `
      <p style="font-size:15px;color:#333;margin:0 0 6px">Hello ${parentName},</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 4px">A payment is due on your account.</p>
      <div style="text-align:center;background:white;border-radius:12px;padding:20px;border:2px solid #ffe599;margin:16px 0">
        <div style="font-size:12px;color:#999;margin-bottom:4px">${description}</div>
        <div style="font-size:40px;font-weight:900;color:#1a1a2e">$${Number(amount||0).toFixed(2)}</div>
        <div style="font-size:12px;color:#b07800;margin-top:4px;font-weight:700">Due: ${dueDate}</div>
      </div>
      ${BTN((siteUrl||SITE())+'/parent/billing','Pay Now →')}
    ` + FOOTER
  }),

  payment_received: ({ parentName, description, amount, paidOn, reference, siteUrl }) => ({
    subject: `✅ Payment Received – BLE Worldwide`,
    html: HEADER('Payment Confirmed') + `
      <p style="font-size:15px;color:#333;margin:0 0 6px">Hello ${parentName},</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 4px">We have received your payment. Thank you!</p>
      ${INFO_BOX([['Description',description],['Amount',`$${Number(amount||0).toFixed(2)}`,'#00804a'],['Paid On',paidOn],['Reference',reference||'—']],'#b0eedd')}
      ${BTN((siteUrl||SITE())+'/parent/billing','View Billing →')}
    ` + FOOTER
  }),

  announcement_blast: ({ recipientName, title, body, audience, siteUrl }) => ({
    subject: `📢 ${title} – BLE Worldwide`,
    html: HEADER('School Announcement') + `
      <p style="font-size:15px;color:#333;margin:0 0 6px">Hello ${recipientName||'BLE Family'},</p>
      <div style="background:white;border-radius:12px;padding:20px;border-left:4px solid #00c9b1;margin:16px 0">
        <div style="font-size:16px;font-weight:900;color:#1a1a2e;margin-bottom:10px">${title}</div>
        <div style="font-size:14px;color:#444;line-height:1.75;white-space:pre-wrap">${body}</div>
      </div>
      ${audience?`<p style="font-size:11px;color:#999;text-align:center">Sent to: ${audience}</p>`:''}
      ${BTN((siteUrl||SITE())+'/parent','View Portal →')}
    ` + FOOTER
  }),

  conference_confirmed: ({ parentName, teacherName, studentName, slotDate, slotTime, duration, meetingUrl, siteUrl }) => ({
    subject: `📋 Conference Confirmed – ${slotDate} at ${slotTime} | BLE Worldwide`,
    html: HEADER('Conference Confirmed') + `
      <p style="font-size:15px;color:#333;margin:0 0 6px">Hello ${parentName},</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 4px">Your parent-teacher conference has been confirmed.</p>
      ${INFO_BOX([['Teacher',teacherName],['Student',studentName],['Date',slotDate],['Time',slotTime],['Duration',`${duration||30} minutes`]],'#b0eedd')}
      ${meetingUrl?BTN(meetingUrl,'Join Meeting →'):BTN((siteUrl||SITE())+'/parent','View Portal →')}
    ` + FOOTER
  }),

  application_status: ({ applicantName, studentName, status, notes, siteUrl }) => ({
    subject: `📥 Application Update: ${status.charAt(0).toUpperCase()+status.slice(1)} – BLE Worldwide`,
    html: HEADER('Application Update') + `
      <p style="font-size:15px;color:#333;margin:0 0 6px">Hello ${applicantName},</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 4px">
        We have an update regarding the enrollment application for <strong>${studentName}</strong>.
      </p>
      <div style="text-align:center;margin:20px 0;padding:16px;background:white;border-radius:12px;border:1px solid #e0e6f8">
        <div style="font-size:12px;color:#999;text-transform:uppercase;font-weight:700;letter-spacing:1px;margin-bottom:8px">Application Status</div>
        <div style="font-size:22px;font-weight:900;color:${status==='approved'?'#00804a':status==='denied'?'#cc3333':status==='waitlisted'?'#7b5ea7':'#b07800'};text-transform:capitalize">${status}</div>
      </div>
      ${notes?`<p style="font-size:13px;color:#444;background:#f8f9fa;padding:14px;border-radius:10px;line-height:1.6">${notes}</p>`:''}
      <p style="font-size:13px;color:#555;line-height:1.7">If you have questions, please contact us at <a href="mailto:info@bleworldwide.edu" style="color:#00c9b1">info@bleworldwide.edu</a>.</p>
    ` + FOOTER
  }),

  absence_alert: ({ parentName, studentName, date, status, courseName, siteUrl }) => ({
    subject: `Attendance Alert: ${studentName} — ${status} on ${date}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#1a1a2e;padding:20px 24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">BLE Worldwide</h1>
          <p style="color:#aaa;margin:4px 0 0;font-size:13px">Attendance Notification</p>
        </div>
        <div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none">
          <p style="font-size:15px">Hello ${parentName},</p>
          <p style="font-size:14px;color:#444;line-height:1.6">
            This is an attendance update for <strong>${studentName}</strong>.
          </p>
          <div style="background:white;border-radius:10px;padding:16px;margin:16px 0;border:1px solid ${status==='absent'?'#ffcccc':'#ffe0a0'}">
            <div style="margin-bottom:8px"><span style="color:#999;font-size:12px">Date:</span> <strong>${date}</strong></div>
            <div style="margin-bottom:8px"><span style="color:#999;font-size:12px">Status:</span> <strong style="color:${status==='absent'?'#cc3333':'#b07800'}">${status.charAt(0).toUpperCase()+status.slice(1)}</strong></div>
            <div><span style="color:#999;font-size:12px">Course:</span> <strong>${courseName||'—'}</strong></div>
          </div>
          <p style="font-size:13px;color:#666">If you have questions, please contact the school or reply to this email.</p>
          <div style="text-align:center;margin:20px 0">
            <a href="${siteUrl}/parent/attendance" style="background:#00c9b1;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
              View Attendance Record →
            </a>
          </div>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
          <p style="font-size:11px;color:#999;text-align:center">BLE Worldwide · This is an automated notification.</p>
        </div>
      </div>
    `
  }),

  grade_alert: ({ parentName, studentName, assignmentTitle, courseName, grade, points, maxPoints, feedback, siteUrl }) => ({
    subject: `Grade Posted: ${assignmentTitle} — ${studentName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#1a1a2e;padding:20px 24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">BLE Worldwide</h1>
          <p style="color:#aaa;margin:4px 0 0;font-size:13px">Grade Notification</p>
        </div>
        <div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none">
          <p style="font-size:15px">Hello ${parentName},</p>
          <p style="font-size:14px;color:#444;line-height:1.6">
            A grade has been posted for <strong>${studentName}</strong> in <strong>${courseName}</strong>.
          </p>
          <div style="background:white;border-radius:10px;padding:16px;margin:16px 0;border:1px solid #e0e6f8">
            <div style="margin-bottom:8px"><span style="color:#999;font-size:12px">Assignment:</span> <strong>${assignmentTitle}</strong></div>
            <div style="margin-bottom:8px"><span style="color:#999;font-size:12px">Score:</span> <strong>${points}/${maxPoints} pts</strong></div>
            <div style="margin-bottom:8px"><span style="color:#999;font-size:12px">Grade:</span> <strong style="color:#00c9b1;font-size:20px">${grade}</strong></div>
            ${feedback ? `<div style="margin-top:12px;padding:10px;background:#f8f9fa;border-radius:8px;font-size:13px;color:#444;line-height:1.6"><strong>Teacher Feedback:</strong><br>${feedback}</div>` : ''}
          </div>
          <div style="text-align:center;margin:20px 0">
            <a href="${siteUrl}/parent/homework" style="background:#00c9b1;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
              View All Assignments →
            </a>
          </div>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
          <p style="font-size:11px;color:#999;text-align:center">BLE Worldwide · This is an automated notification.</p>
        </div>
      </div>
    `
  }),
  meeting_invite: ({ teacherName, studentName, courseTitle, meetingTitle, platform, meetingUrl, scheduledAt, duration, notes, siteUrl }) => ({
    subject: `Class Meeting Invite: ${meetingTitle} — ${courseTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#1a1a2e;padding:20px 24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">BLE Worldwide</h1>
          <p style="color:#aaa;margin:4px 0 0;font-size:13px">Class Meeting Invitation</p>
        </div>
        <div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none">
          <p style="font-size:15px;margin-bottom:4px">Hello ${studentName},</p>
          <p style="font-size:14px;color:#444;line-height:1.6;margin-top:8px">
            Your teacher <strong>${teacherName}</strong> has scheduled a virtual class meeting for <strong>${courseTitle}</strong>.
          </p>
          <div style="background:white;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #e0e6f8;border-left:4px solid #00c9b1">
            <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:12px">${meetingTitle}</div>
            <div style="display:grid;gap:8px">
              <div><span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Platform</span><br><strong style="font-size:14px">${platform}</strong></div>
              ${scheduledAt ? `<div><span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Date &amp; Time</span><br><strong style="font-size:14px">${scheduledAt}</strong></div>` : ''}
              ${duration ? `<div><span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Duration</span><br><strong style="font-size:14px">${duration} minutes</strong></div>` : ''}
              ${notes ? `<div style="margin-top:8px;padding:10px;background:#f8f9fa;border-radius:8px;font-size:13px;color:#444"><strong>Notes from teacher:</strong><br>${notes}</div>` : ''}
            </div>
          </div>
          ${meetingUrl ? `
          <div style="text-align:center;margin:24px 0">
            <a href="${meetingUrl}" style="background:#00c9b1;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800;font-size:15px;display:inline-block">
              🎥 Join Meeting
            </a>
            <div style="margin-top:10px;font-size:11px;color:#999">Or copy this link: <a href="${meetingUrl}" style="color:#00c9b1">${meetingUrl}</a></div>
          </div>` : ''}
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
          <p style="font-size:11px;color:#999;text-align:center">BLE Worldwide · Sent by ${teacherName}</p>
        </div>
      </div>
    `
  }),

  reminder: ({ recipientName, subject: subj, body, siteUrl }) => ({
    subject: `⏰ Reminder: ${subj} – BLE Worldwide`,
    html: HEADER('Reminder') + `
      <p style="font-size:15px;color:#333;margin:0 0 6px">Hello ${recipientName},</p>
      <div style="background:white;border-radius:12px;padding:20px;border-left:4px solid #ffc845;margin:16px 0">
        <div style="font-size:15px;font-weight:800;margin-bottom:8px">${subj}</div>
        <div style="font-size:14px;color:#444;line-height:1.75">${body}</div>
      </div>
      ${BTN((siteUrl||SITE())+'/parent','View Portal →')}
    ` + FOOTER
  }),
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' }
  try {
    const { to, template, data } = JSON.parse(event.body)
    if (!TEMPLATES[template]) return { statusCode:400, body: JSON.stringify({ error:'Unknown template: '+template }) }
    const { subject, html } = TEMPLATES[template]({ ...data, siteUrl: process.env.SITE_URL })
    await sgMail.send({ to, from: FROM, subject, html })
    return { statusCode:200, body: JSON.stringify({ sent:true }) }
  } catch(err) {
    console.error('SendGrid error:', err?.response?.body || err)
    return { statusCode:500, body: JSON.stringify({ error: err.message }) }
  }
}
