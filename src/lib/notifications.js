import { supabase } from './supabase'

// Send a notification to a specific user
export async function sendNotification(userId, { title, body='', type='info', link='' }) {
  await supabase.from('notifications').insert([{ user_id: userId, title, body, type, link }])
}

// Send a notification to all admins and super_admins
export async function notifyAdmins(title, body='', type='info', link='') {
  const { data: admins } = await supabase.from('profiles')
    .select('id').in('role', ['admin','super_admin'])
  if (!admins?.length) return
  await supabase.from('notifications').insert(
    admins.map(a => ({ user_id: a.id, title, body, type, link }))
  )
}
