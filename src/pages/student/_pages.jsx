import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import NewMessageModal from '../../components/NewMessageModal'

// ── Shared data hook ──────────────────────────────────────────────────────
function useStudentData() {
  const { user } = useAuth()
  const [student, setStudent] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof?.student_id_ref) { setLoading(false); return }
      const { data: stu } = await supabase.from('students').select('*').eq('id', prof.student_id_ref).single()
      if (!stu) { setLoading(false); return }
      setStudent(stu)
      const { data: enrollments } = await supabase.from('enrollments')
        .select('course:courses(id,name,subject,grade_level,credits,teacher:profiles!teacher_id(full_name))')
        .eq('student_id', prof.student_id_ref).eq('status','active')
      setCourses((enrollments||[]).map(e=>e.course).filter(Boolean))
      setLoading(false)
    }
    load()
  }, [user])

  return { student, courses, loading }
}

function letterGrade(pct) {
  if (pct==null) return '—'
  if (pct>=93) return 'A'; if (pct>=90) return 'A-'
  if (pct>=87) return 'B+'; if (pct>=83) return 'B'; if (pct>=80) return 'B-'
  if (pct>=77) return 'C+'; if (pct>=73) return 'C'; if (pct>=70) return 'C-'
  if (pct>=67) return 'D+'; if (pct>=60) return 'D'
  return 'F'
}
function gradeColor(pct) {
  if (pct==null) return 'var(--muted)'
  if (pct>=90) return '#00b86b'; if (pct>=80) return 'var(--teal)'
  if (pct>=70) return '#ffc845'; if (pct>=60) return '#ff8c42'
  return 'var(--coral)'
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
export function StudentDashboard() {
  const { profile } = useAuth()
  const { student, courses, loading } = useStudentData()
  const [assignments,   setAssignments]   = useState([])
  const [submissions,   setSubmissions]   = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [attendance,    setAttendance]    = useState([])
  const [dataLoading,   setDataLoading]   = useState(true)

  useEffect(() => {
    if (!student || courses.length===0) { setDataLoading(false); return }
    loadAll()
  }, [student, courses])

  async function loadAll() {
    const ids = courses.map(c=>c.id)
    const [{ data: asgns }, { data: subs }, { data: ann }, { data: att }] = await Promise.all([
      supabase.from('assignments').select('*,course:courses(name,subject)').in('course_id', ids).order('due_date').limit(10),
      supabase.from('submissions').select('*').eq('student_id', student.id),
      supabase.from('announcements').select('*,author:profiles!created_by(full_name)').in('audience',['all','students']).order('published_at',{ascending:false}).limit(3),
      supabase.from('attendance').select('*').eq('student_id', student.id),
    ])
    setAssignments(asgns||[])
    setSubmissions(subs||[])
    setAnnouncements(ann||[])
    setAttendance(att||[])
    setDataLoading(false)
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Student'
  const subMap    = Object.fromEntries((submissions||[]).map(s=>[s.assignment_id, s]))
  const pending   = assignments.filter(a => { const s=subMap[a.id]; return !s || s.status==='pending' })
  const upcoming  = pending.filter(a => a.due_date && new Date(a.due_date) >= new Date()).slice(0,5)
  const overdue   = pending.filter(a => a.due_date && new Date(a.due_date) < new Date())

  // Attendance rate
  const present   = attendance.filter(a=>a.status==='present'||a.status==='late').length
  const attRate   = attendance.length ? Math.round((present/attendance.length)*100) : null

  // Overall grade
  const graded = submissions.filter(s=>s.status==='graded'&&s.points!=null)
  const overallPct = graded.length
    ? Math.round(graded.reduce((a,s)=>a+Number(s.points||0),0) / graded.reduce((a,s)=>{
        const asgn=assignments.find(x=>x.id===s.assignment_id); return a+(asgn?.max_points||100)
      },0) * 100)
    : null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (!student && !loading) return (
    <div className="card" style={{textAlign:'center',padding:40,marginTop:20}}>
      <div style={{fontSize:48,marginBottom:12}}>🎓</div>
      <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:16,marginBottom:6}}>Student Profile Not Linked</div>
      <div style={{fontSize:12,color:'var(--muted)'}}>Ask your admin to link your student profile to this account.</div>
    </div>
  )

  return (
    <div>
      <div className="banner fade-up" style={{background:'linear-gradient(135deg,#0a1628,#1a3060,#0a2a4a)'}}>
        <h2>{greeting}, {firstName}! 👋</h2>
        <p>{student?.grade_level} Grade · BLE Worldwide</p>
        <div className="banner-stats">
          <div><div className="bs-num">{loading||dataLoading?'…':courses.length}</div><div className="bs-lbl">Active Courses</div></div>
          <div><div className="bs-num">{loading||dataLoading?'…':upcoming.length}</div><div className="bs-lbl">Due Soon</div></div>
          <div><div className="bs-num" style={{color:overdue.length?'#ff6b6b':'inherit'}}>{loading||dataLoading?'…':overdue.length}</div><div className="bs-lbl">Overdue</div></div>
          <div><div className="bs-num">{loading||dataLoading?'…':attRate!=null?attRate+'%':'—'}</div><div className="bs-lbl">Attendance</div></div>
        </div>
      </div>

      {loading||dataLoading ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div> : (
        <div className="grid-2 fade-up-2" style={{gap:16}}>
          <div>
            {/* Course grades */}
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">📊 Course Grades</div>
                {overallPct!=null && <span style={{fontWeight:900,fontSize:16,color:gradeColor(overallPct)}}>{overallPct}% · {letterGrade(overallPct)}</span>}
              </div>
              {courses.length===0
                ? <div className="empty-state"><div className="es-icon">📚</div><div className="es-text">No courses enrolled.</div></div>
                : courses.map(c => {
                    const cSubs = submissions.filter(s => { const a=assignments.find(x=>x.id===s.assignment_id); return a?.course_id===c.id && s.status==='graded' && s.points!=null })
                    const cAsgns = assignments.filter(a=>a.course_id===c.id)
                    const cPts = cSubs.reduce((a,s)=>a+Number(s.points||0),0)
                    const cMax = cSubs.reduce((a,s)=>{const asgn=cAsgns.find(x=>x.id===s.assignment_id);return a+(asgn?.max_points||100)},0)
                    const pct = cSubs.length&&cMax ? Math.round((cPts/cMax)*100) : null
                    return (
                      <div key={c.id} className="prog-item">
                        <div className="prog-label">
                          <span style={{fontWeight:700}}>{c.name}</span>
                          <span style={{fontWeight:800,color:gradeColor(pct)}}>{pct!=null?`${pct}% · ${letterGrade(pct)}`:'No grades yet'}</span>
                        </div>
                        <div className="prog-bar"><div className="prog-fill" style={{width:`${pct||0}%`,background:`linear-gradient(90deg,${gradeColor(pct)},var(--sky))`}}/></div>
                        <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>{c.teacher?.full_name||'Unassigned'} · {cSubs.length} graded</div>
                      </div>
                    )
                  })
              }
            </div>

            {/* Announcements */}
            {announcements.length > 0 && (
              <div className="card">
                <div className="card-header"><div className="card-title">📣 Latest Announcements</div></div>
                {announcements.map(a=>(
                  <div key={a.id} style={{padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                    <div style={{fontWeight:700,fontSize:13}}>{a.title}</div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:2,lineHeight:1.5}}>{a.body?.slice(0,120)}{a.body?.length>120?'…':''}</div>
                    <div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>{new Date(a.published_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            {/* Due soon */}
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">📅 Due Soon</div></div>
              {upcoming.length===0
                ? <div className="empty-state" style={{padding:20}}><div className="es-icon">✅</div><div className="es-text">All caught up!</div></div>
                : upcoming.map(a => {
                    const daysLeft = a.due_date ? Math.ceil((new Date(a.due_date)-new Date())/(1000*60*60*24)) : null
                    return (
                      <div key={a.id} style={{display:'flex',gap:10,padding:'9px 0',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                        <div style={{width:36,height:36,borderRadius:8,background:'#e6f4ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>📝</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title}</div>
                          <div style={{fontSize:10,color:'var(--muted)'}}>{a.course?.name}</div>
                        </div>
                        {daysLeft!=null&&<div style={{fontSize:11,fontWeight:800,color:daysLeft<=1?'var(--coral)':daysLeft<=3?'#ffc845':'var(--teal)',flexShrink:0}}>
                          {daysLeft===0?'Today':daysLeft===1?'Tomorrow':`${daysLeft}d`}
                        </div>}
                      </div>
                    )
                  })
              }
              {overdue.length > 0 && (
                <div style={{marginTop:10,padding:'8px 12px',background:'#fff0f0',borderRadius:8}}>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--coral)'}}>⚠️ {overdue.length} overdue assignment{overdue.length>1?'s':''}</div>
                  {overdue.map(a=><div key={a.id} style={{fontSize:11,color:'var(--muted)',marginTop:3}}>· {a.title} ({a.course?.name})</div>)}
                </div>
              )}
            </div>

            {/* Recent grades */}
            <div className="card">
              <div className="card-header"><div className="card-title">🏆 Recent Grades</div></div>
              {graded.length===0
                ? <div className="empty-state" style={{padding:20}}><div className="es-icon">📊</div><div className="es-text">No grades yet.</div></div>
                : graded.slice(0,5).map(s=>{
                    const a=assignments.find(x=>x.id===s.assignment_id)
                    const pct=a?.max_points?Math.round((s.points/a.max_points)*100):null
                    return (
                      <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a?.title||'Assignment'}</div>
                          <div style={{fontSize:10,color:'var(--muted)'}}>{a?.course?.name||''}</div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontWeight:900,fontSize:14,color:gradeColor(pct)}}>{s.points}/{a?.max_points||100}</div>
                          <div style={{fontSize:10,fontWeight:700,color:gradeColor(pct)}}>{letterGrade(pct)}</div>
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── HOMEWORK ──────────────────────────────────────────────────────────────
export function StudentHomework() {
  const { user } = useAuth()
  const { student, courses, loading: ls } = useStudentData()
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState({})
  const [loading,     setLoading]     = useState(true)
  const [submitModal, setSubmitModal] = useState(null)
  const [filter,      setFilter]      = useState('pending')

  useEffect(() => {
    if (!student || courses.length===0) { setLoading(false); return }
    load()
  }, [student, courses])

  async function load() {
    const ids = courses.map(c=>c.id)
    const { data: asgns } = await supabase.from('assignments')
      .select('*,course:courses(name,subject)').in('course_id',ids).order('due_date')
    const { data: subs } = await supabase.from('submissions')
      .select('*').eq('student_id', student.id)
    const subMap = Object.fromEntries((subs||[]).map(s=>[s.assignment_id,s]))
    setAssignments(asgns||[])
    setSubmissions(subMap)
    setLoading(false)
  }

  const filtered = assignments.filter(a => {
    const sub = submissions[a.id]
    if (filter==='pending') return !sub || sub.status==='pending'
    if (filter==='submitted') return sub?.status==='submitted'
    if (filter==='graded') return sub?.status==='graded'
    return true
  })

  const counts = {
    pending:   assignments.filter(a=>{ const s=submissions[a.id]; return !s||s.status==='pending' }).length,
    submitted: assignments.filter(a=>submissions[a.id]?.status==='submitted').length,
    graded:    assignments.filter(a=>submissions[a.id]?.status==='graded').length,
  }

  return (
    <div>
      <div className="page-header fade-up"><h2>📚 Homework & Assignments</h2></div>

      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[['pending','⏳ Pending',counts.pending],['submitted','✅ Submitted',counts.submitted],['graded','🏆 Graded',counts.graded],['all','📋 All',assignments.length]].map(([k,l,n])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{padding:'6px 14px',borderRadius:20,border:'none',cursor:'pointer',fontSize:12,fontWeight:filter===k?800:500,
            background:filter===k?'var(--teal)':'var(--bg)',color:filter===k?'white':'var(--text)'}}>
            {l} {n>0&&<span style={{background:filter===k?'rgba(255,255,255,.25)':'var(--border)',borderRadius:10,padding:'1px 5px',fontSize:10}}>{n}</span>}
          </button>
        ))}
      </div>

      {ls||loading ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
      : filtered.length===0 ? <div className="empty-state"><div className="es-icon">✅</div><div className="es-text">Nothing here.</div></div>
      : filtered.map(a => {
          const sub = submissions[a.id]
          const isOverdue = a.due_date && new Date(a.due_date) < new Date() && (!sub || sub.status==='pending')
          const pct = sub?.status==='graded'&&sub.points!=null&&a.max_points ? Math.round((sub.points/a.max_points)*100) : null
          return (
            <div key={a.id} className="card fade-up" style={{marginBottom:10,borderLeft:`4px solid ${isOverdue?'var(--coral)':sub?.status==='graded'?'var(--teal)':sub?.status==='submitted'?'var(--sky)':'var(--border)'}`}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    <div style={{fontWeight:800,fontSize:14}}>{a.title}</div>
                    {isOverdue && <span className="badge badge-red" style={{fontSize:9}}>OVERDUE</span>}
                    {sub?.status==='submitted' && <span className="badge badge-blue" style={{fontSize:9}}>SUBMITTED</span>}
                    {sub?.status==='graded' && <span className="badge badge-green" style={{fontSize:9}}>GRADED</span>}
                  </div>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>{a.course?.name} · {a.assignment_type||'Assignment'}</div>
                  {a.description && <div style={{fontSize:12,color:'var(--text)',lineHeight:1.5,marginBottom:8}}>{a.description}</div>}
                  <div style={{display:'flex',gap:16,fontSize:11,color:'var(--muted)'}}>
                    {a.due_date && <span>📅 Due {new Date(a.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>}
                    <span>📊 {a.max_points||100} pts</span>
                  </div>
                  {sub?.status==='graded' && (
                    <div style={{marginTop:10,padding:'8px 12px',background:'#f0fdf9',borderRadius:8}}>
                      <div style={{fontWeight:800,fontSize:14,color:gradeColor(pct)}}>{sub.points}/{a.max_points||100} pts · {letterGrade(pct)} ({pct}%)</div>
                      {sub.feedback && <div style={{fontSize:12,color:'var(--text)',marginTop:4}}>💬 {sub.feedback}</div>}
                    </div>
                  )}
                  {sub?.status==='submitted' && sub.content && (
                    <div style={{marginTop:8,padding:'8px 12px',background:'#f0f7ff',borderRadius:8,fontSize:12,color:'var(--muted)'}}>
                      <div style={{fontWeight:700,marginBottom:2}}>Your response:</div>
                      <div style={{lineHeight:1.5}}>{sub.content}</div>
                    </div>
                  )}
                </div>
                {(!sub || sub.status==='pending') && (
                  <button className="btn btn-primary btn-sm" onClick={()=>setSubmitModal(a)}>Submit</button>
                )}
              </div>
            </div>
          )
        })
      }

      {submitModal && (
        <SubmitModal
          assignment={submitModal}
          studentId={student?.id}
          userId={user?.id}
          onClose={()=>setSubmitModal(null)}
          onSubmitted={()=>{ setSubmitModal(null); load() }}
        />
      )}
    </div>
  )
}

function SubmitModal({ assignment, studentId, userId, onClose, onSubmitted }) {
  const [content,     setContent]     = useState('')
  const [file,        setFile]        = useState(null)
  const [uploading,   setUploading]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [uploadProg,  setUploadProg]  = useState(0)

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return }
    setFile(f)
  }

  async function doSubmit() {
    if (!content.trim() && !file) return
    setSubmitting(true)

    let fileUrl = null; let fileName = null; let fileSize = null

    // Upload file if attached
    if (file) {
      setUploading(true)
      const ext  = file.name.split('.').pop()
      const path = `submissions/${studentId}/${assignment.id}-${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('ble-assets').upload(path, file, { contentType: file.type })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('ble-assets').getPublicUrl(path)
        fileUrl = publicUrl; fileName = file.name; fileSize = file.size
      }
      setUploading(false)
    }

    await supabase.from('submissions').upsert(
      { assignment_id: assignment.id, student_id: studentId, submitted_by: userId,
        content: content.trim() || null, file_url: fileUrl, file_name: fileName, file_size: fileSize,
        status: 'submitted', submitted_at: new Date().toISOString() },
      { onConflict: 'assignment_id,student_id' }
    )
    setSubmitting(false)
    onSubmitted()
  }

  const canSubmit = (content.trim() || file) && !submitting

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:540}}>
        <div className="modal-header">
          <div className="modal-title">📝 Submit: {assignment.title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>{assignment.course?.name} · {assignment.max_points||100} pts</div>
          {assignment.description && <div style={{fontSize:13,color:'var(--text)',lineHeight:1.5,padding:'10px 12px',background:'var(--bg)',borderRadius:8}}>{assignment.description}</div>}
        </div>

        <div className="form-group">
          <label className="input-label">Your Response (optional if attaching file)</label>
          <textarea className="input" rows={5} style={{resize:'vertical'}}
            placeholder="Type your answer, notes, or comments here…"
            value={content} onChange={e=>setContent(e.target.value)}/>
        </div>

        {/* File upload */}
        <div className="form-group">
          <label className="input-label">Attach File (optional · PDF, Doc, Image · max 10MB)</label>
          <label style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',border:'2px dashed var(--border)',borderRadius:10,cursor:'pointer',background:'var(--bg)',transition:'border-color .15s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='var(--teal)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
            <input type="file" style={{display:'none'}} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.mp4,.mov" onChange={handleFileChange}/>
            <span style={{fontSize:22}}>{file?'📎':'📁'}</span>
            <div>
              {file
                ? <><div style={{fontWeight:700,fontSize:13}}>{file.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{(file.size/1024).toFixed(1)} KB</div></>
                : <><div style={{fontWeight:700,fontSize:13}}>Click to attach a file</div><div style={{fontSize:11,color:'var(--muted)'}}>PDF, Word, Image, Video</div></>
              }
            </div>
            {file && <button type="button" onClick={e=>{e.preventDefault();setFile(null)}} style={{marginLeft:'auto',border:'none',background:'none',cursor:'pointer',color:'var(--coral)',fontSize:18}}>✕</button>}
          </label>
        </div>

        {uploading && (
          <div style={{marginBottom:12,padding:'8px 12px',background:'#f0fdf9',borderRadius:8,fontSize:12,fontWeight:700,color:'var(--teal)'}}>
            📤 Uploading file…
          </div>
        )}

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={doSubmit} disabled={!canSubmit}>
            {submitting ? (uploading?'Uploading…':'Submitting…') : '✈️ Submit Assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── GRADES ────────────────────────────────────────────────────────────────
export function StudentGrades() {
  const { student } = useStudentData()
  const [reportCards, setReportCards] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [assignments, setAssignments] = useState([])
  const [credits,     setCredits]     = useState([])
  const [creditReqs,  setCreditReqs]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('current')
  const [printRC,     setPrintRC]     = useState(null)
  const printRef = useRef(null)

  useEffect(() => { if (student) loadAll() }, [student])

  async function loadAll() {
    const [{ data:rcs },{ data:subs },{ data:asgns },{ data:sc },{ data:cr }] = await Promise.all([
      supabase.from('report_cards').select('*').eq('student_id',student.id).eq('published',true).order('created_at',{ascending:false}),
      supabase.from('submissions').select('*').eq('student_id',student.id).eq('status','graded'),
      supabase.from('assignments').select('*,course:courses(name,subject)').in('id', []),
      supabase.from('student_credits').select('*').eq('student_id',student.id),
      supabase.from('credit_requirements').select('*'),
    ])
    setReportCards(rcs||[])
    setSubmissions(subs||[])
    setCredits(sc||[])
    setCreditReqs(cr||[])

    // Load assignments for graded submissions
    if (subs?.length) {
      const aIds = [...new Set(subs.map(s=>s.assignment_id))]
      const { data: asgnsData } = await supabase.from('assignments')
        .select('*,course:courses(name,subject)').in('id', aIds)
      setAssignments(asgnsData||[])
    }
    setLoading(false)
  }

  function printReportCard(rc) {
    setPrintRC(rc)
    setTimeout(() => window.print(), 400)
  }

  const totalEarned = credits.reduce((a,c)=>a+Number(c.credits_earned||0),0)
  const totalReq    = creditReqs.reduce((a,c)=>a+Number(c.required_credits||0),0)
  const gradPct     = totalReq ? Math.round((totalEarned/totalReq)*100) : 0

  if (loading) return <div className="loading-screen" style={{height:300}}><div className="spinner"/></div>

  return (
    <div>
      {/* Print-only report card */}
      {printRC && (
        <div className="print-only">
          <div style={{fontFamily:'Arial,sans-serif',maxWidth:720,margin:'0 auto',padding:40}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,borderBottom:'3px solid #1a1a2e',paddingBottom:16}}>
              <div>
                <div style={{fontSize:26,fontWeight:900,color:'#1a1a2e'}}>BLE Worldwide</div>
                <div style={{fontSize:13,color:'#666',marginTop:2}}>Student Report Card</div>
              </div>
              <div style={{textAlign:'right',fontSize:12,color:'#666'}}>
                <div>Term: {printRC.term_name||'—'}</div>
                <div>Printed: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24,padding:16,background:'#f8f9fa',borderRadius:8}}>
              <div><div style={{fontSize:10,color:'#999',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>Student</div>
                <div style={{fontWeight:700,fontSize:16}}>{student?.full_name}</div>
                <div style={{fontSize:12,color:'#666'}}>{student?.grade_level} Grade · ID: {student?.student_id||'—'}</div></div>
              <div style={{textAlign:'right'}}><div style={{fontSize:10,color:'#999',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>GPA</div>
                <div style={{fontWeight:900,fontSize:28,color:'#1a1a2e'}}>{printRC.gpa||'—'}</div>
                <div style={{fontSize:12,color:'#666'}}>Overall: {printRC.overall_grade||'—'}</div></div>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,marginBottom:20}}>
              <thead><tr style={{background:'#1a1a2e',color:'white'}}>
                <th style={{padding:'8px 12px',textAlign:'left'}}>Course</th>
                <th style={{padding:'8px 12px',textAlign:'center'}}>Grade</th>
                <th style={{padding:'8px 12px',textAlign:'center'}}>Credits</th>
                <th style={{padding:'8px 12px',textAlign:'center'}}>Attendance</th>
              </tr></thead>
              <tbody>
                {(printRC.courses||[]).map((c,i)=>(
                  <tr key={i} style={{background:i%2===0?'white':'#f9f9f9',borderBottom:'1px solid #eee'}}>
                    <td style={{padding:'8px 12px',fontWeight:600}}>{c.name}</td>
                    <td style={{padding:'8px 12px',textAlign:'center',fontWeight:700}}>{c.grade||'—'}</td>
                    <td style={{padding:'8px 12px',textAlign:'center'}}>{c.credits||'—'}</td>
                    <td style={{padding:'8px 12px',textAlign:'center'}}>{c.attendance||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,fontSize:12}}>
              <div><span style={{color:'#999',fontWeight:700}}>Days Present:</span> {printRC.days_present||'—'}</div>
              <div><span style={{color:'#999',fontWeight:700}}>Days Absent:</span> {printRC.days_absent||'—'}</div>
              <div><span style={{color:'#999',fontWeight:700}}>Conduct:</span> {printRC.conduct||'—'}</div>
              <div><span style={{color:'#999',fontWeight:700}}>Published:</span> {printRC.published_at?new Date(printRC.published_at).toLocaleDateString():'—'}</div>
            </div>
            {printRC.teacher_comments && <div style={{marginTop:16,padding:12,background:'#f0f7ff',borderRadius:8}}><div style={{fontWeight:700,marginBottom:4,fontSize:11,color:'#999',textTransform:'uppercase'}}>Teacher Comments</div><div style={{fontSize:12,lineHeight:1.6}}>{printRC.teacher_comments}</div></div>}
            <div style={{marginTop:32,borderTop:'1px solid #eee',paddingTop:12,fontSize:10,color:'#999',textAlign:'center'}}>BLE Worldwide · Official Report Card · {new Date().toLocaleDateString()}</div>
          </div>
        </div>
      )}

      <div className="no-print">
        <div className="page-header fade-up"><h2>📊 Grades & Progress</h2></div>

        {/* Tabs */}
        <div style={{display:'flex',gap:0,borderBottom:'2px solid var(--border)',marginBottom:16}}>
          {[['current','📋 Current Grades'],['report_cards','🗂 Report Cards'],['credits','🎓 Credits']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{padding:'8px 16px',border:'none',cursor:'pointer',fontSize:13,fontWeight:tab===k?800:500,
              borderBottom:tab===k?'3px solid var(--teal)':'3px solid transparent',marginBottom:-2,background:'none',
              color:tab===k?'var(--teal)':'var(--muted)'}}>
              {l}
            </button>
          ))}
        </div>

        {/* Current Grades */}
        {tab==='current' && (
          <div className="fade-up">
            {submissions.length===0
              ? <div className="empty-state"><div className="es-icon">📊</div><div className="es-text">No graded assignments yet.</div></div>
              : submissions.map(s=>{
                  const a = assignments.find(x=>x.id===s.assignment_id)
                  const pct = a?.max_points ? Math.round((s.points/a.max_points)*100) : null
                  return (
                    <div key={s.id} className="card" style={{marginBottom:8,padding:'12px 16px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:13}}>{a?.title||'Assignment'}</div>
                          <div style={{fontSize:11,color:'var(--muted)'}}>{a?.course?.name} · {a?.course?.subject}</div>
                          {s.feedback && <div style={{fontSize:11,color:'var(--text)',marginTop:4,padding:'4px 8px',background:'var(--bg)',borderRadius:6}}>💬 {s.feedback}</div>}
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontWeight:900,fontSize:18,color:gradeColor(pct)}}>{s.points}/{a?.max_points||100}</div>
                          <div style={{fontSize:13,fontWeight:800,color:gradeColor(pct)}}>{letterGrade(pct)}</div>
                        </div>
                        <div style={{width:50,height:50,borderRadius:'50%',border:`3px solid ${gradeColor(pct)}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <span style={{fontSize:12,fontWeight:900,color:gradeColor(pct)}}>{pct!=null?pct+'%':'—'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        )}

        {/* Report Cards */}
        {tab==='report_cards' && (
          <div className="fade-up">
            {reportCards.length===0
              ? <div className="empty-state"><div className="es-icon">🗂</div><div className="es-text">No published report cards yet.</div></div>
              : reportCards.map(rc=>(
                  <div key={rc.id} className="card" style={{marginBottom:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:14}}>{rc.term_name||'Report Card'}</div>
                        <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                          GPA: <strong>{rc.gpa||'—'}</strong> · Overall: <strong>{rc.overall_grade||'—'}</strong>
                          {rc.published_at && <> · Published {new Date(rc.published_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</>}
                        </div>
                        {rc.teacher_comments && <div style={{fontSize:12,color:'var(--text)',marginTop:6,lineHeight:1.5}}>"{rc.teacher_comments}"</div>}
                      </div>
                      <div style={{display:'flex',gap:8,flexShrink:0}}>
                        <div style={{textAlign:'center',padding:'8px 16px',background:'var(--bg)',borderRadius:10}}>
                          <div style={{fontWeight:900,fontSize:22,color:'var(--teal)'}}>{rc.gpa||'—'}</div>
                          <div style={{fontSize:10,color:'var(--muted)'}}>GPA</div>
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={()=>printReportCard(rc)}>🖨 Print</button>
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>
        )}

        {/* Credits */}
        {tab==='credits' && (
          <div className="fade-up">
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">🎓 Graduation Progress</div></div>
              <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16}}>
                <div style={{flex:1}}>
                  <div className="prog-bar" style={{height:12,borderRadius:6}}>
                    <div className="prog-fill" style={{width:`${gradPct}%`,borderRadius:6,background:'linear-gradient(90deg,var(--teal),var(--sky))'}}/>
                  </div>
                </div>
                <div style={{fontWeight:900,fontSize:18,color:'var(--teal)',flexShrink:0}}>{totalEarned}/{totalReq} credits</div>
              </div>
            </div>
            {credits.length===0
              ? <div className="empty-state"><div className="es-icon">🎓</div><div className="es-text">No credits recorded yet.</div></div>
              : credits.map(c=>(
                  <div key={c.id} className="card" style={{marginBottom:8,padding:'10px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:13}}>{c.course_name||'Course'}</div>
                        <div style={{fontSize:11,color:'var(--muted)'}}>{c.subject} · {c.school_year}</div>
                      </div>
                      <div style={{fontWeight:900,fontSize:16,color:'var(--teal)'}}>{c.credits_earned} cr</div>
                      <span className={`badge ${c.grade?'badge-green':'badge-blue'}`}>{c.grade||'In Progress'}</span>
                    </div>
                  </div>
                ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
export function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState(null)

  useEffect(() => {
    supabase.from('announcements').select('*,author:profiles!created_by(full_name)')
      .in('audience',['all','students']).order('published_at',{ascending:false})
      .then(({ data }) => { setAnnouncements(data||[]); setLoading(false) })
  }, [])

  return (
    <div>
      <div className="page-header fade-up"><h2>📢 Announcements</h2></div>
      {loading ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
      : announcements.length===0 ? <div className="empty-state"><div className="es-icon">📢</div><div className="es-text">No announcements yet.</div></div>
      : announcements.map(a=>(
          <div key={a.id} className="card fade-up" style={{marginBottom:10,cursor:'pointer',borderLeft:'4px solid var(--teal)'}} onClick={()=>setSelected(selected?.id===a.id?null:a)}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>{a.title}</div>
                {selected?.id===a.id
                  ? <div style={{fontSize:13,lineHeight:1.6,whiteSpace:'pre-wrap',marginBottom:6}}>{a.body}</div>
                  : <div style={{fontSize:12,color:'var(--muted)'}}>{a.body?.slice(0,140)}{a.body?.length>140?'…':''}</div>}
                <div style={{marginTop:8,fontSize:11,color:'var(--muted)'}}>
                  {a.author?.full_name&&<span>By {a.author.full_name} · </span>}
                  {new Date(a.published_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                </div>
              </div>
              <span style={{fontSize:18}}>{selected?.id===a.id?'▲':'▼'}</span>
            </div>
          </div>
        ))
      }
    </div>
  )
}

// ── MESSAGES ─────────────────────────────────────────────────────────────
export function StudentMessages() {
  const { user, profile } = useAuth()
  const [threads,    setThreads]    = useState([])
  const [active,     setActive]     = useState(null)
  const [messages,   setMessages]   = useState([])
  const [reply,      setReply]      = useState('')
  const [showNew,    setShowNew]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user) return
    loadThreads()
    const ch = supabase.channel('student-msgs-'+user.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},()=>{ loadThreads(); if(active) loadMessages(active) })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  useEffect(() => { if (active) loadMessages(active) }, [active])
  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])

  async function loadThreads() {
    const { data } = await supabase.from('messages')
      .select('*,sender:profiles!sender_id(full_name,role),recipient:profiles!recipient_id(full_name,role)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at',{ascending:false})
    const seen = new Set(); const threads = []
    ;(data||[]).forEach(m=>{
      const other = m.sender_id===user.id ? m.recipient_id : m.sender_id
      if(!seen.has(other)){ seen.add(other); threads.push(m) }
    })
    setThreads(threads); setLoading(false)
  }

  async function loadMessages(thread) {
    const otherId = thread.sender_id===user.id ? thread.recipient_id : thread.sender_id
    const { data } = await supabase.from('messages')
      .select('*,sender:profiles!sender_id(full_name,role)')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`)
      .order('created_at')
    setMessages(data||[])
  }

  async function sendReply() {
    if (!reply.trim()||!active) return
    const otherId = active.sender_id===user.id ? active.recipient_id : active.sender_id
    await supabase.from('messages').insert([{ subject: active.subject, body: reply.trim(), sender_id: user.id, recipient_id: otherId }])
    setReply(''); loadMessages(active); loadThreads()
  }

  return (
    <div>
      <div className="page-header fade-up">
        <h2>💬 Messages</h2>
        <button className="btn btn-primary" onClick={()=>setShowNew(true)}>+ New Message</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:16,height:'calc(100vh - 200px)'}}>
        <div className="card" style={{padding:0,overflow:'auto'}}>
          {loading ? <div style={{textAlign:'center',padding:30}}><div className="spinner"/></div>
          : threads.length===0 ? <div style={{textAlign:'center',padding:30,color:'var(--muted)',fontSize:12}}>No messages yet.</div>
          : threads.map(t=>{
              const other = t.sender_id===user.id ? t.recipient : t.sender
              return (
                <div key={t.id} onClick={()=>setActive(t)} style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:active?.id===t.id?'#f0fdf9':'white'}}>
                  <div style={{fontWeight:700,fontSize:12}}>{other?.full_name||'User'}</div>
                  <div style={{fontSize:11,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.subject}</div>
                  <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>{new Date(t.created_at).toLocaleDateString()}</div>
                </div>
              )
            })
          }
        </div>
        <div className="card" style={{padding:0,display:'flex',flexDirection:'column'}}>
          {!active ? <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',fontSize:13}}>Select a conversation</div>
          : (
            <>
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:700}}>{active.subject}</div>
              <div style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:10}}>
                {messages.map(m=>(
                  <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:m.sender_id===user.id?'flex-end':'flex-start'}}>
                    <div style={{maxWidth:'75%',padding:'8px 12px',borderRadius:12,fontSize:13,lineHeight:1.5,
                      background:m.sender_id===user.id?'var(--teal)':'var(--bg)',
                      color:m.sender_id===user.id?'white':'var(--text)'}}>
                      {m.body}
                    </div>
                    <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>{m.sender?.full_name} · {new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                ))}
                <div ref={bottomRef}/>
              </div>
              <div style={{padding:12,borderTop:'1px solid var(--border)',display:'flex',gap:8}}>
                <input className="input" style={{flex:1}} placeholder="Type a reply…" value={reply} onChange={e=>setReply(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),sendReply())}/>
                <button className="btn btn-primary" onClick={sendReply} disabled={!reply.trim()}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
      {showNew && (
        <NewMessageModal onClose={()=>setShowNew(false)}
          onSent={async(recipientId, subject, body)=>{
            await supabase.from('messages').insert([{subject,body,sender_id:user.id,recipient_id:recipientId}])
            setShowNew(false); loadThreads()
          }}/>
      )}
    </div>
  )
}

// ── SETTINGS ─────────────────────────────────────────────────────────────
export function StudentSettings() {
  const { user } = useAuth()
  const [pwForm, setPwForm] = useState({ newPw:'', confirm:'' })
  const [msg,    setMsg]    = useState('')
  const [saving, setSaving] = useState(false)

  async function changePassword() {
    if (pwForm.newPw !== pwForm.confirm) { setMsg('❌ Passwords do not match.'); return }
    if (pwForm.newPw.length < 8) { setMsg('❌ Min 8 characters.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    setSaving(false)
    if (error) { setMsg(`❌ ${error.message}`) } else { setMsg('✅ Password updated!'); setPwForm({newPw:'',confirm:''}) }
    setTimeout(()=>setMsg(''),4000)
  }

  return (
    <div>
      <div className="page-header fade-up"><h2>⚙️ Settings</h2></div>
      <div style={{maxWidth:460}} className="fade-up">
        <div className="card">
          <div className="card-header"><div className="card-title">🔐 Change Password</div></div>
          {msg && <div style={{padding:'8px 12px',borderRadius:8,marginBottom:12,fontSize:13,fontWeight:700,
            background:msg.startsWith('✅')?'#f0fdf9':'#fff0f0',color:msg.startsWith('✅')?'var(--teal)':'#cc3333',
            border:`1px solid ${msg.startsWith('✅')?'var(--teal)':'#ffcccc'}`}}>{msg}</div>}
          <div className="form-group">
            <label className="input-label">New Password</label>
            <input className="input" type="password" value={pwForm.newPw} onChange={e=>setPwForm(p=>({...p,newPw:e.target.value}))} placeholder="Min. 8 characters"/>
          </div>
          <div className="form-group">
            <label className="input-label">Confirm Password</label>
            <input className="input" type="password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))} placeholder="Re-enter password"/>
          </div>
          <button className="btn btn-primary" onClick={changePassword} disabled={saving||!pwForm.newPw||!pwForm.confirm}>
            {saving?'Updating…':'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
const SC_TYPE_META = {
  holiday:  { color:'#cc3333', bg:'#fff0f0', icon:'🏖️', label:'Holiday'  },
  exam:     { color:'#b07800', bg:'#fff9e6', icon:'📝', label:'Exam'     },
  event:    { color:'#0050b0', bg:'#e6f4ff', icon:'🎉', label:'Event'    },
  deadline: { color:'#7b5ea7', bg:'#f3eeff', icon:'⏰', label:'Deadline' },
  meeting:  { color:'#00804a', bg:'#e6fff4', icon:'📋', label:'Meeting'  },
}
const SC_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SC_DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export function StudentCalendar() {
  const today   = new Date()
  const { student, courses } = useStudentData()
  const [year,    setYear]    = useState(today.getFullYear())
  const [month,   setMonth]   = useState(today.getMonth())
  const [events,  setEvents]  = useState([])
  const [meetings,setMeetings]= useState([])
  const [loading, setLoading] = useState(true)
  const [detail,  setDetail]  = useState(null)

  useEffect(() => { loadAll() }, [year, month, courses])

  async function loadAll() {
    setLoading(true)
    const start = `${year}-${String(month+1).padStart(2,'0')}-01`
    const end   = `${year}-${String(month+1).padStart(2,'0')}-31`
    const [{ data: evts }, mtgRes] = await Promise.all([
      supabase.from('calendar_events').select('*').gte('start_date',start).lte('start_date',end).in('audience',['all','students']).order('start_date'),
      courses.length ? supabase.from('class_meetings').select('*, course:courses(name)').in('course_id', courses.map(c=>c.id)).order('scheduled_at',{ascending:false}) : Promise.resolve({data:[]}),
    ])
    setEvents(evts||[])
    setMeetings(mtgRes.data||[])
    setLoading(false)
  }

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const cells = []
  for (let i=0; i<firstDay; i++) cells.push(null)
  for (let d=1; d<=daysInMonth; d++) cells.push(d)
  const dateStr  = d => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const eventsOn = d => events.filter(e => e.start_date === dateStr(d))
  const isToday  = d => today.getFullYear()===year && today.getMonth()===month && today.getDate()===d
  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) }
  const todayStr  = today.toISOString().split('T')[0]
  const upcoming  = events.filter(e => e.start_date >= todayStr).slice(0,6)
  const upcomingMtgs = meetings.filter(m => !m.scheduled_at || new Date(m.scheduled_at) >= new Date()).slice(0,4)

  return (
    <div>
      <div className="page-header fade-up">
        <div><h2>📅 School Calendar</h2><div style={{fontSize:13,color:'var(--muted)'}}>{events.length} events this month</div></div>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {Object.entries(SC_TYPE_META).map(([k,m])=>(
          <div key={k} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,background:m.bg,border:`1px solid ${m.color}30`,fontSize:11,fontWeight:600,color:m.color}}>{m.icon} {m.label}</div>
        ))}
      </div>
      <div className="grid-2 fade-up-2" style={{gap:16,alignItems:'start'}}>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
            <button onClick={prevMonth} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)',padding:'0 8px'}}>‹</button>
            <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:16}}>{SC_MONTHS[month]} {year}</div>
            <button onClick={nextMonth} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)',padding:'0 8px'}}>›</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid var(--border)'}}>
            {SC_DAYS.map(d=><div key={d} style={{textAlign:'center',padding:'6px 0',fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase'}}>{d}</div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
            {cells.map((d,i)=>{
              const evts = d ? eventsOn(d) : []
              return (
                <div key={i} style={{minHeight:68,padding:'4px 5px',borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)',background:isToday(d)?'rgba(0,201,177,.07)':'white',borderTop:isToday(d)?'2px solid var(--teal)':'none'}}>
                  {d && <>
                    <div style={{fontSize:11,fontWeight:isToday(d)?800:500,width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:isToday(d)?'var(--teal)':'transparent',color:isToday(d)?'white':'var(--text)',marginBottom:2}}>{d}</div>
                    {evts.slice(0,2).map(e=>{
                      const m = SC_TYPE_META[e.event_type]||SC_TYPE_META.event
                      return <div key={e.id} onClick={()=>setDetail(e)} style={{fontSize:9,fontWeight:700,color:m.color,background:m.bg,borderRadius:3,padding:'1px 4px',marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'pointer'}}>{m.icon} {e.title}</div>
                    })}
                    {evts.length>2&&<div style={{fontSize:9,color:'var(--muted)',paddingLeft:2}}>+{evts.length-2}</div>}
                  </>}
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <div className="card" style={{marginBottom:12}}>
            <div className="card-header"><div className="card-title">📋 Upcoming Events</div></div>
            {loading ? <div style={{textAlign:'center',padding:16}}><div className="spinner"/></div>
            : upcoming.length===0 ? <div className="empty-state" style={{padding:16}}><div className="es-text">No upcoming events</div></div>
            : upcoming.map(e=>{
                const m = SC_TYPE_META[e.event_type]||SC_TYPE_META.event
                return (
                  <div key={e.id} onClick={()=>setDetail(e)} style={{padding:'9px 0',borderBottom:'1px solid var(--border)',display:'flex',gap:10,cursor:'pointer'}}>
                    <span style={{fontSize:18,flexShrink:0}}>{m.icon}</span>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>{e.title}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{e.start_date}</div>
                    </div>
                  </div>
                )
              })
            }
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">🎥 My Class Meetings</div></div>
            {upcomingMtgs.length===0 ? <div className="empty-state" style={{padding:16}}><div className="es-text">No meetings scheduled</div></div>
            : upcomingMtgs.map(m=>{
                const dt = m.scheduled_at ? new Date(m.scheduled_at) : null
                return (
                  <div key={m.id} style={{padding:'9px 0',borderBottom:'1px solid var(--border)',display:'flex',gap:10,alignItems:'flex-start'}}>
                    <span style={{fontSize:18,flexShrink:0}}>🎥</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>{m.title}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{m.course?.name}{dt&&<> · {dt.toLocaleDateString('en-US',{month:'short',day:'numeric'})} {dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</>}</div>
                      {m.meeting_url&&<a href={m.meeting_url} target="_blank" rel="noreferrer" style={{fontSize:11,fontWeight:700,color:'var(--teal)',textDecoration:'none'}}>Join →</a>}
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>
      {detail && (
        <div className="modal-overlay" onClick={()=>setDetail(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:400}}>
            <div className="modal-header">
              <div className="modal-title">{SC_TYPE_META[detail.event_type]?.icon||'📅'} {detail.title}</div>
              <button className="modal-close" onClick={()=>setDetail(null)}>✕</button>
            </div>
            {[['Date',detail.start_date+(detail.end_date&&detail.end_date!==detail.start_date?' → '+detail.end_date:'')],['Type',detail.event_type],detail.description&&['Details',detail.description]].filter(Boolean).map(([k,v])=>(
              <div key={k} style={{display:'flex',gap:12,padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
                <span style={{color:'var(--muted)',width:60,flexShrink:0}}>{k}</span>
                <span style={{fontWeight:600,textTransform:k==='Type'?'capitalize':'none'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
