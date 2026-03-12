import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const TYPE_META = {
  holiday:  { color:'#cc3333', bg:'#fff0f0', icon:'🏖️', label:'Holiday'  },
  exam:     { color:'#b07800', bg:'#fff9e6', icon:'📝', label:'Exam'     },
  event:    { color:'#0050b0', bg:'#e6f4ff', icon:'🎉', label:'Event'    },
  deadline: { color:'#7b5ea7', bg:'#f3eeff', icon:'⏰', label:'Deadline' },
  meeting:  { color:'#00804a', bg:'#e6fff4', icon:'📋', label:'Meeting'  },
}
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function AdminCalendar() {
  const { profile } = useAuth()
  const today  = new Date()
  const [year,     setYear]     = useState(today.getFullYear())
  const [month,    setMonth]    = useState(today.getMonth())
  const [events,   setEvents]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showModal,setShowModal]= useState(false)
  const [selected, setSelected] = useState(null) // date string clicked
  const [editEvt,  setEditEvt]  = useState(null)
  const [form,     setForm]     = useState({ title:'', description:'', event_type:'event', start_date:'', end_date:'', start_time:'', end_time:'', all_day:true, color:'#3b9eff', audience:'all' })
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState(null)

  useEffect(() => { loadEvents() }, [year, month])

  async function loadEvents() {
    const start = `${year}-${String(month+1).padStart(2,'0')}-01`
    const end   = `${year}-${String(month+1).padStart(2,'0')}-31`
    const { data } = await supabase.from('calendar_events').select('*')
      .gte('start_date', start).lte('start_date', end).order('start_date')
    setEvents(data||[])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  function openNew(date='') {
    setEditEvt(null)
    setForm({ title:'', description:'', event_type:'event', start_date:date, end_date:'', start_time:'', end_time:'', all_day:true, color:'#3b9eff', audience:'all' })
    setShowModal(true)
  }

  function openEdit(evt) {
    setEditEvt(evt)
    setForm({ ...evt })
    setShowModal(true)
  }

  async function saveEvent() {
    if (!form.title.trim() || !form.start_date) return
    setSaving(true)
    if (editEvt) {
      await supabase.from('calendar_events').update({ ...form }).eq('id', editEvt.id)
    } else {
      await supabase.from('calendar_events').insert([{ ...form, created_by: profile.id }])
    }
    setSaving(false); setShowModal(false)
    loadEvents(); showToast(editEvt?'✅ Event updated':'✅ Event added')
  }

  async function deleteEvent(id) {
    if (!confirm('Delete this event?')) return
    await supabase.from('calendar_events').delete().eq('id', id)
    loadEvents(); showToast('🗑 Event deleted')
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const cells = []
  for (let i=0; i<firstDay; i++) cells.push(null)
  for (let d=1; d<=daysInMonth; d++) cells.push(d)

  function dateStr(d) { return `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` }
  function eventsOn(d) { return events.filter(e => e.start_date === dateStr(d)) }
  const isToday = (d) => today.getFullYear()===year && today.getMonth()===month && today.getDate()===d

  function prevMonth() { if (month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }
  function nextMonth() { if (month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) }

  return (
    <div>
      {toast && <div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}

      <div className="page-header fade-up">
        <div><h2>📅 Academic Calendar</h2><div style={{fontSize:13,color:'var(--muted)'}}>{events.length} events this month</div></div>
        <button className="btn btn-primary" onClick={()=>openNew()}>+ Add Event</button>
      </div>

      {/* Event type legend */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {Object.entries(TYPE_META).map(([k,m])=>(
          <div key={k} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,background:m.bg,border:`1px solid ${m.color}30`,fontSize:11,fontWeight:600,color:m.color}}>
            {m.icon} {m.label}
          </div>
        ))}
      </div>

      <div className="grid-2 fade-up-2" style={{gap:16,alignItems:'start'}}>
        {/* Calendar grid */}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {/* Month nav */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
            <button onClick={prevMonth} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)',padding:'0 8px'}}>‹</button>
            <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:16}}>{MONTHS[month]} {year}</div>
            <button onClick={nextMonth} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)',padding:'0 8px'}}>›</button>
          </div>

          {/* Day headers */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid var(--border)'}}>
            {DAYS.map(d=><div key={d} style={{textAlign:'center',padding:'6px 0',fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase'}}>{d}</div>)}
          </div>

          {/* Date cells */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
            {cells.map((d,i) => {
              const evts = d ? eventsOn(d) : []
              const ds   = d ? dateStr(d) : ''
              return (
                <div key={i} onClick={()=>d&&openNew(ds)}
                  style={{minHeight:72,padding:'4px 5px',borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)',cursor:d?'pointer':'default',
                    background:isToday(d)?'rgba(0,201,177,.07)':selected===ds?'#f0f9ff':'white',
                    borderTop:isToday(d)?`2px solid var(--teal)`:'none',transition:'background .12s'}}>
                  {d && <>
                    <div style={{fontSize:11,fontWeight:isToday(d)?800:500,marginBottom:2,width:22,height:22,borderRadius:'50%',
                      display:'flex',alignItems:'center',justifyContent:'center',background:isToday(d)?'var(--teal)':'transparent',color:isToday(d)?'white':'var(--text)'}}>
                      {d}
                    </div>
                    {evts.slice(0,2).map(e=>{
                      const m = TYPE_META[e.event_type]||TYPE_META.event
                      return <div key={e.id} onClick={ev=>{ev.stopPropagation();openEdit(e)}}
                        style={{fontSize:9,fontWeight:700,color:m.color,background:m.bg,borderRadius:3,padding:'1px 4px',marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {m.icon} {e.title}
                      </div>
                    })}
                    {evts.length>2&&<div style={{fontSize:9,color:'var(--muted)',paddingLeft:2}}>+{evts.length-2} more</div>}
                  </>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming events list */}
        <div>
          <div className="card">
            <div className="card-header"><div className="card-title">📋 Events This Month</div></div>
            {loading ? <div style={{padding:20,textAlign:'center'}}><div className="spinner"/></div>
            : events.length===0 ? <div className="empty-state" style={{padding:30}}><div className="es-icon">📅</div><div className="es-text">No events this month</div></div>
            : events.map(e => {
                const m = TYPE_META[e.event_type]||TYPE_META.event
                return (
                  <div key={e.id} style={{padding:'10px 0',borderBottom:'1px solid var(--border)',display:'flex',gap:10,alignItems:'flex-start'}}>
                    <div style={{width:34,height:34,borderRadius:8,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{m.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>{e.title}</div>
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>
                        {e.start_date}{e.end_date&&e.end_date!==e.start_date?' → '+e.end_date:''}
                        {!e.all_day&&e.start_time?' · '+e.start_time:''}
                        {' · '}<span style={{textTransform:'capitalize'}}>{e.audience}</span>
                      </div>
                      {e.description&&<div style={{fontSize:11,color:'var(--text)',marginTop:2,lineHeight:1.5}}>{e.description}</div>}
                    </div>
                    <div style={{display:'flex',gap:4,flexShrink:0}}>
                      <button onClick={()=>openEdit(e)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--muted)'}}>✏️</button>
                      <button onClick={()=>deleteEvent(e.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--muted)'}}>🗑</button>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
            <div className="modal-header">
              <div className="modal-title">{editEvt?'✏️ Edit Event':'➕ Add Calendar Event'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="input-label">Title *</label>
              <input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Event title"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="input-label">Type</label>
                <select className="input" value={form.event_type} onChange={e=>setForm(p=>({...p,event_type:e.target.value}))}>
                  {Object.entries(TYPE_META).map(([k,m])=><option key={k} value={k}>{m.icon} {m.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Audience</label>
                <select className="input" value={form.audience} onChange={e=>setForm(p=>({...p,audience:e.target.value}))}>
                  {['all','students','staff','parents'].map(a=><option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="input-label">Start Date *</label>
                <input className="input" type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="input-label">End Date</label>
                <input className="input" type="date" value={form.end_date||''} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))}/>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <input type="checkbox" id="allday" checked={form.all_day} onChange={e=>setForm(p=>({...p,all_day:e.target.checked}))}/>
              <label htmlFor="allday" style={{fontSize:13,fontWeight:600}}>All day event</label>
            </div>
            {!form.all_day && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group">
                  <label className="input-label">Start Time</label>
                  <input className="input" type="time" value={form.start_time||''} onChange={e=>setForm(p=>({...p,start_time:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="input-label">End Time</label>
                  <input className="input" type="time" value={form.end_time||''} onChange={e=>setForm(p=>({...p,end_time:e.target.value}))}/>
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="input-label">Description</label>
              <textarea className="input" rows={2} value={form.description||''} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={{resize:'vertical'}}/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'space-between'}}>
              {editEvt && <button className="btn btn-sm" style={{color:'#cc3333',border:'1px solid #ffcccc',background:'#fff0f0'}} onClick={()=>{deleteEvent(editEvt.id);setShowModal(false)}}>🗑 Delete</button>}
              <div style={{marginLeft:'auto',display:'flex',gap:10}}>
                <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEvent} disabled={saving||!form.title.trim()||!form.start_date}>{saving?'Saving…':'Save Event'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
