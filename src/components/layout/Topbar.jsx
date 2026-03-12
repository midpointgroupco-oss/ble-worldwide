import GlobalSearch from './GlobalSearch'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

// ── Shared hook — any portal can use this ─────────────────────────────────
export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!user) return
    fetchNotifs()
    // Realtime subscription
    const channel = supabase.channel('notif-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        payload => setNotifications(prev => [payload.new, ...prev])
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  async function fetchNotifs() {
    const { data } = await supabase.from('notifications')
      .select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(30)
    setNotifications(data || [])
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function clearAll() {
    await supabase.from('notifications').delete().eq('user_id', user.id)
    setNotifications([])
  }

  const unread = notifications.filter(n => !n.read).length

  return { notifications, unread, markRead, markAllRead, clearAll, fetchNotifs }
}

// ── Notification type icons ───────────────────────────────────────────────
const TYPE_ICON = {
  enrollment:  '🎓',
  message:     '💬',
  grade:       '📊',
  assignment:  '📝',
  billing:     '💳',
  application: '📥',
  report_card: '📋',
  announcement:'📣',
  system:      '⚙️',
  info:        '🔔',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Topbar component ──────────────────────────────────────────────────────
export default function Topbar({ title, onMenuClick }) {
  const { profile } = useAuth()
  const { notifications, unread, markRead, markAllRead, clearAll } = useNotifications()
  const [showNotif, setShowNotif] = useState(false)
  const panelRef = useRef(null)

  return (
    <>
      <header style={{
        background: 'white', height: 60,
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 12,
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 2px 10px rgba(18,16,58,.06)'
      }}>
        <button className="hamburger-btn" onClick={onMenuClick} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,padding:'0 6px',display:'flex',alignItems:'center',flexShrink:0}}>☰</button>
        <div style={{ fontFamily:'Nunito,sans-serif', fontWeight:900, fontSize:18, flex:1 }}>{title}</div>

        <GlobalSearch role={profile?.role}/>

        {/* Bell button */}
        <button
          onClick={() => setShowNotif(p => !p)}
          style={{ position:'relative', width:34, height:34, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', border:'1.5px solid var(--border)', cursor:'pointer', fontSize:14 }}
        >
          🔔
          {unread > 0 && (
            <div style={{ position:'absolute', top:-4, right:-4, minWidth:16, height:16, background:'var(--coral)', borderRadius:8, border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'white', padding:'0 3px' }}>
              {unread > 9 ? '9+' : unread}
            </div>
          )}
        </button>

        <div style={{ width:34, height:34, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,var(--teal),var(--sky))', color:'white', fontWeight:800, fontSize:12, cursor:'pointer' }}>
          {profile?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '?'}
        </div>
      </header>

      {/* Notification panel */}
      {showNotif && (
        <div ref={panelRef} style={{ position:'fixed', top:68, right:16, width:340, background:'white', borderRadius:14, boxShadow:'0 8px 36px rgba(18,16,58,.18)', zIndex:200, overflow:'hidden', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
          {/* Header */}
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontFamily:'Nunito,sans-serif', fontWeight:800, fontSize:14 }}>
              🔔 Notifications
              {unread > 0 && <span style={{ marginLeft:8, background:'var(--coral)', color:'white', borderRadius:8, fontSize:10, fontWeight:900, padding:'1px 6px' }}>{unread}</span>}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {unread > 0 && (
                <button onClick={markAllRead} style={{ fontSize:10, color:'var(--teal)', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} style={{ fontSize:10, color:'var(--muted)', background:'none', border:'none', cursor:'pointer' }}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY:'auto', flex:1 }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign:'center', padding:30 }}>
                <div style={{ fontSize:30, marginBottom:8 }}>🔔</div>
                <div style={{ fontSize:13, fontWeight:700 }}>All caught up!</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>No notifications yet.</div>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    display:'flex', gap:10, padding:'11px 16px',
                    borderBottom:'1px solid var(--border)', cursor:'pointer',
                    background: n.read ? 'white' : '#f0fdf9',
                    transition:'background .15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = n.read ? 'var(--bg)' : '#e0faf3'}
                  onMouseLeave={e => e.currentTarget.style.background = n.read ? 'white' : '#f0fdf9'}
                >
                  <div style={{ fontSize:20, flexShrink:0, marginTop:1 }}>{TYPE_ICON[n.type] || '🔔'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight: n.read ? 600 : 800, lineHeight:1.4 }}>{n.title}</div>
                    {n.body && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</div>}
                    <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.read && <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--teal)', flexShrink:0, marginTop:5 }}/>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showNotif && <div style={{ position:'fixed', inset:0, zIndex:199 }} onClick={() => setShowNotif(false)}/>}
    </>
  )
}
