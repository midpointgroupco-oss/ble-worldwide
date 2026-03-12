import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const STATUS_META = {
  requested:  { color:'#b07800', bg:'#fff9e6', label:'Requested'  },
  confirmed:  { color:'#00804a', bg:'#e6fff4', label:'Confirmed'  },
  cancelled:  { color:'#cc3333', bg:'#fff0f0', label:'Cancelled'  },
  completed:  { color:'#555',    bg:'#f5f5f5', label:'Completed'  },
}

export default function AdminConferences() {
  const { profile } = useAuth()
  const isTeacher = profile?.role === 'teacher'
  const [conferences, setConferences] = useState([])
  const [slots,       setSlots]       = useState([])
  const [teachers,    setTeachers]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('requests') // requests | slots
  const [showSlotModal, setShowSlotModal] = useState(false)
  const [slotForm,    setSlotForm]    = useState({ teacher_id:'', slot_date:'', slot_time:'', duration_min:30 })
  const [saving,      setSaving]      = useState(false)
  const [toast,       setToast]       = useState(null)
  const [filterTeacher, setFilterTeacher] = useState(isTeacher ? profile.id : '')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: conf }, { data: sl }, { data: tchs }] = await Promise.all([
      supabase.from('conferences').select('*, teacher:profiles!teacher_id(id,full_name), parent:profiles!parent_id(full_name,email), student:students(full_name,grade_level)').order('slot_date',{ascending:false}),
      supabase.from('conference_slots').select('*, teacher:profiles!teacher_id(full_name)').order('slot_date').order('slot_time'),
      supabase.from('profiles').select('id,full_name').eq('role','teacher').order('full_name'),
    ])
    setConferences(conf||[])
    setSlots(sl||[])
    setTeachers(tchs||[])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  async function updateStatus(id, status, meetingUrl='') {
    const update = { status }
    if (meetingUrl) update.meeting_url = meetingUrl
    await supabase.from('conferences').update(update).eq('id', id)
    loadAll(); showToast(`✅ Marked as ${status}`)
  }

  async function addSlot() {
    if (!slotForm.slot_date || !slotForm.slot_time) return
    setSaving(true)
    const tid = isTeacher ? profile.id : slotForm.teacher_id
    await supabase.from('conference_slots').insert([{ ...slotForm, teacher_id: tid, duration_min: Number(slotForm.duration_min)||30 }])
    setSaving(false); setShowSlotModal(false)
    setSlotForm({ teacher_id:'', slot_date:'', slot_time:'', duration_min:30 })
    loadAll(); showToast('✅ Slot added')
  }

  async function deleteSlot(id) {
    if (!confirm('Delete this slot?')) return
    await supabase.from('conference_slots').delete().eq('id', id)
    loadAll()
  }

  const filteredConf  = conferences.filter(c => !filterTeacher || c.teacher_id === filterTeacher)
  const filteredSlots = slots.filter(s => !filterTeacher || s.teacher_id === filterTeacher)
  const pending       = filteredConf.filter(c => c.status === 'requested').length

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}

      <div className="page-header fade-up">
        <div>
          <h2>📋 Parent-Teacher Conferences</h2>
          <div style={{fontSize:13,color:'var(--muted)'}}>{pending>0?<span style={{color:'#b07800',fontWeight:700}}>{pending} pending request{pending!==1?'s':''}</span>:'All caught up'}</div>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowSlotModal(true)}>+ Add Availability</button>
      </div>

      {/* Filter */}
      {!isTeacher && (
        <div style={{marginBottom:14}}>
          <select className="input" style={{maxWidth:220}} value={filterTeacher} onChange={e=>setFilterTeacher(e.target.value)}>
            <option value="">All Teachers</option>
            {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:0,marginBottom:0,borderBottom:'2px solid var(--border)'}}>
        {[['requests',`📥 Requests${pending>0?' ('+pending+')':''}`],['slots','🗓 Availability']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'9px 18px',border:'none',borderBottom:tab===k?'3px solid var(--teal)':'3px solid transparent',marginBottom:-2,background:'none',fontWeight:tab===k?800:500,color:tab===k?'var(--teal)':'var(--muted)',cursor:'pointer',fontSize:13}}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
      : tab==='requests' ? (
        <div className="card fade-up" style={{padding:0,overflow:'hidden'}}>
          {filteredConf.length===0 ? <div className="empty-state" style={{padding:40}}><div className="es-icon">📋</div><div className="es-text">No conference requests yet</div></div>
          : filteredConf.map(c=>{
              const sm = STATUS_META[c.status]||STATUS_META.requested
              return (
                <div key={c.id} style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:38,height:38,borderRadius:10,background:sm.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>📋</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                      <span style={{fontWeight:700,fontSize:13}}>{c.parent?.full_name||'—'} re: {c.student?.full_name||'—'}</span>
                      <span style={{fontSize:10,fontWeight:700,color:sm.color,background:sm.bg,padding:'1px 8px',borderRadius:6,textTransform:'capitalize'}}>{c.status}</span>
                    </div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                      Teacher: {c.teacher?.full_name||'—'} · {c.slot_date} at {c.slot_time} · {c.duration_min||30} min
                    </div>
                    {c.notes&&<div style={{fontSize:11,color:'var(--text)',marginTop:3,lineHeight:1.5}}>{c.notes}</div>}
                    {c.meeting_url&&<a href={c.meeting_url} target="_blank" rel="noreferrer" style={{fontSize:11,fontWeight:700,color:'var(--teal)',textDecoration:'none',display:'inline-block',marginTop:4}}>🎥 {c.meeting_url}</a>}
                    {c.status==='requested' && (
                      <div style={{display:'flex',gap:8,marginTop:8}}>
                        <button className="btn btn-primary btn-sm" onClick={()=>{
                          const url = prompt('Enter meeting URL (optional):','')
                          updateStatus(c.id,'confirmed', url||'')
                        }}>✅ Confirm</button>
                        <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc'}} onClick={()=>updateStatus(c.id,'cancelled')}>❌ Cancel</button>
                      </div>
                    )}
                    {c.status==='confirmed' && (
                      <button className="btn btn-sm btn-outline" style={{marginTop:8}} onClick={()=>updateStatus(c.id,'completed')}>✔️ Mark Completed</button>
                    )}
                  </div>
                </div>
              )
            })
          }
        </div>
      ) : (
        <div className="card fade-up" style={{padding:0,overflow:'hidden'}}>
          {filteredSlots.length===0 ? <div className="empty-state" style={{padding:40}}><div className="es-icon">🗓</div><div className="es-text">No availability slots yet. Click "+ Add Availability" to add some.</div></div>
          : filteredSlots.map(sl=>(
              <div key={sl.id} style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'center'}}>
                <span style={{fontSize:18}}>🗓</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13}}>{sl.slot_date} at {sl.slot_time} · {sl.duration_min||30} min</div>
                  {!isTeacher&&<div style={{fontSize:11,color:'var(--muted)'}}>{sl.teacher?.full_name||'—'}</div>}
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:sl.is_booked?'#e6fff4':'var(--bg)',color:sl.is_booked?'#00804a':'var(--muted)'}}>{sl.is_booked?'Booked':'Open'}</span>
                {!sl.is_booked&&<button onClick={()=>deleteSlot(sl.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--muted)'}}>🗑</button>}
              </div>
            ))
          }
        </div>
      )}

      {showSlotModal && (
        <div className="modal-overlay" onClick={()=>setShowSlotModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
            <div className="modal-header">
              <div className="modal-title">🗓 Add Availability Slot</div>
              <button className="modal-close" onClick={()=>setShowSlotModal(false)}>✕</button>
            </div>
            {!isTeacher && (
              <div className="form-group">
                <label className="input-label">Teacher</label>
                <select className="input" value={slotForm.teacher_id} onChange={e=>setSlotForm(p=>({...p,teacher_id:e.target.value}))}>
                  <option value="">— Select teacher —</option>
                  {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="input-label">Date *</label>
                <input className="input" type="date" value={slotForm.slot_date} onChange={e=>setSlotForm(p=>({...p,slot_date:e.target.value}))} min={new Date().toISOString().split('T')[0]}/>
              </div>
              <div className="form-group">
                <label className="input-label">Time *</label>
                <input className="input" type="time" value={slotForm.slot_time} onChange={e=>setSlotForm(p=>({...p,slot_time:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="input-label">Duration (minutes)</label>
              <select className="input" value={slotForm.duration_min} onChange={e=>setSlotForm(p=>({...p,duration_min:e.target.value}))}>
                {[15,20,30,45,60].map(n=><option key={n} value={n}>{n} min</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setShowSlotModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addSlot} disabled={saving||!slotForm.slot_date||!slotForm.slot_time}>{saving?'Saving…':'Add Slot'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
