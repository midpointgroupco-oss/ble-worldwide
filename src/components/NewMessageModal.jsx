import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const AV = ['av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8']

/**
 * NewMessageModal
 * Props:
 *   recipientFilter — 'admin_teacher' | 'parents' | 'teachers' | 'staff' | 'all'
 *   preselect       — { id, full_name } optionally pre-fill recipient
 *   onClose         — fn()
 *   onSent          — fn(recipientId, subject, body)
 *
 * Role-based contact scoping:
 *   student  → can only message teachers + admins (not other students or parents)
 *   parent   → can only message teachers + admins (not other parents or students)
 *   teacher  → can only message parents + admins (not other teachers or students)
 *   admin    → can message anyone (teachers, parents, students)
 */
export default function NewMessageModal({ recipientFilter = 'all', preselect, onClose, onSent }) {
  const { user, profile } = useAuth()
  const [contacts, setContacts] = useState([])
  const [selected, setSelected] = useState(preselect || null)
  const [subject,  setSubject]  = useState('')
  const [body,     setBody]     = useState('')
  const [sending,  setSending]  = useState(false)
  const [search,   setSearch]   = useState('')

  useEffect(() => { loadContacts() }, [recipientFilter, profile])

  async function loadContacts() {
    if (!user) return
    let query = supabase.from('profiles').select('id,full_name,role,subject,grade_assigned').neq('id', user.id)

    // Scope contacts by role — never show everyone to everyone
    const role = profile?.role
    if (role === 'student') {
      // Students can only message teachers and admins
      query = query.in('role', ['teacher', 'admin'])
    } else if (role === 'parent') {
      // Parents can only message teachers and admins
      query = query.in('role', ['teacher', 'admin'])
    } else if (role === 'teacher') {
      // Teachers can message parents, students, other teachers, and admins
      query = query.in('role', ['parent', 'student', 'teacher', 'admin'])
    } else if (role === 'admin' || role === 'super_admin') {
      // Admins can message anyone — but apply passed filter if given
      if (recipientFilter === 'parents')       query = query.eq('role', 'parent')
      else if (recipientFilter === 'teachers') query = query.eq('role', 'teacher')
      else if (recipientFilter === 'students') query = query.eq('role', 'student')
      else if (recipientFilter === 'staff')    query = query.in('role', ['teacher', 'admin'])
      // else 'all' — no extra filter for admin
    }

    const { data } = await query.order('full_name')
    setContacts(data || [])
  }

  async function handleSend() {
    if (!selected || !subject.trim() || !body.trim()) return
    setSending(true)
    await onSent(selected.id, subject.trim(), body.trim())
    setSending(false)
  }

  const filtered = contacts.filter(c =>
    !search || c.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const roleLabel = { admin:'Admin', teacher:'Teacher', parent:'Parent', student:'Student', super_admin:'Super Admin' }
  const roleColor = { admin:'var(--violet)', teacher:'var(--teal)', parent:'#0050b0', student:'#f72585', super_admin:'#cc3333' }

  // Group contacts by role for cleaner UI
  const grouped = {}
  filtered.forEach(c => {
    const r = c.role || 'other'
    if (!grouped[r]) grouped[r] = []
    grouped[r].push(c)
  })
  const roleOrder = ['admin', 'super_admin', 'teacher', 'parent', 'student']
  const sortedGroups = roleOrder.filter(r => grouped[r]?.length > 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:520,maxHeight:'90vh',display:'flex',flexDirection:'column'}}>
        <div className="modal-header">
          <div className="modal-title">💬 New Message</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {!selected ? (
          <>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>Select a recipient:</div>
            <input
              className="input" style={{marginBottom:10}}
              placeholder="🔍 Search by name…"
              value={search} onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            <div style={{overflowY:'auto',flex:1,border:'1px solid var(--border)',borderRadius:10,marginBottom:14}}>
              {filtered.length === 0 && (
                <div style={{padding:20,textAlign:'center',fontSize:12,color:'var(--muted)'}}>No contacts found.</div>
              )}
              {sortedGroups.map(role => (
                <div key={role}>
                  <div style={{padding:'6px 14px',fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:.8,color:'var(--muted)',background:'var(--bg)',borderBottom:'1px solid var(--border)'}}>
                    {roleLabel[role] || role}s
                  </div>
                  {grouped[role].map((c, i) => (
                    <div
                      key={c.id}
                      onClick={() => setSelected(c)}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--border)',transition:'background .1s'}}
                      className="msg-thread"
                    >
                      <div className={`avatar avatar-sm ${AV[i%8]}`} style={{flexShrink:0}}>
                        {c.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:13}}>{c.full_name}</div>
                        <div style={{fontSize:10,color:'var(--muted)'}}>{c.subject || c.grade_assigned || ''}</div>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:roleColor[c.role]||'var(--muted)',background:'#f0f0f0',padding:'2px 8px',borderRadius:20}}>
                        {roleLabel[c.role] || c.role}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--bg)',borderRadius:10,marginBottom:12}}>
              <div className="avatar avatar-sm av-2">{selected.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{selected.full_name}</div>
                <div style={{fontSize:10,color:'var(--muted)',textTransform:'capitalize'}}>{roleLabel[selected.role] || selected.role}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{fontSize:11,color:'var(--teal)',background:'none',border:'none',cursor:'pointer',fontWeight:700}}>Change</button>
            </div>
            <div className="form-group">
              <label className="input-label">Subject</label>
              <input className="input" placeholder="e.g. Question about upcoming assignment" value={subject} onChange={e => setSubject(e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="input-label">Message</label>
              <textarea className="input" rows={4} placeholder="Type your message here…" value={body} onChange={e => setBody(e.target.value)} style={{resize:'vertical'}}/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}>
                {sending ? 'Sending…' : 'Send Message ✈️'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
