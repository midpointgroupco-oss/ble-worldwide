import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// ── Mini bar chart (pure CSS, no library needed) ──────────────────────────
function BarChart({ data, color = 'var(--teal)', height = 140, valueLabel = '' }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)' }}>
            {d.value}{valueLabel}
          </div>
          <div style={{
            width: '100%', borderRadius: '4px 4px 0 0',
            background: color, opacity: 0.85,
            height: `${Math.max((d.value / max) * (height - 32), 4)}px`,
            transition: 'height .4s ease',
            minHeight: 4,
          }} />
          <div style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Donut chart (SVG) ─────────────────────────────────────────────────────
function DonutChart({ segments, size = 120 }) {
  const r = 40, cx = size / 2, cy = size / 2
  const circumference = 2 * Math.PI * r
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth={14} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circumference
        const gap  = circumference - dash
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={14}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray .5s ease' }}
          />
        )
        offset += dash
        return el
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={18} fontWeight={900} fill="var(--text)">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9} fill="var(--muted)">total</text>
    </svg>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, sub, cls, trend }) {
  return (
    <div className={`stat-card ${cls}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {sub  && <div style={{ fontSize: 10, opacity: .7, marginTop: 2 }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ fontSize: 10, marginTop: 4, fontWeight: 700, color: trend >= 0 ? '#00804a' : '#cc3333' }}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

// ── MAIN REPORTS PAGE ─────────────────────────────────────────────────────
export default function AdminReports() {
  const [loading,     setLoading]     = useState(true)
  const [stats,       setStats]       = useState({})
  const [gradeData,   setGradeData]   = useState([])
  const [countryData, setCountryData] = useState([])
  const [billingData, setBillingData] = useState({ paid: 0, outstanding: 0, total: 0 })
  const [attendData,  setAttendData]  = useState([])
  const [compData,    setCompData]    = useState({ graded: 0, submitted: 0, missing: 0 })
  const [activeTab,   setActiveTab]   = useState('overview')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [
      { data: students },
      { data: profiles },
      { data: courses },
      { data: enrollments },
      { data: attendance },
      { data: submissions },
      { data: billing },
      { data: assignments },
      { data: announcements },
    ] = await Promise.all([
      supabase.from('students').select('id,full_name,grade_level,country,created_at'),
      supabase.from('profiles').select('id,role'),
      supabase.from('courses').select('id,name,grade_level,subject').eq('is_active', true),
      supabase.from('enrollments').select('id,course_id,student_id,status'),
      supabase.from('attendance').select('id,status,student_id,course_id'),
      supabase.from('submissions').select('id,status,points,grade,assignment_id,student_id'),
      supabase.from('billing').select('id,amount,status,due_date'),
      supabase.from('assignments').select('id,course_id,max_points'),
      supabase.from('announcements').select('id,audience,published_at'),
    ])

    const s = students || []
    const p = profiles || []
    const c = courses  || []
    const e = enrollments || []
    const a = attendance  || []
    const sub = submissions || []
    const b = billing || []
    const asgn = assignments || []

    // ── Top stats
    const teacherCount  = p.filter(x => x.role === 'teacher').length
    const parentCount   = p.filter(x => x.role === 'parent').length
    const activeEnroll  = e.filter(x => x.status === 'active').length
    const presentCount  = a.filter(x => x.status === 'present').length
    const attendRate    = a.length ? Math.round((presentCount / a.length) * 100) : null
    const gradedCount   = sub.filter(x => x.status === 'graded').length
    const submittedCount = sub.filter(x => x.status === 'submitted').length
    const compRate      = sub.length ? Math.round((gradedCount / sub.length) * 100) : null
    const paidBilling   = b.filter(x => x.status === 'paid').reduce((acc, x) => acc + Number(x.amount || 0), 0)
    const outstandBill  = b.filter(x => x.status !== 'paid').reduce((acc, x) => acc + Number(x.amount || 0), 0)

    setStats({
      students: s.length, teachers: teacherCount, parents: parentCount,
      courses: c.length, activeEnroll, attendRate, compRate,
      totalBilling: paidBilling + outstandBill,
    })

    // ── Grade breakdown
    const gradeMap = {}
    s.forEach(st => {
      const g = st.grade_level || 'Unknown'
      if (!gradeMap[g]) gradeMap[g] = { students: 0, present: 0, attend: 0, graded: 0, total: 0 }
      gradeMap[g].students++
    })
    // Attendance by grade
    a.forEach(att => {
      const st = s.find(x => x.id === att.student_id)
      const g = st?.grade_level || 'Unknown'
      if (gradeMap[g]) {
        gradeMap[g].attend++
        if (att.status === 'present') gradeMap[g].present++
      }
    })
    // Submissions by grade (via course enrollment)
    sub.forEach(sb2 => {
      const enr = e.find(x => x.student_id === sb2.student_id)
      const course = enr ? c.find(x => x.id === enr.course_id) : null
      const st = s.find(x => x.id === sb2.student_id)
      const g = st?.grade_level || 'Unknown'
      if (gradeMap[g]) {
        gradeMap[g].total++
        if (sb2.status === 'graded') gradeMap[g].graded++
      }
    })

    const GRADE_ORDER = ['Pre-K','K','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th']
    const gradeRows = Object.entries(gradeMap)
      .sort(([a], [b]) => {
        const ai = GRADE_ORDER.indexOf(a), bi = GRADE_ORDER.indexOf(b)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
      .map(([grade, d]) => ({
        grade,
        students: d.students,
        attendRate: d.attend ? Math.round((d.present / d.attend) * 100) : null,
        compRate: d.total ? Math.round((d.graded / d.total) * 100) : null,
      }))
    setGradeData(gradeRows)

    // ── Country breakdown
    const countryMap = {}
    s.forEach(st => {
      const co = st.country || 'Unknown'
      countryMap[co] = (countryMap[co] || 0) + 1
    })
    const countryRows = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }))
    setCountryData(countryRows)

    // ── Billing
    setBillingData({ paid: paidBilling, outstanding: outstandBill, total: paidBilling + outstandBill })

    // ── Attendance chart data
    setAttendData(gradeRows.filter(g => g.attendRate !== null).map(g => ({
      label: g.grade, value: g.attendRate
    })))

    // ── Submission breakdown
    setCompData({
      graded: gradedCount,
      submitted: submittedCount,
      missing: Math.max((asgn.length * Math.ceil(s.length / Math.max(c.length, 1))) - sub.length, 0),
    })

    setLoading(false)
  }

  const TABS = [['overview','📊 Overview'],['enrollment','👥 Enrollment'],['attendance','📅 Attendance'],['grades','📝 Grades'],['billing','💳 Billing']]

  if (loading) return <div className="loading-screen" style={{height:400}}><div className="spinner"/></div>

  return (
    <div>
      <div className="page-header fade-up">
        <h2>📈 Reports & Analytics</h2>
        <button className="btn btn-outline" onClick={loadAll}>🔄 Refresh</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'2px solid var(--border)', marginBottom:20 }}>
        {TABS.map(([k,l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            padding:'9px 18px', border:'none', cursor:'pointer', fontSize:13, fontWeight: activeTab===k ? 800 : 500,
            borderBottom: activeTab===k ? '3px solid var(--teal)' : '3px solid transparent',
            marginBottom: -2, background: 'none',
            color: activeTab===k ? 'var(--teal)' : 'var(--muted)', whiteSpace:'nowrap'
          }}>{l}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <>
          {/* Stat cards */}
          <div className="grid-4 fade-up-2">
            <StatCard icon="👥" value={stats.students}    label="Total Students"    cls="sc-teal"   />
            <StatCard icon="👩‍🏫" value={stats.teachers}    label="Teachers"          cls="sc-violet" />
            <StatCard icon="📚" value={stats.courses}     label="Active Courses"    cls="sc-sky"    />
            <StatCard icon="✅" value={stats.attendRate != null ? `${stats.attendRate}%` : '—'} label="Attendance Rate" cls="sc-coral" />
          </div>
          <div className="grid-4 fade-up-2" style={{marginTop:12}}>
            <StatCard icon="📋" value={stats.activeEnroll} label="Active Enrollments" cls="sc-gold"   />
            <StatCard icon="🏆" value={stats.compRate != null ? `${stats.compRate}%` : '—'} label="Completion Rate" cls="sc-teal" />
            <StatCard icon="👨‍👩‍👧" value={stats.parents}     label="Parents Registered" cls="sc-violet" />
            <StatCard icon="💳" value={`$${billingData.total.toLocaleString()}`} label="Total Billed" cls="sc-coral" />
          </div>

          {/* Two column charts */}
          <div className="grid-2 fade-up-3" style={{marginTop:20}}>
            <div className="card">
              <div className="card-header"><div className="card-title">👥 Students by Grade</div></div>
              <BarChart
                data={gradeData.map(g => ({ label: g.grade, value: g.students }))}
                color="var(--teal)" height={160}
              />
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">📅 Attendance by Grade (%)</div></div>
              <BarChart
                data={attendData} color="var(--sky)" height={160} valueLabel="%"
              />
              {attendData.length === 0 && <div className="empty-state"><div className="es-icon">📅</div><div className="es-text">No attendance data yet.</div></div>}
            </div>
          </div>

          {/* Submission breakdown + Country */}
          <div className="grid-2 fade-up-3" style={{marginTop:16}}>
            <div className="card">
              <div className="card-header"><div className="card-title">📝 Assignment Submissions</div></div>
              <div style={{display:'flex',alignItems:'center',gap:24,padding:'8px 0'}}>
                <DonutChart size={110} segments={[
                  { value: compData.graded,    color: 'var(--teal)'   },
                  { value: compData.submitted, color: 'var(--gold)'   },
                  { value: Math.max(compData.missing, 0), color: '#eee' },
                ]} />
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[
                    { label:'Graded',    value: compData.graded,    color:'var(--teal)'  },
                    { label:'Pending',   value: compData.submitted, color:'var(--gold)'  },
                    { label:'Not submitted', value: Math.max(compData.missing,0), color:'#ccc' },
                  ].map(item => (
                    <div key={item.label} style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:10,height:10,borderRadius:2,background:item.color,flexShrink:0}}/>
                      <div style={{fontSize:12}}>{item.label}</div>
                      <div style={{fontWeight:800,fontSize:13,marginLeft:'auto'}}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">🌍 Students by Country</div></div>
              {countryData.length === 0
                ? <div className="empty-state"><div className="es-icon">🌍</div><div className="es-text">No country data yet.</div></div>
                : <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {countryData.slice(0,7).map((c, i) => {
                      const max = countryData[0].value
                      return (
                        <div key={c.label} style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:16,fontSize:11,color:'var(--muted)',textAlign:'right'}}>{i+1}</div>
                          <div style={{flex:1,fontSize:12,fontWeight:600}}>{c.label}</div>
                          <div style={{width:100,background:'#f0f0f0',borderRadius:20,height:8,overflow:'hidden'}}>
                            <div style={{height:'100%',background:'var(--teal)',borderRadius:20,width:`${(c.value/max)*100}%`,transition:'width .4s'}}/>
                          </div>
                          <div style={{fontSize:12,fontWeight:800,minWidth:24,textAlign:'right'}}>{c.value}</div>
                        </div>
                      )
                    })}
                  </div>
              }
            </div>
          </div>
        </>
      )}

      {/* ── ENROLLMENT TAB ── */}
      {activeTab === 'enrollment' && (
        <div className="card fade-up">
          <div className="card-header"><div className="card-title">👥 Enrollment by Grade Level</div></div>
          {gradeData.length === 0
            ? <div className="empty-state"><div className="es-icon">👥</div><div className="es-text">No student data yet.</div></div>
            : <>
                <BarChart data={gradeData.map(g=>({label:g.grade,value:g.students}))} color="var(--teal)" height={200}/>
                <table className="data-table" style={{marginTop:16}}>
                  <thead><tr><th>Grade</th><th>Students</th><th>Attendance Rate</th><th>Completion Rate</th><th>Status</th></tr></thead>
                  <tbody>
                    {gradeData.map(g => (
                      <tr key={g.grade}>
                        <td style={{fontWeight:700}}>{g.grade} Grade</td>
                        <td><span className="badge badge-blue">{g.students}</span></td>
                        <td>
                          {g.attendRate != null
                            ? <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <div style={{flex:1,background:'#f0f0f0',borderRadius:20,height:6,overflow:'hidden'}}>
                                  <div style={{height:'100%',background:g.attendRate>=90?'var(--teal)':g.attendRate>=75?'var(--gold)':'var(--coral)',width:`${g.attendRate}%`}}/>
                                </div>
                                <span style={{fontSize:12,fontWeight:700}}>{g.attendRate}%</span>
                              </div>
                            : <span style={{color:'var(--muted)',fontSize:12}}>No data</span>
                          }
                        </td>
                        <td>
                          {g.compRate != null
                            ? <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <div style={{flex:1,background:'#f0f0f0',borderRadius:20,height:6,overflow:'hidden'}}>
                                  <div style={{height:'100%',background:g.compRate>=80?'var(--teal)':g.compRate>=60?'var(--gold)':'var(--coral)',width:`${g.compRate}%`}}/>
                                </div>
                                <span style={{fontSize:12,fontWeight:700}}>{g.compRate}%</span>
                              </div>
                            : <span style={{color:'var(--muted)',fontSize:12}}>No data</span>
                          }
                        </td>
                        <td>
                          <span className={`badge ${g.students>0?'badge-green':'badge-yellow'}`}>
                            {g.students>0?'Active':'Empty'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
          }
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === 'attendance' && (
        <div className="fade-up">
          <div className="grid-3" style={{marginBottom:16}}>
            {[
              { label:'Present',  color:'var(--teal)',  key:'present'  },
              { label:'Absent',   color:'var(--coral)', key:'absent'   },
              { label:'Late',     color:'var(--gold)',  key:'late'     },
            ].map(s => (
              <div key={s.key} className="card" style={{textAlign:'center',padding:20,borderTop:`4px solid ${s.color}`}}>
                <div style={{fontSize:28,fontWeight:900,color:s.color}}>
                  {stats.attendRate != null && s.key==='present' ? `${stats.attendRate}%` : '—'}
                </div>
                <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>{s.label} Rate</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📅 Attendance Rate by Grade</div></div>
            {attendData.length === 0
              ? <div className="empty-state"><div className="es-icon">📅</div><div className="es-text">No attendance records yet.</div></div>
              : <BarChart data={attendData} color="var(--sky)" height={200} valueLabel="%"/>
            }
          </div>
        </div>
      )}

      {/* ── GRADES TAB ── */}
      {activeTab === 'grades' && (
        <div className="fade-up">
          <div className="grid-3" style={{marginBottom:16}}>
            {[
              { label:'Total Submissions', value: compData.graded + compData.submitted, color:'var(--teal)' },
              { label:'Graded',            value: compData.graded,                      color:'var(--sky)'  },
              { label:'Pending Review',    value: compData.submitted,                   color:'var(--gold)' },
            ].map(s => (
              <div key={s.label} className="card" style={{textAlign:'center',padding:20,borderTop:`4px solid ${s.color}`}}>
                <div style={{fontSize:28,fontWeight:900,color:s.color}}>{s.value}</div>
                <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📝 Completion Rate by Grade</div></div>
            {gradeData.filter(g=>g.compRate!=null).length === 0
              ? <div className="empty-state"><div className="es-icon">📝</div><div className="es-text">No submission data yet.</div></div>
              : <BarChart
                  data={gradeData.filter(g=>g.compRate!=null).map(g=>({label:g.grade,value:g.compRate}))}
                  color="var(--violet,#7b5ea7)" height={200} valueLabel="%"
                />
            }
          </div>
        </div>
      )}

      {/* ── BILLING TAB ── */}
      {activeTab === 'billing' && (
        <div className="fade-up">
          <div className="grid-3" style={{marginBottom:16}}>
            {[
              { label:'Total Billed',     value:`$${billingData.total.toLocaleString()}`,       color:'var(--teal)'  },
              { label:'Collected',        value:`$${billingData.paid.toLocaleString()}`,         color:'var(--sky)'   },
              { label:'Outstanding',      value:`$${billingData.outstanding.toLocaleString()}`,  color:'var(--coral)' },
            ].map(s => (
              <div key={s.label} className="card" style={{textAlign:'center',padding:20,borderTop:`4px solid ${s.color}`}}>
                <div style={{fontSize:24,fontWeight:900,color:s.color}}>{s.value}</div>
                <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">💳 Collection Rate</div></div>
            <div style={{display:'flex',alignItems:'center',gap:24,padding:'16px 0'}}>
              <DonutChart size={120} segments={[
                { value: billingData.paid,        color: 'var(--teal)'  },
                { value: billingData.outstanding, color: 'var(--coral)' },
              ]} />
              <div style={{display:'flex',flexDirection:'column',gap:12,flex:1}}>
                {[
                  { label:'Collected',   value: billingData.paid,        color:'var(--teal)'  },
                  { label:'Outstanding', value: billingData.outstanding, color:'var(--coral)' },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,color:'var(--muted)'}}>{item.label}</span>
                      <span style={{fontSize:13,fontWeight:800}}>${item.value.toLocaleString()}</span>
                    </div>
                    <div style={{background:'#f0f0f0',borderRadius:20,height:8,overflow:'hidden'}}>
                      <div style={{height:'100%',background:item.color,borderRadius:20,
                        width:`${billingData.total ? (item.value/billingData.total)*100 : 0}%`,transition:'width .4s'}}/>
                    </div>
                  </div>
                ))}
                {billingData.total > 0 && (
                  <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>
                    Collection rate: <strong style={{color:'var(--teal)'}}>
                      {Math.round((billingData.paid/billingData.total)*100)}%
                    </strong>
                  </div>
                )}
              </div>
            </div>
            {billingData.total === 0 && <div className="empty-state"><div className="es-icon">💳</div><div className="es-text">No billing records yet.</div></div>}
          </div>
        </div>
      )}
    </div>
  )
}
