const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const supabaseUrl     = process.env.VITE_SUPABASE_URL
  const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) }
  }

  // Admin client with service role — can create users
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) }
  }

  const { mode, email, password, full_name, role, phone, subject, grade_assigned, timezone, notes, is_admin } = body

  try {
    if (mode === 'invite') {
      // Send magic link invite — user sets their own password
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name, role: role || 'teacher' }
      })
      if (error) throw error

      // Update profile with extra fields
      await supabase.from('profiles').update({
        full_name, role: role || 'teacher', phone, subject, grade_assigned, timezone, notes, email, is_admin: is_admin || false
      }).eq('id', data.user.id)

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: `Invite sent to ${email}` })
      }
    }

    if (mode === 'create') {
      // Create user with password — admin sets credentials
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role: role || 'teacher' }
      })
      if (error) throw error

      // Update profile with extra fields
      await supabase.from('profiles').update({
        full_name, role: role || 'teacher', phone, subject, grade_assigned, timezone, notes, email, is_admin: is_admin || false
      }).eq('id', data.user.id)

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: `Account created for ${full_name}` })
      }
    }

    if (mode === 'update') {
      const { userId } = body
      const { error } = await supabase.from('profiles').update({
        full_name, role, phone, subject, grade_assigned, timezone, notes, is_admin: is_admin || false
      }).eq('id', userId)
      if (error) throw error

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Profile updated' })
      }
    }

    if (mode === 'delete') {
      const { userId } = body
      const { error } = await supabase.auth.admin.deleteUser(userId)
      if (error) throw error

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'User deleted' })
      }
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid mode' }) }

  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message || 'Something went wrong' })
    }
  }
}
