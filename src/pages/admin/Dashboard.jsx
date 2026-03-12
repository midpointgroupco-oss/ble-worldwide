import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const AV = ['av-1','av-2','av-3','av-4','av-5','av-6']
const GRADE_COLORS = { '1st':'#06d6a0','2nd':'#00c9b1','3rd':'#3b9eff','4th':'#00c9b1','5th':'#3b9eff','6th':'#f72585','7th':'#ffc845','8th':'#ff6058','9th':'#7b5ea7','10th':'#06d6a0','11th':'#ff8c42','12th':'#00b4d8' }

export default function AdminDashboard() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [stats,     setStats]     = useState({ students:0, teachers:0, parents:0, courses:0, pending_apps:0, unread_msgs:0, overdue_bills:0, submissions_pending:0 })
  const [recent,    setRecent]    = useState([])
  const [gradeData, setGradeData] = useState([])
  const [recentApps,setRecentApps]= useState([])
  const [upcomingEvts,setUpcomingEvts] = useState([])
  const [upcomingMeetings,setUpcomingMeetings] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const today = new Date().toISOString().split('T')[0]
    const [
      { count: studentCount },
      { count: teacherCount },
      { count: parentCount  },
      { count: courseCount  },
      { count: pendingApps  },
      { count: overdueBills },
      { count: pendingSubs  },
      { data: recentStudents },
      { data: gradeBreakdown },
      { data: apps },
      { data: evts },
      { data: meetings },
    ] = await Promise.all([
      supabase.from('students').select('*',{count:'exact',head:true}).eq('status','active'),
      supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','teacher'),
      supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','parent'),
      supabase.from('courses').select('*',{count:'exact',head:true}).eq('is_active',true),
      supabase.from('enrollment_applications').select('*',{count:'exact',head:true}).eq('status','pending'),
      supabase.from('billing').select('*',{count:'exact',head:true}).eq('status','overdue'),
      supabase.from('submissions').select('*',{count:'exact',head:true}).eq('status','submitted'),
      supabase.from('students').select('id,full_name,grade_level,country,created_at,photo_url').eq('status','active').order('created_at',{ascending:false}).limit(5),
      supabase.from('students').select('grade_level').eq('status','active'),
      supabase.from('enrollment_applications').select('id,student_name,grade_applying,status,submitted_at').order('submitted_at',{ascending:false}).limit(4),
      supabase.from('calendar_events').select('*').gte('start_date',today).order('start_date').limit(5),
      supabase.from('class_meetings').select('*, course:courses(name)').gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(4),
    ])

    setStats({ students:studentCount||0, teachers:teacherCount||0, parents:parentCount||0, courses:courseCount||0, pending_apps:pendingApps||0, overdue_bills:overdueBills||0, submissions_pending:pendingSubs||0 })
    setRecent(recentStudents||[])
    setRecentApps(apps||[])
    setUpcomingEvts(evts||[])
    setUpcomingMeetings(meetings||[])

    const gradeMap = {}
    ;(gradeBreakdown||[]).forEach(s => { gradeMap[s.grade_level] = (gradeMap[s.grade_level]||0)+1 })
    setGradeData(Object.entries(gradeMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([g,c])=>({grade:g,count:c})))
    setLoading(false)
  }

  const STATUS_BADGE = { pending:'badge-gold', reviewing:'badge-blue', approved:'badge-green', denied:'badge-red' }

  return (
    <div>
      {/* Banner */}
      <div className="banner fade-up" style={{background:'linear-gradient(135deg,#12103a,#221c6e,#0e3060)'}}>
        <h2>Welcome back, {profile?.full_name?.split(' ')[0] || 'Admin'} 👋</h2>
        <p>BLE Worldwide · School Management Dashboard · {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
        <div className="banner-stats">
          <div><div className="bs-num">{loading?'…':stats.students}</div><div className="bs-lbl">Students</div></div>
          <div><div className="bs-num">{loading?'…':stats.teachers}</div><div className="bs-lbl">Teachers</div></div>
          <div><div className="bs-num">{loading?'…':stats.courses}</div><div className="bs-lbl">Courses</div></div>
          <div><div className="bs-num">{loading?'…':stats.parents}</div><div className="bs-lbl">Parents</div></div>
        </div>
      </div>

      {/* Alert cards — only show if non-zero */}
      {!loading && (stats.pending_apps>0 || stats.overdue_bills>0 || stats.submissions_pending>0) && (
        <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}} className="fade-up">
          {stats.pending_apps>0 && (
            <div onClick={()=>navigate('/admin/applications')} style={{flex:'1 1 180px',padding:'10px 14px',background:'#fff9e6',border:'1.5px solid #ffe599',borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:22}}>📥</span>
              <div><div style={{fontWeight:800,fontSize:14,color:'#b07800'}}>{stats.pending_apps} Pending Application{stats.pending_apps!==1?'s':''}</div><div style={{fontSize:11,color:'#b07800'}}>Needs review →</div></div>
            </div>
          )}
          {stats.overdue_bills>0 && (
            <div onClick={()=>navigate('/admin/billing')} style={{flex:'1 1 180px',padding:'10px 14px',background:'#fff0f0',border:'1.5px solid #ffcccc',borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:22}}>💳</span>
              <div><div style={{fontWeight:800,fontSize:14,color:'#cc3333'}}>{stats.overdue_bills} Overdue Bill{stats.overdue_bills!==1?'s':''}</div><div style={{fontSize:11,color:'#cc3333'}}>View billing →</div></div>
            </div>
          )}
          {stats.submissions_pending>0 && (
            <div style={{flex:'1 1 180px',padding:'10px 14px',background:'#e6f4ff',border:'1.5px solid #b0d4ff',borderRadius:12,display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:22}}>📝</span>
              <div><div style={{fontWeight:800,fontSize:14,color:'#0050b0'}}>{stats.submissions_pending} Submission{stats.submissions_pending!==1?'s':''} Awaiting Grading</div><div style={{fontSize:11,color:'#0050b0'}}>Assign to teachers</div></div>
            </div>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid-4 fade-up-2">
        {[['🧑‍🎓','Active Students',stats.students,'sc-teal','/admin/students'],['👩‍🏫','Teachers',stats.teachers,'sc-sky','/admin/staff'],['📚','Active Courses',stats.courses,'sc-violet','/admin/courses'],['👨‍👩‍👧','Parent Accounts',stats.parents,'sc-coral',null]].map(([ic,lbl,val,cls,path])=>(
          <div key={lbl} className={`stat-card ${cls}`} style={{cursor:path?'pointer':'default'}} onClick={()=>path&&navigate(path)}>
            <div className="stat-icon">{ic}</div>
            <div className="stat-value">{loading?'…':val}</div>
            <div className="stat-label">{lbl}</div>
            {path&&<div className="stat-change up">View all →</div>}
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid-2 fade-up-3">
        {/* Recent enrollments */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🧑‍🎓 Recently Enrolled</div>
            <button className="card-link" onClick={()=>navigate('/admin/students')}>View all →</button>
          </div>
          {loading ? <div style={{textAlign:'center',padding:20}}><div className="spinner"/></div>
          : recent.length===0 ? <div className="empty-state"><div className="es-icon">🧑‍🎓</div><div className="es-text">No students yet.</div></div>
          : recent.map((s,i)=>(
            <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid var(--border)',cursor:'pointer'}} onClick={()=>navigate(`/admin/students/${s.id}`)}>
              {s.photo_url
                ? <img src={s.photo_url} style={{width:30,height:30,borderRadius:'50%',objectFit:'cover'}}/>
                : <div className={`avatar avatar-sm ${AV[i%6]}`}>{s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
              }
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{s.full_name}</div>
                <div style={{fontSize:10,color:'var(--muted)'}}>{s.grade_level} Grade · {s.country||'—'}</div>
              </div>
              <span className="badge" style={{background:GRADE_COLORS[s.grade_level]||'var(--teal)',color:'white',fontSize:9}}>{s.grade_level}</span>
            </div>
          ))}
        </div>

        {/* Students by grade */}
        <div className="card">
          <div className="card-header"><div className="card-title">📊 Students by Grade</div></div>
          {loading ? <div style={{textAlign:'center',padding:20}}><div className="spinner"/></div>
          : gradeData.length===0 ? <div className="empty-state"><div className="es-icon">📊</div><div className="es-text">No data yet.</div></div>
          : gradeData.map(({grade,count})=>{
              const pct = stats.students>0 ? Math.round((count/stats.students)*100) : 0
              return (
                <div key={grade} className="prog-item">
                  <div className="prog-label">
                    <span>{grade} Grade</span>
                    <span style={{fontWeight:700,color:GRADE_COLORS[grade]||'var(--teal)'}}>{count}</span>
                  </div>
                  <div className="prog-bar"><div className="prog-fill" style={{width:`${pct}%`,background:GRADE_COLORS[grade]||'var(--teal)'}}/></div>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2 fade-up-4">
        {/* Recent applications */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📥 Recent Applications</div>
            <button className="card-link" onClick={()=>navigate('/admin/applications')}>View all →</button>
          </div>
          {loading ? <div style={{textAlign:'center',padding:20}}><div className="spinner"/></div>
          : recentApps.length===0 ? <div className="empty-state"><div className="es-text">No applications yet.</div></div>
          : recentApps.map(a=>(
            <div key={a.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)',cursor:'pointer'}} onClick={()=>navigate('/admin/applications')}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{a.student_name}</div>
                <div style={{fontSize:10,color:'var(--muted)'}}>{a.grade_applying} · {new Date(a.submitted_at).toLocaleDateString()}</div>
              </div>
              <span className={`badge ${STATUS_BADGE[a.status]||'badge-gold'}`}>{a.status}</span>
            </div>
          ))}
        </div>

        {/* Upcoming events + meetings */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📅 Coming Up</div>
            <button className="card-link" onClick={()=>navigate('/admin/calendar')}>Calendar →</button>
          </div>
          {loading ? <div style={{textAlign:'center',padding:20}}><div className="spinner"/></div>
          : (upcomingEvts.length===0 && upcomingMeetings.length===0) ? <div className="empty-state"><div className="es-text">Nothing scheduled.</div></div>
          : <>
              {upcomingEvts.slice(0,3).map(e=>(
                <div key={e.id} style={{display:'flex',gap:8,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:16}}>📅</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:12}}>{e.title}</div>
                    <div style={{fontSize:10,color:'var(--muted)'}}>{e.start_date} · {e.event_type}</div>
                  </div>
                </div>
              ))}
              {upcomingMeetings.slice(0,2).map(m=>(
                <div key={m.id} style={{display:'flex',gap:8,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:16}}>🎥</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:12}}>{m.title}</div>
                    <div style={{fontSize:10,color:'var(--muted)'}}>{m.course?.name} · {m.scheduled_at?new Date(m.scheduled_at).toLocaleDateString():m.recurrence}</div>
                  </div>
                  {m.meeting_url&&<a href={m.meeting_url} target="_blank" rel="noreferrer" style={{fontSize:10,fontWeight:700,color:'var(--teal)',textDecoration:'none'}}>Join →</a>}
                </div>
              ))}
            </>
          }
        </div>
      </div>

      {/* Quick actions */}
      <div className="card fade-up" style={{marginTop:0}}>
        <div className="card-header"><div className="card-title">⚡ Quick Actions</div></div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {[
            ['🧑‍🎓','Enroll Student',    '/admin/students'],
            ['👩‍🏫','Add Staff',          '/admin/staff'],
            ['📚','New Course',          '/admin/courses'],
            ['📥','Review Applications', '/admin/applications'],
            ['📅','Add Calendar Event',  '/admin/calendar'],
            ['🎥','Schedule Meeting',    '/admin/meetings'],
            ['🧠','Conduct Record',      '/admin/conduct'],
            ['📊','View Reports',        '/admin/reports'],
            ['💳','Billing',             '/admin/billing'],
            ['💬','Messages',            '/admin/messages'],
          ].map(([ic,lbl,path])=>(
            <button key={lbl} className="btn btn-outline" style={{gap:6}} onClick={()=>navigate(path)}>
              {ic} {lbl}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
