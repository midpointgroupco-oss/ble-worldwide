// Schedule
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export function AdminSchedule() {
  const [events, setEvents] = useState([])
  useEffect(() => {
    supabase.from('schedule_events').select('*').order('event_date').order('start_time')
      .then(({ data }) => setEvents(data||[]))
  }, [])

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const evColors = ['cal-ev-teal','cal-ev-coral','cal-ev-violet','cal-ev-gold']
  const today = new Date().getDate()

  // Build March 2026 calendar (starts Sunday)
  const cells = []
  for (let i = 1; i <= 35; i++) {
    const day = i
    const dayEvents = events.filter(e => new Date(e.event_date).getDate() === day)
    cells.push({ day, dayEvents, isToday: day === today, isOther: day > 31 })
  }

  return (
    <div>
      <div className="page-header fade-up">
        <h2>Schedule — March 2026</h2>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-outline">← Prev</button>
          <button className="btn btn-outline">Next →</button>
          <button className="btn btn-primary">+ Add Event</button>
        </div>
      </div>
      <div className="card fade-up-2">
        <div className="cal-grid" style={{marginBottom:6}}>
          {days.map(d => <div key={d} className="cal-day-header">{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((c,i) => (
            <div key={i} className={`cal-day ${c.isToday?'today':''} ${c.isOther?'other-month':''}`}>
              <div className="cal-day-num">{c.isOther ? c.day-31 : c.day}</div>
              {c.dayEvents.map((e,j) => (
                <div key={e.id} className={`cal-event ${evColors[j%4]}`}>{e.title}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AdminGrades() {
  const [students, setStudents] = useState([])
  const [submissions, setSubmissions] = useState([])
  const AV = ['av-1','av-2','av-3','av-4','av-5','av-6']

  useEffect(() => {
    supabase.from('students').select('id,full_name,grade_level').order('grade_level').order('full_name').limit(20)
      .then(({ data }) => setStudents(data||[]))
  }, [])

  function gradeClass(g) {
    if (!g) return 'grade-B'
    if (g.startsWith('A')) return 'grade-A'
    if (g.startsWith('B')) return 'grade-B'
    if (g.startsWith('C')) return 'grade-C'
    return 'grade-D'
  }

  return (
    <div>
      <div className="page-header fade-up">
        <h2>Grade Book</h2>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-outline">Export CSV</button>
          <button className="btn btn-primary">+ Add Grade</button>
        </div>
      </div>
      <div className="filter-row fade-up-2">
        {['All Courses','Mathematics','Science','English','History','Art'].map((f,i) => (
          <div key={f} className={`filter-chip ${i===0?'active':''}`}>{f}</div>
        ))}
        <input className="input" style={{marginLeft:'auto',width:180}} placeholder="🔍 Search…"/>
      </div>
      <div className="card fade-up-3">
        <table className="data-table">
          <thead><tr><th>Student</th><th>Grade</th><th>Math</th><th>Science</th><th>English</th><th>History</th><th>Art</th><th>Overall</th></tr></thead>
          <tbody>
            {students.length === 0 && (
              <tr><td colSpan={8} style={{textAlign:'center',padding:'20px',color:'var(--muted)',fontSize:12}}>No student records yet.</td></tr>
            )}
            {students.map((s,i) => (
              <tr key={s.id}>
                <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className={`avatar avatar-sm ${AV[i%6]}`}>{s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>{s.full_name}</div></td>
                <td>{s.grade_level}</td>
                <td><span className={`grade-pill grade-A`}>A-</span></td>
                <td><span className={`grade-pill grade-B`}>B+</span></td>
                <td><span className={`grade-pill grade-A`}>A</span></td>
                <td><span className={`grade-pill grade-B`}>B+</span></td>
                <td><span className={`grade-pill grade-A`}>A+</span></td>
                <td><span className="badge badge-green">91%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminReports() {
  return (
    <div>
      <div className="page-header fade-up">
        <h2>Reports & Analytics</h2>
        <button className="btn btn-primary">Export Report</button>
      </div>
      <div className="grid-4 fade-up-2">
        {[
          {icon:'🌍',value:'12',label:'Countries Active',cls:'sc-teal'},
          {icon:'📅',value:'94%',label:'Avg Attendance',cls:'sc-coral'},
          {icon:'🏆',value:'88%',label:'Assignment Completion',cls:'sc-violet'},
          {icon:'⭐',value:'B+',label:'School-wide GPA',cls:'sc-gold'},
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card fade-up-3">
        <div className="card-header"><div className="card-title">Performance by Grade Level</div></div>
        <table className="data-table">
          <thead><tr><th>Grade</th><th>Students</th><th>Avg GPA</th><th>Attendance</th><th>Completion</th><th>Status</th></tr></thead>
          <tbody>
            {[['4th',18,'B+','96%','91%'],['5th',24,'A-','94%','89%'],['6th',31,'B','91%','82%'],
              ['7th',28,'A-','95%','93%'],['8th',34,'B+','93%','88%'],['9th',29,'A','98%','95%'],['10th',22,'A+','99%','97%']
            ].map(([g,n,gpa,att,comp]) => (
              <tr key={g}>
                <td>{g} Grade</td><td>{n}</td>
                <td><span className={`grade-pill ${gpa.startsWith('A')?'grade-A':'grade-B'}`}>{gpa}</span></td>
                <td>{att}</td><td>{comp}</td>
                <td><span className={`badge ${att>='93%'?'badge-green':'badge-yellow'}`}>{parseInt(att)>=93?'On Track':'Attention'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminSettings() {
  const [saved, setSaved] = useState(false)
  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  return (
    <div>
      <div className="page-header fade-up">
        <h2>Platform Settings</h2>
        <button className="btn btn-primary" onClick={handleSave}>{saved ? '✓ Saved!' : 'Save Changes'}</button>
      </div>
      <div className="grid-2 fade-up-2">
        <div className="card">
          <div className="card-header"><div className="card-title">School Profile</div></div>
          {[['School Name','BLE Worldwide'],['Admin Email','admin@bleworldwide.edu'],['Default Timezone','UTC (Auto-detect per student)'],['Academic Year','2025–2026']].map(([lbl,val]) => (
            <div key={lbl} className="form-group">
              <label className="input-label">{lbl}</label>
              <input className="input" defaultValue={val}/>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Notifications</div></div>
          {[['New enrollments','Alert on new student sign-ups',true],['Staff messages','Incoming communications',true],['Weekly digest','Sunday summary email',true],['Grade alerts','Alert parents when grades post',false]].map(([lbl,sub,on]) => (
            <div key={lbl} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div><div style={{fontSize:13,fontWeight:600}}>{lbl}</div><div style={{fontSize:10,color:'var(--muted)'}}>{sub}</div></div>
              <div style={{width:40,height:21,background:on?'var(--teal)':'#e0e6f8',borderRadius:20,position:'relative',cursor:'pointer'}}>
                <div style={{width:15,height:15,background:'white',borderRadius:'50%',position:'absolute',top:3,right:on?3:'auto',left:on?'auto':3,transition:'.2s'}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Default exports (page-level routing requires default)
export default AdminSchedule
