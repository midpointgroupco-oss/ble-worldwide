import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import NewMessageModal from '../../components/NewMessageModal'

const AV = ['av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8']
const GRADE_COLORS = {
  '1st':'#06d6a0','2nd':'#00c9b1','3rd':'#3b9eff','4th':'#00c9b1','5th':'#3b9eff','6th':'#f72585','7th':'#ffc845',
  '8th':'#ff6058','9th':'#7b5ea7','10th':'#06d6a0','11th':'#ff8c42','12th':'#00b4d8'
}

// Shared hook — supports multiple children per parent
function useChildData() {
  const { user } = useAuth()
  const [children,       setChildren]       = useState([])
  const [activeChild,    setActiveChild]    = useState(null)
  const [courses,        setCourses]        = useState([])
  const [attendance,     setAttendance]     = useState([])
  const [scheduleEvents, setScheduleEvents] = useState([])
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    if (!user) return
    loadChildren()
  }, [user])

  async function loadChildren() {
    const { data: students } = await supabase
      .from('students').select('*')
      .eq('guardian_email', user.email).eq('status', 'active')
    if (!students?.length) { setLoading(false); return }
    setChildren(students)
    loadChild(students[0], students)
  }

  async function loadChild(child, allChildren) {
    setLoading(true)
    setActiveChild(child)

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course:courses(id,name,subject,grade_level,credits,teacher:profiles!teacher_id(id,full_name))')
      .eq('student_id', child.id).eq('status', 'active')

    const childCourses = (enrollments||[]).map(e => e.course).filter(Boolean)
    const courseIds = childCourses.map(c => c.id)

    const { data: att } = await supabase.from('attendance').select('*').eq('student_id', child.id)
    setAttendance(att||[])

    if (courseIds.length) {
      const { data: events } = await supabase.from('schedule_events')
        .select('*').in('course_id', courseIds).order('start_time')
      setScheduleEvents(events||[])
    } else {
      setScheduleEvents([])
    }

    const enriched = await Promise.all(childCourses.map(async course => {
      const { data: assignments } = await supabase
        .from('assignments').select('*').eq('course_id', course.id).order('due_date')
      const { data: submissions } = await supabase
        .from('submissions').select('*').eq('student_id', child.id)
        .in('assignment_id', (assignments||[]).map(a => a.id))
      const graded  = (submissions||[]).filter(s => s.status==='graded' && s.points!=null)
      const totalPts = graded.reduce((a,b)=>a+Number(b.points||0),0)
      const totalMax = graded.reduce((a,b)=>{
        const asgn=(assignments||[]).find(x=>x.id===b.assignment_id)
        return a+(asgn?.max_points||100)
      },0)
      const avg      = graded.length && totalMax ? Math.round((totalPts/totalMax)*100) : null
      const courseAtt = (att||[]).filter(a=>a.course_id===course.id)
      const present   = courseAtt.filter(a=>a.status==='present').length
      const attRate   = courseAtt.length ? Math.round((present/courseAtt.length)*100) : null
      return { ...course, assignments:assignments||[], submissions:submissions||[], avg, attRate, courseAtt }
    }))

    setCourses(enriched)
    setLoading(false)
  }

  function switchChild(child) { loadChild(child, children) }

  return { child: activeChild, children, courses, attendance, scheduleEvents, loading, switchChild }
}

// Child switcher component — drop into any parent page header
function ChildSwitcher({ children, activeChild, onSwitch }) {
  if (!children || children.length <= 1) return null
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'var(--bg)',borderRadius:10,border:'1px solid var(--border)'}}>
      <span style={{fontSize:11,color:'var(--muted)',fontWeight:700}}>Viewing:</span>
      {children.map(c => (
        <button key={c.id} onClick={() => onSwitch(c)}
          style={{padding:'4px 10px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
            background: activeChild?.id===c.id ? 'var(--teal)' : 'white',
            color: activeChild?.id===c.id ? 'white' : 'var(--text)',
            boxShadow: activeChild?.id===c.id ? '0 2px 8px rgba(0,201,177,.3)' : 'none',
            transition:'all .15s'}}>
          {c.full_name?.split(' ')[0]}
        </button>
      ))}
    </div>
  )
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

