import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const AUDIENCE_OPTS = ['all','students','parents','teachers']
const AUDIENCE_COLOR = { all:'badge-blue', students:'badge-teal', parents:'badge-green', teachers:'badge-gold' }

export default function AdminAnnouncements() {
  const { user } = useAuth()
  const [list,      setList]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem,  setEditItem]  = useState(null)
  const [blasting,  setBlasting]  = useState(null) // announcement being blasted
  const [blastResult, setBlastResult] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('announcements')
      .select('*,author:profiles!created_by(full_name)').order('published_at',{ascending:false})
    setList(data||[])
    setLoading(false)
  }

  async function del(id) {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id',id)
    load()
  }

  async function sendBlast(id) {
    if (!confirm('Send this announcement as an email to all recipients? This cannot be undone.')) return
    setBlasting(id)
    try {
      const res = await fetch('/.netlify/functions/email-blast', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ announcement_id: id })
      })
      const data = await res.json()
      setBlastResult(data.sent !== undefined ? `✅ Sent to ${data.sent} recipient${data.sent!==1?'s':''}` : '⚠️ ' + (data.error||'Unknown error'))
      load()
    } catch(e) {
      setBlastResult('⚠️ Failed: ' + e.message)
    }
    setBlasting(null)
    setTimeout(()=>setBlastResult(null), 5000)
  }

  return (
    <div>
      {blastResult && <div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:blastResult.startsWith('✅')?'var(--teal)':'#cc3333',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{blastResult}</div>}
      <div className="page-header fade-up">
        <h2>📢 Announcements</h2>
        <button className="btn btn-primary" onClick={()=>{ setEditItem(null); setShowModal(true) }}>+ New Announcement</button>
      </div>
      <div className="card fade-up-2">
        {loading ? <div style={{textAlign:'center',padding:30}}><div className="spinner"/></div>
        : list.length===0 ? <div className="empty-state"><div className="es-icon">📢</div><div className="es-text">No announcements yet.</div></div>
        : list.map(a=>(
            <div key={a.id} style={{padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    <div style={{fontWeight:800,fontSize:14}}>{a.title}</div>
                    <span className={`badge ${AUDIENCE_COLOR[a.audience]||'badge-blue'}`}>{a.audience}</span>
                    {a.grade_level&&<span className="badge badge-blue">{a.grade_level}</span>}
                  </div>
                  <div style={{fontSize:13,color:'var(--text)',lineHeight:1.5,marginBottom:6}}>{a.body}</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>
                    {a.author?.full_name&&<span>By {a.author.full_name} · </span>}
                    {new Date(a.published_at).toLocaleString()}
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0,flexDirection:'column',alignItems:'flex-end'}}>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-sm btn-outline" onClick={()=>{ setEditItem(a); setShowModal(true) }}>✏️</button>
                    <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc'}} onClick={()=>del(a.id)}>🗑</button>
                  </div>
                  {a.email_sent
                    ? <span style={{fontSize:10,color:'#00804a',fontWeight:700}}>📧 Emailed {a.email_count||0}</span>
                    : <button className="btn btn-sm" style={{background:'#e6f4ff',color:'#0050b0',border:'1px solid #b0d4ff',fontSize:11,fontWeight:700}}
                        onClick={()=>sendBlast(a.id)} disabled={blasting===a.id}>
                        {blasting===a.id?'Sending…':'📧 Email Blast'}
                      </button>
                  }
                </div>
              </div>
            </div>
          ))
        }
      </div>
      {showModal&&<AnnouncementModal item={editItem} userId={user.id} onClose={()=>setShowModal(false)} onSaved={()=>{ setShowModal(false); load() }}/>}
    </div>
  )
}

function AnnouncementModal({ item, userId, onClose, onSaved }) {
  const [title,    setTitle]    = useState(item?.title||'')
  const [body,     setBody]     = useState(item?.body||'')
  const [audience, setAudience] = useState(item?.audience||'all')
  const [grade,    setGrade]    = useState(item?.grade_level||'')
  const [saving,   setSaving]   = useState(false)
  const GRADES = ['','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th']

  async function save() {
    if (!title.trim()||!body.trim()) return
    setSaving(true)
    const payload = { title:title.trim(), body:body.trim(), audience, grade_level:grade||null, created_by:userId, published_at:new Date().toISOString() }
    item ? await supabase.from('announcements').update(payload).eq('id',item.id)
         : await supabase.from('announcements').insert([payload])
    setSaving(false); onSaved()
  }

  async function sendBlast(id) {
    if (!confirm('Send this announcement as an email to all recipients? This cannot be undone.')) return
    setBlasting(id)
    try {
      const res = await fetch('/.netlify/functions/email-blast', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ announcement_id: id })
      })
      const data = await res.json()
      setBlastResult(data.sent !== undefined ? `✅ Sent to ${data.sent} recipient${data.sent!==1?'s':''}` : '⚠️ ' + (data.error||'Unknown error'))
      load()
    } catch(e) {
      setBlastResult('⚠️ Failed: ' + e.message)
    }
    setBlasting(null)
    setTimeout(()=>setBlastResult(null), 5000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
        <div className="modal-header">
          <div className="modal-title">{item?'✏️ Edit':'📢 New'} Announcement</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-group">
          <label className="input-label">Title</label>
          <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Announcement title"/>
        </div>
        <div className="form-group">
          <label className="input-label">Message</label>
          <textarea className="input" rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder="Write your announcement…" style={{resize:'vertical'}}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="form-group">
            <label className="input-label">Audience</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {AUDIENCE_OPTS.map(a=>(
                <button key={a} onClick={()=>setAudience(a)} style={{padding:'5px 12px',borderRadius:20,border:'2px solid',fontWeight:700,fontSize:11,cursor:'pointer',textTransform:'capitalize',
                  borderColor:audience===a?'var(--teal)':'var(--border)',background:audience===a?'var(--teal)':'white',color:audience===a?'white':'var(--muted)'}}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="input-label">Grade Level (optional)</label>
            <select className="select" value={grade} onChange={e=>setGrade(e.target.value)}>
              {GRADES.map(g=><option key={g} value={g}>{g||'— All Grades —'}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving||!title.trim()||!body.trim()}>{saving?'Saving…':'Publish'}</button>
        </div>
      </div>
    </div>
  )
}
