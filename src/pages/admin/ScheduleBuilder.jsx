import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const COLORS = {
  teal:   { bg:'#e0faf7', border:'#00c9b1', text:'#007a6e', dot:'#00c9b1' },
  coral:  { bg:'#fff0ee', border:'#ff6058', text:'#cc2a1f', dot:'#ff6058' },
  violet: { bg:'#f3eeff', border:'#7b5ea7', text:'#4a2d8f', dot:'#7b5ea7' },
  gold:   { bg:'#fffbea', border:'#ffc845', text:'#8a6800', dot:'#ffc845' },
  sky:    { bg:'#e8f4ff', border:'#3b9eff', text:'#1a5fa8', dot:'#3b9eff' },
  pink:   { bg:'#fff0f7', border:'#f72585', text:'#a0005c', dot:'#f72585' },
}

const TYPE_COLORS = { class:'teal', exam:'coral', holiday:'gold', meeting:'violet', other:'sky' }
const TYPE_ICONS  = { class:'📚', exam:'📋', holiday:'🏖', meeting:'👥', other:'📌' }
const TYPE_LABELS = { class:'Class', exam:'Exam / Test', holiday:'Holiday / Break', meeting:'Meeting', other:'Other' }
const DAYS_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAYS_FULL   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay() }

// Expand recurring events into individual occurrences for a given month/year
function expandEvents(rawEvents, year, month) {
  const result = []
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  rawEvents.forEach(ev => {
    if (ev.recurrence === 'once' || !ev.recurrence) {
      const d = new Date(ev.event_date + 'T00:00:00')
      if (d.getFullYear() === year && d.getMonth() === month) {
        result.push({ ...ev, _date: d.getDate() })
      }
    } else if (ev.recurrence === 'weekly' || ev.recurrence === 'biweekly') {
      const startDate = new Date(ev.event_date + 'T00:00:00')
      const endDate   = ev.recurrence_end ? new Date(ev.recurrence_end + 'T00:00:00') : lastDay
      const step      = ev.recurrence === 'biweekly' ? 14 : 7
      let cur = new Date(startDate)
      while (cur <= endDate) {
        if (cur >= firstDay && cur <= lastDay) {
          result.push({ ...ev, _date: cur.getDate(), _instance: cur.toISOString().split('T')[0] })
        }
        cur = new Date(cur.getTime() + step * 86400000)
      }
    } else if (ev.recurrence === 'daily') {
      const startDate = new Date(ev.event_date + 'T00:00:00')
      const endDate   = ev.recurrence_end ? new Date(ev.recurrence_end + 'T00:00:00') : lastDay
      let cur = new Date(startDate)
      while (cur <= endDate) {
        if (cur >= firstDay && cur <= lastDay) {
          result.push({ ...ev, _date: cur.getDate(), _instance: cur.toISOString().split('T')[0] })
        }
        cur = new Date(cur.getTime() + 86400000)
      }
    }
  })
  return result
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function ScheduleBuilder({ teacherMode = false }) {
  const { profile } = useAuth()
  const today       = new Date()
  const [year,      setYear]      = useState(today.getFullYear())
  const [month,     setMonth]     = useState(today.getMonth())
  const [view,      setView]      = useState('month') // month | week
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today); d.setDate(today.getDate() - today.getDay()); return d
  })
  const [events,    setEvents]    = useState([])
  const [courses,   setCourses]   = useState([])
  const [teachers,  setTeachers]  = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [clickDay,  setClickDay]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [filterType,   setFilterType]   = useState('all')
  const [showGenerate, setShowGenerate] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: evs }, { data: crs }, { data: tch }] = await Promise.all([
      teacherMode
        ? supabase.from('schedule_events').select('*').eq('teacher_id', profile.id).order('event_date').order('start_time')
        : supabase.from('schedule_events').select('*').order('event_date').order('start_time'),
      supabase.from('courses').select('id,name,subject,grade_level,teacher_id,default_start_time,default_end_time,meeting_days,credits').eq('is_active', true).order('name'),
      supabase.from('profiles').select('id,full_name').eq('role','teacher').order('full_name'),
    ])
    setEvents(evs || [])
    setCourses(crs || [])
    setTeachers(tch || [])
    setLoading(false)
  }, [profile?.id, teacherMode])

  useEffect(() => { if (profile?.id) loadData() }, [loadData])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  function prevWeek() { setWeekStart(d => new Date(d.getTime() - 7*86400000)) }
  function nextWeek() { setWeekStart(d => new Date(d.getTime() + 7*86400000)) }
  function goToday()  {
    setYear(today.getFullYear()); setMonth(today.getMonth())
    const d = new Date(today); d.setDate(today.getDate() - today.getDay()); setWeekStart(d)
  }

  function openNew(date) {
    if (teacherMode) return // teachers can't create events
    setEditEvent(null)
    setClickDay(date)
    setShowModal(true)
  }
  function openEdit(ev, e) {
    if (teacherMode) return
    e.stopPropagation()
    setEditEvent(ev)
    setClickDay(null)
    setShowModal(true)
  }

  const expanded = expandEvents(events, year, month)
  const filtered = filterType === 'all' ? expanded : expanded.filter(e => e.event_type === filterType)

  // ── MONTH VIEW ────────────────────────────────────────────────────────────
  const daysInMonth  = getDaysInMonth(year, month)
  const firstDayOfMonth = getFirstDayOfMonth(year, month)
  const prevDays     = getDaysInMonth(year, month === 0 ? 11 : month - 1)
  const totalCells   = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

  function renderMonthView() {
    const cells = []
    for (let i = 0; i < totalCells; i++) {
      let dayNum, isCurrentMonth = true
      if (i < firstDayOfMonth) { dayNum = prevDays - firstDayOfMonth + i + 1; isCurrentMonth = false }
      else if (i >= firstDayOfMonth + daysInMonth) { dayNum = i - firstDayOfMonth - daysInMonth + 1; isCurrentMonth = false }
      else dayNum = i - firstDayOfMonth + 1

      const isToday = isCurrentMonth && dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear()
      const dayEvs  = isCurrentMonth ? filtered.filter(e => e._date === dayNum) : []
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`

      cells.push(
        <div key={i} onClick={() => isCurrentMonth && openNew(dateStr)}
          style={{
            minHeight: 100, padding:'6px 8px', border:'1px solid var(--border)',
            background: isCurrentMonth ? 'white' : '#f9fafb',
            cursor: isCurrentMonth && !teacherMode ? 'pointer' : 'default',
            transition: 'background .15s',
          }}
          onMouseEnter={e => { if(isCurrentMonth && !teacherMode) e.currentTarget.style.background='#f0fdf9' }}
          onMouseLeave={e => { if(isCurrentMonth && !teacherMode) e.currentTarget.style.background='white' }}
        >
          <div style={{
            width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
            marginBottom:4, fontSize:12, fontWeight: isToday ? 800 : 500,
            background: isToday ? 'var(--teal)' : 'transparent',
            color: isToday ? 'white' : isCurrentMonth ? 'var(--text)' : '#ccc',
          }}>{dayNum}</div>
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            {dayEvs.slice(0,3).map((ev,j) => {
              const col = COLORS[ev.color || TYPE_COLORS[ev.event_type] || 'teal']
              return (
                <div key={ev.id + (ev._instance||j)} onClick={e => openEdit(ev, e)}
                  style={{
                    fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
                    background: col.bg, color: col.text, borderLeft:`3px solid ${col.border}`,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    cursor: teacherMode ? 'default' : 'pointer'
                  }}
                >
                  {ev.start_time ? ev.start_time.slice(0,5)+' ' : ''}{TYPE_ICONS[ev.event_type]||'📌'} {ev.title}
                </div>
              )
            })}
            {dayEvs.length > 3 && <div style={{fontSize:9,color:'var(--muted)',paddingLeft:4}}>+{dayEvs.length-3} more</div>}
          </div>
        </div>
      )
    }
    return cells
  }

  // ── WEEK VIEW ─────────────────────────────────────────────────────────────
  const HOURS = Array.from({length:13}, (_,i)=>i+7) // 7am–7pm

  function renderWeekView() {
    const weekDays = Array.from({length:7}, (_,i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d
    })

    // Get events for this week
    const weekEvs = events.filter(ev => {
      const evDate = new Date(ev.event_date + 'T00:00:00')
      return evDate >= weekDays[0] && evDate <= weekDays[6]
    })

    return (
      <div style={{overflowX:'auto'}}>
        {/* Day headers */}
        <div style={{display:'grid', gridTemplateColumns:'60px repeat(7,1fr)', borderBottom:'2px solid var(--border)'}}>
          <div/>
          {weekDays.map((d,i) => {
            const isToday = d.toDateString() === today.toDateString()
            return (
              <div key={i} style={{padding:'10px 6px', textAlign:'center', borderLeft:'1px solid var(--border)'}}>
                <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1}}>{DAYS_SHORT[d.getDay()]}</div>
                <div style={{
                  width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                  margin:'4px auto 0',fontSize:14,fontWeight:800,
                  background: isToday?'var(--teal)':'transparent',
                  color: isToday?'white':'var(--text)'
                }}>{d.getDate()}</div>
              </div>
            )
          })}
        </div>
        {/* Time grid */}
        <div style={{display:'grid', gridTemplateColumns:'60px repeat(7,1fr)', position:'relative'}}>
          {HOURS.map(h => (
            <>
              <div key={'t'+h} style={{padding:'0 8px',textAlign:'right',fontSize:10,color:'var(--muted)',height:60,display:'flex',alignItems:'flex-start',paddingTop:4}}>
                {h > 12 ? `${h-12}pm` : h===12 ? '12pm' : `${h}am`}
              </div>
              {weekDays.map((d,i) => {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                const slotEvs = weekEvs.filter(ev => {
                  if (ev.event_date !== dateStr) return false
                  const startH = ev.start_time ? parseInt(ev.start_time.split(':')[0]) : null
                  return startH === h
                })
                return (
                  <div key={i} onClick={() => openNew(dateStr)}
                    style={{height:60,borderLeft:'1px solid var(--border)',borderBottom:'1px solid #f0f0f0',position:'relative',
                      cursor: teacherMode?'default':'pointer', padding:'2px'}}
                    onMouseEnter={e => { if(!teacherMode) e.currentTarget.style.background='#f0fdf9' }}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    {slotEvs.map(ev => {
                      const col = COLORS[ev.color || TYPE_COLORS[ev.event_type] || 'teal']
                      const startH = ev.start_time ? parseInt(ev.start_time.split(':')[0]) : h
                      const startM = ev.start_time ? parseInt(ev.start_time.split(':')[1]) : 0
                      const endH   = ev.end_time   ? parseInt(ev.end_time.split(':')[0])   : startH+1
                      const endM   = ev.end_time   ? parseInt(ev.end_time.split(':')[1])   : 0
                      const dur    = Math.max(((endH-startH)*60+(endM-startM))/60, 0.5)
                      return (
                        <div key={ev.id} onClick={e=>openEdit(ev,e)}
                          style={{
                            position:'absolute', left:2, right:2,
                            top: (startM/60)*60, height: Math.max(dur*60-4,20),
                            background:col.bg, borderLeft:`3px solid ${col.border}`, borderRadius:4,
                            padding:'2px 5px', fontSize:10, fontWeight:700, color:col.text,
                            overflow:'hidden', cursor: teacherMode?'default':'pointer', zIndex:1
                          }}
                        >
                          {ev.title}
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
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header fade-up">
        <h2>📅 Class Schedule</h2>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {/* View toggle */}
          <div style={{display:'flex',border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}}>
            {['month','week'].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{
                padding:'6px 14px',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
                background: view===v?'var(--teal)':'white',
                color: view===v?'white':'var(--muted)',
                textTransform:'capitalize'
              }}>{v==='month'?'📅 Month':'📆 Week'}</button>
            ))}
          </div>
          <button className="btn btn-outline" style={{fontSize:12}} onClick={goToday}>Today</button>
          <button className="btn btn-outline" onClick={view==='month'?prevMonth:prevWeek}>←</button>
          <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:14,minWidth:160,textAlign:'center'}}>
            {view==='month'
              ? `${MONTHS[month]} ${year}`
              : `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS[new Date(weekStart.getTime()+6*86400000).getMonth()]} ${new Date(weekStart.getTime()+6*86400000).getDate()}, ${year}`
            }
          </div>
          <button className="btn btn-outline" onClick={view==='month'?nextMonth:nextWeek}>→</button>
          {!teacherMode && <>
            <button className="btn btn-outline" style={{fontSize:12}} onClick={()=>setShowGenerate(p=>!p)}>⚡ Generate Schedule</button>
            <button className="btn btn-primary" onClick={()=>{ setEditEvent(null); setClickDay(null); setShowModal(true) }}>+ Add Event</button>
          </>}
        </div>
      </div>

      {/* Generate Schedule panel */}
      {showGenerate && !teacherMode && (
        <GeneratePanel courses={courses} onGenerated={()=>{ setShowGenerate(false); loadData() }}/>
      )}

      {/* Filter chips */}
      <div className="filter-row fade-up-2" style={{marginBottom:8}}>
        {[['all','All Events'],['class','Classes'],['exam','Exams'],['holiday','Holidays'],['meeting','Meetings'],['other','Other']].map(([t,l])=>(
          <div key={t} className={`filter-chip ${filterType===t?'active':''}`} onClick={()=>setFilterType(t)}>
            {t!=='all'&&TYPE_ICONS[t]+' '}{l}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="card fade-up-3" style={{padding:0,overflow:'hidden'}}>
        {loading
          ? <div className="loading-screen" style={{height:300}}><div className="spinner"/></div>
          : view === 'month' ? (
            <>
              {/* Day headers */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',background:'var(--bg)',borderBottom:'1px solid var(--border)'}}>
                {DAYS_SHORT.map(d=>(
                  <div key={d} style={{padding:'10px 0',textAlign:'center',fontSize:11,fontWeight:800,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1}}>{d}</div>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
                {renderMonthView()}
              </div>
            </>
          ) : renderWeekView()
        }
      </div>

      {/* Legend */}
      <div style={{display:'flex',gap:16,marginTop:12,flexWrap:'wrap'}}>
        {Object.entries(TYPE_LABELS).map(([t,l])=>{
          const col = COLORS[TYPE_COLORS[t]]
          return (
            <div key={t} style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}>
              <div style={{width:10,height:10,borderRadius:2,background:col.dot}}/>
              <span style={{color:'var(--muted)'}}>{TYPE_ICONS[t]} {l}</span>
            </div>
          )
        })}
        {!teacherMode && <div style={{marginLeft:'auto',fontSize:11,color:'var(--muted)'}}>Click any day to add an event</div>}
      </div>

      {/* Event Modal */}
      {showModal && (
        <EventModal
          editEvent={editEvent}
          defaultDate={clickDay}
          courses={courses}
          teachers={teachers}
          onClose={()=>setShowModal(false)}
          onSaved={()=>{ setShowModal(false); loadData() }}
        />
      )}
    </div>
  )
}

// ── GENERATE SCHEDULE PANEL ───────────────────────────────────────────────────
const DAY_MAP = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:0 }

function GeneratePanel({ courses, onGenerated }) {
  const { profile } = useAuth()
  const [selCourse,  setSelCourse]  = useState('')
  const [startDate,  setStartDate]  = useState('')
  const [endDate,    setEndDate]    = useState('')
  const [preview,    setPreview]    = useState([])
  const [generating, setGenerating] = useState(false)
  const [done,       setDone]       = useState(null) // number of events created
  const [error,      setError]      = useState('')

  const course = courses.find(c => c.id === selCourse)

  function buildDates(startStr, endStr, meetingDaysStr) {
    if (!startStr || !endStr || !meetingDaysStr) return []
    const days = meetingDaysStr.split(',').map(d => d.trim()).filter(Boolean)
    const dayNums = days.map(d => DAY_MAP[d]).filter(n => n !== undefined)
    const dates = []
    const cur = new Date(startStr + 'T00:00:00')
    const end = new Date(endStr   + 'T00:00:00')
    while (cur <= end) {
      if (dayNums.includes(cur.getDay())) {
        dates.push(cur.toISOString().split('T')[0])
      }
      cur.setDate(cur.getDate() + 1)
    }
    return dates
  }

  useEffect(() => {
    if (!course || !startDate || !endDate) { setPreview([]); return }
    const dates = buildDates(startDate, endDate, course.meeting_days)
    setPreview(dates)
    setDone(null)
    setError('')
  }, [selCourse, startDate, endDate])

  async function handleGenerate() {
    if (!course || preview.length === 0) return
    setGenerating(true)
    setError('')
    try {
      // Check for existing events on these dates to avoid duplicates
      const { data: existing } = await supabase
        .from('schedule_events')
        .select('event_date')
        .eq('course_id', course.id)
        .in('event_date', preview)

      const existingDates = new Set((existing||[]).map(e => e.event_date))
      const toCreate = preview.filter(d => !existingDates.has(d))

      if (toCreate.length === 0) {
        setError('All dates already have events for this course. No new events created.')
        setGenerating(false)
        return
      }

      const records = toCreate.map(date => ({
        title:       course.name,
        event_date:  date,
        start_time:  course.default_start_time || '08:00',
        end_time:    course.default_end_time   || '09:00',
        event_type:  'class',
        course_id:   course.id,
        teacher_id:  course.teacher_id || null,
        color:       'teal',
        recurrence:  'once',
        created_by:  profile.id,
      }))

      // Insert in batches of 50
      for (let i = 0; i < records.length; i += 50) {
        const { error: insertErr } = await supabase
          .from('schedule_events')
          .insert(records.slice(i, i + 50))
        if (insertErr) throw insertErr
      }

      setDone(toCreate.length)
    } catch(e) {
      setError(e.message || 'An error occurred.')
    }
    setGenerating(false)
  }

  const meetingDaysArr = course?.meeting_days ? course.meeting_days.split(',').map(d=>d.trim()) : []

  return (
    <div className="card fade-up-2" style={{marginBottom:16,borderTop:'3px solid var(--teal)'}}>
      <div className="card-header">
        <div className="card-title">⚡ Generate Recurring Schedule</div>
        <div style={{fontSize:12,color:'var(--muted)'}}>Bulk-create class events from course defaults</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:12,marginBottom:12,alignItems:'end'}}>
        <div className="form-group" style={{marginBottom:0}}>
          <label className="input-label">Select Course</label>
          <select className="input" value={selCourse} onChange={e=>{ setSelCourse(e.target.value); setDone(null) }}>
            <option value="">— Pick a course —</option>
            {courses.filter(c=>c.is_active!==false).map(c=>(
              <option key={c.id} value={c.id}>
                {c.name} ({c.grade_level}){c.default_start_time ? ' · ' + c.default_start_time : ' · no time set'}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{marginBottom:0}}>
          <label className="input-label">Start Date</label>
          <input className="input" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/>
        </div>
        <div className="form-group" style={{marginBottom:0}}>
          <label className="input-label">End Date</label>
          <input className="input" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/>
        </div>
      </div>

      {course && (
        <div style={{background:'var(--bg)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13}}>
          <div style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'center'}}>
            <span>⏰ <strong>{course.default_start_time||'—'}</strong> – <strong>{course.default_end_time||'—'}</strong></span>
            <span style={{display:'flex',gap:4}}>
              {meetingDaysArr.length > 0
                ? meetingDaysArr.map(d=>(
                    <span key={d} style={{background:'var(--teal)',color:'white',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700}}>{d}</span>
                  ))
                : <span style={{color:'var(--muted)'}}>No meeting days set — edit the course to add them</span>
              }
            </span>
            {preview.length > 0 && (
              <span style={{marginLeft:'auto',fontWeight:700,color:'var(--teal)'}}>
                {preview.length} class sessions
              </span>
            )}
          </div>
        </div>
      )}

      {preview.length > 0 && !done && (
        <div style={{marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:12,marginBottom:6,color:'var(--muted)'}}>PREVIEW — first 10 dates</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {preview.slice(0,10).map(d=>(
              <span key={d} style={{background:'#e0faf7',color:'#007a6e',padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:600}}>
                {new Date(d+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
              </span>
            ))}
            {preview.length > 10 && <span style={{color:'var(--muted)',fontSize:12,alignSelf:'center'}}>+{preview.length-10} more</span>}
          </div>
        </div>
      )}

      {error && <div style={{color:'#cc3333',fontSize:13,marginBottom:10,padding:'8px 12px',background:'#fff3f3',borderRadius:8}}>{error}</div>}

      {done != null && (
        <div style={{color:'#00804a',fontSize:13,marginBottom:10,padding:'8px 12px',background:'#f0fff8',borderRadius:8,fontWeight:700}}>
          ✅ {done} events created! <button className="btn btn-outline" style={{fontSize:11,marginLeft:12,padding:'2px 10px'}} onClick={onGenerated}>View Calendar</button>
        </div>
      )}

      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        {!course?.default_start_time && selCourse && (
          <span style={{fontSize:12,color:'#b07800',alignSelf:'center'}}>⚠️ No default time set on this course</span>
        )}
        <button
          className="btn btn-primary"
          disabled={!course || preview.length===0 || generating || !!done}
          onClick={handleGenerate}
          style={{minWidth:140}}
        >
          {generating ? 'Generating…' : `⚡ Create ${preview.length||''} Events`}
        </button>
      </div>
    </div>
  )
}

// ── EVENT MODAL ──────────────────────────────────────────────────────────────
function EventModal({ editEvent, defaultDate, courses, teachers, onClose, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    title:          editEvent?.title          || '',
    description:    editEvent?.description    || '',
    event_date:     editEvent?.event_date     || defaultDate || new Date().toISOString().split('T')[0],
    start_time:     editEvent?.start_time     || '08:00',
    end_time:       editEvent?.end_time       || '09:00',
    event_type:     editEvent?.event_type     || 'class',
    color:          editEvent?.color          || '',
    course_id:      editEvent?.course_id      || '',
    teacher_id:     editEvent?.teacher_id     || '',
    recurrence:     editEvent?.recurrence     || 'once',
    recurrence_end: editEvent?.recurrence_end || '',
    location:       editEvent?.location       || '',
  })
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  function update(k, v) { setForm(p => ({ ...p, [k]: v })) }

  // Auto-set color from event type
  function handleTypeChange(t) {
    update('event_type', t)
    if (!form.color || form.color === TYPE_COLORS[form.event_type]) {
      update('color', TYPE_COLORS[t])
    }
  }

  // Auto-fill time from course if selected
  function handleCourseChange(courseId) {
    update('course_id', courseId)
    const course = courses.find(c => c.id === courseId)
    if (course && !editEvent) {
      if (course.teacher_id) update('teacher_id', course.teacher_id)
      if (course.default_start_time) update('start_time', course.default_start_time)
      if (course.default_end_time)   update('end_time',   course.default_end_time)
      if (!form.title && course.name) update('title', course.name)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      ...form,
      course_id:  form.course_id  || null,
      teacher_id: form.teacher_id || null,
      recurrence_end: form.recurrence === 'once' ? null : (form.recurrence_end || null),
      color: form.color || TYPE_COLORS[form.event_type] || 'teal',
      created_by: profile.id,
    }
    if (editEvent) {
      await supabase.from('schedule_events').update(payload).eq('id', editEvent.id)
    } else {
      await supabase.from('schedule_events').insert([payload])
    }
    setSaving(false)
    onSaved()
  }

  async function handleDelete() {
    if (!confirm('Delete this event?')) return
    setDeleting(true)
    await supabase.from('schedule_events').delete().eq('id', editEvent.id)
    setDeleting(false)
    onSaved()
  }

  const colorOpts = Object.entries(COLORS).map(([k,v]) => ({ value:k, ...v }))
  const selectedColor = COLORS[form.color || TYPE_COLORS[form.event_type] || 'teal']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500,maxHeight:'90vh',overflowY:'auto'}}>
        <div className="modal-header" style={{borderLeft:`4px solid ${selectedColor.border}`,paddingLeft:16}}>
          <div className="modal-title">{editEvent ? '✏️ Edit Event' : '📅 New Schedule Event'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave}>
          {/* Event Type pills */}
          <div className="form-group">
            <label className="input-label">Event Type</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {Object.entries(TYPE_LABELS).map(([t,l])=>(
                <button type="button" key={t} onClick={()=>handleTypeChange(t)}
                  style={{padding:'5px 12px',borderRadius:20,border:'2px solid',fontSize:11,fontWeight:700,cursor:'pointer',
                    borderColor: form.event_type===t ? selectedColor.border : 'var(--border)',
                    background:  form.event_type===t ? selectedColor.bg     : 'white',
                    color:       form.event_type===t ? selectedColor.text   : 'var(--muted)',
                  }}>{TYPE_ICONS[t]} {l}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Title *</label>
            <input className="input" required value={form.title} onChange={e=>update('title',e.target.value)} placeholder="e.g. 7th Grade Math"/>
          </div>

          {/* Date + Time row */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            <div className="form-group">
              <label className="input-label">Date *</label>
              <input className="input" type="date" required value={form.event_date} onChange={e=>update('event_date',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="input-label">Start Time</label>
              <input className="input" type="time" value={form.start_time} onChange={e=>update('start_time',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="input-label">End Time</label>
              <input className="input" type="time" value={form.end_time} onChange={e=>update('end_time',e.target.value)}/>
            </div>
          </div>

          {/* Linked course + teacher */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div className="form-group">
              <label className="input-label">Linked Course</label>
              <select className="input" value={form.course_id} onChange={e=>handleCourseChange(e.target.value)}>
                <option value="">— None —</option>
                {courses.map(c=><option key={c.id} value={c.id}>{c.name} ({c.grade_level})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Teacher</label>
              <select className="input" value={form.teacher_id} onChange={e=>update('teacher_id',e.target.value)}>
                <option value="">— None —</option>
                {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Location / Room</label>
            <input className="input" value={form.location} onChange={e=>update('location',e.target.value)} placeholder="e.g. Room 204, Online, Gymnasium"/>
          </div>

          {/* Recurrence */}
          <div className="form-group">
            <label className="input-label">Recurrence</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {[['once','One-time'],['weekly','Weekly'],['biweekly','Bi-weekly'],['daily','Daily']].map(([v,l])=>(
                <button type="button" key={v} onClick={()=>update('recurrence',v)}
                  style={{padding:'5px 12px',borderRadius:20,border:'2px solid',fontSize:11,fontWeight:700,cursor:'pointer',
                    borderColor: form.recurrence===v?'var(--teal)':'var(--border)',
                    background:  form.recurrence===v?'var(--teal)':'white',
                    color:       form.recurrence===v?'white':'var(--muted)',
                  }}>{l}
                </button>
              ))}
            </div>
            {form.recurrence !== 'once' && (
              <div style={{marginTop:8}}>
                <label className="input-label">Repeat Until</label>
                <input className="input" type="date" value={form.recurrence_end} onChange={e=>update('recurrence_end',e.target.value)}/>
              </div>
            )}
          </div>

          {/* Color picker */}
          <div className="form-group">
            <label className="input-label">Color</label>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {colorOpts.map(c=>(
                <button type="button" key={c.value} onClick={()=>update('color',c.value)}
                  style={{width:24,height:24,borderRadius:'50%',border: form.color===c.value?`3px solid ${c.border}`:'3px solid transparent',
                    background:c.dot,cursor:'pointer',outline: form.color===c.value?`2px solid ${c.border}`:'none',outlineOffset:2}}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Notes / Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={e=>update('description',e.target.value)} style={{resize:'vertical'}} placeholder="Optional details…"/>
          </div>

          <div style={{display:'flex',gap:10,justifyContent:'space-between',marginTop:8}}>
            {editEvent
              ? <button type="button" className="btn" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc'}} onClick={handleDelete} disabled={deleting}>
                  {deleting?'Deleting…':'🗑 Delete'}
                </button>
              : <div/>
            }
            <div style={{display:'flex',gap:10}}>
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving||!form.title.trim()}>
                {saving?'Saving…':editEvent?'Save Changes':'Add to Schedule'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
