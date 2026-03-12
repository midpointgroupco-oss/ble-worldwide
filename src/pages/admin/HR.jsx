import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const AV = ['av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8']

const TABS = [
  { key: 'overview',    label: 'Overview',    icon: '📊' },
  { key: 'timeoff',     label: 'Time Off',    icon: '🏖️' },
  { key: 'onboarding',  label: 'Onboarding',  icon: '✅' },
  { key: 'orgchart',    label: 'Org Chart',   icon: '🏢' },
  { key: 'benefits',    label: 'Benefits',    icon: '💊' },
  { key: 'salary',      label: 'Salary',      icon: '💰' },
]

const LEAVE_TYPES = ['vacation','sick','personal','fmla','bereavement','other']
const LEAVE_BADGE = {
  vacation:    'badge-blue',
  sick:        'badge-red',
  personal:    'badge-green',
  fmla:        'badge-yellow',
  bereavement: 'badge-gray',
  other:       'badge-gray',
}
const STATUS_BADGE = { pending:'badge-yellow', approved:'badge-green', denied:'badge-red' }

// ── MAIN ──────────────────────────────────────────────────────────────────
export default function AdminHR() {
  const [tab, setTab] = useState('overview')
  return (
    <div>
      <div className="page-header fade-up">
        <div>
          <h2>👥 Human Resources</h2>
          <div style={{fontSize:13,color:'var(--muted)'}}>Staff management, time off, benefits and org structure</div>
        </div>
      </div>
      <div style={{display:'flex',gap:2,marginBottom:20,flexWrap:'wrap',borderBottom:'2px solid var(--border)',paddingBottom:0}}>
        {TABS.map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            padding:'9px 18px',border:'none',borderRadius:'8px 8px 0 0',cursor:'pointer',
            fontWeight:700,fontSize:12,whiteSpace:'nowrap',
            background:tab===t.key?'var(--teal)':'transparent',
            color:tab===t.key?'white':'var(--muted)',
            borderBottom:tab===t.key?'2px solid var(--teal)':'2px solid transparent',
            marginBottom:-2,transition:'all .15s',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>
      {tab==='overview'   && <HROverview   onNav={setTab}/>}
      {tab==='timeoff'    && <HRTimeOff/>}
      {tab==='onboarding' && <HROnboarding/>}
      {tab==='orgchart'   && <HROrgChart/>}
      {tab==='benefits'   && <HRBenefits/>}
      {tab==='salary'     && <HRSalary/>}
    </div>
  )
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────
function HROverview({ onNav }) {
  const [stats, setStats] = useState({ staff:0, pending:0, onLeave:0, onboarding:0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [staffRes, pendingRes, leaveRes, onboardRes, recentRes] = await Promise.all([
      supabase.from('profiles').select('id',{count:'exact'}).in('role',['teacher','admin']),
      supabase.from('hr_time_off').select('id',{count:'exact'}).eq('status','pending'),
      supabase.from('hr_time_off').select('id',{count:'exact'}).eq('status','approved').gte('end_date',today),
      supabase.from('hr_onboarding').select('staff_id',{count:'exact'}).eq('completed',false),
      supabase.from('hr_time_off').select('*, staff:profiles!hr_time_off_staff_id_fkey(full_name,role)').eq('status','pending').order('created_at',{ascending:false}).limit(5),
    ])
    setStats({
      staff:    staffRes.count||0,
      pending:  pendingRes.count||0,
      onLeave:  leaveRes.count||0,
      onboarding: onboardRes.count||0,
    })
    setRecent(recentRes.data||[])
    setLoading(false)
  }

  const cards = [
    { icon:'👨‍💼', label:'Total Staff',       value:stats.staff,      color:'var(--teal)',   nav:'orgchart' },
    { icon:'⏳',  label:'Pending Requests',  value:stats.pending,    color:'#f59e0b',      nav:'timeoff'  },
    { icon:'🏖️', label:'Currently on Leave', value:stats.onLeave,    color:'#3b9eff',      nav:'timeoff'  },
    { icon:'📋',  label:'Open Onboarding Tasks', value:stats.onboarding, color:'#a855f7',  nav:'onboarding'},
  ]

  return (
    <div className="fade-up-2">
      <div className="grid-4" style={{gap:12,marginBottom:20}}>
        {cards.map(c => (
          <div key={c.label} className="card" onClick={()=>onNav(c.nav)}
            style={{cursor:'pointer',borderTop:`3px solid ${c.color}`,transition:'transform .15s'}}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
            <div style={{fontSize:28,marginBottom:6}}>{c.icon}</div>
            {loading
              ? <div className="spinner" style={{margin:'8px 0'}}/>
              : <div style={{fontSize:28,fontWeight:900,color:c.color,lineHeight:1}}>{c.value}</div>
            }
            <div style={{fontSize:12,color:'var(--muted)',marginTop:4,fontWeight:600}}>{c.label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">⏳ Pending Time Off Requests</div>
          <button className="btn btn-outline" style={{fontSize:12}} onClick={()=>onNav('timeoff')}>View All</button>
        </div>
        {loading ? <div style={{textAlign:'center',padding:24}}><div className="spinner"/></div>
        : recent.length===0
          ? <div className="empty-state"><div className="es-icon">🏖️</div><div className="es-text">No pending requests</div></div>
          : recent.map(r => (
            <div key={r.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
              <div className={`avatar avatar-sm ${AV[0]}`} style={{flexShrink:0}}>
                {r.staff?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'??'}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{r.staff?.full_name||'Staff'}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>{r.start_date} to {r.end_date} &middot; {r.days_requested} day{r.days_requested!==1?'s':''}</div>
              </div>
              <span className={`badge ${LEAVE_BADGE[r.leave_type]||'badge-gray'}`} style={{textTransform:'capitalize'}}>{r.leave_type}</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ── TIME OFF ──────────────────────────────────────────────────────────────
function HRTimeOff() {
  const [requests, setRequests] = useState([])
  const [balances, setBalances] = useState([])
  const [staff,    setStaff]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('pending')
  const [detail,   setDetail]   = useState(null)
  const [adminNote, setAdminNote] = useState('')
  const [acting,   setActing]   = useState(false)
  const [subTab,   setSubTab]   = useState('requests')

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    const [reqRes, balRes, stRes] = await Promise.all([
      filter==='all'
        ? supabase.from('hr_time_off').select('*, staff:profiles!hr_time_off_staff_id_fkey(full_name,role,avatar_url)').order('created_at',{ascending:false})
        : supabase.from('hr_time_off').select('*, staff:profiles!hr_time_off_staff_id_fkey(full_name,role,avatar_url)').eq('status',filter).order('created_at',{ascending:false}),
      supabase.from('hr_leave_balances').select('*, staff:profiles(full_name)').eq('year', new Date().getFullYear()),
      supabase.from('profiles').select('id,full_name,role').in('role',['teacher','admin']).order('full_name'),
    ])
    setRequests(reqRes.data||[])
    setBalances(balRes.data||[])
    setStaff(stRes.data||[])
    setLoading(false)
  }

  async function act(id, status) {
    setActing(true)
    await supabase.from('hr_time_off').update({ status, admin_notes: adminNote, reviewed_at: new Date().toISOString() }).eq('id', id)
    setActing(false)
    setDetail(null)
    setAdminNote('')
    load()
  }

  const filterBtns = ['pending','approved','denied','all']

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',gap:4,background:'var(--bg)',borderRadius:10,padding:4}}>
          {[{k:'requests',l:'Requests'},{k:'balances',l:'Leave Balances'}].map(b => (
            <button key={b.k} onClick={()=>setSubTab(b.k)} style={{padding:'6px 14px',border:'none',borderRadius:7,cursor:'pointer',fontWeight:700,fontSize:12,background:subTab===b.k?'white':'transparent',color:subTab===b.k?'var(--teal)':'var(--muted)',boxShadow:subTab===b.k?'var(--sh)':'none'}}>{b.l}</button>
          ))}
        </div>
        {subTab==='requests' && (
          <div style={{display:'flex',gap:4,marginLeft:'auto',flexWrap:'wrap'}}>
            {filterBtns.map(f => (
              <button key={f} onClick={()=>setFilter(f)} style={{padding:'6px 14px',border:'none',borderRadius:20,cursor:'pointer',fontWeight:700,fontSize:11,textTransform:'capitalize',background:filter===f?'var(--teal)':'var(--bg)',color:filter===f?'white':'var(--muted)'}}>{f}</button>
            ))}
          </div>
        )}
      </div>

      {subTab==='requests' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {loading ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
          : requests.length===0
            ? <div className="empty-state" style={{padding:40}}><div className="es-icon">🏖️</div><div className="es-text">No {filter} requests</div></div>
            : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{background:'var(--bg)',borderBottom:'2px solid var(--border)'}}>
                    {['Staff','Type','Dates','Days','Reason','Status',''].map(h => (
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:700,fontSize:11,color:'var(--muted)',textTransform:'uppercase'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} style={{borderBottom:'1px solid var(--border)'}}>
                      <td style={{padding:'10px 14px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div className={`avatar avatar-sm ${AV[0]}`}>{r.staff?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'??'}</div>
                          <div style={{fontWeight:700}}>{r.staff?.full_name||'—'}</div>
                        </div>
                      </td>
                      <td style={{padding:'10px 14px'}}><span className={`badge ${LEAVE_BADGE[r.leave_type]||'badge-gray'}`} style={{textTransform:'capitalize'}}>{r.leave_type}</span></td>
                      <td style={{padding:'10px 14px',color:'var(--muted)',fontSize:12}}>{r.start_date}<br/>{r.end_date!==r.start_date && r.end_date}</td>
                      <td style={{padding:'10px 14px',fontWeight:800}}>{r.days_requested}</td>
                      <td style={{padding:'10px 14px',color:'var(--muted)',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.reason||'—'}</td>
                      <td style={{padding:'10px 14px'}}><span className={`badge ${STATUS_BADGE[r.status]||'badge-gray'}`} style={{textTransform:'capitalize'}}>{r.status}</span></td>
                      <td style={{padding:'10px 14px'}}>
                        {r.status==='pending' && (
                          <button className="btn btn-outline" style={{fontSize:11}} onClick={()=>{setDetail(r);setAdminNote('')}}>Review</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}

      {subTab==='balances' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {loading ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
          : balances.length===0
            ? <div className="empty-state" style={{padding:40}}><div className="es-icon">📋</div><div className="es-text">No leave balances on file yet</div></div>
            : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{background:'var(--bg)',borderBottom:'2px solid var(--border)'}}>
                    {['Staff','Vacation Used/Total','Sick Used/Total','Personal Used/Total'].map(h => (
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:700,fontSize:11,color:'var(--muted)',textTransform:'uppercase'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {balances.map(b => (
                    <tr key={b.id} style={{borderBottom:'1px solid var(--border)'}}>
                      <td style={{padding:'10px 14px',fontWeight:700}}>{b.staff?.full_name||'—'}</td>
                      <td style={{padding:'10px 14px'}}><BalanceBar used={b.vacation_used} total={b.vacation_total} color="var(--teal)"/></td>
                      <td style={{padding:'10px 14px'}}><BalanceBar used={b.sick_used} total={b.sick_total} color="#cc3333"/></td>
                      <td style={{padding:'10px 14px'}}><BalanceBar used={b.personal_used} total={b.personal_total} color="#a855f7"/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}

      {detail && (
        <div className="modal-overlay" onClick={()=>setDetail(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
            <div className="modal-header">
              <div className="modal-title">Review Time Off Request</div>
              <button className="modal-close" onClick={()=>setDetail(null)}>&#x2715;</button>
            </div>
            <div style={{padding:'0 0 16px'}}>
              {[
                ['Staff',    detail.staff?.full_name||'—'],
                ['Type',     detail.leave_type],
                ['Dates',    detail.start_date + (detail.end_date!==detail.start_date ? ' to '+detail.end_date : '')],
                ['Days',     detail.days_requested],
                ['Reason',   detail.reason||'—'],
              ].map(([k,v]) => (
                <div key={k} style={{display:'flex',gap:12,padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
                  <span style={{color:'var(--muted)',width:70,flexShrink:0,fontWeight:600}}>{k}</span>
                  <span style={{fontWeight:700,textTransform:k==='Type'?'capitalize':'none'}}>{v}</span>
                </div>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Admin Notes (optional)</label>
              <textarea className="input" rows={2} value={adminNote} onChange={e=>setAdminNote(e.target.value)} placeholder="Add a note for the staff member..."/>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button className="btn btn-outline" onClick={()=>setDetail(null)}>Cancel</button>
              <button className="btn" style={{background:'#cc3333',color:'white'}} onClick={()=>act(detail.id,'denied')} disabled={acting}>Deny</button>
              <button className="btn btn-primary" onClick={()=>act(detail.id,'approved')} disabled={acting}>{acting?'Saving...':'Approve'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BalanceBar({ used, total, color }) {
  const pct = total > 0 ? Math.min(100, Math.round((used/total)*100)) : 0
  return (
    <div>
      <div style={{fontSize:12,fontWeight:700,marginBottom:4}}>{used} / {total} days</div>
      <div style={{background:'#eee',borderRadius:20,height:6,width:120,overflow:'hidden'}}>
        <div style={{height:'100%',borderRadius:20,width:pct+'%',background:color,transition:'width 0.3s'}}/>
      </div>
    </div>
  )
}

// ── ONBOARDING ────────────────────────────────────────────────────────────
const ONBOARD_CATS = ['documents','training','setup','compliance','other']
const CAT_ICON = { documents:'📄', training:'🎓', setup:'💻', compliance:'⚖️', other:'📋' }

function HROnboarding() {
  const [staff,    setStaff]    = useState([])
  const [tasks,    setTasks]    = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [form,     setForm]     = useState({ task:'', category:'documents', due_date:'' })
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { loadStaff() }, [])
  useEffect(() => { if (selected) loadTasks(selected) }, [selected])

  async function loadStaff() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('id,full_name,role').in('role',['teacher','admin']).order('full_name')
    setStaff(data||[])
    setLoading(false)
  }

  async function loadTasks(staffId) {
    const { data } = await supabase.from('hr_onboarding').select('*').eq('staff_id', staffId).order('category').order('created_at')
    setTasks(data||[])
  }

  async function toggleTask(id, completed) {
    await supabase.from('hr_onboarding').update({ completed: !completed, completed_date: !completed ? new Date().toISOString().split('T')[0] : null }).eq('id', id)
    loadTasks(selected)
  }

  async function addTask() {
    if (!form.task.trim() || !selected) return
    setSaving(true)
    await supabase.from('hr_onboarding').insert({ ...form, staff_id: selected })
    setSaving(false)
    setShowAdd(false)
    setForm({ task:'', category:'documents', due_date:'' })
    loadTasks(selected)
  }

  async function deleteTask(id) {
    await supabase.from('hr_onboarding').delete().eq('id', id)
    loadTasks(selected)
  }

  const done  = tasks.filter(t => t.completed).length
  const total = tasks.length
  const pct   = total > 0 ? Math.round((done/total)*100) : 0

  const grouped = ONBOARD_CATS.reduce((acc, cat) => {
    const items = tasks.filter(t => t.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  return (
    <div className="grid-2 fade-up-2" style={{gap:16,alignItems:'start'}}>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:800,fontSize:14}}>Staff Members</div>
        {loading ? <div style={{textAlign:'center',padding:24}}><div className="spinner"/></div>
        : staff.map(s => (
          <div key={s.id} onClick={()=>setSelected(s.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',cursor:'pointer',background:selected===s.id?'rgba(0,201,177,.07)':'white',borderBottom:'1px solid var(--border)',borderLeft:selected===s.id?'3px solid var(--teal)':'3px solid transparent'}}>
            <div className={`avatar avatar-sm ${AV[0]}`}>{s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'??'}</div>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>{s.full_name}</div>
              <div style={{fontSize:11,color:'var(--muted)',textTransform:'capitalize'}}>{s.role}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        {!selected ? (
          <div className="card">
            <div className="empty-state"><div className="es-icon">👈</div><div className="es-text">Select a staff member to view onboarding tasks</div></div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Onboarding Checklist</div>
              <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>setShowAdd(true)}>+ Add Task</button>
            </div>
            {total > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:700,marginBottom:6}}>
                  <span>{done} of {total} complete</span>
                  <span style={{color:'var(--teal)'}}>{pct}%</span>
                </div>
                <div style={{background:'#eee',borderRadius:20,height:8,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:20,width:pct+'%',background:'var(--teal)',transition:'width 0.3s'}}/>
                </div>
              </div>
            )}
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:800,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>{CAT_ICON[cat]} {cat}</div>
                {items.map(t => (
                  <div key={t.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                    <input type="checkbox" checked={t.completed} onChange={()=>toggleTask(t.id, t.completed)} style={{width:16,height:16,accentColor:'var(--teal)',cursor:'pointer'}}/>
                    <div style={{flex:1,textDecoration:t.completed?'line-through':'none',color:t.completed?'var(--muted)':'var(--text)',fontSize:13}}>{t.task}</div>
                    {t.due_date && <span style={{fontSize:11,color:'var(--muted)'}}>{t.due_date}</span>}
                    <button onClick={()=>deleteTask(t.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:14,padding:'0 4px'}}>&#x2715;</button>
                  </div>
                ))}
              </div>
            ))}
            {total===0 && <div className="empty-state"><div className="es-icon">✅</div><div className="es-text">No tasks yet. Add the first one!</div></div>}

            {showAdd && (
              <div style={{marginTop:16,padding:16,background:'var(--bg)',borderRadius:12,border:'1px solid var(--border)'}}>
                <div style={{fontWeight:800,marginBottom:12,fontSize:14}}>New Task</div>
                <div className="form-group">
                  <label className="form-label">Task Description</label>
                  <input className="input" value={form.task} onChange={e=>setForm(p=>({...p,task:e.target.value}))} placeholder="e.g. Submit signed W-4 form"/>
                </div>
                <div className="grid-2" style={{gap:8}}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="input" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                      {ONBOARD_CATS.map(c => <option key={c} value={c} style={{textTransform:'capitalize'}}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input className="input" type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))}/>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                  <button className="btn btn-outline" onClick={()=>setShowAdd(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={addTask} disabled={saving||!form.task.trim()}>{saving?'Saving...':'Add Task'}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ORG CHART ─────────────────────────────────────────────────────────────
function HROrgChart() {
  const [depts,    setDepts]    = useState([])
  const [staff,    setStaff]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [editDept, setEditDept] = useState(null)
  const [form,     setForm]     = useState({ name:'', description:'', head_id:'' })
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [deptRes, staffRes] = await Promise.all([
      supabase.from('hr_departments').select('*, head:profiles(full_name,role)').order('name'),
      supabase.from('profiles').select('id,full_name,role,department').in('role',['teacher','admin']).order('full_name'),
    ])
    setDepts(deptRes.data||[])
    setStaff(staffRes.data||[])
    setLoading(false)
  }

  async function saveDept() {
    setSaving(true)
    if (editDept) {
      await supabase.from('hr_departments').update({ name:form.name, description:form.description, head_id:form.head_id||null }).eq('id', editDept.id)
    } else {
      await supabase.from('hr_departments').insert({ name:form.name, description:form.description, head_id:form.head_id||null })
    }
    setSaving(false)
    setShowAdd(false)
    setEditDept(null)
    setForm({ name:'', description:'', head_id:'' })
    load()
  }

  async function deleteDept(id) {
    if (!window.confirm('Delete this department?')) return
    await supabase.from('hr_departments').delete().eq('id', id)
    load()
  }

  async function assignDept(staffId, deptName) {
    await supabase.from('profiles').update({ department: deptName||null }).eq('id', staffId)
    load()
  }

  function openEdit(dept) {
    setEditDept(dept)
    setForm({ name:dept.name, description:dept.description||'', head_id:dept.head_id||'' })
    setShowAdd(true)
  }

  const unassigned = staff.filter(s => !s.department || !depts.find(d => d.name===s.department))

  return (
    <div className="fade-up-2">
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
        <button className="btn btn-primary" onClick={()=>{setShowAdd(true);setEditDept(null);setForm({name:'',description:'',head_id:''})}}>+ New Department</button>
      </div>

      {loading ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
      : (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16,marginBottom:16}}>
            {depts.map(dept => {
              const members = staff.filter(s => s.department===dept.name)
              return (
                <div key={dept.id} className="card" style={{borderTop:'3px solid var(--teal)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <div>
                      <div style={{fontWeight:900,fontSize:15}}>{dept.name}</div>
                      {dept.head && <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>Head: {dept.head.full_name}</div>}
                    </div>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>openEdit(dept)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:14}}>✏️</button>
                      <button onClick={()=>deleteDept(dept.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:14}}>🗑️</button>
                    </div>
                  </div>
                  {dept.description && <div style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>{dept.description}</div>}
                  <div style={{fontSize:11,fontWeight:800,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Members ({members.length})</div>
                  {members.length===0
                    ? <div style={{fontSize:12,color:'var(--muted)',fontStyle:'italic'}}>No members assigned</div>
                    : members.map(m => (
                      <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                        <div className={`avatar avatar-sm ${AV[0]}`} style={{width:26,height:26,fontSize:10}}>{m.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'??'}</div>
                        <span style={{fontSize:13,fontWeight:600}}>{m.full_name}</span>
                        <button onClick={()=>assignDept(m.id,'')} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:11}}>remove</button>
                      </div>
                    ))
                  }
                  <select className="input" style={{marginTop:8,fontSize:12}} onChange={e=>{if(e.target.value)assignDept(e.target.value,dept.name);e.target.value=''}} defaultValue="">
                    <option value="">+ Add member...</option>
                    {unassigned.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    {staff.filter(s=>s.department&&s.department!==dept.name).map(u => <option key={u.id} value={u.id}>{u.full_name} (move)</option>)}
                  </select>
                </div>
              )
            })}
          </div>

          {unassigned.length > 0 && (
            <div className="card">
              <div className="card-title" style={{marginBottom:12}}>⚠️ Unassigned Staff ({unassigned.length})</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {unassigned.map(u => (
                  <div key={u.id} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:'var(--bg)',borderRadius:20,fontSize:12,fontWeight:600}}>
                    {u.full_name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={()=>{setShowAdd(false);setEditDept(null)}}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:400}}>
            <div className="modal-header">
              <div className="modal-title">{editDept?'Edit Department':'New Department'}</div>
              <button className="modal-close" onClick={()=>{setShowAdd(false);setEditDept(null)}}>&#x2715;</button>
            </div>
            <div className="form-group">
              <label className="form-label">Department Name</label>
              <input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Mathematics"/>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="input" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Optional"/>
            </div>
            <div className="form-group">
              <label className="form-label">Department Head</label>
              <select className="input" value={form.head_id} onChange={e=>setForm(p=>({...p,head_id:e.target.value}))}>
                <option value="">Select head (optional)</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button className="btn btn-outline" onClick={()=>{setShowAdd(false);setEditDept(null)}}>Cancel</button>
              <button className="btn btn-primary" onClick={saveDept} disabled={saving||!form.name.trim()}>{saving?'Saving...':'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── BENEFITS ──────────────────────────────────────────────────────────────
const BENEFIT_TYPES = ['health','dental','vision','retirement','life','disability','other']
const BENEFIT_ICON  = { health:'🏥', dental:'🦷', vision:'👁️', retirement:'💰', life:'🛡️', disability:'♿', other:'📋' }

function HRBenefits() {
  const [staff,    setStaff]    = useState([])
  const [benefits, setBenefits] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [form,     setForm]     = useState({ benefit_type:'health', plan_name:'', provider:'', enrollment_date:'', employee_contribution:'', employer_contribution:'', notes:'' })
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { loadStaff() }, [])
  useEffect(() => { if (selected) loadBenefits(selected) }, [selected])

  async function loadStaff() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('id,full_name,role').in('role',['teacher','admin']).order('full_name')
    setStaff(data||[])
    setLoading(false)
  }

  async function loadBenefits(staffId) {
    const { data } = await supabase.from('hr_benefits').select('*').eq('staff_id', staffId).order('benefit_type')
    setBenefits(data||[])
  }

  async function addBenefit() {
    setSaving(true)
    await supabase.from('hr_benefits').insert({ ...form, staff_id: selected, employee_contribution: form.employee_contribution||null, employer_contribution: form.employer_contribution||null })
    setSaving(false)
    setShowAdd(false)
    setForm({ benefit_type:'health', plan_name:'', provider:'', enrollment_date:'', employee_contribution:'', employer_contribution:'', notes:'' })
    loadBenefits(selected)
  }

  async function deleteBenefit(id) {
    await supabase.from('hr_benefits').delete().eq('id', id)
    loadBenefits(selected)
  }

  return (
    <div className="grid-2 fade-up-2" style={{gap:16,alignItems:'start'}}>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:800,fontSize:14}}>Staff Members</div>
        {loading ? <div style={{textAlign:'center',padding:24}}><div className="spinner"/></div>
        : staff.map(s => (
          <div key={s.id} onClick={()=>setSelected(s.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',cursor:'pointer',background:selected===s.id?'rgba(0,201,177,.07)':'white',borderBottom:'1px solid var(--border)',borderLeft:selected===s.id?'3px solid var(--teal)':'3px solid transparent'}}>
            <div className={`avatar avatar-sm ${AV[0]}`}>{s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'??'}</div>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>{s.full_name}</div>
              <div style={{fontSize:11,color:'var(--muted)',textTransform:'capitalize'}}>{s.role}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        {!selected ? (
          <div className="card">
            <div className="empty-state"><div className="es-icon">👈</div><div className="es-text">Select a staff member to view benefits</div></div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Benefits Enrollment</div>
              <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>setShowAdd(true)}>+ Add Benefit</button>
            </div>
            {benefits.length===0
              ? <div className="empty-state"><div className="es-icon">💊</div><div className="es-text">No benefits on file</div></div>
              : benefits.map(b => (
                <div key={b.id} style={{padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                    <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                      <span style={{fontSize:20}}>{BENEFIT_ICON[b.benefit_type]||'📋'}</span>
                      <div>
                        <div style={{fontWeight:700,fontSize:13,textTransform:'capitalize'}}>{b.benefit_type} {b.plan_name ? '— '+b.plan_name : ''}</div>
                        {b.provider && <div style={{fontSize:12,color:'var(--muted)'}}>Provider: {b.provider}</div>}
                        <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                          {b.enrollment_date && 'Since '+b.enrollment_date}
                          {b.employee_contribution!=null && ' | Employee: $'+Number(b.employee_contribution).toFixed(2)+'/mo'}
                          {b.employer_contribution!=null && ' | Employer: $'+Number(b.employer_contribution).toFixed(2)+'/mo'}
                        </div>
                        {b.notes && <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{b.notes}</div>}
                      </div>
                    </div>
                    <button onClick={()=>deleteBenefit(b.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:14}}>🗑️</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={()=>setShowAdd(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
            <div className="modal-header">
              <div className="modal-title">Add Benefit</div>
              <button className="modal-close" onClick={()=>setShowAdd(false)}>&#x2715;</button>
            </div>
            <div className="grid-2" style={{gap:8}}>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="input" value={form.benefit_type} onChange={e=>setForm(p=>({...p,benefit_type:e.target.value}))}>
                  {BENEFIT_TYPES.map(t=><option key={t} value={t} style={{textTransform:'capitalize'}}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Plan Name</label>
                <input className="input" value={form.plan_name} onChange={e=>setForm(p=>({...p,plan_name:e.target.value}))} placeholder="e.g. Blue Cross PPO"/>
              </div>
              <div className="form-group">
                <label className="form-label">Provider</label>
                <input className="input" value={form.provider} onChange={e=>setForm(p=>({...p,provider:e.target.value}))} placeholder="Insurance company"/>
              </div>
              <div className="form-group">
                <label className="form-label">Enrollment Date</label>
                <input className="input" type="date" value={form.enrollment_date} onChange={e=>setForm(p=>({...p,enrollment_date:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Employee Contribution/mo</label>
                <input className="input" type="number" step="0.01" value={form.employee_contribution} onChange={e=>setForm(p=>({...p,employee_contribution:e.target.value}))} placeholder="0.00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Employer Contribution/mo</label>
                <input className="input" type="number" step="0.01" value={form.employer_contribution} onChange={e=>setForm(p=>({...p,employer_contribution:e.target.value}))} placeholder="0.00"/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="input" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Optional notes"/>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button className="btn btn-outline" onClick={()=>setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addBenefit} disabled={saving}>{saving?'Saving...':'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SALARY ────────────────────────────────────────────────────────────────
const SALARY_REASONS  = ['hire','merit','promotion','cola','adjustment','other']
const PAY_FREQS       = ['weekly','biweekly','semimonthly','monthly','annual']

function HRSalary() {
  const [staff,    setStaff]    = useState([])
  const [history,  setHistory]  = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [form,     setForm]     = useState({ effective_date:'', salary_type:'annual', amount:'', pay_frequency:'biweekly', reason:'hire', notes:'' })
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { loadStaff() }, [])
  useEffect(() => { if (selected) loadHistory(selected) }, [selected])

  async function loadStaff() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('id,full_name,role').in('role',['teacher','admin']).order('full_name')
    setStaff(data||[])
    setLoading(false)
  }

  async function loadHistory(staffId) {
    const { data } = await supabase.from('hr_salary').select('*').eq('staff_id', staffId).order('effective_date',{ascending:false})
    setHistory(data||[])
  }

  async function addRecord() {
    if (!form.effective_date || !form.amount) return
    setSaving(true)
    await supabase.from('hr_salary').insert({ ...form, staff_id: selected, amount: Number(form.amount) })
    setSaving(false)
    setShowAdd(false)
    setForm({ effective_date:'', salary_type:'annual', amount:'', pay_frequency:'biweekly', reason:'hire', notes:'' })
    loadHistory(selected)
  }

  async function deleteRecord(id) {
    await supabase.from('hr_salary').delete().eq('id', id)
    loadHistory(selected)
  }

  const current = history[0]

  return (
    <div className="grid-2 fade-up-2" style={{gap:16,alignItems:'start'}}>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:800,fontSize:14}}>Staff Members</div>
        {loading ? <div style={{textAlign:'center',padding:24}}><div className="spinner"/></div>
        : staff.map(s => (
          <div key={s.id} onClick={()=>setSelected(s.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',cursor:'pointer',background:selected===s.id?'rgba(0,201,177,.07)':'white',borderBottom:'1px solid var(--border)',borderLeft:selected===s.id?'3px solid var(--teal)':'3px solid transparent'}}>
            <div className={`avatar avatar-sm ${AV[0]}`}>{s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'??'}</div>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>{s.full_name}</div>
              <div style={{fontSize:11,color:'var(--muted)',textTransform:'capitalize'}}>{s.role}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        {!selected ? (
          <div className="card">
            <div className="empty-state"><div className="es-icon">👈</div><div className="es-text">Select a staff member to view salary history</div></div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <div className="card-title">💰 Salary History</div>
              <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>setShowAdd(true)}>+ Add Record</button>
            </div>
            {current && (
              <div style={{padding:'12px 16px',background:'rgba(0,201,177,.07)',borderRadius:10,marginBottom:16,border:'1px solid rgba(0,201,177,.2)'}}>
                <div style={{fontSize:11,fontWeight:800,color:'var(--teal)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Current</div>
                <div style={{fontSize:24,fontWeight:900,color:'var(--teal)'}}>${Number(current.amount).toLocaleString()}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:2,textTransform:'capitalize'}}>{current.salary_type} &middot; {current.pay_frequency} &middot; as of {current.effective_date}</div>
              </div>
            )}
            {history.length===0
              ? <div className="empty-state"><div className="es-icon">💰</div><div className="es-text">No salary records on file</div></div>
              : history.map((h, idx) => (
                <div key={h.id} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:idx===0?'var(--teal)':'#ccc',marginTop:4,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:14}}>${Number(h.amount).toLocaleString()}</div>
                    <div style={{fontSize:12,color:'var(--muted)',textTransform:'capitalize'}}>{h.salary_type} &middot; {h.pay_frequency} &middot; {h.effective_date}</div>
                    {h.reason && <div style={{fontSize:11,color:'var(--muted)',marginTop:2,textTransform:'capitalize'}}>Reason: {h.reason}</div>}
                    {h.notes  && <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{h.notes}</div>}
                  </div>
                  {idx > 0 && history[idx-1] && (
                    <div style={{fontSize:11,fontWeight:700,color:Number(h.amount)<Number(history[idx-1]?.amount)?'#cc3333':'var(--teal)'}}>
                      {Number(h.amount)<Number(history[idx-1]?.amount)?'▼':'▲'} ${Math.abs(Number(history[idx-1]?.amount)-Number(h.amount)).toLocaleString()}
                    </div>
                  )}
                  <button onClick={()=>deleteRecord(h.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:14}}>🗑️</button>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={()=>setShowAdd(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:440}}>
            <div className="modal-header">
              <div className="modal-title">Add Salary Record</div>
              <button className="modal-close" onClick={()=>setShowAdd(false)}>&#x2715;</button>
            </div>
            <div className="grid-2" style={{gap:8}}>
              <div className="form-group">
                <label className="form-label">Effective Date</label>
                <input className="input" type="date" value={form.effective_date} onChange={e=>setForm(p=>({...p,effective_date:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input className="input" type="number" step="0.01" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} placeholder="50000.00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Salary Type</label>
                <select className="input" value={form.salary_type} onChange={e=>setForm(p=>({...p,salary_type:e.target.value}))}>
                  <option value="annual">Annual</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Pay Frequency</label>
                <select className="input" value={form.pay_frequency} onChange={e=>setForm(p=>({...p,pay_frequency:e.target.value}))}>
                  {PAY_FREQS.map(f=><option key={f} value={f} style={{textTransform:'capitalize'}}>{f}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <select className="input" value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))}>
                  {SALARY_REASONS.map(r=><option key={r} value={r} style={{textTransform:'capitalize'}}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="input" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Optional notes"/>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button className="btn btn-outline" onClick={()=>setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addRecord} disabled={saving||!form.effective_date||!form.amount}>{saving?'Saving...':'Add Record'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
