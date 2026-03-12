import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const PLATFORM_META = {
  zoom:        { icon:'🎥', label:'Zoom',        color:'#2D8CFF', bg:'#e8f3ff', oauthFn:'oauth-zoom'   },
  google_meet: { icon:'🟢', label:'Google Meet', color:'#00897B', bg:'#e6f9f7', oauthFn:'oauth-google' },
  teams:       { icon:'💜', label:'MS Teams',    color:'#6264A7', bg:'#f0eeff', oauthFn:'oauth-teams'  },
  other:       { icon:'🌐', label:'Other',        color:'#555',    bg:'#f5f5f5', oauthFn:null           },
}
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export default function AdminMeetings() {
  const { profile } = useAuth()
  const [meetings,       setMeetings]       = useState([])
  const [courses,        setCourses]        = useState([])
  const [teachers,       setTeachers]       = useState([])
  const [allTokens,      setAllTokens]      = useState([])
  const [myTokens,       setMyTokens]       = useState({})
  const [loading,        setLoading]        = useState(true)
  const [showModal,      setShowModal]      = useState(false)
  const [showInteg,      setShowInteg]      = useState(false)
  const [activeIntegTab, setActiveIntegTab] = useState('overview')
  const [editItem,       setEditItem]       = useState(null)
  const [form,           setForm]           = useState({ course_id:'', teacher_id:'', title:'', meeting_url:'', platform:'zoom', scheduled_at:'', duration_min:60, recurring:false, recurrence:'weekly', day_of_week:1, recurring_time:'09:00', notes:'' })
  const [saving,         setSaving]         = useState(false)
  const [creating,       setCreating]       = useState(false)
  const [toast,          setToast]          = useState(null)
  const [oauthStatus,    setOauthStatus]    = useState(null)
  const [filterCourse,   setFilterCourse]   = useState('')

  useEffect(() => {
    loadAll()
    const params = new URLSearchParams(window.location.search)
    const success = params.get('oauth_success')
    const error   = params.get('oauth_error')
    if (success || error) {
      setOauthStatus(success ? 'success' : 'error')
      setTimeout(() => setOauthStatus(null), 4000)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function loadAll() {
    const [{ data: mtgs }, { data: crs }, { data: tchs }] = await Promise.all([
      supabase.from('class_meetings').select('*, course:courses(id,name,grade_level), teacher:profiles!teacher_id(full_name)').order('scheduled_at',{ascending:false}),
      supabase.from('courses').select('id,name,grade_level,teacher_id').eq('is_active',true).order('name'),
      supabase.from('profiles').select('id,full_name,email').eq('role','teacher').order('full_name'),
    ])
    setMeetings(mtgs||[]); setCourses(crs||[]); setTeachers(tchs||[])
    try {
      const { data: tokens } = await supabase.from('oauth_tokens').select('user_id,platform,account_email,account_name,updated_at')
      setAllTokens(tokens||[])
      const mine = {}
      ;(tokens||[]).filter(t => t.user_id === profile?.id).forEach(t => { mine[t.platform] = { email: t.account_email, name: t.account_name } })
      setMyTokens(mine)
    } catch(_) {}
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3500) }
  function openNew() { setEditItem(null); setForm({ course_id:'', teacher_id:'', title:'', meeting_url:'', platform:'zoom', scheduled_at:'', duration_min:60, recurring:false, recurrence:'weekly', day_of_week:1, recurring_time:'09:00', notes:'' }); setShowModal(true) }
  function openEdit(m) { setEditItem(m); setForm({...m, scheduled_at: m.scheduled_at?.slice(0,16)||''});  setShowModal(true) }

  function getTeacherToken(teacherId, platform) {
    return allTokens.find(t => t.user_id === teacherId && t.platform === platform)
  }

  function connectMyAccount(platform) {
    const fn = PLATFORM_META[platform]?.oauthFn
    if (!fn || !profile?.id) return
    window.location.href = '/.netlify/functions/' + fn + '?state=' + profile.id
  }

  async function disconnectAccount(userId, platform) {
    await fetch('/.netlify/functions/oauth-disconnect', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId, platform })
    })
    loadAll(); showToast('Account disconnected')
  }

  async function saveMeeting() {
    if (!form.title.trim()) return
    setSaving(true)
    let meetingUrl = form.meeting_url
    const teacherId = form.teacher_id || profile.id
    const platformKey = form.platform
    const hasManualUrl = !!form.meeting_url?.trim()
    const teacherToken = getTeacherToken(teacherId, platformKey)
    const adminToken   = getTeacherToken(profile.id, platformKey)
    const useToken     = teacherToken || adminToken

    if (useToken && !hasManualUrl && !editItem && platformKey !== 'other') {
      setCreating(true)
      try {
        const res = await fetch('/.netlify/functions/create-meeting', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ userId: useToken.user_id, platform: platformKey, title: form.title, scheduled_at: form.scheduled_at||null, duration_min: Number(form.duration_min)||60, notes: form.notes||'' })
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to create meeting')
        meetingUrl = data.join_url
        showToast(PLATFORM_META[platformKey]?.label + ' meeting created!')
      } catch(e) {
        showToast('Failed: ' + e.message)
        setSaving(false); setCreating(false); return
      }
      setCreating(false)
    }

    const payload = { ...form, meeting_url: meetingUrl, teacher_id: teacherId, duration_min: Number(form.duration_min)||60, day_of_week: Number(form.day_of_week)||1 }
    if (editItem) await supabase.from('class_meetings').update(payload).eq('id', editItem.id)
    else          await supabase.from('class_meetings').insert([payload])
    setSaving(false); setShowModal(false)
    loadAll(); showToast(editItem ? 'Meeting updated' : 'Meeting added')
  }

  async function deleteMeeting(id) {
    if (!confirm('Delete this meeting?')) return
    await supabase.from('class_meetings').delete().eq('id', id)
    loadAll(); showToast('Deleted')
  }

  const filtered = meetings.filter(m => !filterCourse || m.course_id === filterCourse)
  const upcoming = filtered.filter(m => !m.scheduled_at || new Date(m.scheduled_at) >= new Date())
  const past     = filtered.filter(m => m.scheduled_at && new Date(m.scheduled_at) < new Date())
  const selectedTeacherToken = form.teacher_id ? getTeacherToken(form.teacher_id, form.platform) : null
  const adminOwnToken        = getTeacherToken(profile?.id, form.platform)
  const effectiveToken       = selectedTeacherToken || adminOwnToken

  function MeetingCard({ m }) {
    const p  = PLATFORM_META[m.platform] || PLATFORM_META.other
    const dt = m.scheduled_at ? new Date(m.scheduled_at) : null
    return (
      <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'flex-start'}}>
        <div style={{width:36,height:36,borderRadius:10,background:p.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{p.icon}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontWeight:700,fontSize:13}}>{m.title}</span>
            <span style={{fontSize:10,fontWeight:700,color:p.color,background:p.bg,padding:'1px 6px',borderRadius:4}}>{p.label}</span>
            {m.recurring&&<span style={{fontSize:10,color:'var(--muted)',background:'var(--bg)',padding:'1px 6px',borderRadius:4}}>Recurring {m.recurrence}</span>}
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
            {m.course?.name||'—'} · {m.teacher?.full_name||'—'}
            {dt&&<> · {dt.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} {dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</>}
            {m.duration_min&&<> · {m.duration_min} min</>}
          </div>
          {m.notes&&<div style={{fontSize:11,color:'var(--text)',marginTop:2}}>{m.notes}</div>}
          {m.meeting_url&&(
            <a href={m.meeting_url} target="_blank" rel="noreferrer"
              style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:5,fontSize:11,fontWeight:700,color:p.color,textDecoration:'none',padding:'3px 10px',borderRadius:6,background:p.bg,border:'1px solid '+p.color+'30'}}>
              {p.icon} Join Meeting
            </a>
          )}
        </div>
        <div style={{display:'flex',gap:4,flexShrink:0}}>
          <button onClick={()=>openEdit(m)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--muted)'}}>✏️</button>
          <button onClick={()=>deleteMeeting(m.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--muted)'}}>🗑</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}
      {oauthStatus&&<div style={{position:'fixed',top:20,right:24,zIndex:1000,padding:'12px 20px',borderRadius:10,fontWeight:700,fontSize:13,boxShadow:'0 4px 20px rgba(0,0,0,.2)',background:oauthStatus==='success'?'#00804a':'#cc3333',color:'white'}}>
        {oauthStatus==='success'?'Account connected!':'Failed to connect. Please try again.'}
      </div>}

      <div className="page-header fade-up">
        <div>
          <h2>🎥 Class Meetings</h2>
          <div style={{fontSize:13,color:'var(--muted)'}}>{meetings.length} meetings total</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-outline" onClick={()=>setShowInteg(true)}>
            🔌 Integrations
            {allTokens.length > 0 && (
              <span style={{marginLeft:6,background:'#00c9b1',color:'white',borderRadius:10,padding:'1px 7px',fontSize:10,fontWeight:800}}>
                {allTokens.length}
              </span>
            )}
          </button>
          <button className="btn btn-primary" onClick={openNew}>+ Add Meeting</button>
        </div>
      </div>

      <div className="grid-4 fade-up-2" style={{marginBottom:16}}>
        {Object.entries(PLATFORM_META).map(([k,p]) => {
          const count = meetings.filter(m=>m.platform===k).length
          return count > 0 ? (
            <div key={k} className="stat-card" style={{border:'1px solid '+p.color+'20'}}>
              <div className="stat-icon">{p.icon}</div>
              <div className="stat-value" style={{color:p.color}}>{count}</div>
              <div className="stat-label">{p.label}</div>
            </div>
          ) : null
        }).filter(Boolean)}
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-value" style={{color:'var(--teal)'}}>{meetings.filter(m=>m.recurring).length}</div>
          <div className="stat-label">Recurring</div>
        </div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:14,alignItems:'center'}}>
        <select className="input" style={{maxWidth:220}} value={filterCourse} onChange={e=>setFilterCourse(e.target.value)}>
          <option value="">All Courses</option>
          {courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid-2 fade-up-3">
        <div>
          <div style={{fontWeight:800,fontSize:13,color:'var(--muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>Upcoming</div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {loading?<div style={{padding:40,textAlign:'center'}}><div className="spinner"/></div>
            :upcoming.length===0?<div className="empty-state" style={{padding:30}}><div className="es-icon">🎥</div><div className="es-text">No upcoming meetings</div></div>
            :upcoming.map(m=><MeetingCard key={m.id} m={m}/>)}
          </div>
        </div>
        <div>
          <div style={{fontWeight:800,fontSize:13,color:'var(--muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>Past / Recurring</div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {loading?<div style={{padding:40,textAlign:'center'}}><div className="spinner"/></div>
            :past.length===0&&!meetings.filter(m=>m.recurring).length?<div className="empty-state" style={{padding:30}}><div className="es-text">None yet</div></div>
            :[...meetings.filter(m=>m.recurring),...past].filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i).map(m=><MeetingCard key={m.id} m={m}/>)}
          </div>
        </div>
      </div>

      {showInteg && (
        <div className="modal-overlay" onClick={()=>setShowInteg(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:620}}>
            <div className="modal-header">
              <div className="modal-title">🔌 Video Platform Integrations</div>
              <button className="modal-close" onClick={()=>setShowInteg(false)}>✕</button>
            </div>
            <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'2px solid var(--border)'}}>
              {[{key:'overview',label:'Teacher Overview'},{key:'my_accounts',label:'My Admin Accounts'}].map(tab=>(
                <button key={tab.key} onClick={()=>setActiveIntegTab(tab.key)}
                  style={{padding:'8px 18px',fontWeight:700,fontSize:13,background:'none',border:'none',cursor:'pointer',
                    borderBottom:activeIntegTab===tab.key?'3px solid var(--teal)':'3px solid transparent',
                    color:activeIntegTab===tab.key?'var(--teal)':'var(--muted)',marginBottom:-2}}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeIntegTab==='overview' && (
              <div>
                <p style={{fontSize:13,color:'var(--muted)',marginBottom:16,lineHeight:1.6}}>
                  Which teachers have connected their video accounts. When you create a meeting for a teacher, their token is used automatically.
                </p>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead>
                    <tr style={{background:'var(--bg)'}}>
                      <th style={{textAlign:'left',padding:'8px 10px',fontWeight:700,color:'var(--muted)',fontSize:11,textTransform:'uppercase',letterSpacing:.5}}>Teacher</th>
                      {['zoom','google_meet','teams'].map(pk=>(
                        <th key={pk} style={{textAlign:'center',padding:'8px 10px',fontWeight:700,color:PLATFORM_META[pk].color,fontSize:11}}>
                          {PLATFORM_META[pk].icon} {PLATFORM_META[pk].label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher,i)=>(
                      <tr key={teacher.id} style={{borderTop:'1px solid var(--border)',background:i%2===0?'white':'var(--bg)'}}>
                        <td style={{padding:'10px 10px'}}>
                          <div style={{fontWeight:700,fontSize:13}}>{teacher.full_name}</div>
                          <div style={{fontSize:11,color:'var(--muted)'}}>{teacher.email}</div>
                        </td>
                        {['zoom','google_meet','teams'].map(pk=>{
                          const tok = getTeacherToken(teacher.id, pk)
                          return (
                            <td key={pk} style={{textAlign:'center',padding:'10px 6px'}}>
                              {tok ? (
                                <div>
                                  <div style={{display:'inline-flex',alignItems:'center',gap:4,background:'#e6fff4',color:'#00804a',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>
                                    ✓ Connected
                                  </div>
                                  <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>{tok.account_email||tok.account_name||''}</div>
                                  <button onClick={()=>disconnectAccount(teacher.id, pk)}
                                    style={{marginTop:4,fontSize:10,color:'#cc3333',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>
                                    Disconnect
                                  </button>
                                </div>
                              ) : (
                                <span style={{display:'inline-flex',alignItems:'center',gap:4,background:'#fff0f0',color:'#cc3333',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>
                                  Not connected
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    {teachers.length===0&&<tr><td colSpan={4} style={{padding:24,textAlign:'center',color:'var(--muted)',fontSize:13}}>No teachers found.</td></tr>}
                  </tbody>
                </table>
                <div style={{background:'#f8f9fc',borderRadius:10,padding:'12px 14px',fontSize:12,color:'var(--muted)',marginTop:16,lineHeight:1.7}}>
                  <strong>Note:</strong> Teachers connect their own accounts from Teacher portal Meetings page. You can disconnect any account from here if needed.
                </div>
              </div>
            )}

            {activeIntegTab==='my_accounts' && (
              <div>
                <p style={{fontSize:13,color:'var(--muted)',marginBottom:16,lineHeight:1.6}}>
                  Connect your own admin accounts. Used as fallback when creating meetings if the assigned teacher has no connection.
                </p>
                {['zoom','google_meet','teams'].map(pk=>{
                  const p    = PLATFORM_META[pk]
                  const conn = myTokens[pk]
                  return (
                    <div key={pk} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:12,border:'1px solid var(--border)',marginBottom:10,background:conn?p.bg:'white'}}>
                      <div style={{width:44,height:44,borderRadius:12,background:p.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{p.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:14,color:p.color}}>{p.label}</div>
                        {conn
                          ? <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>Connected as <strong>{conn.name||conn.email}</strong></div>
                          : <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>Not connected</div>
                        }
                      </div>
                      {conn
                        ? <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc',fontSize:12}} onClick={()=>disconnectAccount(profile.id, pk)}>Disconnect</button>
                        : <button className="btn btn-sm btn-primary" style={{fontSize:12,background:p.color}} onClick={()=>connectMyAccount(pk)}>Connect</button>
                      }
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
            <div className="modal-header">
              <div className="modal-title">{editItem?'Edit Meeting':'Add Class Meeting'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="input-label">Title *</label>
              <input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Math Live Class"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="input-label">Course</label>
                <select className="input" value={form.course_id||''} onChange={e=>setForm(p=>({...p,course_id:e.target.value}))}>
                  <option value="">Select course</option>
                  {courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Teacher</label>
                <select className="input" value={form.teacher_id||''} onChange={e=>setForm(p=>({...p,teacher_id:e.target.value}))}>
                  <option value="">Select teacher</option>
                  {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="input-label">Platform</label>
                <select className="input" value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))}>
                  {Object.entries(PLATFORM_META).map(([k,m])=><option key={k} value={k}>{m.icon} {m.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Duration (min)</label>
                <input className="input" type="number" min={15} max={240} step={15} value={form.duration_min} onChange={e=>setForm(p=>({...p,duration_min:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="input-label">Meeting URL</label>
              {effectiveToken && !editItem && form.platform!=='other' ? (
                <div style={{background:'#e6f9f7',border:'1px solid #b0ece6',borderRadius:10,padding:'10px 14px',fontSize:13}}>
                  <div style={{fontWeight:700,color:'#00897B',marginBottom:2}}>
                    ✅ {PLATFORM_META[form.platform]?.label} connected
                    <span style={{fontWeight:400,fontSize:11,color:'var(--muted)',marginLeft:6}}>
                      ({selectedTeacherToken?'teacher account':'your admin account'})
                    </span>
                  </div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>Meeting will be created automatically on save</div>
                  <input className="input" type="url" value={form.meeting_url||''} onChange={e=>setForm(p=>({...p,meeting_url:e.target.value}))} placeholder="Leave blank to auto-create" style={{marginTop:8}}/>
                </div>
              ) : (
                <div>
                  <input className="input" type="url" value={form.meeting_url||''} onChange={e=>setForm(p=>({...p,meeting_url:e.target.value}))} placeholder="https://zoom.us/j/…"/>
                  {form.platform!=='other'&&!effectiveToken&&(
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>
                      No {PLATFORM_META[form.platform]?.label} account connected.
                      <button type="button" onClick={()=>{setShowModal(false);setShowInteg(true);setActiveIntegTab('my_accounts')}}
                        style={{background:'none',border:'none',cursor:'pointer',color:'var(--teal)',fontWeight:700,padding:'0 4px',fontSize:11}}>
                        Connect one now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <input type="checkbox" id="am-recurring" checked={form.recurring} onChange={e=>setForm(p=>({...p,recurring:e.target.checked}))}/>
              <label htmlFor="am-recurring" style={{fontSize:13,fontWeight:600}}>Recurring meeting</label>
            </div>
            {form.recurring ? (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                <div className="form-group">
                  <label className="input-label">Frequency</label>
                  <select className="input" value={form.recurrence} onChange={e=>setForm(p=>({...p,recurrence:e.target.value}))}>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Day of Week</label>
                  <select className="input" value={form.day_of_week} onChange={e=>setForm(p=>({...p,day_of_week:e.target.value}))}>
                    {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Start Time</label>
                  <input className="input" type="time" value={form.recurring_time||'09:00'} onChange={e=>setForm(p=>({...p,recurring_time:e.target.value}))}/>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="input-label">Date and Time</label>
                <input className="input" type="datetime-local" value={form.scheduled_at||''} onChange={e=>setForm(p=>({...p,scheduled_at:e.target.value}))}/>
              </div>
            )}
            <div className="form-group">
              <label className="input-label">Notes</label>
              <textarea className="input" rows={2} value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={{resize:'vertical'}}/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveMeeting} disabled={saving||creating||!form.title.trim()}>
                {creating?'Creating meeting…':saving?'Saving…':'Save Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