export function ParentDashboard() {
  const { profile } = useAuth()
  const { child, children, courses, loading, switchChild } = useChildData()
  const name = profile?.full_name || 'Family'

  const overallAvg = courses.filter(c=>c.avg!=null).length
    ? Math.round(courses.filter(c=>c.avg!=null).reduce((a,c)=>a+c.avg,0)/courses.filter(c=>c.avg!=null).length)
    : null

  return (
    <div>
      <div className="banner fade-up" style={{background:'linear-gradient(135deg,#3a0a2e,#5c1a50,#1a3060)'}}>
        <h2>Good morning, {name} 👨‍👩‍👧</h2>
        <p>Your child&#39;s progress at BLE Worldwide</p>
        <div className="banner-stats">
          <div><div className="bs-num">{loading?'…':children.length}</div><div className="bs-lbl">Children Enrolled</div></div>
          <div><div className="bs-num">{loading?'…':courses.length}</div><div className="bs-lbl">Active Courses</div></div>
          <div><div className="bs-num">{loading?'…':child?.attendance_rate||'—'}%</div><div className="bs-lbl">Attendance</div></div>
          <div><div className="bs-num">{loading?'…':overallAvg!=null?overallAvg+'%':'—'}</div><div className="bs-lbl">Overall Avg</div></div>
        </div>
      </div>

      {children.length > 1 && (
        <div style={{marginBottom:12}}><ChildSwitcher children={children} activeChild={child} onSwitch={switchChild}/></div>
      )}
      {loading ? (
        <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
      ) : !child ? (
        <div className="card fade-up-2" style={{textAlign:'center',padding:40}}>
          <div style={{fontSize:48,marginBottom:12}}>👧</div>
          <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:16,marginBottom:6}}>No Student Linked</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>Your account is not yet linked to a student. Contact your school administrator.</div>
        </div>
      ) : (
        <>
          {/* Child card */}
          <div className="card fade-up-2" style={{marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:13,marginBottom:14}}>
              <div className="avatar avatar-lg av-1">{child.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
              <div>
                <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:17}}>{child.full_name}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{child.grade_level} Grade · {child.country||'—'} · ID: {child.student_id||'—'}</div>
              </div>
              <div style={{marginLeft:'auto'}}><span className="badge badge-green">Active</span></div>
            </div>

            {courses.length === 0 ? (
              <div className="empty-state"><div className="es-icon">📚</div><div className="es-text">No courses enrolled yet.</div></div>
            ) : (
              <div className="card" style={{padding:14}}>
                <div className="card-header" style={{marginBottom:10}}><div className="card-title">Course Grades</div></div>
                {courses.map(c => {
                  const pct = c.avg ?? 0
                  return (
                    <div key={c.id} className="prog-item">
                      <div className="prog-label">
                        <span>{c.name} <span style={{fontSize:10,color:'var(--muted)'}}>· {c.teacher?.full_name||'Unassigned'}</span></span>
                        <span style={{fontWeight:700,color:'var(--teal)'}}>{c.avg!=null?c.avg+'%':'No grades yet'}</span>
                      </div>
                      <div className="prog-bar"><div className="prog-fill" style={{width:`${pct}%`,background:'linear-gradient(90deg,var(--teal),var(--sky))'}}/></div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent assignments */}
          {courses.some(c=>c.assignments.length>0) && (
            <div className="card fade-up-3">
              <div className="card-header"><div className="card-title">Upcoming & Recent Assignments</div></div>
              {courses.flatMap(c => c.assignments.map(a => ({ ...a, courseName: c.name, subject: c.subject }))).slice(0,6).map(a => {
                const isOverdue = a.due_date && new Date(a.due_date) < new Date()
                return (
                  <div key={a.id} className="assign-item">
                    <div className="assign-icon" style={{background:'#e6f4ff'}}>📝</div>
                    <div>
                      <div className="assign-name">{a.title}</div>
                      <div className="assign-sub">{a.courseName} · {a.subject}</div>
                    </div>
                    <div className="assign-due" style={{color:isOverdue?'var(--coral)':'var(--teal)'}}>
                      {a.due_date || 'No due date'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── PROGRESS ──
export function ParentProgress() {
  const { child, courses, attendance, loading , children, switchChild } = useChildData()

  function letterGrade(pct) {
    if (pct >= 93) return 'A'
    if (pct >= 90) return 'A-'
    if (pct >= 87) return 'B+'
    if (pct >= 83) return 'B'
    if (pct >= 80) return 'B-'
    if (pct >= 77) return 'C+'
    if (pct >= 73) return 'C'
    if (pct >= 70) return 'C-'
    if (pct >= 60) return 'D'
    return 'F'
  }
  function gradeColor(l) {
    if (!l||l==='—') return 'var(--muted)'
    if (l.startsWith('A')) return '#00804a'
    if (l.startsWith('B')) return '#1a5fa8'
    if (l.startsWith('C')) return '#b07800'
    return '#cc3333'
  }

  // Overall GPA across all courses
  const gradedCourses = courses.filter(c => c.avg != null)
  const overallAvg = gradedCourses.length
    ? Math.round(gradedCourses.reduce((a,b) => a+b.avg, 0) / gradedCourses.length)
    : null
  const overallLetter = overallAvg != null ? letterGrade(overallAvg) : '—'

  // Attendance overall
  const presentAll = attendance.filter(a => a.status === 'present').length
  const overallAtt = attendance.length ? Math.round((presentAll/attendance.length)*100) : null

  return (
    <div>
      <div className="page-header fade-up">
        <h2>📊 Academic Progress</h2>
        <ChildSwitcher children={children} activeChild={child} onSwitch={switchChild}/>
      </div>

      {loading ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
      : !child ? (
        <div className="card" style={{textAlign:'center',padding:30}}>
          <div style={{fontSize:36,marginBottom:10}}>👧</div>
          <div style={{fontWeight:800,fontSize:16}}>No Student Linked</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:6}}>Contact the school to link your child to your account.</div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid-3 fade-up-2" style={{marginBottom:20}}>
            <div className="card" style={{textAlign:'center',padding:20,borderTop:'4px solid var(--teal)'}}>
              <div style={{fontSize:32,fontWeight:900,color:'var(--teal)'}}>{overallAvg != null ? `${overallAvg}%` : '—'}</div>
              <div style={{fontSize:22,fontWeight:900,color:gradeColor(overallLetter),marginTop:2}}>{overallLetter}</div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Overall Average</div>
            </div>
            <div className="card" style={{textAlign:'center',padding:20,borderTop:'4px solid var(--sky)'}}>
              <div style={{fontSize:32,fontWeight:900,color:'var(--sky)'}}>{overallAtt != null ? `${overallAtt}%` : '—'}</div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Attendance Rate</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{attendance.length} sessions recorded</div>
            </div>
            <div className="card" style={{textAlign:'center',padding:20,borderTop:'4px solid var(--violet,#7b5ea7)'}}>
              <div style={{fontSize:32,fontWeight:900,color:'var(--violet,#7b5ea7)'}}>{courses.length}</div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Enrolled Courses</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{gradedCourses.length} with grades</div>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="card" style={{textAlign:'center',padding:30}}>
              <div style={{fontSize:36,marginBottom:10}}>📚</div>
              <div style={{fontWeight:800,fontSize:16}}>No Courses Yet</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>Your child has not been enrolled in any courses yet.</div>
            </div>
          ) : courses.map(course => {
            const graded   = course.submissions.filter(s => s.status==='graded')
            const pending  = course.submissions.filter(s => s.status==='submitted')
            const missing  = course.assignments.filter(a => !course.submissions.find(s => s.assignment_id===a.id))
            const letter   = course.avg != null ? letterGrade(course.avg) : '—'

            return (
              <div key={course.id} className="card fade-up-2" style={{marginBottom:16,borderTop:`4px solid ${GRADE_COLORS[course.grade_level]||'var(--teal)'}`}}>
                {/* Course header */}
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                  <div style={{fontWeight:800,fontSize:15}}>{course.name}</div>
                  <span className="badge badge-blue">{course.subject}</span>
                  {course.teacher?.full_name && <span style={{fontSize:11,color:'var(--muted)'}}>👩‍🏫 {course.teacher.full_name}</span>}
                  <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
                    {course.avg != null && (
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:20,fontWeight:900,color:gradeColor(letter)}}>{letter}</div>
                        <div style={{fontSize:10,color:'var(--muted)'}}>{course.avg}%</div>
                      </div>
                    )}
                    {course.attRate != null && (
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:14,fontWeight:800,color:'var(--sky)'}}>{course.attRate}%</div>
                        <div style={{fontSize:10,color:'var(--muted)'}}>Attendance</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {course.avg != null && (
                  <div style={{marginBottom:14}}>
                    <div style={{background:'#f0f0f0',borderRadius:20,height:8,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:20,background:gradeColor(letter),width:`${course.avg}%`,transition:'width .5s'}}/>
                    </div>
                  </div>
                )}

                {/* Stats row */}
                <div style={{display:'flex',gap:12,marginBottom:14}}>
                  {[
                    {label:'Graded',  value:graded.length,  color:'var(--teal)'},
                    {label:'Pending', value:pending.length, color:'var(--gold)'},
                    {label:'Missing', value:missing.length, color:'var(--coral)'},
                  ].map(s => (
                    <div key={s.label} style={{flex:1,textAlign:'center',background:'var(--bg)',borderRadius:8,padding:'8px 4px'}}>
                      <div style={{fontSize:18,fontWeight:900,color:s.color}}>{s.value}</div>
                      <div style={{fontSize:10,color:'var(--muted)'}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Assignments table */}
                {course.assignments.length === 0 ? (
                  <div style={{fontSize:12,color:'var(--muted)',padding:'8px 0'}}>No assignments posted yet.</div>
                ) : (
                  <table className="data-table">
                    <thead><tr><th>Assignment</th><th>Type</th><th>Due</th><th>Score</th><th>Grade</th><th>Status</th></tr></thead>
                    <tbody>
                      {course.assignments.map(a => {
                        const sub = course.submissions.find(s => s.assignment_id === a.id)
                        const pct = sub?.points != null ? Math.round((sub.points/(a.max_points||100))*100) : null
                        const lg  = pct != null ? letterGrade(pct) : null
                        return (
                          <tr key={a.id}>
                            <td style={{fontWeight:600}}>{a.title}</td>
                            <td><span style={{fontSize:10,color:'var(--muted)',textTransform:'capitalize'}}>{a.assignment_type||'assignment'}</span></td>
                            <td style={{fontSize:12,color:'var(--muted)'}}>{a.due_date||'—'}</td>
                            <td style={{fontSize:12}}>
                              {sub?.points != null ? `${sub.points}/${a.max_points||100}` : <span style={{color:'var(--muted)'}}>—</span>}
                            </td>
                            <td>
                              {lg
                                ? <span style={{fontWeight:800,color:gradeColor(lg)}}>{lg}</span>
                                : <span style={{color:'var(--muted)',fontSize:11}}>—</span>}
                            </td>
                            <td>
                              {sub?.status === 'graded'    && <span className="badge badge-green">Graded</span>}
                              {sub?.status === 'submitted' && <span className="badge badge-blue">Submitted</span>}
                              {!sub                        && <span className="badge" style={{background:'#fff0f0',color:'var(--coral)',border:'1px solid var(--coral)'}}>Missing</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
// ── SCHEDULE ──
export function ParentSchedule() {
  const { child, courses, scheduleEvents, loading , children, switchChild } = useChildData()

  const DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday']
  const HOURS   = Array.from({length:11}, (_,i) => i+7) // 7am–5pm
  const COLORS  = ['var(--teal)','var(--sky)','#7b5ea7','var(--coral)','var(--gold)','#06d6a0','#ff8c42']

  // Map course id to color
  const courseColorMap = {}
  courses.forEach((c,i) => { courseColorMap[c.id] = COLORS[i % COLORS.length] })

  // Group events by day_of_week
  function eventsForDay(day) {
    return scheduleEvents.filter(e => {
      if (e.day_of_week) return e.day_of_week.toLowerCase() === day.toLowerCase()
      // fallback: check recurrence pattern
      return false
    })
  }

  // Parse time string "HH:MM" or ISO to hour decimal
  function toHourDecimal(timeStr) {
    if (!timeStr) return 8
    const t = timeStr.includes('T') ? timeStr.split('T')[1] : timeStr
    const [h,m] = t.split(':').map(Number)
    return h + (m||0)/60
  }

  function formatTime(timeStr) {
    if (!timeStr) return ''
    const h = Math.floor(toHourDecimal(timeStr))
    const m = Math.round((toHourDecimal(timeStr) - h) * 60)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12  = h > 12 ? h-12 : h === 0 ? 12 : h
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`
  }

  const CELL_H = 52 // px per hour

  // Upcoming events (next 7 days)
  const today = new Date()
  const upcoming = scheduleEvents
    .filter(e => e.start_time && new Date(e.start_time) >= today)
    .sort((a,b) => new Date(a.start_time)-new Date(b.start_time))
    .slice(0,5)

  const hasWeeklyEvents = DAYS.some(d => eventsForDay(d).length > 0)

  return (
    <div>
      <div className="page-header fade-up">
        <h2>📅 Class Schedule</h2>
        <ChildSwitcher children={children} activeChild={child} onSwitch={switchChild}/>
      </div>

      {loading ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
      : !child ? (
        <div className="card" style={{textAlign:'center',padding:30}}>
          <div style={{fontSize:36,marginBottom:10}}>👧</div>
          <div style={{fontWeight:800,fontSize:16}}>No Student Linked</div>
        </div>
      ) : (
        <>
          {/* Enrolled courses list */}
          {courses.length > 0 && (
            <div className="card fade-up-2" style={{marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>📚 Enrolled Courses</div>
              <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {courses.map((c,i) => (
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                    <div style={{width:10,height:10,borderRadius:2,background:courseColorMap[c.id],flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>{c.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{c.subject}</div>
                    </div>
                    <div style={{fontSize:12,color:'var(--muted)'}}>
                      {c.teacher?.full_name ? `👩‍🏫 ${c.teacher.full_name}` : 'No teacher assigned'}
                    </div>
                    <span className="badge badge-blue" style={{fontSize:10}}>{c.grade_level}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly schedule grid */}
          {hasWeeklyEvents ? (
            <div className="card fade-up-3" style={{padding:0,overflowX:'auto'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:800,fontSize:14}}>
                🗓 Weekly Schedule
              </div>
              <div style={{display:'grid',gridTemplateColumns:`52px repeat(5,1fr)`,minWidth:500}}>
                {/* Header row */}
                <div style={{background:'var(--bg)',padding:8}}/>
                {DAYS.map(d => (
                  <div key={d} style={{background:'var(--bg)',padding:'8px 4px',textAlign:'center',fontSize:12,fontWeight:800,borderLeft:'1px solid var(--border)'}}>
                    {d.slice(0,3)}
                  </div>
                ))}
                {/* Time rows */}
                {HOURS.map(hour => (
                  <>
                    <div key={`h${hour}`} style={{padding:'0 6px',fontSize:10,color:'var(--muted)',height:CELL_H,display:'flex',alignItems:'flex-start',paddingTop:4,borderTop:'1px solid var(--border)'}}>
                      {hour > 12 ? `${hour-12}PM` : hour===12 ? '12PM' : `${hour}AM`}
                    </div>
                    {DAYS.map(day => {
                      const dayEvents = eventsForDay(day).filter(e => {
                        const h = toHourDecimal(e.start_time?.split('T')[1] || e.start_time)
                        return Math.floor(h) === hour
                      })
                      return (
                        <div key={`${hour}-${day}`} style={{borderLeft:'1px solid var(--border)',borderTop:'1px solid var(--border)',height:CELL_H,position:'relative',padding:2}}>
                          {dayEvents.map(ev => {
                            const course = courses.find(c => c.id === ev.course_id)
                            const color  = courseColorMap[ev.course_id] || 'var(--teal)'
                            const start  = formatTime(ev.start_time?.split('T')[1] || ev.start_time)
                            const end_t  = formatTime(ev.end_time?.split('T')[1] || ev.end_time)
                            return (
                              <div key={ev.id} style={{
                                background:`${color}22`,border:`1px solid ${color}`,
                                borderRadius:4,padding:'2px 4px',fontSize:9,fontWeight:700,color,
                                overflow:'hidden',height:'calc(100% - 4px)'
                              }}>
                                <div>{course?.name || ev.title}</div>
                                {start && <div style={{opacity:.8}}>{start}{end_t?` – ${end_t}`:''}</div>}
                                {ev.location && <div style={{opacity:.7}}>📍 {ev.location}</div>}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </>
                ))}
              </div>
            </div>
          ) : (
            /* No recurring schedule — show upcoming events list instead */
            <div className="card fade-up-3">
              <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>📅 Upcoming Classes & Events</div>
              {upcoming.length === 0 ? (
                <div className="empty-state">
                  <div className="es-icon">📅</div>
                  <div className="es-text">No scheduled events found for your child&#39;s courses yet.</div>
                  <div className="es-sub">The school will add class schedules here when available.</div>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {upcoming.map(ev => {
                    const course = courses.find(c => c.id === ev.course_id)
                    const color  = courseColorMap[ev.course_id] || 'var(--teal)'
                    const dt     = new Date(ev.start_time)
                    return (
                      <div key={ev.id} style={{display:'flex',gap:12,alignItems:'center',padding:'10px 12px',background:'var(--bg)',borderRadius:8,borderLeft:`4px solid ${color}`}}>
                        <div style={{textAlign:'center',minWidth:40}}>
                          <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase'}}>{dt.toLocaleDateString('en-US',{weekday:'short'})}</div>
                          <div style={{fontSize:20,fontWeight:900,color}}>{dt.getDate()}</div>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:13}}>{ev.title || course?.name}</div>
                          <div style={{fontSize:11,color:'var(--muted)'}}>{course?.subject} {ev.location ? `· 📍 ${ev.location}` : ''}</div>
                        </div>
                        <div style={{fontSize:11,color:'var(--muted)',textAlign:'right'}}>
                          {formatTime(ev.start_time?.split('T')[1] || ev.start_time)}
                          {ev.end_time && ` – ${formatTime(ev.end_time?.split('T')[1] || ev.end_time)}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
// ── MESSAGES ──
export function ParentMessages() {
  const { user, profile } = useAuth()
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
    const channel = supabase.channel('parent-messages')
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
    if (profile?.messaging_blocked) return
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
        {!profile?.messaging_blocked && <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Message</button>}
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
                {(()=>{const other=active.sender?.id===user.id?active.recipient:active.sender;return(<><div className="avatar avatar-md av-3" style={{flexShrink:0}}>{other?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'?'}</div><div><div style={{fontWeight:700,fontSize:13}}>{other?.full_name||'Unknown'}</div><div style={{fontSize:10,color:'var(--muted)',textTransform:'capitalize'}}>{other?.role||'Staff'}</div></div></>)})()}
              </div>
              <div className="msg-bubbles">{messages.map(m=><div key={m.id} className={`bubble ${m.sender?.id===user.id?'sent':'recv'}`}>{m.body}</div>)}</div>
              {profile?.messaging_blocked
                ? <div style={{padding:'12px 16px',background:'#f5f0ff',borderTop:'1px solid #d4b0ff',fontSize:12,color:'#7b5ea7',fontWeight:700,textAlign:'center'}}>🔇 Your messaging has been restricted. Please contact the school administrator.</div>
                : <div className="msg-input-area"><input value={newMsg} onChange={e=>setNewMsg(e.target.value)} placeholder="Type a message…" onKeyDown={e=>e.key==='Enter'&&sendMessage()}/><button className="btn btn-primary btn-sm" onClick={sendMessage} disabled={sending}>Send ✈️</button></div>
              }
            </>
          ) : (
            <div className="empty-state" style={{margin:'auto'}}><div className="es-icon">💬</div><div className="es-text">Select a conversation</div></div>
          )}
        </div>
      </div>

      {showNew && (
        <NewMessageModal
          senderId={user.id}
          recipientFilter="teachers"
          onClose={() => setShowNew(false)}
          onSent={(recipientId, subject, body) => { startThread(recipientId, subject, body); setShowNew(false) }}
        />
      )}
    </div>
  )
}
// ── BILLING ──
export function ParentBilling() {
  const { user, profile } = useAuth()
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [paying,   setPaying]   = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [tab,      setTab]      = useState('all')

  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('ledger_paid') === '1') setSuccess(true)
    loadEntries()
  }, [user])

  async function loadEntries() {
    setLoading(true)
    const { data } = await supabase
      .from('parent_ledger')
      .select('*')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  const all      = entries
  const charges  = entries.filter(e => e.type === 'debit')
  const payments = entries.filter(e => e.type === 'credit')
  const balance  = entries.reduce((acc, e) =>
    acc + (e.type === 'debit' ? Number(e.amount) : -Number(e.amount)), 0)

  const displayed = tab === 'all' ? all : tab === 'charges' ? charges : payments

  const CAT_ICON = { tuition:'🏫', fee:'📋', activity:'🎭', field_trip:'🚌', supply:'📦', payment:'✅', other:'📝' }

  async function payBalance() {
    if (balance <= 0) return
    setPaying(true)
    try {
      const res = await fetch('/.netlify/functions/pay-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId:    user.id,
          parentEmail: profile?.email || user.email,
          parentName:  profile?.full_name || 'Parent',
          amount:      balance,
          successUrl:  window.location.origin + '/parent/billing',
          cancelUrl:   window.location.origin + '/parent/billing',
        }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) {
      alert('Payment is not available right now. Please contact the school.')
    }
    setPaying(false)
  }

  return (
    <div>
      <div className="page-header fade-up">
        <div>
          <h2>💳 My Account</h2>
          <div style={{fontSize:13,color:'var(--muted)'}}>Your full billing history and current balance</div>
        </div>
      </div>

      {success && (
        <div style={{background:'rgba(0,201,177,.1)',border:'1px solid var(--teal)',borderRadius:10,padding:'12px 16px',marginBottom:16,color:'var(--teal)',fontWeight:700,fontSize:13}}>
          &#x2705; Payment received! Your account has been updated.
        </div>
      )}

      <div className="fade-up-2">
        <div className="card" style={{marginBottom:16,borderTop:'3px solid '+(balance>0?'#cc3333':'var(--teal)')}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontSize:11,fontWeight:800,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Current Balance</div>
              <div style={{fontSize:36,fontWeight:900,color:balance>0?'#cc3333':balance<0?'var(--teal)':'var(--muted)',lineHeight:1}}>
                ${Math.abs(balance).toFixed(2)}
              </div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>
                {balance > 0 ? 'Outstanding — please pay at your earliest convenience'
                  : balance < 0 ? 'Credit on your account'
                  : 'All paid up!'}
              </div>
            </div>
            {balance > 0 && (
              <button className="btn btn-primary" style={{fontSize:14,padding:'12px 24px'}} onClick={payBalance} disabled={paying}>
                {paying ? 'Redirecting...' : 'Pay $' + balance.toFixed(2) + ' Now'}
              </button>
            )}
          </div>

          <div style={{display:'flex',gap:24,marginTop:16,paddingTop:16,borderTop:'1px solid var(--border)',flexWrap:'wrap'}}>
            {[
              { label:'Total Charged', val: charges.reduce((a,e)=>a+Number(e.amount),0), color:'#cc3333' },
              { label:'Total Paid',    val: payments.reduce((a,e)=>a+Number(e.amount),0), color:'var(--teal)' },
              { label:'Transactions',  val: entries.length, color:'var(--muted)', noSign: true },
            ].map(s => (
              <div key={s.label}>
                <div style={{fontSize:11,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>{s.label}</div>
                <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.noSign ? s.val : '$'+s.val.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{display:'flex',gap:4,padding:'10px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg)'}}>
            {[['all','All Transactions'],['charges','Charges'],['payments','Payments']].map(([k,l]) => (
              <button key={k} onClick={()=>setTab(k)} style={{padding:'5px 14px',border:'none',borderRadius:20,cursor:'pointer',fontWeight:700,fontSize:11,background:tab===k?'var(--teal)':'transparent',color:tab===k?'white':'var(--muted)'}}>{l}</button>
            ))}
          </div>

          {loading
            ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
            : displayed.length === 0
              ? <div className="empty-state" style={{padding:40}}><div className="es-icon">📋</div><div className="es-text">No transactions yet</div></div>
              : (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{background:'var(--bg)',borderBottom:'2px solid var(--border)'}}>
                      {['Date','Description','Amount','Balance'].map(h=>(
                        <th key={h} style={{padding:'9px 14px',textAlign:'left',fontWeight:700,fontSize:11,color:'var(--muted)',textTransform:'uppercase'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map(e => (
                      <tr key={e.id} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={{padding:'11px 14px',color:'var(--muted)',fontSize:12,whiteSpace:'nowrap'}}>
                          {new Date(e.created_at).toLocaleDateString()}
                        </td>
                        <td style={{padding:'11px 14px'}}>
                          <div style={{fontWeight:600}}>{CAT_ICON[e.category]||'📋'} {e.description}</div>
                          {e.due_date && <div style={{fontSize:11,color:'var(--muted)'}}>Due: {e.due_date}</div>}
                        </td>
                        <td style={{padding:'11px 14px',fontWeight:800,color:e.type==='debit'?'#cc3333':'var(--teal)'}}>
                          {e.type==='debit'?'+':'-'}${Number(e.amount).toFixed(2)}
                        </td>
                        <td style={{padding:'11px 14px',fontWeight:700,color:'var(--muted)',fontSize:12}}>
                          ${Number(e.balance_after||0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          }
        </div>
      </div>
    </div>
  )
}


export function ParentSettings() {
  const { user } = useAuth()
  const [current,   setCurrent]   = useState('')
  const [newPass,   setNewPass]   = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState(null) // { type: 'success'|'error', text }
  const [showCur,   setShowCur]   = useState(false)
  const [showNew,   setShowNew]   = useState(false)
  const [showCon,   setShowCon]   = useState(false)

  const strength = newPass.length === 0 ? 0
    : newPass.length < 6 ? 1
    : newPass.length < 10 ? 2
    : /[A-Z]/.test(newPass) && /[0-9]/.test(newPass) ? 4 : 3

  const strengthLabel = ['','Weak','Fair','Good','Strong']
  const strengthColor = ['','#cc3333','#b07800','#3b9eff','#00b87a']

  async function handleChange() {
    if (!newPass || !confirm) { setMsg({ type:'error', text:'Please fill in all fields.' }); return }
    if (newPass !== confirm)  { setMsg({ type:'error', text:'New passwords do not match.' }); return }
    if (newPass.length < 6)   { setMsg({ type:'error', text:'Password must be at least 6 characters.' }); return }
    setSaving(true); setMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setSaving(false)
    if (error) {
      setMsg({ type:'error', text: error.message })
    } else {
      setMsg({ type:'success', text:'Password updated successfully!' })
      setCurrent(''); setNewPass(''); setConfirm('')
    }
  }

  return (
    <div>
      <div className="page-header fade-up"><h2>Account Settings</h2></div>

      <div className="card fade-up-2" style={{maxWidth:460}}>
        <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:15,marginBottom:16}}>🔐 Change Password</div>

        {msg && (
          <div style={{padding:'10px 14px',borderRadius:8,marginBottom:14,fontSize:13,fontWeight:600,
            background: msg.type==='success'?'#e6fff4':'#fff0f0',
            color:      msg.type==='success'?'#00804a':'#cc3333',
            border:     `1px solid ${msg.type==='success'?'#b0eedd':'#ffcccc'}`}}>
            {msg.type==='success'?'✅':'❌'} {msg.text}
          </div>
        )}

        <div className="form-group">
          <label className="input-label">New Password</label>
          <div style={{position:'relative'}}>
            <input className="input" type={showNew?'text':'password'} value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Enter new password" style={{paddingRight:40}}/>
            <button onClick={()=>setShowNew(p=>!p)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--muted)'}}>
              {showNew?'🙈':'👁'}
            </button>
          </div>
          {newPass.length > 0 && (
            <div style={{marginTop:6}}>
              <div style={{display:'flex',gap:4,marginBottom:3}}>
                {[1,2,3,4].map(i=>(
                  <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=strength?strengthColor[strength]:'#eee',transition:'background .2s'}}/>
                ))}
              </div>
              <div style={{fontSize:10,color:strengthColor[strength],fontWeight:700}}>{strengthLabel[strength]}</div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="input-label">Confirm New Password</label>
          <div style={{position:'relative'}}>
            <input className="input" type={showCon?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Re-enter new password" style={{paddingRight:40}}/>
            <button onClick={()=>setShowCon(p=>!p)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--muted)'}}>
              {showCon?'🙈':'👁'}
            </button>
          </div>
          {confirm.length>0 && newPass!==confirm && (
            <div style={{fontSize:11,color:'#cc3333',marginTop:4}}>⚠ Passwords do not match</div>
          )}
          {confirm.length>0 && newPass===confirm && newPass.length>0 && (
            <div style={{fontSize:11,color:'#00804a',marginTop:4}}>✓ Passwords match</div>
          )}
        </div>

        <button className="btn btn-primary" onClick={handleChange} disabled={saving||!newPass||!confirm||newPass!==confirm} style={{width:'100%',marginTop:4}}>
          {saving ? 'Updating…' : 'Update Password'}
        </button>

        <div style={{marginTop:14,fontSize:11,color:'var(--muted)',borderTop:'1px solid var(--border)',paddingTop:12}}>
          💡 Tips for a strong password: use 10+ characters, mix uppercase, numbers, and symbols.
        </div>
      </div>
    </div>
  )
}

export function ParentAnnouncements() {
  return <AnnouncementsView audience="parents" />
}

// ─────────────────────────────────────────────────────────────────────────────
// PARENT CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
const PC_TYPE_META = {
  holiday:  { color:'#cc3333', bg:'#fff0f0', icon:'🏖️', label:'Holiday'  },
  exam:     { color:'#b07800', bg:'#fff9e6', icon:'📝', label:'Exam'     },
  event:    { color:'#0050b0', bg:'#e6f4ff', icon:'🎉', label:'Event'    },
  deadline: { color:'#7b5ea7', bg:'#f3eeff', icon:'⏰', label:'Deadline' },
  meeting:  { color:'#00804a', bg:'#e6fff4', icon:'📋', label:'Meeting'  },
}
const PC_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const PC_DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export function ParentCalendar() {
  const today   = new Date()
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
      .gte('start_date', start).lte('start_date', end)
      .in('audience', ['all','parents']).order('start_date')
    setEvents(data||[])
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
  const upcoming  = events.filter(e => e.start_date >= todayStr).slice(0,8)

  return (
    <div>
      <div className="page-header fade-up">
        <div><h2>📅 School Calendar</h2><div style={{fontSize:13,color:'var(--muted)'}}>{events.length} events this month</div></div>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {Object.entries(PC_TYPE_META).map(([k,m])=>(
          <div key={k} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,background:m.bg,border:`1px solid ${m.color}30`,fontSize:11,fontWeight:600,color:m.color}}>{m.icon} {m.label}</div>
        ))}
      </div>
      <div className="grid-2 fade-up-2" style={{gap:16,alignItems:'start'}}>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
            <button onClick={prevMonth} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)',padding:'0 8px'}}>‹</button>
            <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:16}}>{PC_MONTHS[month]} {year}</div>
            <button onClick={nextMonth} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)',padding:'0 8px'}}>›</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid var(--border)'}}>
            {PC_DAYS.map(d=><div key={d} style={{textAlign:'center',padding:'6px 0',fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase'}}>{d}</div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
            {cells.map((d,i)=>{
              const evts = d ? eventsOn(d) : []
              return (
                <div key={i} style={{minHeight:68,padding:'4px 5px',borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)',background:isToday(d)?'rgba(0,201,177,.07)':'white',borderTop:isToday(d)?'2px solid var(--teal)':'none'}}>
                  {d && <>
                    <div style={{fontSize:11,fontWeight:isToday(d)?800:500,width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:isToday(d)?'var(--teal)':'transparent',color:isToday(d)?'white':'var(--text)',marginBottom:2}}>{d}</div>
                    {evts.slice(0,2).map(e=>{
                      const m = PC_TYPE_META[e.event_type]||PC_TYPE_META.event
                      return <div key={e.id} onClick={()=>setDetail(e)} style={{fontSize:9,fontWeight:700,color:m.color,background:m.bg,borderRadius:3,padding:'1px 4px',marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'pointer'}}>{m.icon} {e.title}</div>
                    })}
                    {evts.length>2&&<div style={{fontSize:9,color:'var(--muted)',paddingLeft:2}}>+{evts.length-2}</div>}
                  </>}
                </div>
              )
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">📋 Upcoming</div></div>
          {loading ? <div style={{textAlign:'center',padding:20}}><div className="spinner"/></div>
          : upcoming.length===0 ? <div className="empty-state" style={{padding:20}}><div className="es-icon">📅</div><div className="es-text">No upcoming events</div></div>
          : upcoming.map(e=>{
              const m = PC_TYPE_META[e.event_type]||PC_TYPE_META.event
              return (
                <div key={e.id} onClick={()=>setDetail(e)} style={{padding:'10px 0',borderBottom:'1px solid var(--border)',display:'flex',gap:10,cursor:'pointer'}}>
                  <div style={{width:34,height:34,borderRadius:8,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{m.icon}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{e.title}</div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>{e.start_date}{e.end_date&&e.end_date!==e.start_date?' → '+e.end_date:''}</div>
                    {e.description&&<div style={{fontSize:11,color:'var(--text)',marginTop:2}}>{e.description}</div>}
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>
      {detail && (
        <div className="modal-overlay" onClick={()=>setDetail(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:400}}>
            <div className="modal-header">
              <div className="modal-title">{PC_TYPE_META[detail.event_type]?.icon||'📅'} {detail.title}</div>
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

// ─────────────────────────────────────────────────────────────────────────────
// PARENT MEETINGS — view class meetings for their child + book conferences
// ─────────────────────────────────────────────────────────────────────────────
const PM_PLATFORM_META = {
  zoom:        { icon:'🎥', label:'Zoom',        color:'#2D8CFF', bg:'#e8f3ff' },
  google_meet: { icon:'🟢', label:'Google Meet', color:'#00897B', bg:'#e6f9f7' },
  teams:       { icon:'💜', label:'MS Teams',    color:'#6264A7', bg:'#f0eeff' },
  other:       { icon:'🌐', label:'Other',        color:'#555',    bg:'#f5f5f5' },
}

export function ParentMeetings() {
  const { user } = useAuth()
  const { child } = useChildData()
  const [meetings,     setMeetings]     = useState([])
  const [conferences,  setConferences]  = useState([])
  const [teachers,     setTeachers]     = useState([])
  const [slots,        setSlots]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('meetings') // meetings | conferences
  const [showBook,     setShowBook]     = useState(false)
  const [bookTeacher,  setBookTeacher]  = useState('')
  const [bookSlot,     setBookSlot]     = useState(null)
  const [bookNotes,    setBookNotes]    = useState('')
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState(null)

  useEffect(() => { if(child?.id) loadAll() }, [child?.id])

  async function loadAll() {
    // Get courses for this child to find teachers + meetings
    const { data: enr } = await supabase.from('enrollments').select('course:courses(id,name,teacher_id,teacher:profiles!teacher_id(id,full_name))').eq('student_id',child.id).eq('status','active')
    const courseIds  = (enr||[]).map(e=>e.course?.id).filter(Boolean)
    const teacherMap = {}
    ;(enr||[]).forEach(e => { if(e.course?.teacher) teacherMap[e.course.teacher.id] = e.course.teacher })
    setTeachers(Object.values(teacherMap))

    const [{ data: mtgs }, { data: conf }] = await Promise.all([
      courseIds.length ? supabase.from('class_meetings').select('*, course:courses(name)').in('course_id', courseIds).order('scheduled_at',{ascending:false}) : Promise.resolve({data:[]}),
      supabase.from('conferences').select('*, teacher:profiles!teacher_id(full_name), student:students(full_name)').eq('parent_id', user.id).order('slot_date',{ascending:false}),
    ])
    setMeetings(mtgs||[])
    setConferences(conf||[])
    setLoading(false)
  }

  async function loadSlots(teacherId) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('conference_slots').select('*').eq('teacher_id', teacherId).eq('is_booked', false).gte('slot_date', today).order('slot_date').order('slot_time')
    setSlots(data||[])
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  async function bookConference() {
    if (!bookSlot || !child?.id) return
    setSaving(true)
    await supabase.from('conferences').insert([{ teacher_id: bookTeacher, parent_id: user.id, student_id: child.id, slot_date: bookSlot.slot_date, slot_time: bookSlot.slot_time, duration_min: bookSlot.duration_min||30, status:'requested', notes: bookNotes }])
    await supabase.from('conference_slots').update({ is_booked: true }).eq('id', bookSlot.id)
    setSaving(false); setShowBook(false); setBookSlot(null); setBookNotes('')
    loadAll(); showToast('✅ Conference request sent!')
  }

  const STATUS_COLORS = { requested:'#b07800', confirmed:'#00804a', cancelled:'#cc3333', completed:'#555' }
  const STATUS_BG     = { requested:'#fff9e6', confirmed:'#e6fff4', cancelled:'#fff0f0', completed:'#f5f5f5' }

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}
      <div className="page-header fade-up">
        <div><h2>🎥 Meetings & Conferences</h2></div>
        {tab==='conferences'&&<button className="btn btn-primary" onClick={()=>setShowBook(true)}>📅 Book Conference</button>}
      </div>
      <div style={{display:'flex',gap:0,marginBottom:16,borderBottom:'2px solid var(--border)'}}>
        {[['meetings','🎥 Class Meetings'],['conferences','📋 Conferences']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'9px 18px',border:'none',borderBottom:tab===k?'3px solid var(--teal)':'3px solid transparent',marginBottom:-2,background:'none',fontWeight:tab===k?800:500,color:tab===k?'var(--teal)':'var(--muted)',cursor:'pointer',fontSize:13}}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
      : tab==='meetings' ? (
        <div className="card fade-up" style={{padding:0,overflow:'hidden'}}>
          {meetings.length===0 ? <div className="empty-state" style={{padding:40}}><div className="es-icon">🎥</div><div className="es-text">No class meetings scheduled yet</div></div>
          : meetings.map(m=>{
              const p  = PM_PLATFORM_META[m.platform]||PM_PLATFORM_META.other
              const dt = m.scheduled_at ? new Date(m.scheduled_at) : null
              return (
                <div key={m.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:36,height:36,borderRadius:10,background:p.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{p.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{m.title}</div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                      {m.course?.name||'—'} · {p.label}
                      {dt&&<> · {dt.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} {dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</>}
                      {m.recurring&&<> · 🔄 {m.recurrence}</>}
                    </div>
                    {m.meeting_url&&<a href={m.meeting_url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:5,fontSize:11,fontWeight:700,color:p.color,textDecoration:'none',padding:'3px 10px',borderRadius:6,background:p.bg}}>{p.icon} Join →</a>}
                  </div>
                </div>
              )
            })
          }
        </div>
      ) : (
        <div className="card fade-up" style={{padding:0,overflow:'hidden'}}>
          {conferences.length===0 ? <div className="empty-state" style={{padding:40}}><div className="es-icon">📋</div><div className="es-text">No conferences yet. Click "Book Conference" to request one.</div></div>
          : conferences.map(c=>(
              <div key={c.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:36,height:36,borderRadius:10,background:STATUS_BG[c.status]||'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>📋</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13}}>Conference with {c.teacher?.full_name||'—'}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{c.slot_date} at {c.slot_time} · {c.duration_min||30} min · {c.student?.full_name}</div>
                  {c.notes&&<div style={{fontSize:11,color:'var(--text)',marginTop:2}}>{c.notes}</div>}
                  {c.meeting_url&&<a href={c.meeting_url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:5,fontSize:11,fontWeight:700,color:'var(--teal)',textDecoration:'none',padding:'3px 10px',borderRadius:6,background:'#e6fff4'}}>🎥 Join →</a>}
                </div>
                <span style={{fontSize:10,fontWeight:700,color:STATUS_COLORS[c.status]||'#555',background:STATUS_BG[c.status]||'#f5f5f5',padding:'2px 8px',borderRadius:6,flexShrink:0,textTransform:'capitalize'}}>{c.status}</span>
              </div>
            ))
          }
        </div>
      )}

      {showBook && (
        <div className="modal-overlay" onClick={()=>setShowBook(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:480}}>
            <div className="modal-header">
              <div className="modal-title">📅 Book a Conference</div>
              <button className="modal-close" onClick={()=>setShowBook(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="input-label">Select Teacher</label>
              <select className="input" value={bookTeacher} onChange={e=>{ setBookTeacher(e.target.value); setBookSlot(null); if(e.target.value) loadSlots(e.target.value) }}>
                <option value="">— Choose a teacher —</option>
                {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            {bookTeacher && (
              <div className="form-group">
                <label className="input-label">Available Slots</label>
                {slots.length===0 ? <div style={{fontSize:13,color:'var(--muted)',padding:'10px 0'}}>No available slots. Contact the teacher directly.</div>
                : <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {slots.map(sl=>(
                      <div key={sl.id} onClick={()=>setBookSlot(sl)}
                        style={{padding:'10px 14px',border:`2px solid ${bookSlot?.id===sl.id?'var(--teal)':'var(--border)'}`,borderRadius:10,cursor:'pointer',background:bookSlot?.id===sl.id?'rgba(0,201,177,.07)':'white',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontWeight:700,fontSize:13}}>{sl.slot_date}</span>
                        <span style={{fontSize:13,color:'var(--muted)'}}>{sl.slot_time} · {sl.duration_min||30} min</span>
                      </div>
                    ))}
                  </div>
                }
              </div>
            )}
            <div className="form-group">
              <label className="input-label">Notes (optional)</label>
              <textarea className="input" rows={2} value={bookNotes} onChange={e=>setBookNotes(e.target.value)} placeholder="What would you like to discuss?" style={{resize:'vertical'}}/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setShowBook(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={bookConference} disabled={saving||!bookSlot}>{saving?'Sending…':'Send Request'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ParentAttendance() {
  const { child, attendance, loading, children, switchChild } = useChildData()
  const [filter, setFilter] = useState('all')
  const [month,  setMonth]  = useState('')

  const STATUS_LABEL = { present:'Present', absent:'Absent', tardy:'Tardy', excused:'Excused', 'excused-absence':'Excused Absence' }
  const STATUS_COLOR = { present:'badge-green', absent:'badge-red', tardy:'badge-yellow', excused:'badge-blue', 'excused-absence':'badge-blue' }
  const STATUS_ICON  = { present:'✅', absent:'❌', tardy:'⏰', excused:'📋', 'excused-absence':'📋' }

  const filtered = attendance.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false
    if (month && !a.date?.startsWith(month)) return false
    return true
  })

  const presentCount = attendance.filter(a => a.status === 'present').length
  const absentCount  = attendance.filter(a => a.status === 'absent').length
  const tardyCount   = attendance.filter(a => a.status === 'tardy').length
  const excusedCount = attendance.filter(a => a.status === 'excused' || a.status === 'excused-absence').length
  const attPct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null

  // Group by month for summary
  const byMonth = {}
  attendance.forEach(a => {
    const m = a.date?.slice(0, 7) || 'Unknown'
    if (!byMonth[m]) byMonth[m] = { present: 0, absent: 0, tardy: 0, excused: 0 }
    if (a.status === 'present') byMonth[m].present++
    else if (a.status === 'absent') byMonth[m].absent++
    else if (a.status === 'tardy') byMonth[m].tardy++
    else byMonth[m].excused++
  })

  return (
    <div>
      <div className="page-header fade-up">
        <h2>📅 Attendance Record</h2>
        <ChildSwitcher children={children} activeChild={child} onSwitch={switchChild}/>
      </div>

      {loading ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
      : !child ? (
        <div className="card" style={{textAlign:'center',padding:30}}>
          <div style={{fontSize:36,marginBottom:10}}>👧</div>
          <div style={{fontWeight:800,fontSize:16}}>No Student Linked</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:6}}>Contact the school to link your child to your account.</div>
        </div>
      ) : (
        <>
          <div className="grid-4 fade-up-2" style={{marginBottom:20}}>
            {[
              ['Attendance Rate', attPct != null ? attPct+'%' : '—', attPct >= 90 ? '#00804a' : attPct >= 80 ? '#b07800' : '#cc3333', 'var(--teal)'],
              ['Present',  presentCount,  '#00804a',  'var(--teal)'],
              ['Absent',   absentCount,   absentCount > 5 ? '#cc3333' : 'var(--text)', '#f72585'],
              ['Tardy',    tardyCount,    tardyCount > 3 ? '#b07800' : 'var(--text)', '#ffc845'],
            ].map(([label, val, color, accent]) => (
              <div key={label} className="card" style={{textAlign:'center',padding:16,borderTop:'3px solid '+accent}}>
                <div style={{fontSize:28,fontWeight:900,color}}>{val}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{label}</div>
              </div>
            ))}
          </div>

          {absentCount > 5 && (
            <div style={{background:'#fff3f3',border:'1px solid #ffcccc',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#cc3333',display:'flex',alignItems:'center',gap:8}}>
              ⚠️ <strong>{absentCount} absences</strong> recorded this year. Please contact the school if any are unresolved.
            </div>
          )}

          <div className="card fade-up-3">
            <div className="card-header">
              <div className="card-title">📋 Attendance Log — {child.full_name}</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <input type="month" className="input" style={{maxWidth:150,fontSize:12}} value={month} onChange={e=>setMonth(e.target.value)}/>
                <select className="input" style={{maxWidth:140,fontSize:12}} value={filter} onChange={e=>setFilter(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="tardy">Tardy</option>
                  <option value="excused">Excused</option>
                </select>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div style={{textAlign:'center',padding:30,color:'var(--muted)',fontSize:13}}>No records match your filter.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Status</th><th>Course</th><th>Notes</th></tr></thead>
                <tbody>
                  {filtered.sort((a,b) => (b.date||'').localeCompare(a.date||'')).map(a => (
                    <tr key={a.id}>
                      <td style={{fontWeight:600}}>{a.date ? new Date(a.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : '—'}</td>
                      <td>
                        <span className={'badge ' + (STATUS_COLOR[a.status] || 'badge-gold')}>
                          {STATUS_ICON[a.status] || '•'} {STATUS_LABEL[a.status] || a.status}
                        </span>
                      </td>
                      <td style={{fontSize:12,color:'var(--muted)'}}>{a.course_name || '—'}</td>
                      <td style={{fontSize:12,color:'var(--muted)'}}>{a.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{fontSize:11,color:'var(--muted)',padding:'10px 0 0',textAlign:'right'}}>
              Showing {filtered.length} of {attendance.length} total records
            </div>
          </div>

          {Object.keys(byMonth).length > 1 && (
            <div className="card fade-up-4" style={{marginTop:16}}>
              <div className="card-header"><div className="card-title">📊 Monthly Breakdown</div></div>
              <table className="data-table">
                <thead><tr><th>Month</th><th>Present</th><th>Absent</th><th>Tardy</th><th>Excused</th><th>Rate</th></tr></thead>
                <tbody>
                  {Object.entries(byMonth).sort(([a],[b])=>b.localeCompare(a)).map(([month, d]) => {
                    const total = d.present + d.absent + d.tardy + d.excused
                    const rate  = total ? Math.round((d.present / total) * 100) : 0
                    return (
                      <tr key={month}>
                        <td style={{fontWeight:600}}>{new Date(month+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</td>
                        <td><span style={{color:'#00804a',fontWeight:700}}>{d.present}</span></td>
                        <td><span style={{color:d.absent>2?'#cc3333':'var(--text)',fontWeight:d.absent>2?700:400}}>{d.absent}</span></td>
                        <td>{d.tardy}</td>
                        <td>{d.excused}</td>
                        <td><span className={'badge '+(rate>=90?'badge-green':rate>=80?'badge-yellow':'badge-red')}>{rate}%</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function ParentHomework() {
  const { child, courses, loading, children, switchChild } = useChildData()
  const [allAssignments, setAllAssignments] = useState([])
  const [allSubmissions, setAllSubmissions] = useState([])
  const [loadingHw, setLoadingHw] = useState(false)
  const [filter, setFilter] = useState('upcoming')
  const [selCourse, setSelCourse] = useState('all')

  useEffect(() => {
    if (!child?.id || !courses.length) return
    setLoadingHw(true)
    const courseIds = courses.map(c => c.id)
    Promise.all([
      supabase.from('assignments').select('*,course:courses(name)').in('course_id', courseIds).order('due_date'),
      supabase.from('submissions').select('*').eq('student_id', child.id),
    ]).then(([{data: asgns}, {data: subs}]) => {
      setAllAssignments(asgns || [])
      setAllSubmissions(subs || [])
      setLoadingHw(false)
    })
  }, [child, courses])

  const today = new Date().toISOString().split('T')[0]

  const enriched = allAssignments.map(a => {
    const sub = allSubmissions.find(s => s.assignment_id === a.id)
    const isSubmitted = !!sub
    const isGraded = sub?.status === 'graded' || sub?.points_earned != null
    const isPast = a.due_date < today
    const pct = isGraded && a.max_points ? Math.round((Number(sub.points_earned||0) / a.max_points) * 100) : null
    return { ...a, sub, isSubmitted, isGraded, isPast, pct }
  })

  const filtered = enriched.filter(a => {
    if (selCourse !== 'all' && a.course_id !== selCourse) return false
    if (filter === 'upcoming') return !a.isPast && !a.isSubmitted
    if (filter === 'submitted') return a.isSubmitted && !a.isGraded
    if (filter === 'graded') return a.isGraded
    if (filter === 'missing') return a.isPast && !a.isSubmitted
    return true
  })

  const missingCount  = enriched.filter(a => a.isPast && !a.isSubmitted).length
  const upcomingCount = enriched.filter(a => !a.isPast && !a.isSubmitted).length
  const gradedCount   = enriched.filter(a => a.isGraded).length

  function gradeColor(pct) {
    if (pct == null) return 'var(--muted)'
    if (pct >= 90) return '#00804a'
    if (pct >= 70) return '#1a5fa8'
    if (pct >= 60) return '#b07800'
    return '#cc3333'
  }

  function dueBadge(a) {
    if (a.isPast && !a.isSubmitted) return <span className="badge badge-red">Missing</span>
    if (a.isGraded) return <span className="badge badge-green">Graded</span>
    if (a.isSubmitted) return <span className="badge badge-blue">Submitted</span>
    const daysLeft = Math.ceil((new Date(a.due_date) - new Date()) / 86400000)
    if (daysLeft <= 1) return <span className="badge badge-red">Due Today</span>
    if (daysLeft <= 3) return <span className="badge badge-yellow">Due Soon</span>
    return <span className="badge badge-gold">Upcoming</span>
  }

  return (
    <div>
      <div className="page-header fade-up">
        <h2>📝 Homework &amp; Assignments</h2>
        <ChildSwitcher children={children} activeChild={child} onSwitch={switchChild}/>
      </div>

      {loading || loadingHw ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
      : !child ? (
        <div className="card" style={{textAlign:'center',padding:30}}>
          <div style={{fontSize:36,marginBottom:10}}>👧</div>
          <div style={{fontWeight:800,fontSize:16}}>No Student Linked</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:6}}>Contact the school to link your child to your account.</div>
        </div>
      ) : (
        <>
          <div className="grid-4 fade-up-2" style={{marginBottom:20}}>
            {[
              ['Upcoming', upcomingCount, upcomingCount > 0 ? '#b07800' : 'var(--text)', 'var(--teal)'],
              ['Missing',  missingCount,  missingCount > 0 ? '#cc3333' : '#00804a', '#f72585'],
              ['Graded',   gradedCount,   '#00804a', 'var(--sky)'],
              ['Total',    enriched.length, 'var(--text)', '#ffc845'],
            ].map(([label, val, color, accent]) => (
              <div key={label} className="card" style={{textAlign:'center',padding:16,borderTop:'3px solid '+accent}}>
                <div style={{fontSize:28,fontWeight:900,color}}>{val}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{label}</div>
              </div>
            ))}
          </div>

          {missingCount > 0 && (
            <div style={{background:'#fff3f3',border:'1px solid #ffcccc',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#cc3333',display:'flex',alignItems:'center',gap:8}}>
              ⚠️ <strong>{missingCount} missing assignment{missingCount > 1 ? 's' : ''}</strong> — please check with your child.
            </div>
          )}

          <div className="card fade-up-3">
            <div className="card-header" style={{flexWrap:'wrap',gap:8}}>
              <div className="card-title">📋 Assignments — {child.full_name}</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <select className="input" style={{maxWidth:160,fontSize:12}} value={selCourse} onChange={e=>setSelCourse(e.target.value)}>
                  <option value="all">All Courses</option>
                  {courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{display:'flex',gap:0,borderBottom:'2px solid var(--border)',marginBottom:16,flexWrap:'wrap'}}>
              {[['upcoming','📅 Upcoming'],['submitted','📤 Submitted'],['graded','✅ Graded'],['missing','❌ Missing'],['all','All']].map(([val,label])=>(
                <button key={val} onClick={()=>setFilter(val)} style={{padding:'7px 14px',border:'none',borderBottom:filter===val?'3px solid var(--teal)':'3px solid transparent',marginBottom:-2,background:'none',fontWeight:filter===val?800:500,color:filter===val?'var(--teal)':'var(--muted)',cursor:'pointer',fontSize:12}}>
                  {label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{textAlign:'center',padding:30,color:'var(--muted)',fontSize:13}}>No assignments in this view.</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {filtered.map(a => (
                  <div key={a.id} style={{border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',background:a.isPast&&!a.isSubmitted?'#fff8f8':a.isGraded?'#f8fff8':'white'}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:14}}>{a.title}</div>
                        <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{a.course?.name} · Due {a.due_date ? new Date(a.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</div>
                        {a.description && <div style={{fontSize:12,color:'var(--text)',marginTop:6,lineHeight:1.6}}>{a.description}</div>}
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
                        {dueBadge(a)}
                        {a.isGraded && (
                          <div style={{fontWeight:900,fontSize:18,color:gradeColor(a.pct)}}>{a.pct}%</div>
                        )}
                        {a.isGraded && a.sub?.feedback && (
                          <div style={{fontSize:11,color:'var(--muted)',maxWidth:200,textAlign:'right',fontStyle:'italic'}}>
                            {a.sub.feedback.slice(0,80)}{a.sub.feedback.length>80?'…':''}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>
                      {a.max_points} pts
                      {a.isSubmitted && a.sub?.submitted_at && ` · Submitted ${new Date(a.sub.submitted_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
