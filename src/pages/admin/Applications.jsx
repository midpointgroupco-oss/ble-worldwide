import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const STATUS_META = {
  pending:   { color:'#b07800', bg:'#fff9e6', border:'#ffe599', badge:'badge-gold',  icon:'⏳', label:'Pending'   },
  reviewing: { color:'#0050b0', bg:'#e6f4ff', border:'#b0d4ff', badge:'badge-blue',  icon:'🔍', label:'Reviewing' },
  approved:  { color:'#00804a', bg:'#e6fff4', border:'#b0eedd', badge:'badge-green', icon:'✅', label:'Approved'  },
  denied:    { color:'#cc3333', bg:'#fff0f0', border:'#ffcccc', badge:'badge-red',   icon:'❌', label:'Denied'    },
  waitlisted:{ color:'#7b5ea7', bg:'#f3eeff', border:'#d4b8ff', badge:'badge-purple',icon:'📋', label:'Waitlisted'},
}

export default function AdminApplications() {
  const navigate = useNavigate()
  const [apps,           setApps]           = useState([])
  const [loading,        setLoading]        = useState(true)
  const [selected,       setSelected]       = useState(null)
  const [filter,         setFilter]         = useState('all')
  const [search,         setSearch]         = useState('')
  const [sort,           setSort]           = useState('newest')
  const [reviewNotes,    setReviewNotes]    = useState('')
  const [denyReason,     setDenyReason]     = useState('')
  const [confirmDeny,    setConfirmDeny]    = useState(false)
  const [processing,     setProcessing]     = useState(false)
  const [toast,          setToast]          = useState(null)
  const [createdStudent, setCreatedStudent] = useState(null)
  const toastRef = useRef(null)

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (selected) {
      setReviewNotes(selected.review_notes || '')
      setDenyReason('')
      setConfirmDeny(false)
    }
  }, [selected?.id])

  function showToast(msg, type='success') {
    setToast({ msg, type })
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(null), 4000)
  }

  async function load() {
    const { data, error } = await supabase
      .from('enrollment_applications')
      .select('*')
      .order('submitted_at', { ascending: false })
    if (error) console.error('Load error:', error)
    setApps(data || [])
    setLoading(false)
  }

  // ── Status update + side-effects ──────────────────────────────────────────
  async function updateStatus(id, status) {
    setProcessing(true)
    const app = apps.find(a => a.id === id)
    const notes = status === 'denied' ? denyReason : reviewNotes

    // 1. Update DB
    const { error } = await supabase.from('enrollment_applications').update({
      status,
      review_notes: notes || null,
      reviewed_at:  new Date().toISOString(),
    }).eq('id', id)

    if (error) {
      showToast('Failed to update status: ' + error.message, 'error')
      setProcessing(false)
      return
    }

    // 2. Notify applicant by email
    try {
      const subjectMap = {
        reviewing:  `Your BLE Worldwide Application is Under Review`,
        approved:   `🎉 Congratulations — Your Application is Approved!`,
        denied:     `BLE Worldwide Application Update`,
        waitlisted: `BLE Worldwide — Application Waitlisted`,
      }
      const bodyMap = {
        reviewing:  `<p>Dear ${app.guardian_name},</p><p>We wanted to let you know that we are currently reviewing <strong>${app.student_name}'s</strong> enrollment application. We will be in touch shortly.</p>`,
        approved:   `<p>Dear ${app.guardian_name},</p><p>We are delighted to inform you that <strong>${app.student_name}'s</strong> application to BLE Worldwide has been <strong>approved</strong>! You will receive a separate email with your parent portal login credentials shortly.</p>${notes?`<p><em>Note from admin: ${notes}</em></p>`:''}`,
        denied:     `<p>Dear ${app.guardian_name},</p><p>After careful review, we regret that we are unable to admit <strong>${app.student_name}</strong> at this time.</p>${notes?`<p>Reason: ${notes}</p>`:''}<p>You are welcome to reapply in a future term.</p>`,
        waitlisted: `<p>Dear ${app.guardian_name},</p><p><strong>${app.student_name}'s</strong> application has been placed on our waitlist. We will contact you if a space becomes available.</p>`,
      }
      if (subjectMap[status]) {
        await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to:      app.guardian_email,
            subject: subjectMap[status],
            html:    (bodyMap[status] || '') + `<p style="color:#888;font-size:12px">BLE Worldwide · Global Online Education</p>`
          })
        })
      }
    } catch(e) { console.error('Email failed:', e) }

    // 3. Auto-create student + invite parent on approval
    if (status === 'approved') {
      await autoCreateStudent(app)
    }

    // 4. Refresh + update selected
    await load()
    setSelected(s => s?.id === id ? { ...s, status, review_notes: notes } : s)
    setConfirmDeny(false)
    showToast(`Application ${status}${status==='approved'?' — student record created':''}`)
    setProcessing(false)
  }

  async function autoCreateStudent(app) {
    // Check if student already exists by guardian email + name
    const { data: existing } = await supabase
      .from('students')
      .select('id,full_name')
      .eq('guardian_email', app.guardian_email)
      .eq('full_name', app.student_name)
      .maybeSingle()

    if (existing) { setCreatedStudent({ ...existing, alreadyExisted: true }); return }

    const { data: newStudent, error } = await supabase.from('students').insert([{
      full_name:       app.student_name,
      grade_level:     app.grade_applying,        // ← fixed: was reading grade_level
      country:         app.country || '',
      guardian_name:   app.guardian_name,
      guardian_email:  app.guardian_email,
      guardian_phone:  app.guardian_phone || '',
      status:          'active',
      enrollment_date: new Date().toISOString().split('T')[0],
    }]).select().single()

    if (error) { console.error('Student create error:', error); return }

    setCreatedStudent(newStudent)

    // Invite parent — fixed payload to match invite-parent.js
    try {
      const res = await fetch('/.netlify/functions/invite-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardian_email: app.guardian_email,     // ← fixed field names
          guardian_name:  app.guardian_name,
          student_name:   app.student_name,
          student_grade:  app.grade_applying,
        })
      })
      const result = await res.json()
      if (!result.success) console.error('Invite error:', result)
    } catch(e) { console.error('Invite failed:', e) }
  }

  async function saveNotes() {
    if (!selected) return
    await supabase.from('enrollment_applications')
      .update({ review_notes: reviewNotes })
      .eq('id', selected.id)
    setSelected(s => ({ ...s, review_notes: reviewNotes }))
    setApps(prev => prev.map(a => a.id === selected.id ? { ...a, review_notes: reviewNotes } : a))
    showToast('Notes saved')
  }

  // ── Filtering + sorting ───────────────────────────────────────────────────
  const filtered = apps
    .filter(a => {
      if (filter !== 'all' && a.status !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        return a.student_name?.toLowerCase().includes(q) ||
               a.guardian_name?.toLowerCase().includes(q) ||
               a.guardian_email?.toLowerCase().includes(q) ||
               a.country?.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.submitted_at) - new Date(a.submitted_at)
      if (sort === 'oldest') return new Date(a.submitted_at) - new Date(b.submitted_at)
      if (sort === 'name')   return a.student_name?.localeCompare(b.student_name)
      return 0
    })

  const counts = Object.fromEntries(
    Object.keys(STATUS_META).map(s => [s, apps.filter(a => a.status === s).length])
  )
  const totalPending = counts.pending + counts.reviewing

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{position:'relative'}}>

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,
          background:toast.type==='error'?'#cc3333':'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)',
          animation:'fadeIn .2s ease'}}>
          {toast.type==='error'?'⚠️':'✅'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="page-header fade-up">
        <div>
          <h2>📥 Enrollment Applications</h2>
          <div style={{fontSize:13,color:'var(--muted)',marginTop:2}}>
            {apps.length} total · <span style={{color:totalPending>0?'#b07800':'var(--muted)',fontWeight:totalPending>0?700:400}}>{totalPending} need attention</span>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={()=>window.open('/apply','_blank')}>
          🔗 View Application Form
        </button>
      </div>

      {/* Auto-create banner */}
      {createdStudent && (
        <div style={{padding:'12px 16px',background:'#f0fdf9',border:'2px solid var(--teal)',borderRadius:12,marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontSize:24}}>🎓</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:14,color:'var(--teal)'}}>
              {createdStudent.alreadyExisted ? 'Student Already Exists' : 'Student Record Created!'}
            </div>
            <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
              {createdStudent.alreadyExisted
                ? `${createdStudent.full_name} was already in the student roster.`
                : `A student profile for ${createdStudent.full_name} has been created and a parent portal invite has been sent.`
              }
              {!createdStudent.alreadyExisted && (
                <span style={{marginLeft:8,color:'var(--teal)',cursor:'pointer',fontWeight:700,textDecoration:'underline'}}
                  onClick={()=>navigate(`/admin/students/${createdStudent.id}`)}>View student →</span>
              )}
            </div>
          </div>
          <button onClick={()=>setCreatedStudent(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)'}}>✕</button>
        </div>
      )}

      {/* Status filter tiles */}
      <div className="grid-5 fade-up-2" style={{marginBottom:16,display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
        {Object.entries(STATUS_META).map(([s, m]) => (
          <div key={s} onClick={() => setFilter(filter===s?'all':s)}
            style={{background:'white',borderRadius:12,padding:'12px 10px',textAlign:'center',cursor:'pointer',
              border: filter===s ? `2px solid ${m.color}` : '2px solid transparent',
              boxShadow: filter===s ? `0 2px 12px ${m.color}22` : 'var(--sh)',
              transition:'all .15s'}}>
            <div style={{fontSize:20,marginBottom:3}}>{m.icon}</div>
            <div style={{fontWeight:900,fontSize:18,color:m.color}}>{counts[s]||0}</div>
            <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',fontWeight:600,letterSpacing:.5}}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Search + sort */}
      <div style={{display:'flex',gap:10,marginBottom:14,alignItems:'center'}}>
        <input className="input" style={{maxWidth:260}} placeholder="🔍 Search name, email, country…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="input" style={{maxWidth:150}} value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">By name</option>
        </select>
        {(filter!=='all'||search) && (
          <button className="btn btn-outline btn-sm" onClick={()=>{setFilter('all');setSearch('')}}>Clear ✕</button>
        )}
        <div style={{marginLeft:'auto',fontSize:12,color:'var(--muted)'}}>{filtered.length} result{filtered.length!==1?'s':''}</div>
      </div>

      {/* Split: list + detail */}
      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 1.1fr':'1fr',gap:16,alignItems:'start'}}>

        {/* ── Application list ── */}
        <div className="card fade-up-3" style={{padding:0,overflow:'hidden'}}>
          {loading
            ? <div style={{padding:40,textAlign:'center'}}><div className="spinner"/></div>
            : filtered.length === 0
              ? <div className="empty-state" style={{padding:40}}><div className="es-icon">📋</div><div className="es-text">No applications found</div></div>
              : filtered.map((a, i) => {
                  const m = STATUS_META[a.status] || STATUS_META.pending
                  const isSelected = selected?.id === a.id
                  return (
                    <div key={a.id} onClick={() => setSelected(isSelected ? null : a)}
                      style={{padding:'13px 16px',borderBottom:'1px solid var(--border)',cursor:'pointer',
                        background: isSelected ? '#f0f9ff' : i%2===0 ? 'white' : '#fafbff',
                        borderLeft: isSelected ? `3px solid var(--teal)` : '3px solid transparent',
                        transition:'all .12s'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:36,height:36,borderRadius:10,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0,border:`1px solid ${m.border}`}}>
                          {m.icon}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.student_name}</div>
                          <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>
                            {a.grade_applying} · {a.country||'—'} · {a.guardian_name}
                          </div>
                          <div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>{new Date(a.submitted_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                        </div>
                        <span className={`badge ${m.badge}`} style={{flexShrink:0}}>{m.label}</span>
                      </div>
                      {a.review_notes && (
                        <div style={{marginTop:6,fontSize:11,color:'var(--muted)',paddingLeft:46,fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          📝 {a.review_notes}
                        </div>
                      )}
                    </div>
                  )
                })
          }
        </div>

        {/* ── Application detail panel ── */}
        {selected && (
          <div style={{position:'sticky',top:80}}>
            <div className="card fade-up" style={{marginBottom:12}}>
              {/* Detail header */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                <div>
                  <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:17}}>{selected.student_name}</div>
                  <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
                    Applied {new Date(selected.submitted_at).toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'})}
                  </div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span className={`badge ${STATUS_META[selected.status]?.badge||'badge-gold'}`} style={{fontSize:12}}>
                    {STATUS_META[selected.status]?.icon} {STATUS_META[selected.status]?.label}
                  </span>
                  <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'var(--muted)'}}>✕</button>
                </div>
              </div>

              {/* Student details */}
              <InfoSection label="👤 Student" rows={[
                ['Name',           selected.student_name],
                ['Grade Applying',  selected.grade_applying],
                ['Date of Birth',   selected.date_of_birth || '—'],
                ['Country',         selected.country || '—'],
                ['Nationality',     selected.student_nationality || '—'],
                ['Previous School', selected.previous_school || '—'],
                ['IEP / Special',   selected.has_iep === 'yes' ? (selected.special_needs || 'Yes') : 'No'],
              ]}/>

              {/* Guardian details */}
              <InfoSection label="👪 Guardian" rows={[
                ['Name',         selected.guardian_name],
                ['Relationship', selected.guardian_relationship || 'Parent'],
                ['Email',        selected.guardian_email],
                ['Phone',        selected.guardian_phone || '—'],
                ['Address',      selected.guardian_address || '—'],
              ]}/>

              {/* Additional */}
              {(selected.start_date || selected.how_heard || selected.notes) && (
                <InfoSection label="📝 Additional" rows={[
                  ['Start Date', selected.start_date || 'Flexible'],
                  ['How Heard',  selected.how_heard || '—'],
                  ['Notes',      selected.notes || '—'],
                ]}/>
              )}
            </div>

            {/* Review actions */}
            <div className="card">
              <div style={{fontWeight:800,fontSize:13,marginBottom:12}}>⚙️ Review Actions</div>

              {/* Review notes */}
              <div className="form-group">
                <label className="input-label">Internal Review Notes</label>
                <textarea className="input" rows={3} style={{resize:'vertical',fontSize:12}}
                  placeholder="Notes visible only to admins…"
                  value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)}/>
                <div style={{display:'flex',justifyContent:'flex-end',marginTop:6}}>
                  <button className="btn btn-outline btn-sm" onClick={saveNotes}>💾 Save Notes</button>
                </div>
              </div>

              {/* Status buttons */}
              <div style={{borderTop:'1px solid var(--border)',paddingTop:12,marginTop:4}}>
                <div style={{fontSize:11,color:'var(--muted)',fontWeight:700,marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>Change Status</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {['reviewing','approved','waitlisted'].map(s => {
                    const m = STATUS_META[s]
                    const isCurrent = selected.status === s
                    return (
                      <button key={s} disabled={isCurrent || processing}
                        onClick={() => updateStatus(selected.id, s)}
                        style={{padding:'7px 14px',borderRadius:8,border:`1.5px solid ${isCurrent?m.color:m.border}`,
                          background:isCurrent?m.bg:'white',color:m.color,fontWeight:700,fontSize:12,cursor:isCurrent?'default':'pointer',
                          opacity:isCurrent?.7:1,transition:'all .12s'}}>
                        {m.icon} {m.label}
                      </button>
                    )
                  })}
                </div>

                {/* Deny — requires reason */}
                <div style={{marginTop:10}}>
                  {!confirmDeny ? (
                    <button disabled={selected.status==='denied'||processing}
                      onClick={()=>setConfirmDeny(true)}
                      style={{padding:'7px 14px',borderRadius:8,border:'1.5px solid #ffcccc',background:'white',color:'#cc3333',fontWeight:700,fontSize:12,cursor:'pointer',opacity:selected.status==='denied'?.6:1}}>
                      ❌ Deny Application
                    </button>
                  ) : (
                    <div style={{background:'#fff5f5',border:'1px solid #ffcccc',borderRadius:10,padding:'12px 14px'}}>
                      <div style={{fontWeight:700,fontSize:12,color:'#cc3333',marginBottom:8}}>Confirm Denial</div>
                      <textarea className="input" rows={2} style={{fontSize:12,marginBottom:8,borderColor:'#ffcccc'}}
                        placeholder="Reason for denial (will be sent to applicant)…"
                        value={denyReason} onChange={e=>setDenyReason(e.target.value)}/>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-outline btn-sm" onClick={()=>setConfirmDeny(false)}>Cancel</button>
                        <button disabled={processing}
                          onClick={()=>updateStatus(selected.id,'denied')}
                          style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#cc3333',color:'white',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                          {processing?'…':'Confirm Deny'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notification log */}
              {selected.reviewed_at && (
                <div style={{marginTop:12,padding:'8px 12px',background:'var(--bg)',borderRadius:8,fontSize:11,color:'var(--muted)'}}>
                  Last reviewed {new Date(selected.reviewed_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
                </div>
              )}

              {/* Quick approve → view student */}
              {selected.status === 'approved' && (
                <button className="btn btn-outline btn-sm" style={{marginTop:10,width:'100%'}}
                  onClick={async () => {
                    const { data } = await supabase.from('students')
                      .select('id').eq('guardian_email', selected.guardian_email).eq('full_name', selected.student_name).maybeSingle()
                    if (data) navigate(`/admin/students/${data.id}`)
                    else showToast('Student record not found — try approving again','error')
                  }}>
                  👤 View Student Record →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoSection({ label, rows }) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{fontWeight:700,color:'var(--muted)',fontSize:10,textTransform:'uppercase',letterSpacing:.8,marginBottom:6}}>{label}</div>
      <div style={{background:'var(--bg)',borderRadius:10,padding:'8px 12px',display:'flex',flexDirection:'column',gap:4}}>
        {rows.map(([k,v]) => (
          <div key={k} style={{display:'flex',gap:8,fontSize:12}}>
            <span style={{color:'var(--muted)',minWidth:110,flexShrink:0}}>{k}</span>
            <span style={{fontWeight:600,wordBreak:'break-word'}}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
