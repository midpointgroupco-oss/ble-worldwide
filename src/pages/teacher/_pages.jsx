import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import NewMessageModal from '../../components/NewMessageModal'

const AV = ['av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8']
const GRADE_COLORS = {
  '1st':'#06d6a0','2nd':'#00c9b1','3rd':'#3b9eff','4th':'#00c9b1','5th':'#3b9eff','6th':'#f72585','7th':'#ffc845',
  '8th':'#ff6058','9th':'#7b5ea7','10th':'#06d6a0','11th':'#ff8c42','12th':'#00b4d8'
}

// ── DASHBOARD ──

function AnnouncementsView({ audience }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState(null)

  useEffect(() => {
    supabase.from('announcements')
      .select('*,author:profiles!created_by(full_name)')
      .in('audience', ['all', audience])
      .order('published_at', {ascending: false})
      .then(({ data }) => { setAnnouncements(data||[]); setLoading(false) })
  }, [audience])

  const BADGE = { all:'badge-blue', students:'badge-teal', parents:'badge-green', teachers:'badge-gold' }

  return (
    <div>
      <div className="page-header fade-up">
        <h2>📢 Announcements</h2>
        <span style={{fontSize:12,color:'var(--muted)'}}>{announcements.length} announcement{announcements.length!==1?'s':''}</span>
      </div>
      {loading
        ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
        : announcements.length === 0
          ? <div className="empty-state"><div className="es-icon">📢</div><div className="es-text">No announcements yet.</div></div>
          : <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {announcements.map(a => (
                <div key={a.id} className="card fade-up"
                  style={{cursor:'pointer', borderLeft:'4px solid var(--teal)', transition:'box-shadow .15s'}}
                  onClick={() => setSelected(selected?.id===a.id ? null : a)}
                >
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>{a.title}</div>
                      {selected?.id === a.id
                        ? <div style={{fontSize:13,lineHeight:1.6,color:'var(--text)',whiteSpace:'pre-wrap',marginBottom:6}}>{a.body}</div>
                        : <div style={{fontSize:12,color:'var(--muted)'}}>{a.body?.slice(0,140)}{a.body?.length>140?'…':''}</div>
                      }
                      <div style={{marginTop:8,fontSize:11,color:'var(--muted)',display:'flex',gap:8,alignItems:'center'}}>
                        {a.author?.full_name && <span>By {a.author.full_name}</span>}
                        <span>·</span>
                        <span>{new Date(a.published_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                        {a.grade_level && <><span>·</span><span className="badge badge-blue" style={{fontSize:9}}>{a.grade_level} Grade</span></>}
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
                      <span className={`badge ${BADGE[a.audience]||'badge-blue'}`} style={{fontSize:9,textTransform:'capitalize'}}>{a.audience||'all'}</span>
                      <span style={{fontSize:18}}>{selected?.id===a.id ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      }
    </div>
  )
}

export function TeacherDashboard() {
  const { profile } = useAuth()
  const name    = profile?.full_name || 'Teacher'
  const [courses,        setCourses]        = useState([])
  const [directStudents, setDirectStudents] = useState([])
  const [pendingGrades,  setPendingGrades]  = useState(0)
  const [recentSubs,     setRecentSubs]     = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loading,        setLoading]        = useState(true)
  const isElementary = profile?.grade_assigned?.split(',').map(s=>s.trim()).some(g=>['1st','2nd','3rd','4th','5th'].includes(g))

  useEffect(() => {
    if (!profile?.id) return
    loadAll()
  }, [profile?.id])

  async function loadAll() {
    // Load courses
    const { data: coursesData } = await supabase.from('courses')
      .select('id,name,subject,grade_level,enrollments(count)')
      .eq('teacher_id', profile.id).eq('is_active', true).order('grade_level')
    setCourses(coursesData||[])

    // Load direct students if elementary
    if (isElementary) {
      const { data: studs } = await supabase.from('students').select('*').eq('teacher_id', profile.id).eq('status','active').order('full_name')
      setDirectStudents(studs||[])
    }

    // Pending submissions to grade
    if (coursesData?.length) {
      const cIds = coursesData.map(c=>c.id)
      const { data: asgns } = await supabase.from('assignments').select('id').in('course_id', cIds)
      if (asgns?.length) {
        const aIds = asgns.map(a=>a.id)
        const { data: pending } = await supabase.from('submissions').select('id,assignment_id,student_id,submitted_at,content,assignment:assignments(title,course:courses(name)),student:students(full_name)')
          .in('assignment_id', aIds).eq('status','submitted').order('submitted_at',{ascending:false}).limit(8)
        setPendingGrades(pending?.length||0)
        setRecentSubs(pending||[])
      }
      // Upcoming schedule events
      const { data: events } = await supabase.from('schedule_events')
        .select('*').in('course_id', cIds)
        .gte('start_time', new Date().toISOString().split('T')[0])
        .order('start_time').limit(5)
      setUpcomingEvents(events||[])
    }
    setLoading(false)
  }

  const totalStudents = isElementary ? directStudents.length : courses.reduce((a,c) => a + (c.enrollments?.[0]?.count||0), 0)

  return (
    <div>
      <div className="banner fade-up" style={{background:'linear-gradient(135deg,#0a3d2e,#0f5a45,#0a3a5c)'}}>
        <h2>Good morning, {name} 👩‍🏫</h2>
        <p>
          {profile?.subject
            ? profile.subject.split(',').map(s=>s.trim()).filter(Boolean).join(' · ')
            : 'Teacher'} · BLE Worldwide
        </p>
        <div className="banner-stats">
          <div><div className="bs-num">{loading?'…':courses.length}</div><div className="bs-lbl">My Courses</div></div>
          <div><div className="bs-num">{loading?'…':totalStudents}</div><div className="bs-lbl">Total Students</div></div>
          <div style={{maxWidth:160}}>
            <div className="bs-lbl" style={{marginBottom:4}}>Subjects</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
              {(profile?.subject||'').split(',').map(s=>s.trim()).filter(Boolean).map(s=>(
                <span key={s} style={{background:'rgba(255,255,255,.2)',borderRadius:10,padding:'2px 7px',fontSize:10,fontWeight:700}}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-3 fade-up-2">
        <div className="stat-card sc-teal"><div className="stat-icon">📚</div><div className="stat-value">{loading?'…':courses.length}</div><div className="stat-label">Active Courses</div></div>
        <div className="stat-card sc-coral"><div className="stat-icon">🧑‍🎓</div><div className="stat-value">{loading?'…':totalStudents}</div><div className="stat-label">Total Students</div></div>
        <div className="stat-card sc-green"><div className="stat-icon">📝</div><div className="stat-value">{loading?'…':pendingGrades}</div><div className="stat-label">Needs Grading</div></div>
      </div>

      {recentSubs.length > 0 && (
        <div className="card fade-up-2" style={{marginBottom:16,border:'2px solid #ffc845'}}>
          <div className="card-header"><div className="card-title">📝 Needs Grading ({recentSubs.length})</div></div>
          {recentSubs.slice(0,5).map(s=>(
            <div key={s.id} style={{display:'flex',gap:10,padding:'9px 0',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:12}}>{s.student?.full_name||'Student'}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>{s.assignment?.title} · {s.assignment?.course?.name}</div>
              </div>
              <div style={{fontSize:10,color:'var(--muted)',flexShrink:0}}>{new Date(s.submitted_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
            </div>
          ))}
        </div>
      )}
      <div className="card fade-up-3">
        <div className="card-header"><div className="card-title">{isElementary ? 'My Students' : 'My Courses'}</div></div>
        {loading ? <div style={{textAlign:'center',padding:20}}><div className="spinner"/></div>
        : isElementary ? (
          directStudents.length === 0 ? (
            <div className="empty-state"><div className="es-icon">🧑‍🎓</div><div className="es-text">No students assigned yet. Contact your administrator.</div></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Student</th><th>Country</th><th>GPA</th><th>Attendance</th></tr></thead>
              <tbody>
                {directStudents.map((s,i) => (
                  <tr key={s.id}>
                    <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className={`avatar avatar-sm ${AV[i%8]}`}>{s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>{s.full_name}</div></td>
                    <td>{s.country||'—'}</td>
                    <td><span className="grade-pill grade-A">{s.gpa||'B+'}</span></td>
                    <td>{s.attendance_rate||94}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : courses.length === 0 ? (
          <div className="empty-state"><div className="es-icon">📚</div><div className="es-text">No courses assigned yet. Contact your administrator.</div></div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {courses.map(c => (
              <div key={c.id} style={{background:'white',borderRadius:12,padding:14,boxShadow:'var(--sh)',borderLeft:`4px solid ${GRADE_COLORS[c.grade_level]||'var(--teal)'}`}}>
                <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:14}}>{c.name}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{c.subject} · {c.grade_level} Grade · {c.enrollments?.[0]?.count||0} students</div>
                {c.description && <div style={{fontSize:11,color:'#555',marginTop:4}}>{c.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── CLASSES ──
export function TeacherClasses() {
  const { profile } = useAuth()
  const [courses,        setCourses]        = useState([])
  const [loading,        setLoading]        = useState(true)
  const [openCourse,     setOpenCourse]     = useState({})
  const [students,       setStudents]       = useState({})       // keyed by course_id
  const [attendanceModal,setAttendanceModal]= useState(null)     // { course, students }
  const [directStudents, setDirectStudents] = useState([])
  const isElementary = profile?.grade_assigned?.split(',').map(s=>s.trim()).some(g=>['1st','2nd','3rd','4th','5th'].includes(g))

  useEffect(() => {
    if (!profile?.id) return
    if (isElementary) {
      supabase.from('students').select('id,full_name,country,grade_level,gpa,attendance_rate')
        .eq('teacher_id', profile.id).eq('status','active').order('full_name')
        .then(({ data }) => { setDirectStudents(data||[]); setLoading(false) })
    } else {
      supabase.from('courses').select('*').eq('teacher_id', profile.id).eq('is_active', true).order('grade_level')
        .then(async ({ data: courseData }) => {
          const c = courseData || []
          setCourses(c)
          const studentMap = {}
          await Promise.all(c.map(async course => {
            const { data } = await supabase
              .from('enrollments')
              .select('student:students(id,full_name,country,grade_level,gpa,attendance_rate)')
              .eq('course_id', course.id).eq('status', 'active')
            studentMap[course.id] = (data||[]).map(e => e.student).filter(Boolean)
          }))
          setStudents(studentMap)
          setLoading(false)
          if (c.length) setOpenCourse({ [c[0].id]: true })
        })
    }
  }, [profile?.id, isElementary])

  return (
    <div>
      <div className="page-header fade-up"><h2>My Classes</h2></div>

      {loading ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
      : isElementary ? (
        /* ── ELEMENTARY: single class, take attendance directly ── */
        <div className="grade-section fade-up-2">
          <div className="grade-section-header" style={{cursor:'default'}}>
            <div className="gs-color" style={{background:'#3b9eff'}}/>
            <div className="gs-title">{profile?.grade_assigned?.split(',').map(s=>s.trim()).join(' & ')} Grade Homeroom</div>
            <div style={{fontSize:11,color:'var(--muted)',marginRight:8}}>{directStudents.length} Students</div>
            <button
              className="btn btn-primary btn-sm"
              style={{marginLeft:'auto',marginRight:8}}
              onClick={() => setAttendanceModal({ course: null, students: directStudents })}
            >📋 Take Attendance</button>
          </div>
          <div className="grade-body open">
            {directStudents.length === 0 ? (
              <div className="empty-state" style={{padding:20}}><div className="es-icon">👥</div><div className="es-text">No students assigned yet.</div></div>
            ) : (
              <div className="students-grid">
                {directStudents.map((s,i) => (
                  <div key={s.id} className="student-card" style={{borderLeftColor:'#3b9eff'}}>
                    <div className={`student-card-av ${AV[i%8]}`}>{s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                    <div className="student-card-name">{s.full_name}</div>
                    <div className="student-card-meta">{s.country||'—'} · {s.grade_level}</div>
                    <div className="student-card-stats">
                      <div className="sc-pill"><div className="sc-pill-num">{s.gpa||'B+'}</div><div className="sc-pill-lbl">GPA</div></div>
                      <div className="sc-pill"><div className="sc-pill-num">{s.attendance_rate||94}%</div><div className="sc-pill-lbl">Attend.</div></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : courses.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:30}}>
          <div style={{fontSize:36,marginBottom:10}}>📚</div>
          <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:16,marginBottom:6}}>No Courses Assigned</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>Ask your administrator to assign courses to you.</div>
        </div>
      ) : courses.map(course => (
        <div key={course.id} className="grade-section fade-up-2" style={{marginBottom:12}}>
          <div className="grade-section-header" onClick={() => setOpenCourse(p=>({...p,[course.id]:!p[course.id]}))}>
            <div className="gs-color" style={{background:GRADE_COLORS[course.grade_level]||'var(--teal)'}}/>
            <div className="gs-title">{course.name}</div>
            <div style={{fontSize:11,color:'var(--muted)',marginRight:8}}>{course.subject} · {course.grade_level} Grade</div>
            <div className="gs-stats">
              <div className="gs-stat"><div className="gsn">{(students[course.id]||[]).length}</div><div className="gsl">Students</div></div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              style={{marginLeft:'auto',marginRight:8}}
              onClick={e => { e.stopPropagation(); setAttendanceModal({ course, students: students[course.id]||[] }) }}
            >📋 Take Attendance</button>
            <div className={`gs-toggle ${openCourse[course.id]?'open':''}`}>▼</div>
          </div>
          <div className={`grade-body ${openCourse[course.id]?'open':''}`}>
            {!(students[course.id]||[]).length ? (
              <div className="empty-state" style={{padding:20}}><div className="es-icon">👥</div><div className="es-text">No students enrolled in this course yet.</div></div>
            ) : (
              <div className="students-grid">
                {(students[course.id]||[]).map((s,i) => (
                  <div key={s.id} className="student-card" style={{borderLeftColor:GRADE_COLORS[course.grade_level]||'var(--teal)'}}>
                    <div className={`student-card-av ${AV[i%8]}`}>{s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                    <div className="student-card-name">{s.full_name}</div>
                    <div className="student-card-meta">{s.country||'—'} · {s.grade_level}</div>
                    <div className="student-card-stats">
                      <div className="sc-pill"><div className="sc-pill-num">{s.gpa||'B+'}</div><div className="sc-pill-lbl">GPA</div></div>
                      <div className="sc-pill"><div className="sc-pill-num">{s.attendance_rate||94}%</div><div className="sc-pill-lbl">Attend.</div></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {attendanceModal && (
        <AttendanceModal
          course={attendanceModal.course}
          students={attendanceModal.students}
          teacherId={profile?.id}
          onClose={() => setAttendanceModal(null)}
        />
      )}
    </div>
  )
}

function AttendanceModal({ course, students, teacherId, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [date,      setDate]      = useState(today)
  const [marks,     setMarks]     = useState({})
  const [existing,  setExisting]  = useState([])
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [history,   setHistory]   = useState([])
  const [showHist,  setShowHist]  = useState(false)

  useEffect(() => { loadExisting(date) }, [date])
  useEffect(() => { loadHistory() }, [])

  async function loadExisting(d) {
    setSaved(false)
    const query = supabase.from('attendance').select('*').eq('date', d)
      .in('student_id', students.map(s => s.id))
    if (course) query.eq('course_id', course.id)
    const { data } = await query
    const existing = data || []
    setExisting(existing)
    const m = {}
    existing.forEach(r => { m[r.student_id] = r.status })
    students.forEach(s => { if (!m[s.id]) m[s.id] = 'present' })
    setMarks(m)
  }

  async function loadHistory() {
    const last30 = new Date(); last30.setDate(last30.getDate()-30)
    const query = supabase.from('attendance').select('date,status,student_id')
      .in('student_id', students.map(s=>s.id))
      .gte('date', last30.toISOString().split('T')[0])
      .order('date', {ascending:false})
    if (course) query.eq('course_id', course.id)
    const { data } = await query
    setHistory(data||[])
  }

  function markAll(status) {
    const m = {}
    students.forEach(s => { m[s.id] = status })
    setMarks(m)
  }

  function toggle(studentId, status) {
    setMarks(p => ({ ...p, [studentId]: status }))
  }

  async function handleSave() {
    setSaving(true)
    const records = students.map(s => ({
      student_id: s.id,
      course_id:  course?.id || null,
      date,
      status: marks[s.id] || 'present',
    }))
    await supabase.from('attendance').upsert(records, { onConflict: 'student_id,course_id,date' })

    // Fire absence alerts for absent/tardy students
    const alertStudents = students.filter(s => {
      const st = marks[s.id] || 'present'
      return st === 'absent' || st === 'tardy'
    })
    if (alertStudents.length > 0) {
      const { data: profiles } = await supabase
        .from('students').select('id,full_name,guardian_email,parent_id')
        .in('id', alertStudents.map(s => s.id))
      for (const p of (profiles||[])) {
        if (!p.guardian_email) continue
        const status = marks[p.id] || 'absent'
        await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: p.guardian_email,
            template: 'absence_alert',
            data: {
              parentName: 'Parent/Guardian',
              studentName: p.full_name,
              date,
              status,
              courseName: course?.name || 'Class',
            }
          })
        }).catch(() => {})
      }
    }

    setSaving(false); setSaved(true)
    loadHistory()
  }

  const counts = { present: 0, absent: 0, late: 0 }
  students.forEach(s => { const st = marks[s.id]||'present'; counts[st]++ })

  // Build history dates
  const histDates = [...new Set(history.map(h=>h.date))].slice(0,7)

  const STATUS = [
    { key:'present', label:'P', color:'#00b87a', bg:'#e6fff4', icon:'✅' },
    { key:'late',    label:'L', color:'#b07800', bg:'#fff9e6', icon:'⏰' },
    { key:'absent',  label:'A', color:'#cc3333', bg:'#fff0f0', icon:'❌' },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:620,maxHeight:'92vh',display:'flex',flexDirection:'column'}}>
        <div className="modal-header">
          <div className="modal-title">📋 {course?.name || 'Homeroom'} — Attendance</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button onClick={()=>setShowHist(h=>!h)} style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer'}}>
              {showHist?'📋 Sheet':'📅 History'}
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {!showHist ? (
          <>
            {/* Date + summary */}
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,flexWrap:'wrap'}}>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>Date</label>
                <input type="date" className="input" style={{width:160,padding:'5px 10px'}} value={date} onChange={e=>setDate(e.target.value)} max={today}/>
              </div>
              <div style={{display:'flex',gap:6,marginLeft:'auto',alignItems:'center'}}>
                <span style={{fontSize:11,color:'var(--muted)'}}>Mark all:</span>
                {STATUS.map(s=>(
                  <button key={s.key} onClick={()=>markAll(s.key)} style={{padding:'4px 10px',borderRadius:8,border:`1px solid ${s.color}`,background:s.bg,color:s.color,fontWeight:700,fontSize:11,cursor:'pointer'}}>{s.icon} {s.label}</button>
                ))}
              </div>
              <div style={{display:'flex',gap:6}}>
                {STATUS.map(s=>(
                  <div key={s.key} style={{background:s.bg,border:`1px solid ${s.color}30`,borderRadius:8,padding:'4px 10px',textAlign:'center',minWidth:44}}>
                    <div style={{fontWeight:800,fontSize:14,color:s.color}}>{counts[s.key]}</div>
                    <div style={{fontSize:9,color:s.color}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student list */}
            <div style={{overflowY:'auto',flex:1,border:'1px solid var(--border)',borderRadius:10,marginBottom:12}}>
              {students.length===0
                ? <div style={{padding:30,textAlign:'center',color:'var(--muted)',fontSize:13}}>No students.</div>
                : students.map((s, i) => {
                    const current = marks[s.id] || 'present'
                    return (
                      <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderBottom:'1px solid var(--border)',background:i%2===0?'white':'#fafbff'}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:11,flexShrink:0}}>
                          {s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:13}}>{s.full_name}</div>
                          <div style={{fontSize:10,color:'var(--muted)'}}>{s.grade_level} Grade</div>
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          {STATUS.map(st=>(
                            <button key={st.key} onClick={()=>toggle(s.id, st.key)}
                              style={{width:36,height:36,borderRadius:8,border:`2px solid ${current===st.key?st.color:'var(--border)'}`,
                                background:current===st.key?st.bg:'white',cursor:'pointer',fontSize:16,
                                boxShadow:current===st.key?`0 2px 8px ${st.color}40`:'none',transition:'all .12s'}}>
                              {st.icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })
              }
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              {saved&&<div style={{fontSize:12,fontWeight:700,color:'var(--teal)'}}>✅ Attendance saved for {date}</div>}
              <div style={{marginLeft:'auto',display:'flex',gap:8}}>
                <button className="btn btn-outline" onClick={onClose}>Close</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving||students.length===0}>
                  {saving?'Saving…':'💾 Save Attendance'}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* History view */
          <div style={{overflowY:'auto',flex:1}}>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>Last 30 days · {students.length} students</div>
            {students.length===0||histDates.length===0
              ? <div style={{textAlign:'center',padding:30,color:'var(--muted)'}}>No history yet.</div>
              : (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead>
                    <tr>
                      <th style={{textAlign:'left',padding:'6px 10px',borderBottom:'2px solid var(--border)',fontWeight:700}}>Student</th>
                      {histDates.map(d=>(
                        <th key={d} style={{padding:'6px 6px',borderBottom:'2px solid var(--border)',fontWeight:600,color:'var(--muted)',fontSize:10}}>
                          {new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'numeric',day:'numeric'})}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s,i)=>(
                      <tr key={s.id} style={{background:i%2===0?'white':'#fafbff'}}>
                        <td style={{padding:'6px 10px',fontWeight:700}}>{s.full_name}</td>
                        {histDates.map(d=>{
                          const rec = history.find(h=>h.student_id===s.id&&h.date===d)
                          return (
                            <td key={d} style={{padding:'6px 6px',textAlign:'center'}}>
                              {rec ? (rec.status==='present'?'✅':rec.status==='late'?'⏰':'❌') : <span style={{color:'var(--border)'}}>·</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        )}
      </div>
    </div>
  )
}


// ── GRADES ──
export function TeacherGrades() {
  const { profile } = useAuth()
  const [courses,      setCourses]      = useState([])
  const [activeCourse, setActiveCourse] = useState(null)
  const [students,     setStudents]     = useState([])
  const [assignments,  setAssignments]  = useState([])
  const [submissions,  setSubmissions]  = useState([])
  const [showAssModal, setShowAssModal] = useState(false)
  const [editAssign,   setEditAssign]   = useState(null)
  const [tab,          setTab]          = useState('gradebook') // gradebook | assignments | submissions
  const [reviewSub,    setReviewSub]    = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [bulkMode,     setBulkMode]     = useState(false)
  const [bulkScores,   setBulkScores]   = useState({}) // studentId -> score
  const [bulkAssign,   setBulkAssign]   = useState(null)
  const [bulkSaving,   setBulkSaving]   = useState(false)
  const [showTemplates,setShowTemplates]= useState(false)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('courses').select('*').eq('teacher_id', profile.id).eq('is_active', true).order('grade_level')
      .then(({ data }) => {
        setCourses(data||[])
        if (data?.length) loadCourseData(data[0])
        setLoading(false)
      })
  }, [profile?.id])

  async function loadCourseData(course) {
    setActiveCourse(course)
    const [{ data: enr }, { data: ass }] = await Promise.all([
      supabase.from('enrollments').select('student:students(id,full_name,country)').eq('course_id', course.id).eq('status','active'),
      supabase.from('assignments').select('*').eq('course_id', course.id).order('due_date')
    ])
    const studs = (enr||[]).map(e=>e.student).filter(Boolean)
    setStudents(studs)
    setAssignments(ass||[])
    if (ass?.length && studs.length) {
      const { data: subs } = await supabase.from('submissions')
        .select('*')
        .in('assignment_id', ass.map(a=>a.id))
        .in('student_id', studs.map(s=>s.id))
      setSubmissions(subs||[])
    } else {
      setSubmissions([])
    }
  }

  async function deleteAssignment(id) {
    if (!confirm('Delete this assignment? All submissions will also be deleted.')) return
    await supabase.from('submissions').delete().eq('assignment_id', id)
    await supabase.from('assignments').delete().eq('id', id)
    if (activeCourse) loadCourseData(activeCourse)
  }

  function getGrade(studentId, assignmentId) {
    const sub = submissions.find(s => s.student_id===studentId && s.assignment_id===assignmentId)
    return sub?.grade ?? '—'
  }
  function getPoints(studentId, assignmentId) {
    const sub = submissions.find(s => s.student_id===studentId && s.assignment_id===assignmentId)
    return sub?.points ?? ''
  }
  function getSub(studentId, assignmentId) {
    return submissions.find(s => s.student_id===studentId && s.assignment_id===assignmentId)
  }

  async function updateGrade(studentId, assignmentId, scoreInput, feedbackText) {
    const existing  = submissions.find(s => s.student_id===studentId && s.assignment_id===assignmentId)
    const assignment = assignments.find(a => a.id===assignmentId)
    const maxPts = assignment?.max_points || 100
    const points = Number(scoreInput)
    // Derive letter grade from numeric score
    const pct = (points / maxPts) * 100
    const letterGrade = pct >= 93?'A': pct >= 90?'A-': pct >= 87?'B+': pct >= 83?'B':
                        pct >= 80?'B-': pct >= 77?'C+': pct >= 73?'C': pct >= 70?'C-':
                        pct >= 67?'D+': pct >= 60?'D': 'F'
    const now = new Date().toISOString()
    const payload = { grade:letterGrade, points, status:'graded', graded_at:now, ...(feedbackText!==undefined && { feedback:feedbackText }) }
    if (existing) {
      await supabase.from('submissions').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('submissions').insert([{ student_id:studentId, assignment_id:assignmentId, ...payload, submitted_at:now }])
    }
    if (activeCourse) loadCourseData(activeCourse)
  }

  const pendingSubs = submissions.filter(s => s.status === 'submitted')
  const TYPES_ICON = { homework:'📚', quiz:'✏️', test:'📋', project:'🎨', classwork:'✍️', extra_credit:'⭐' }

  function startBulkGrade(assignment) {
    const init = {}
    students.forEach(s => {
      const sub = submissions.find(x => x.student_id===s.id && x.assignment_id===assignment.id)
      init[s.id] = sub?.points ?? ''
    })
    setBulkScores(init); setBulkAssign(assignment); setBulkMode(true)
  }

  async function saveBulkGrades() {
    if (!bulkAssign) return
    setBulkSaving(true)
    const maxPts = bulkAssign.max_points || 100
    for (const [studentId, score] of Object.entries(bulkScores)) {
      if (score === '' || score === null) continue
      const points = Number(score)
      const pct = (points / maxPts) * 100
      const grade = pct>=93?'A':pct>=90?'A-':pct>=87?'B+':pct>=83?'B':pct>=80?'B-':pct>=77?'C+':pct>=73?'C':pct>=70?'C-':pct>=67?'D+':pct>=60?'D':'F'
      const existing = submissions.find(s=>s.student_id===studentId&&s.assignment_id===bulkAssign.id)
      const now = new Date().toISOString()
      if (existing) await supabase.from('submissions').update({points,grade,status:'graded',graded_at:now}).eq('id',existing.id)
      else await supabase.from('submissions').insert([{student_id:studentId,assignment_id:bulkAssign.id,points,grade,status:'graded',graded_at:now,submitted_at:now}])
    }
    setBulkSaving(false); setBulkMode(false); setBulkAssign(null); setBulkScores({})
    if (activeCourse) loadCourseData(activeCourse)
  }

  const ASSIGNMENT_TEMPLATES = [
    { title:'Weekly Homework', assignment_type:'homework', max_points:100, description:'Complete all assigned problems and show your work.' },
    { title:'Chapter Quiz',    assignment_type:'quiz',     max_points:50,  description:"Quiz covering this week's material." },
    { title:'Unit Test',       assignment_type:'test',     max_points:100, description:'Comprehensive test on the current unit.' },
    { title:'Class Project',   assignment_type:'project',  max_points:100, description:'Project due at the end of the unit. See rubric for details.' },
    { title:'Extra Credit',    assignment_type:'extra_credit', max_points:10, description:'Optional extra credit assignment.' },
    { title:'Reading Response',assignment_type:'homework', max_points:50,  description:'Write a 1-2 paragraph response to the assigned reading.' },
  ]

  function exportGradeCSV() {
    if (!activeCourse || !students.length || !assignments.length) return
    const header = ['Student', ...assignments.map(a=>a.title), 'Average'].join(',')
    const rows = students.map(s => {
      const scores = assignments.map(a => {
        const sub = submissions.find(x=>x.student_id===s.id&&x.assignment_id===a.id)
        return sub?.points ?? ''
      })
      const graded = scores.filter(x=>x!=='')
      const avg = graded.length ? Math.round(graded.reduce((a,b)=>a+Number(b),0)/graded.length) : ''
      return [s.full_name, ...scores, avg].join(',')
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], {type:'text/csv'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href=url; a.download=`${activeCourse.name}-grades.csv`; a.click()
  }

  return (
    <div>
      <div className="page-header fade-up">
        <h2>Gradebook & Assignments</h2>
        {tab === 'gradebook' && (
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-outline" onClick={()=>setShowTemplates(true)} disabled={!activeCourse}>📋 Templates</button>
            <button className="btn btn-outline" onClick={exportGradeCSV} disabled={!activeCourse||!assignments.length}>⬇️ CSV</button>
            <button className="btn btn-primary" onClick={() => setShowAssModal(true)} disabled={!activeCourse}>+ New Assignment</button>
          </div>
        )}
        {tab === 'assignments' && <button className="btn btn-primary" onClick={() => { setEditAssign(null); setShowAssModal(true) }} disabled={!activeCourse}>+ New Assignment</button>}
      </div>

      {/* Course selector */}
      {courses.length > 0 && (
        <div className="filter-row fade-up-2" style={{marginBottom:0}}>
          {courses.map(c => (
            <div key={c.id} className={`filter-chip ${activeCourse?.id===c.id?'active':''}`} onClick={() => loadCourseData(c)}>
              {c.name} <span style={{opacity:0.6,fontSize:10}}>· {c.grade_level}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:0,marginBottom:0,borderBottom:'2px solid var(--border)'}}>
        {[['gradebook','📊 Gradebook'],['assignments','📝 Assignments'],['submissions','📤 Submissions' + (pendingSubs.length ? ` (${pendingSubs.length})` : '')]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'9px 18px',border:'none',borderBottom:tab===k?'3px solid var(--teal)':'3px solid transparent',marginBottom:-2,background:'none',fontWeight:tab===k?800:500,color:tab===k?'var(--teal)':'var(--muted)',cursor:'pointer',fontSize:13,whiteSpace:'nowrap'}}>{l}</button>
        ))}
      </div>

      {loading ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
      : !activeCourse ? (
        <div className="card" style={{textAlign:'center',padding:30}}>
          <div style={{fontSize:36,marginBottom:10}}>📚</div>
          <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:16}}>No Courses Assigned</div>
        </div>
      ) : tab === 'assignments' ? (
        <div className="card fade-up-3">
          <div style={{marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
            <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:14}}>{activeCourse.name}</div>
            <span className="badge badge-blue">{activeCourse.subject}</span>
            <span className="badge badge-green">{activeCourse.grade_level} Grade</span>
            <span style={{fontSize:11,color:'var(--muted)',marginLeft:'auto'}}>{assignments.length} assignments</span>
          </div>
          {assignments.length === 0
            ? <div className="empty-state"><div className="es-icon">📝</div><div className="es-text">No assignments yet. Click "+ New Assignment" to add one.</div></div>
            : <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {assignments.map(a => {
                  const subCount = submissions.filter(s=>s.assignment_id===a.id).length
                  const gradedCount = submissions.filter(s=>s.assignment_id===a.id && s.status==='graded').length
                  const today = new Date().toISOString().split('T')[0]
                  const isOverdue = a.due_date && a.due_date < today
                  return (
                    <div key={a.id} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',border:'1px solid var(--border)',borderRadius:10,borderLeft:`4px solid ${isOverdue?'var(--coral)':'var(--teal)'}`}}>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                          <span style={{fontSize:16}}>{TYPES_ICON[a.assignment_type]||'📝'}</span>
                          <div style={{fontWeight:800,fontSize:14}}>{a.title}</div>
                          <span className="badge badge-blue" style={{fontSize:9,textTransform:'capitalize'}}>{a.assignment_type||'homework'}</span>
                        </div>
                        {a.description && <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.4,marginBottom:6}}>{a.description}</div>}
                        <div style={{fontSize:11,color:'var(--muted)',display:'flex',gap:14}}>
                          <span>📅 Due: {a.due_date||'No date'}</span>
                          <span>🎯 {a.max_points} pts</span>
                          <span style={{color:gradedCount===subCount&&subCount>0?'var(--teal)':'var(--muted)'}}>
                            ✅ {gradedCount}/{subCount} graded
                          </span>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:6,flexShrink:0}}>
                        <button className="btn btn-sm btn-outline" onClick={()=>{ setEditAssign(a); setShowAssModal(true) }}>✏️ Edit</button>
                        <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc'}} onClick={()=>deleteAssignment(a.id)}>🗑</button>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      ) : tab === 'submissions' ? (
        <div className="card fade-up-3">
          <div style={{marginBottom:12,fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:14}}>
            {activeCourse.name} · {submissions.length} submissions
            {pendingSubs.length > 0 && <span className="badge badge-gold" style={{marginLeft:8}}>{pendingSubs.length} pending review</span>}
          </div>
          {submissions.length === 0
            ? <div className="empty-state"><div className="es-icon">📤</div><div className="es-text">No submissions yet for this course.</div></div>
            : <table className="data-table">
                <thead>
                  <tr><th>Student</th><th>Assignment</th><th>Submitted</th><th>Status</th><th>Score</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {submissions.map(sub => {
                    const student = students.find(s=>s.id===sub.student_id)
                    const assign  = assignments.find(a=>a.id===sub.assignment_id)
                    return (
                      <tr key={sub.id} style={{background:sub.status==='submitted'?'#fffbf0':'white'}}>
                        <td style={{fontWeight:700}}>{student?.full_name||'—'}</td>
                        <td style={{fontSize:12}}>{assign?.title||'—'}<div style={{fontSize:10,color:'var(--muted)',textTransform:'capitalize'}}>{assign?.assignment_type||''}</div></td>
                        <td style={{fontSize:11,color:'var(--muted)'}}>{sub.submitted_at?new Date(sub.submitted_at).toLocaleDateString():'—'}</td>
                        <td>
                          {sub.status==='graded'
                            ? <span className="badge badge-green">✅ Graded</span>
                            : sub.status==='submitted'
                              ? <span className="badge badge-gold">⏳ Pending</span>
                              : <span className="badge">Draft</span>}
                        </td>
                        <td style={{fontWeight:700}}>{sub.points!==null&&sub.points!==undefined?`${sub.points}/${assign?.max_points||100}`:'—'}{sub.grade&&<span style={{fontSize:10,color:'var(--teal)',marginLeft:4}}>({sub.grade})</span>}</td>
                        <td>
                          <button className="btn btn-sm btn-primary" style={{fontSize:11}} onClick={()=>setReviewSub({sub, student, assign})}>
                            {sub.status==='graded'?'📝 Edit Grade':'✅ Grade'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
          }
        </div>
      ) : (
        <div className="card fade-up-3" style={{overflowX:'auto'}}>
          <div style={{marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
            <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:14}}>{activeCourse.name}</div>
            <span className="badge badge-blue">{activeCourse.subject}</span>
            <span className="badge badge-green">{activeCourse.grade_level} Grade</span>
            <span style={{fontSize:11,color:'var(--muted)',marginLeft:'auto'}}>{students.length} students · {assignments.length} assignments</span>
          </div>

          {assignments.length === 0 ? (
            <div className="empty-state"><div className="es-icon">📝</div><div className="es-text">No assignments yet. Click "+ New Assignment" to add one.</div></div>
          ) : students.length === 0 ? (
            <div className="empty-state"><div className="es-icon">👥</div><div className="es-text">No students enrolled in this course yet.</div></div>
          ) : (
            <table className="data-table" style={{minWidth:600}}>
              <thead>
                <tr>
                  <th>Student</th>
                  {assignments.map(a => <th key={a.id} style={{fontSize:10,maxWidth:80}}>{a.title}<div style={{fontWeight:400,color:'var(--muted)'}}>{a.due_date}</div></th>)}
                  <th>Avg</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s,i) => {
                  const pts = assignments.map(a => getPoints(s.id, a.id)).filter(p => p!=='')
                  const avg = pts.length ? Math.round(pts.reduce((a,b)=>a+Number(b),0)/pts.length) : '—'
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div className={`avatar avatar-sm ${AV[i%8]}`}>{s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                          {s.full_name}
                        </div>
                      </td>
                      {assignments.map(a => (
                        <td key={a.id} style={{minWidth:64}}>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                            <input
                              style={{width:50,textAlign:'center',border:'1px solid var(--border)',borderRadius:6,padding:'3px 6px',fontSize:12,fontWeight:700}}
                              defaultValue={getPoints(s.id,a.id)}
                              onBlur={e => { if(e.target.value!=='') updateGrade(s.id, a.id, e.target.value) }}
                              placeholder="—"
                            />
                            {getGrade(s.id,a.id)!=='—'&&<span style={{fontSize:9,fontWeight:800,color:'var(--teal)'}}>{getGrade(s.id,a.id)}</span>}
                          </div>
                        </td>
                      ))}
                      <td><span className="badge badge-green">{avg}{avg!=='—'?' pts':''}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showAssModal && activeCourse && (
        <AssignmentModal
          course={activeCourse}
          teacherId={profile.id}
          editItem={editAssign}
          onClose={() => { setShowAssModal(false); setEditAssign(null) }}
          onSaved={() => { setShowAssModal(false); setEditAssign(null); loadCourseData(activeCourse) }}
        />
      )}
      {/* Bulk Grade Modal */}
      {bulkMode && bulkAssign && (
        <div className="modal-overlay" onClick={()=>setBulkMode(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500,maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
            <div className="modal-header">
              <div className="modal-title">⚡ Bulk Grade: {bulkAssign.title}</div>
              <button className="modal-close" onClick={()=>setBulkMode(false)}>✕</button>
            </div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>Max points: <strong>{bulkAssign.max_points||100}</strong> · Enter scores for all students at once</div>
            <div style={{overflowY:'auto',flex:1,border:'1px solid var(--border)',borderRadius:10,marginBottom:14}}>
              {students.map((s,i)=>(
                <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderBottom:'1px solid var(--border)',background:i%2===0?'white':'#fafbff'}}>
                  <div style={{flex:1,fontSize:13,fontWeight:700}}>{s.full_name}</div>
                  <input type="number" min={0} max={bulkAssign.max_points||100}
                    className="input" style={{width:80,padding:'5px 10px',textAlign:'center'}}
                    placeholder="—" value={bulkScores[s.id]??''}
                    onChange={e=>setBulkScores(p=>({...p,[s.id]:e.target.value}))}/>
                  <div style={{width:28,fontSize:12,fontWeight:700,color:'var(--teal)'}}>
                    {bulkScores[s.id]!==''&&bulkScores[s.id]!=null ? (() => {
                      const pct=(Number(bulkScores[s.id])/(bulkAssign.max_points||100))*100
                      return pct>=90?'A':pct>=80?'B':pct>=70?'C':pct>=60?'D':'F'
                    })() : ''}
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:11,color:'var(--muted)'}}>{Object.values(bulkScores).filter(v=>v!=='').length} / {students.length} scored</div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-outline" onClick={()=>setBulkMode(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveBulkGrades} disabled={bulkSaving}>{bulkSaving?'Saving…':'💾 Save All Grades'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Templates Modal */}
      {showTemplates && (
        <div className="modal-overlay" onClick={()=>setShowTemplates(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
            <div className="modal-header">
              <div className="modal-title">📋 Assignment Templates</div>
              <button className="modal-close" onClick={()=>setShowTemplates(false)}>✕</button>
            </div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>Click a template to pre-fill the new assignment form.</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {ASSIGNMENT_TEMPLATES.map(tpl=>(
                <div key={tpl.title} onClick={()=>{setEditAssign({...tpl,id:null});setShowTemplates(false);setShowAssModal(true)}}
                  style={{padding:'12px 14px',border:'1px solid var(--border)',borderRadius:10,cursor:'pointer',display:'flex',gap:12,alignItems:'flex-start',transition:'all .12s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <span style={{fontSize:20}}>{tpl.assignment_type==='homework'?'📚':tpl.assignment_type==='quiz'?'✏️':tpl.assignment_type==='test'?'📋':tpl.assignment_type==='project'?'🎨':'⭐'}</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{tpl.title}</div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{tpl.description}</div>
                    <div style={{fontSize:10,color:'var(--teal)',marginTop:3,fontWeight:700}}>{tpl.max_points} pts · {tpl.assignment_type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {reviewSub && (
        <GradeSubmissionModal
          sub={reviewSub.sub}
          student={reviewSub.student}
          assign={reviewSub.assign}
          onClose={()=>setReviewSub(null)}
          onSaved={()=>{ setReviewSub(null); loadCourseData(activeCourse) }}
        />
      )}
    </div>
  )
}

function AssignmentModal({ course, teacherId, onClose, onSaved, editItem=null }) {
  const [form, setForm] = useState({
    title:           editItem?.title           || '',
    description:     editItem?.description     || '',
    due_date:        editItem?.due_date        || '',
    max_points:      editItem?.max_points      || 100,
    assignment_type: editItem?.assignment_type || 'homework',
  })
  const [saving, setSaving] = useState(false)
  const TYPES = [
    { value:'homework',     label:'📚 Homework'      },
    { value:'quiz',         label:'✏️ Quiz'           },
    { value:'test',         label:'📋 Test / Exam'   },
    { value:'project',      label:'🎨 Project'       },
    { value:'classwork',    label:'✍️ Classwork'     },
    { value:'extra_credit', label:'⭐ Extra Credit'  },
  ]

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    if (editItem) {
      await supabase.from('assignments').update({ ...form }).eq('id', editItem.id)
    } else {
      await supabase.from('assignments').insert([{ ...form, course_id: course.id, teacher_id: teacherId }])
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
        <div className="modal-header">
          <div className="modal-title">{editItem?'✏️ Edit':'📝 New'} Assignment — {course.name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="input-label">Assignment Title *</label>
            <input className="input" required value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Chapter 4 Quiz"/>
          </div>
          <div className="form-group">
            <label className="input-label">Type</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {TYPES.map(t=>(
                <button type="button" key={t.value} onClick={()=>setForm(p=>({...p,assignment_type:t.value}))}
                  style={{padding:'5px 12px',borderRadius:20,border:'2px solid',fontSize:11,fontWeight:700,cursor:'pointer',
                    borderColor: form.assignment_type===t.value?'var(--teal)':'var(--border)',
                    background:  form.assignment_type===t.value?'var(--teal)':'white',
                    color:       form.assignment_type===t.value?'white':'var(--muted)'}}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="input-label">Instructions / Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Describe what students need to do…" style={{resize:'vertical'}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="form-group">
              <label className="input-label">Due Date</label>
              <input className="input" type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="input-label">Max Points</label>
              <input className="input" type="number" min="1" max="1000" value={form.max_points} onChange={e=>setForm(p=>({...p,max_points:Number(e.target.value)}))}/>
            </div>
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving||!form.title.trim()}>{saving?'Saving…':editItem?'Save Changes':'Create Assignment'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}


function GradeSubmissionModal({ sub, student, assign, onClose, onSaved }) {
  const maxPts = assign?.max_points || 100
  const [points,   setPoints]   = useState(sub?.points ?? '')
  const [feedback, setFeedback] = useState(sub?.feedback || '')
  const [saving,   setSaving]   = useState(false)

  const numPts = points !== '' ? Number(points) : null
  const pct = numPts !== null ? Math.round((numPts / maxPts) * 100) : null
  const letterGrade = pct === null ? null
    : pct >= 93 ? 'A'  : pct >= 90 ? 'A-' : pct >= 87 ? 'B+'
    : pct >= 83 ? 'B'  : pct >= 80 ? 'B-' : pct >= 77 ? 'C+'
    : pct >= 73 ? 'C'  : pct >= 70 ? 'C-' : pct >= 67 ? 'D+'
    : pct >= 60 ? 'D'  : 'F'
  const gradeColor = !letterGrade ? 'var(--muted)'
    : letterGrade[0] === 'A' ? '#00804a'
    : letterGrade[0] === 'B' ? '#0050b0'
    : letterGrade[0] === 'C' ? '#b07800'
    : '#cc3333'

  async function save() {
    if (points === '') return
    setSaving(true)
    const now = new Date().toISOString()
    await supabase.from('submissions').update({
      points: Number(points),
      grade: letterGrade,
      feedback: feedback.trim() || null,
      status: 'graded',
      graded_at: now,
    }).eq('id', sub.id)
    setSaving(false)
    onSaved()
  }

  const barPct = pct !== null ? Math.min(100, pct) : 0
  const barColor = pct === null ? '#eee'
    : pct >= 90 ? '#00804a'
    : pct >= 70 ? '#3b9eff'
    : pct >= 60 ? '#b07800'
    : '#cc3333'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:460}}>
        <div className="modal-header">
          <div className="modal-title">Grade Submission</div>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>

        <div style={{background:'var(--bg)',borderRadius:10,padding:'12px 14px',marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>{student?.full_name}</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>{assign?.title} &middot; {maxPts} pts max</div>
          {assign?.due_date && <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Due: {assign.due_date}</div>}
        </div>

        {sub?.content && (
          <div style={{marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:12,marginBottom:6,color:'var(--muted)'}}>STUDENT RESPONSE</div>
            <div style={{background:'#f7f9ff',borderRadius:10,padding:'12px 14px',fontSize:13,lineHeight:1.6,whiteSpace:'pre-wrap',maxHeight:160,overflowY:'auto',border:'1px solid var(--border)'}}>
              {sub.content}
            </div>
          </div>
        )}

        <div style={{display:'flex',alignItems:'flex-end',gap:16,marginBottom:16}}>
          <div className="form-group" style={{flex:1,marginBottom:0}}>
            <label className="input-label">Score (out of {maxPts})</label>
            <input className="input" type="number" min="0" max={maxPts} value={points}
              onChange={e => setPoints(e.target.value)}
              style={{fontSize:20,fontWeight:800,textAlign:'center'}}/>
          </div>
          <div style={{textAlign:'center',minWidth:70,paddingBottom:4}}>
            <div style={{fontSize:32,fontWeight:900,color:gradeColor,lineHeight:1}}>{letterGrade || '--'}</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>{pct !== null ? String(pct) + '%' : ''}</div>
          </div>
        </div>

        {pct !== null && (
          <div style={{marginBottom:16}}>
            <div style={{background:'#eee',borderRadius:20,height:8,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:20,width:String(barPct)+'%',transition:'width 0.3s',background:barColor}}/>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="input-label">Feedback for Student (optional)</label>
          <textarea className="input" rows={3} value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Add feedback for the student"
            style={{resize:'vertical'}}/>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || points === ''}>
            {saving ? 'Saving...' : 'Save Grade'}
          </button>
        </div>
      </div>
    </div>
  )
}
// ── SCHEDULE ──
export function TeacherSchedule() {
  const { profile } = useAuth()
  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const today = new Date().getDate()
  return (
    <div>
      <div className="page-header fade-up"><h2>My Teaching Schedule</h2></div>
      <div className="card fade-up-2">
        <div className="cal-grid" style={{marginBottom:6}}>{days.map(d=><div key={d} className="cal-day-header">{d}</div>)}</div>
        <div className="cal-grid">
          {Array.from({length:35},(_,i)=>i+1).map(d=>(
            <div key={d} className={`cal-day ${d===today?'today':''} ${d>31?'other-month':''}`}>
              <div className="cal-day-num">{d>31?d-31:d}</div>
              {d===3&&<div className="cal-event cal-ev-teal">{profile?.subject?.split(',')[0]?.trim()||'Class'}</div>}
              {d===10&&<div className="cal-event cal-ev-violet">{profile?.subject?.split(',')[0]?.trim()||'Class'}</div>}
              {d===17&&<div className="cal-event cal-ev-gold">Mid-term</div>}
              {d===24&&<div className="cal-event cal-ev-teal">{profile?.subject?.split(',')[0]?.trim()||'Class'}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── MESSAGES ──
export function TeacherMessages() {
  const { user } = useAuth()
  const [threads,  setThreads]  = useState([])
  const [active,   setActive]   = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg,   setNewMsg]   = useState('')
  const [sending,  setSending]  = useState(false)
  const [showNew,  setShowNew]  = useState(false)
  const [search,   setSearch]   = useState('')

  const activeRef = useRef(active)
  useEffect(() => { activeRef.current = active }, [active])

  useEffect(() => {
    if (!user) return
    loadThreads()
    const channel = supabase.channel('teacher-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new
        if (msg.sender_id === user.id || msg.recipient_id === user.id) {
          loadThreads()
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
      .select('id,subject,created_at,sender:profiles!sender_id(id,full_name,role),recipient:profiles!recipient_id(id,full_name,role)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    const seen = {}; const deduped = []
    ;(data||[]).forEach(t => {
      const other = t.sender?.id===user.id ? t.recipient?.id : t.sender?.id
      const key = `${t.subject}__${other}`
      if (!seen[key]) { seen[key]=true; deduped.push(t) }
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
  }

  async function sendMessage() {
    if (!newMsg.trim()||!active) return
    const text = newMsg
    setNewMsg('')
    setMessages(prev => [...prev, {
      id: `temp-${Date.now()}`,
      body: text,
      created_at: new Date().toISOString(),
      sender: { id: user.id, full_name: 'You' }
    }])
    setSending(true)
    const otherId = active.sender?.id===user.id ? active.recipient?.id : active.sender?.id
    await supabase.from('messages').insert([{subject:active.subject,body:text,sender_id:user.id,recipient_id:otherId}])
    setSending(false)
  }

  async function startThread(recipientId, subject, body) {
    await supabase.from('messages').insert([{subject,body,sender_id:user.id,recipient_id:recipientId}])
  }

  const filtered = threads.filter(t => {
    const other = t.sender?.id===user.id ? t.recipient : t.sender
    return !search || other?.full_name?.toLowerCase().includes(search.toLowerCase()) || t.subject?.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div>
      <div className="page-header fade-up">
        <h2>Messages</h2>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Message</button>
      </div>
      <div className="msg-layout fade-up-2">
        <div className="msg-list">
          <div className="msg-list-search"><input placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          {filtered.length===0&&<div className="empty-state"><div className="es-icon">💬</div><div className="es-text">No messages yet.</div></div>}
          {filtered.map(t=>{
            const other=t.sender?.id===user.id?t.recipient:t.sender
            return <div key={t.id} className={`msg-thread ${active?.id===t.id?'active':''}`} onClick={()=>openThread(t)}><div className="msg-thread-name">{other?.full_name||'Unknown'}</div><div className="msg-thread-prev">{t.subject}</div></div>
          })}
        </div>
        <div className="msg-panel">
          {active ? (
            <>
              <div className="msg-panel-header">
                {(()=>{const other=active.sender?.id===user.id?active.recipient:active.sender;return(<><div className="avatar avatar-md av-2" style={{flexShrink:0}}>{other?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'?'}</div><div><div style={{fontWeight:700,fontSize:13}}>{other?.full_name||'Unknown'}</div><div style={{fontSize:10,color:'var(--muted)',textTransform:'capitalize'}}>{other?.role||'Staff'}</div></div></>)})()}
              </div>
              <div className="msg-bubbles">{messages.map(m=><div key={m.id} className={`bubble ${m.sender?.id===user.id?'sent':'recv'}`}>{m.body}</div>)}</div>
              <div className="msg-input-area"><input value={newMsg} onChange={e=>setNewMsg(e.target.value)} placeholder="Type a message…" onKeyDown={e=>e.key==='Enter'&&sendMessage()}/><button className="btn btn-primary btn-sm" onClick={sendMessage} disabled={sending}>Send ✈️</button></div>
            </>
          ) : (
            <div className="empty-state" style={{margin:'auto'}}><div className="es-icon">💬</div><div className="es-text">Select a conversation</div></div>
          )}
        </div>
      </div>

      {showNew && (
        <NewMessageModal
          senderId={user.id}
          recipientFilter="parents"
          onClose={() => setShowNew(false)}
          onSent={(recipientId, subject, body) => { startThread(recipientId, subject, body); setShowNew(false) }}
        />
      )}
    </div>
  )
}

export function TeacherAnnouncements() {
  return <AnnouncementsView audience="teachers" />
}


// ─────────────────────────────────────────────────────────────────────────────
// TEACHER CALENDAR — read-only view of school calendar events
// ─────────────────────────────────────────────────────────────────────────────
const CAL_TYPE_META = {
  holiday:  { color:'#cc3333', bg:'#fff0f0', icon:'🏖️', label:'Holiday'  },
  exam:     { color:'#b07800', bg:'#fff9e6', icon:'📝', label:'Exam'     },
  event:    { color:'#0050b0', bg:'#e6f4ff', icon:'🎉', label:'Event'    },
  deadline: { color:'#7b5ea7', bg:'#f3eeff', icon:'⏰', label:'Deadline' },
  meeting:  { color:'#00804a', bg:'#e6fff4', icon:'📋', label:'Meeting'  },
}
const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CAL_DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export function TeacherCalendar() {
  const today  = new Date()
  const [year,    setYear]    = useState(today.getFullYear())
  const [month,   setMonth]   = useState(today.getMonth())
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [detail,  setDetail]  = useState(null)

  useEffect(() => { loadEvents() }, [year, month])

  async function loadEvents() {
    setLoading(true)
    const start = `${year}-${String(month+1).padStart(2,'0')}-01`
    const end   = `${year}-${String(month+1).padStart(2,'0')}-31`
    const { data } = await supabase.from('calendar_events').select('*')
      .gte('start_date', start).lte('start_date', end).order('start_date')
    setEvents(data||[])
    setLoading(false)
  }

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const cells = []
  for (let i=0; i<firstDay; i++) cells.push(null)
  for (let d=1; d<=daysInMonth; d++) cells.push(d)
  const dateStr = d => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const eventsOn = d => events.filter(e => e.start_date === dateStr(d))
  const isToday  = d => today.getFullYear()===year && today.getMonth()===month && today.getDate()===d
  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) }

  // Upcoming events (next 30 days from today)
  const todayStr   = today.toISOString().split('T')[0]
  const upcoming   = events.filter(e => e.start_date >= todayStr).slice(0,8)

  return (
    <div>
      <div className="page-header fade-up">
        <div><h2>📅 Academic Calendar</h2><div style={{fontSize:13,color:'var(--muted)'}}>{events.length} events this month</div></div>
      </div>

      {/* Legend */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {Object.entries(CAL_TYPE_META).map(([k,m])=>(
          <div key={k} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,background:m.bg,border:`1px solid ${m.color}30`,fontSize:11,fontWeight:600,color:m.color}}>
            {m.icon} {m.label}
          </div>
        ))}
      </div>

      <div className="grid-2 fade-up-2" style={{gap:16,alignItems:'start'}}>
        {/* Calendar grid */}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
            <button onClick={prevMonth} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)',padding:'0 8px'}}>‹</button>
            <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:16}}>{CAL_MONTHS[month]} {year}</div>
            <button onClick={nextMonth} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)',padding:'0 8px'}}>›</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid var(--border)'}}>
            {CAL_DAYS.map(d=><div key={d} style={{textAlign:'center',padding:'6px 0',fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase'}}>{d}</div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
            {cells.map((d,i)=>{
              const evts = d ? eventsOn(d) : []
              return (
                <div key={i} style={{minHeight:72,padding:'4px 5px',borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)',
                  background:isToday(d)?'rgba(0,201,177,.07)':'white',borderTop:isToday(d)?'2px solid var(--teal)':'none'}}>
                  {d && <>
                    <div style={{fontSize:11,fontWeight:isToday(d)?800:500,width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                      background:isToday(d)?'var(--teal)':'transparent',color:isToday(d)?'white':'var(--text)',marginBottom:2}}>{d}</div>
                    {evts.slice(0,2).map(e=>{
                      const m = CAL_TYPE_META[e.event_type]||CAL_TYPE_META.event
                      return <div key={e.id} onClick={()=>setDetail(e)} style={{fontSize:9,fontWeight:700,color:m.color,background:m.bg,borderRadius:3,padding:'1px 4px',marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'pointer'}}>{m.icon} {e.title}</div>
                    })}
                    {evts.length>2&&<div style={{fontSize:9,color:'var(--muted)',paddingLeft:2}}>+{evts.length-2} more</div>}
                  </>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming list */}
        <div className="card">
          <div className="card-header"><div className="card-title">📋 Upcoming Events</div></div>
          {loading ? <div style={{textAlign:'center',padding:20}}><div className="spinner"/></div>
          : upcoming.length===0 ? <div className="empty-state" style={{padding:20}}><div className="es-icon">📅</div><div className="es-text">No upcoming events</div></div>
          : upcoming.map(e=>{
              const m = CAL_TYPE_META[e.event_type]||CAL_TYPE_META.event
              return (
                <div key={e.id} onClick={()=>setDetail(e)} style={{padding:'10px 0',borderBottom:'1px solid var(--border)',display:'flex',gap:10,alignItems:'flex-start',cursor:'pointer'}}>
                  <div style={{width:34,height:34,borderRadius:8,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{m.icon}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{e.title}</div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>{e.start_date}{e.end_date&&e.end_date!==e.start_date?' → '+e.end_date:''} · <span style={{textTransform:'capitalize'}}>{e.event_type}</span></div>
                    {e.description&&<div style={{fontSize:11,color:'var(--text)',marginTop:2}}>{e.description}</div>}
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="modal-overlay" onClick={()=>setDetail(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
            <div className="modal-header">
              <div className="modal-title">{CAL_TYPE_META[detail.event_type]?.icon||'📅'} {detail.title}</div>
              <button className="modal-close" onClick={()=>setDetail(null)}>✕</button>
            </div>
            {[['Date', detail.start_date+(detail.end_date&&detail.end_date!==detail.start_date?' → '+detail.end_date:'')],
              ['Type', detail.event_type], ['Audience', detail.audience],
              detail.description&&['Details', detail.description]
            ].filter(Boolean).map(([k,v])=>(
              <div key={k} style={{display:'flex',gap:12,padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
                <span style={{color:'var(--muted)',width:70,flexShrink:0}}>{k}</span>
                <span style={{fontWeight:600,textTransform:k==='Type'||k==='Audience'?'capitalize':'none'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER MEETINGS — see & manage meetings for their own courses
// ─────────────────────────────────────────────────────────────────────────────
const MTG_PLATFORM_META = {
  zoom:        { icon:'🎥', label:'Zoom',        color:'#2D8CFF', bg:'#e8f3ff', oauthKey:'zoom' },
  google_meet: { icon:'🟢', label:'Google Meet', color:'#00897B', bg:'#e6f9f7', oauthKey:'google_meet' },
  teams:       { icon:'💜', label:'MS Teams',    color:'#6264A7', bg:'#f0eeff', oauthKey:'teams' },
  other:       { icon:'🌐', label:'Other',        color:'#555',    bg:'#f5f5f5', oauthKey:null },
}
const MTG_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export function TeacherMeetings() {
  const { profile } = useAuth()
  const [meetings,    setMeetings]    = useState([])
  const [courses,     setCourses]     = useState([])
  const [connected,   setConnected]   = useState({}) // { zoom: {account_email, account_name}, ... }
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [showIntegrations, setShowIntegrations] = useState(false)
  const [editItem,    setEditItem]    = useState(null)
  const [form,        setForm]        = useState({ course_id:'', title:'', meeting_url:'', platform:'zoom', scheduled_at:'', duration_min:60, recurring:false, recurrence:'weekly', day_of_week:1, recurring_time:'09:00', notes:'' })
  const [saving,      setSaving]      = useState(false)
  const [creating,    setCreating]    = useState(false) // API meeting creation in progress
  const [toast,       setToast]       = useState(null)
  const [oauthStatus, setOauthStatus] = useState(null) // 'success' | 'error' | null

  useEffect(() => {
    if (!profile?.id) return
    loadAll()
    // Handle OAuth redirect results
    const params = new URLSearchParams(window.location.search)
    const success = params.get('oauth_success')
    const error   = params.get('oauth_error')
    if (success || error) {
      setOauthStatus(success ? 'success' : 'error')
      setTimeout(() => setOauthStatus(null), 4000)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [profile?.id])

  async function loadAll() {
    const [{ data: crs }, { data: mtgs }] = await Promise.all([
      supabase.from('courses').select('id,name,grade_level').eq('teacher_id', profile.id).eq('is_active',true).order('name'),
      supabase.from('class_meetings').select('*, course:courses(id,name,grade_level)').eq('teacher_id', profile.id).order('scheduled_at',{ascending:false}),
    ])
    setCourses(crs||[])
    setMeetings(mtgs||[])
    // oauth_tokens table may not exist yet — fail silently
    try {
      const { data: tokens } = await supabase
        .from('oauth_tokens')
        .select('platform,account_email,account_name')
        .eq('user_id', profile.id)
      const conn = {}
      ;(tokens||[]).forEach(tok => { conn[tok.platform] = { email: tok.account_email, name: tok.account_name } })
      setConnected(conn)
    } catch(_) { /* table not yet created — integrations show as disconnected */ }
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  function openNew() {
    setEditItem(null)
    setForm({ course_id: courses[0]?.id||'', title:'', meeting_url:'', platform:'zoom', scheduled_at:'', duration_min:60, recurring:false, recurrence:'weekly', day_of_week:1, recurring_time:'09:00', notes:'' })
    setShowModal(true)
  }

  function openEdit(m) { setEditItem(m); setForm({...m, scheduled_at:m.scheduled_at?.slice(0,16)||''}); setShowModal(true) }

  async function sendMeetingInvites(meeting, courseId) {
    const cid = courseId || meeting.course_id
    if (!cid || !meeting.meeting_url) return
    // Get enrolled students + guardian emails
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student:students(id,full_name,guardian_email,email)')
      .eq('course_id', cid).eq('status','active')
    const recipients = (enrollments||[]).map(e=>e.student).filter(Boolean)
    const courseName = courses.find(c=>c.id===cid)?.name || 'your class'
    const scheduledAt = meeting.scheduled_at
      ? new Date(meeting.scheduled_at).toLocaleString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})
      : null
    let sent = 0
    for (const student of recipients) {
      const emails = [student.guardian_email, student.email].filter(Boolean)
      for (const to of emails) {
        await fetch('/.netlify/functions/send-email', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            to,
            template: 'meeting_invite',
            data: {
              teacherName:  profile.full_name || 'Your Teacher',
              studentName:  student.full_name,
              courseTitle:  courseName,
              meetingTitle: meeting.title,
              platform:     meeting.platform || 'Zoom',
              meetingUrl:   meeting.meeting_url,
              scheduledAt,
              duration:     meeting.duration_min,
              notes:        meeting.notes || '',
            }
          })
        }).catch(()=>{})
        sent++
      }
    }
    showToast(`📧 Invites sent to ${sent} recipient${sent!==1?'s':''}`)
  }

  function connectPlatform(platform) {
    window.location.href = `/.netlify/functions/oauth-${platform === 'google_meet' ? 'google' : platform}?state=${profile.id}`
  }

  async function disconnectPlatform(platform) {
    await fetch('/.netlify/functions/oauth-disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, platform })
    })
    loadAll()
    showToast('🔌 Account disconnected')
  }

  async function saveMeeting() {
    if (!form.title.trim()) return
    setSaving(true)
    let meetingUrl = form.meeting_url

    // If platform is connected and no manual URL — call API to create meeting
    const platformKey = form.platform
    const isConnected = !!connected[platformKey]
    const hasManualUrl = !!form.meeting_url?.trim()

    if (isConnected && !hasManualUrl && !editItem) {
      setCreating(true)
      try {
        const res = await fetch('/.netlify/functions/create-meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId:       profile.id,
            platform:     platformKey,
            title:        form.title,
            scheduled_at: form.scheduled_at || null,
            duration_min: Number(form.duration_min) || 60,
            notes:        form.notes || '',
          })
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to create meeting')
        meetingUrl = data.join_url
        showToast(`🎥 ${MTG_PLATFORM_META[platformKey]?.label} meeting created!`)
      } catch(e) {
        showToast(`❌ ${e.message}`)
        setSaving(false); setCreating(false)
        return
      }
      setCreating(false)
    }

    const payload = { ...form, meeting_url: meetingUrl, teacher_id: profile.id, duration_min: Number(form.duration_min)||60, day_of_week: Number(form.day_of_week)||1 }
    let savedMeeting = null
    if (editItem) {
      await supabase.from('class_meetings').update(payload).eq('id', editItem.id)
      savedMeeting = { ...editItem, ...payload }
    } else {
      const { data } = await supabase.from('class_meetings').insert([payload]).select().single()
      savedMeeting = data
    }
    setSaving(false); setShowModal(false)
    loadAll()
    const wasNew = !editItem
    showToast(wasNew ? '✅ Meeting added' : '✅ Updated')
    if (wasNew && savedMeeting?.meeting_url) {
      await sendMeetingInvites(savedMeeting, form.course_id)
    }
  }

  async function deleteMeeting(id) {
    if (!confirm('Delete this meeting?')) return
    await supabase.from('class_meetings').delete().eq('id', id)
    loadAll(); showToast('🗑 Deleted')
  }

  const upcoming = meetings.filter(m => !m.scheduled_at || new Date(m.scheduled_at) >= new Date())
  const past     = meetings.filter(m => m.scheduled_at && new Date(m.scheduled_at) < new Date() && !m.recurring)

  function MeetingCard({ m }) {
    const p  = MTG_PLATFORM_META[m.platform]||MTG_PLATFORM_META.other
    const dt = m.scheduled_at ? new Date(m.scheduled_at) : null
    return (
      <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'flex-start'}}>
        <div style={{width:36,height:36,borderRadius:10,background:p.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{p.icon}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontWeight:700,fontSize:13}}>{m.title}</span>
            <span style={{fontSize:10,fontWeight:700,color:p.color,background:p.bg,padding:'1px 6px',borderRadius:4}}>{p.label}</span>
            {m.recurring&&<span style={{fontSize:10,color:'var(--muted)',background:'var(--bg)',padding:'1px 6px',borderRadius:4}}>🔄 {m.recurrence} · {MTG_DAYS[m.day_of_week]}</span>}
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
            {m.course?.name||'—'}
            {dt&&<> · {dt.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} {dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</>}
            {m.duration_min&&<> · {m.duration_min} min</>}
          </div>
          {m.notes&&<div style={{fontSize:11,color:'var(--text)',marginTop:2}}>{m.notes}</div>}
          {m.meeting_url&&(
            <a href={m.meeting_url} target="_blank" rel="noreferrer"
              style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:5,fontSize:11,fontWeight:700,color:p.color,textDecoration:'none',padding:'3px 10px',borderRadius:6,background:p.bg,border:`1px solid ${p.color}30`}}>
              {p.icon} Join Meeting →
            </a>
          )}
        </div>
        <div style={{display:'flex',gap:4,flexShrink:0}}>
          {m.meeting_url&&(
            <button onClick={()=>sendMeetingInvites(m, m.course_id)} title="Send invite emails to enrolled students"
              style={{background:'#e0faf7',border:'1px solid #00c9b1',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:700,color:'#007a6e',padding:'3px 8px',whiteSpace:'nowrap'}}>
              📧 Invite
            </button>
          )}
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
        <div><h2>🎥 My Class Meetings</h2><div style={{fontSize:13,color:'var(--muted)'}}>{meetings.length} total</div></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-outline" onClick={()=>setShowIntegrations(true)}>
            🔌 Integrations
            {Object.keys(connected).length > 0 && (
              <span style={{marginLeft:6,background:'#00c9b1',color:'white',borderRadius:10,padding:'1px 7px',fontSize:10,fontWeight:800}}>
                {Object.keys(connected).length}
              </span>
            )}
          </button>
          <button className="btn btn-primary" onClick={openNew} disabled={courses.length===0}>+ Add Meeting</button>
        </div>
      </div>

      {loading ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
      : courses.length===0 ? (
        <div className="card" style={{textAlign:'center',padding:40}}>
          <div style={{fontSize:36,marginBottom:10}}>🎥</div>
          <div style={{fontWeight:800,fontSize:16}}>No courses assigned yet</div>
        </div>
      ) : (
        <div className="grid-2 fade-up-2">
          <div>
            <div style={{fontWeight:800,fontSize:12,color:'var(--muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>Upcoming</div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              {upcoming.length===0 ? <div className="empty-state" style={{padding:30}}><div className="es-icon">🎥</div><div className="es-text">No upcoming meetings</div></div>
              : upcoming.map(m=><MeetingCard key={m.id} m={m}/>)}
            </div>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:12,color:'var(--muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>Past</div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              {past.length===0 ? <div className="empty-state" style={{padding:30}}><div className="es-text">None yet</div></div>
              : past.map(m=><MeetingCard key={m.id} m={m}/>)}
            </div>
          </div>
        </div>
      )}

      
      {/* ── Integrations Modal ───────────────────────── */}
      {showIntegrations && (
        <div className="modal-overlay" onClick={()=>setShowIntegrations(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
            <div className="modal-header">
              <div className="modal-title">🔌 Video Platform Integrations</div>
              <button className="modal-close" onClick={()=>setShowIntegrations(false)}>✕</button>
            </div>
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:16,lineHeight:1.6}}>
              Connect your accounts so BLE can create meetings automatically when you schedule a class.
            </p>
            {[
              { key:'zoom',        label:'Zoom',         icon:'🎥', color:'#2D8CFF', bg:'#e8f3ff', fn:'oauth-zoom' },
              { key:'google_meet', label:'Google Meet',  icon:'🟢', color:'#00897B', bg:'#e6f9f7', fn:'oauth-google' },
              { key:'teams',       label:'MS Teams',     icon:'💜', color:'#6264A7', bg:'#f0eeff', fn:'oauth-teams' },
            ].map(p => {
              const conn = connected[p.key]
              return (
                <div key={p.key} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:12,border:'1px solid var(--border)',marginBottom:10,background:conn?p.bg:'white'}}>
                  <div style={{width:44,height:44,borderRadius:12,background:p.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{p.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:14,color:p.color}}>{p.label}</div>
                    {conn
                      ? <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>Connected as <strong>{conn.name||conn.email}</strong>{conn.email&&conn.name?' ('+conn.email+')':''}</div>
                      : <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>Not connected — meetings will use manual URL</div>
                    }
                  </div>
                  {conn
                    ? <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc',fontSize:12}} onClick={()=>disconnectPlatform(p.key)}>Disconnect</button>
                    : <button className="btn btn-sm btn-primary" style={{fontSize:12,background:p.color}} onClick={()=>connectPlatform(p.key)}>Connect</button>
                  }
                </div>
              )
            })}
            <div style={{background:'#f8f9fc',borderRadius:10,padding:'12px 14px',fontSize:12,color:'var(--muted)',marginTop:8,lineHeight:1.7}}>
              <strong>How it works:</strong> Once connected, selecting Zoom/Meet/Teams when adding a meeting will automatically create the meeting in your account and fill in the join link. Students will receive the link in their invite email.
            </div>
          </div>
        </div>
      )}

{showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
            <div className="modal-header">
              <div className="modal-title">{editItem?'✏️ Edit Meeting':'🎥 Add Meeting'}</div>
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
                  <option value="">— Select —</option>
                  {courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Platform</label>
                <select className="input" value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))}>
                  {Object.entries(MTG_PLATFORM_META).map(([k,m])=><option key={k} value={k}>{m.icon} {m.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="input-label">Duration (min)</label>
                <input className="input" type="number" min={15} max={240} step={15} value={form.duration_min} onChange={e=>setForm(p=>({...p,duration_min:e.target.value}))}/>
              </div>
            </div>
            {/* Smart URL field — shows connect prompt if platform is connected but no URL */}
            <div className="form-group">
              <label className="input-label">Meeting URL</label>
              {connected[form.platform] && !editItem ? (
                <div style={{background:'#e6f9f7',border:'1px solid #b0ece6',borderRadius:10,padding:'10px 14px',fontSize:13}}>
                  <div style={{fontWeight:700,color:'#00897B',marginBottom:2}}>
                    ✅ {MTG_PLATFORM_META[form.platform]?.label} connected — meeting will be created automatically
                  </div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>Connected as {connected[form.platform].name||connected[form.platform].email}</div>
                  <div style={{marginTop:8}}>
                    <label style={{fontSize:12,color:'var(--muted)'}}>Or paste a manual URL to override:</label>
                    <input className="input" type="url" value={form.meeting_url||''} onChange={e=>setForm(p=>({...p,meeting_url:e.target.value}))} placeholder="Leave blank to auto-create" style={{marginTop:4}}/>
                  </div>
                </div>
              ) : (
                <div>
                  <input className="input" type="url" value={form.meeting_url||''} onChange={e=>setForm(p=>({...p,meeting_url:e.target.value}))} placeholder="https://zoom.us/j/… (or connect account above)"/>
                  {form.platform !== 'other' && !connected[form.platform] && (
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>
                      💡 <button type="button" onClick={()=>{setShowModal(false);setShowIntegrations(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--teal)',fontWeight:700,padding:0,fontSize:11}}>Connect your {MTG_PLATFORM_META[form.platform]?.label} account</button> to auto-create meetings
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <input type="checkbox" id="t-recurring" checked={form.recurring} onChange={e=>setForm(p=>({...p,recurring:e.target.checked}))}/>
              <label htmlFor="t-recurring" style={{fontSize:13,fontWeight:600}}>Recurring meeting</label>
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
                    {MTG_DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Start Time</label>
                  <input className="input" type="time" value={form.recurring_time||'09:00'} onChange={e=>setForm(p=>({...p,recurring_time:e.target.value}))}/>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="input-label">Date & Time</label>
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
                {creating?'Creating meeting…':saving?'Saving…':'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER CONDUCT — add/view conduct records for their students
// ─────────────────────────────────────────────────────────────────────────────
const TC_TYPE_META = {
  positive: { color:'#00804a', bg:'#e6fff4', border:'#b0eedd', icon:'⭐' },
  negative: { color:'#cc3333', bg:'#fff0f0', border:'#ffcccc', icon:'⚠️' },
  neutral:  { color:'#0050b0', bg:'#e6f4ff', border:'#b0d4ff', icon:'📝' },
}
const TC_CATEGORIES = ['academic','behavior','attendance','other']
const TC_CAT_ICON   = { academic:'📚', behavior:'🧠', attendance:'📅', other:'📌' }

export function TeacherConduct() {
  const { profile } = useAuth()
  const [records,   setRecords]   = useState([])
  const [students,  setStudents]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterStu, setFilterStu] = useState('')
  const [filterType,setFilterType]= useState('all')
  const [form,      setForm]      = useState({ student_id:'', type:'positive', category:'behavior', title:'', description:'', points:0, date: new Date().toISOString().split('T')[0] })
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState(null)

  useEffect(() => { if(profile?.id) loadAll() }, [profile?.id])

  async function loadAll() {
    // Get students in teacher courses
    const { data: enr } = await supabase.from('enrollments')
      .select('student:students(id,full_name,grade_level,conduct_points)')
      .eq('status','active')
      .in('course_id',
        (await supabase.from('courses').select('id').eq('teacher_id',profile.id).eq('is_active',true)).data?.map(c=>c.id)||[]
      )
    const studs = [...new Map((enr||[]).map(e=>e.student).filter(Boolean).map(s=>[s.id,s])).values()]
    setStudents(studs)

    if (studs.length) {
      const { data: recs } = await supabase.from('conduct_records')
        .select('*, student:students(id,full_name,grade_level)')
        .in('student_id', studs.map(s=>s.id))
        .order('date',{ascending:false}).limit(100)
      setRecords(recs||[])
    }
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  async function saveRecord() {
    if (!form.student_id || !form.title.trim()) return
    setSaving(true)
    await supabase.from('conduct_records').insert([{ ...form, recorded_by: profile.id, points: Number(form.points)||0 }])
    const student = students.find(s=>s.id===form.student_id)
    const delta = form.type==='positive' ? Number(form.points)||0 : form.type==='negative' ? -(Number(form.points)||0) : 0
    if (delta !== 0) await supabase.from('students').update({ conduct_points: (student?.conduct_points||0)+delta }).eq('id', form.student_id)
    setSaving(false); setShowModal(false)
    setForm({ student_id:'', type:'positive', category:'behavior', title:'', description:'', points:0, date: new Date().toISOString().split('T')[0] })
    loadAll(); showToast('✅ Record saved')
  }

  const filtered = records.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false
    if (filterStu && r.student_id !== filterStu) return false
    return true
  })

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}
      {oauthStatus&&<div style={{position:'fixed',top:20,right:24,zIndex:1000,padding:'12px 20px',borderRadius:10,fontWeight:700,fontSize:13,boxShadow:'0 4px 20px rgba(0,0,0,.2)',background:oauthStatus==='success'?'#00804a':'#cc3333',color:'white'}}>
        {oauthStatus==='success'?'Account connected!':'Failed to connect. Please try again.'}
      </div>}

      <div className="page-header fade-up">
        <div><h2>🧠 Student Conduct</h2><div style={{fontSize:13,color:'var(--muted)'}}>{records.length} records</div></div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Add Record</button>
      </div>

      {/* Summary tiles */}
      <div className="grid-4 fade-up-2" style={{marginBottom:16}}>
        {[['⭐','Positive',records.filter(r=>r.type==='positive').length,'#00804a'],
          ['⚠️','Negative',records.filter(r=>r.type==='negative').length,'#cc3333'],
          ['📝','Neutral', records.filter(r=>r.type==='neutral').length, '#0050b0'],
          ['🧑‍🎓','My Students',students.length,'var(--teal)']
        ].map(([ic,l,n,c])=>(
          <div key={l} className="stat-card"><div className="stat-icon">{ic}</div><div className="stat-value" style={{color:c}}>{n}</div><div className="stat-label">{l}</div></div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <select className="input" style={{maxWidth:200}} value={filterStu} onChange={e=>setFilterStu(e.target.value)}>
          <option value="">All Students</option>
          {students.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <div style={{display:'flex',gap:4}}>
          {['all','positive','negative','neutral'].map(tp=>(
            <button key={tp} onClick={()=>setFilterType(tp)}
              style={{padding:'5px 12px',borderRadius:8,border:'1px solid var(--border)',background:filterType===tp?'var(--teal)':'white',color:filterType===tp?'white':'var(--text)',fontWeight:700,fontSize:11,cursor:'pointer',textTransform:'capitalize'}}>
              {tp==='all'?'All':TC_TYPE_META[tp]?.icon+' '+tp}
            </button>
          ))}
        </div>
      </div>

      <div className="card fade-up-3" style={{padding:0,overflow:'hidden'}}>
        {loading ? <div style={{padding:40,textAlign:'center'}}><div className="spinner"/></div>
        : filtered.length===0 ? <div className="empty-state" style={{padding:40}}><div className="es-icon">🧠</div><div className="es-text">No records yet</div></div>
        : filtered.map((r,i)=>{
            const m = TC_TYPE_META[r.type]||TC_TYPE_META.neutral
            return (
              <div key={r.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',background:i%2===0?'white':'#fafbff',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:36,height:36,borderRadius:10,background:m.bg,border:`1px solid ${m.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{m.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontWeight:700,fontSize:13}}>{r.title}</span>
                    <span style={{fontSize:10,color:'var(--muted)',background:'var(--bg)',padding:'1px 6px',borderRadius:4}}>{TC_CAT_ICON[r.category]} {r.category}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{r.student?.full_name} · {r.date}</div>
                  {r.description&&<div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{r.description}</div>}
                </div>
                {r.points ? <div style={{fontWeight:800,fontSize:14,color:m.color,flexShrink:0}}>{r.type==='negative'?'-':'+'}{r.points}pts</div> : null}
              </div>
            )
          })
        }
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:480}}>
            <div className="modal-header">
              <div className="modal-title">📝 Add Conduct Record</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="input-label">Student *</label>
              <select className="input" value={form.student_id} onChange={e=>setForm(p=>({...p,student_id:e.target.value}))}>
                <option value="">— Select student —</option>
                {students.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.grade_level})</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="input-label">Type *</label>
                <select className="input" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                  <option value="positive">⭐ Positive</option>
                  <option value="negative">⚠️ Negative</option>
                  <option value="neutral">📝 Neutral</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Category *</label>
                <select className="input" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                  {TC_CATEGORIES.map(c=><option key={c} value={c}>{TC_CAT_ICON[c]} {c}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="input-label">Title *</label>
                <input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Great participation"/>
              </div>
              <div className="form-group">
                <label className="input-label">Points</label>
                <input className="input" type="number" min={0} max={100} value={form.points} onChange={e=>setForm(p=>({...p,points:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="input-label">Date</label>
              <input className="input" type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="input-label">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={{resize:'vertical'}}/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveRecord} disabled={saving||!form.student_id||!form.title.trim()}>{saving?'Saving…':'Save Record'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
