import { sendNotification } from '../../lib/notifications'
import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import NewMessageModal from '../../components/NewMessageModal'

export default function AdminMessages() {
  const { user } = useAuth()
  const [threads,  setThreads]  = useState([])
  const [active,   setActive]   = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg,   setNewMsg]   = useState('')
  const [sending,  setSending]  = useState(false)
  const [showNew,  setShowNew]  = useState(false)
  const [search,   setSearch]   = useState('')

  const activeRef = React.useRef(active)
  useEffect(() => { activeRef.current = active }, [active])

  useEffect(() => {
    if (!user) return
    loadThreads()
    // Realtime subscription — new message arrives instantly
    const channel = supabase.channel('admin-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new
        if (msg.sender_id === user.id || msg.recipient_id === user.id) {
          loadThreads()
          // If this message belongs to the open thread, append it live
          if (activeRef.current && msg.subject === activeRef.current.subject) {
            // Small delay so DB write completes before we re-fetch
            setTimeout(() => loadThread(msg.subject), 100)
          }
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  async function loadThreads() {
    const { data } = await supabase
      .from('messages')
      .select('id,subject,created_at,read,sender:profiles!sender_id(id,full_name,role),recipient:profiles!recipient_id(id,full_name,role)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    const seen = {}
    const deduped = []
    ;(data||[]).forEach(t => {
      const other = t.sender?.id === user.id ? t.recipient?.id : t.sender?.id
      const key = `${t.subject}__${other}`
      if (!seen[key]) { seen[key] = true; deduped.push(t) }
    })
    setThreads(deduped)
  }

  async function loadThread(subject) {
    const { data } = await supabase.from('messages')
      .select('id,body,created_at,sender:profiles!sender_id(id,full_name)')
      .eq('subject', subject)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at')
    // Replace any optimistic temp messages with real DB records
    setMessages(data||[])
  }

  async function openThread(msg) {
    setActive(msg)
    await loadThread(msg.subject)
    await supabase.from('messages').update({ read: true })
      .eq('subject', msg.subject).eq('recipient_id', user.id)
  }

  async function sendMessage() {
    if (!newMsg.trim() || !active) return
    const text = newMsg
    setNewMsg('')
    // Optimistic update — show instantly before DB confirms
    setMessages(prev => [...prev, {
      id: `temp-${Date.now()}`,
      body: text,
      created_at: new Date().toISOString(),
      sender: { id: user.id, full_name: 'You' }
    }])
    setSending(true)
    const otherId = active.sender?.id === user.id ? active.recipient?.id : active.sender?.id
    await supabase.from('messages').insert([{ subject: active.subject, body: text, sender_id: user.id, recipient_id: otherId }])
    setSending(false)
    // Realtime will replace temp message with real one
  }

  async function startThread(recipientId, subject, body) {
    await supabase.from('messages').insert([{ subject, body, sender_id: user.id, recipient_id: recipientId }])
    await sendNotification(recipientId, { title: `💬 New message: ${subject}`, body: body.slice(0, 80), type: 'message', link: '' })
  }

  const filtered = threads.filter(t => {
    const other = t.sender?.id === user.id ? t.recipient : t.sender
    return !search || other?.full_name?.toLowerCase().includes(search.toLowerCase()) || t.subject?.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div>
      <div className="page-header fade-up">
        <h2>Staff & Parent Messages</h2>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Message</button>
      </div>
      <div className="msg-layout fade-up-2">
        <div className="msg-list">
          <div className="msg-list-search">
            <input placeholder="🔍 Search…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          {filtered.length === 0 && <div className="empty-state"><div className="es-icon">💬</div><div className="es-text">No messages yet.</div></div>}
          {filtered.map(t => {
            const other = t.sender?.id === user.id ? t.recipient : t.sender
            return (
              <div key={t.id} className={`msg-thread ${active?.id===t.id?'active':''}`} onClick={() => openThread(t)}>
                <div className="msg-thread-name">{other?.full_name||'Unknown'}</div>
                <div className="msg-thread-prev">{t.subject}</div>
              </div>
            )
          })}
        </div>
        <div className="msg-panel">
          {active ? (
            <>
              <div className="msg-panel-header">
                {(() => { const other = active.sender?.id===user.id?active.recipient:active.sender; return (
                  <><div className="avatar avatar-md av-2" style={{flexShrink:0}}>{other?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'?'}</div>
                  <div><div style={{fontWeight:700,fontSize:13}}>{other?.full_name||'Unknown'}</div>
                  <div style={{fontSize:10,color:'var(--muted)',textTransform:'capitalize'}}>{other?.role||'Staff'}</div></div></>
                )})()}
              </div>
              <div className="msg-bubbles">
                {messages.map(m => <div key={m.id} className={`bubble ${m.sender?.id===user.id?'sent':'recv'}`}>{m.body}</div>)}
              </div>
              <div className="msg-input-area">
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message…" onKeyDown={e => e.key==='Enter'&&sendMessage()}/>
                <button className="btn btn-primary btn-sm" onClick={sendMessage} disabled={sending}>Send ✈️</button>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{margin:'auto'}}><div className="es-icon">💬</div><div className="es-text">Select a conversation</div></div>
          )}
        </div>
      </div>

      {showNew && (
        <NewMessageModal
          senderId={user.id}
          recipientFilter="all"
          onClose={() => setShowNew(false)}
          onSent={(recipientId, subject, body) => { startThread(recipientId, subject, body); setShowNew(false) }}
        />
      )}
    </div>
  )
}
