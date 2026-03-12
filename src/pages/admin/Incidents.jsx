import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const INCIDENT_TYPES = ['Physical Altercation','Verbal Altercation','Bullying','Harassment','Disruptive Behavior','Insubordination','Vandalism','Theft','Cheating/Academic Dishonesty','Dress Code Violation','Technology Misuse','Substance Related','Truancy','Threat','Other']
const SEVERITY = { low:{ label:'Low', color:'#00804a', bg:'#e6fff4' }, medium:{ label:'Medium', color:'#e67e22', bg:'#fff3e0' }, high:{ label:'High', color:'#cc3333', bg:'#fff0f0' }, critical:{ label:'Critical', color:'#7b0000', bg:'#ffe0e0' } }
const CONSEQUENCES = ['Verbal Warning','Written Warning','Parent Contact','Detention','In-School Suspension','Out-of-School Suspension','Expulsion','Community Service','Counseling Referral','Restorative Conference','No Action Taken','Other']
const STATUS_META = { open:{ label:'Open', color:'#cc3333', bg:'#fff0f0' }, under_review:{ label:'Under Review', color:'#e67e22', bg:'#fff3e0' }, resolved:{ label:'Resolved', color:'#00804a', bg:'#e6fff4' }, closed:{ label:'Closed', color:'#777', bg:'#f5f5f5' } }

export default function AdminIncidents() {
  const { profile } = useAuth()
  const [incidents,  setIncidents]  = useState([])
  const [students,   setStudents]   = useState([])
  const [staff,      setStaff]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [viewItem,   setViewItem]   = useState(null)
  const [editItem,   setEditItem]   = useState(null)
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [search,         setSearch]         = useState('')
  const [toast,          setToast]          = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [form, setForm] = useState({
    student_id:'', reported_by:'', incident_date: new Date().toISOString().slice(0,16),
    incident_type:'Disruptive Behavior', severity:'low', location:'', description:'',
    witnesses:'', consequence:'Verbal Warning', parent_notified:false, parent_notified_date:'',
    follow_up:'', status:'open',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: inc }, { data: stu }, { data: stf }] = await Promise.all([
      supabase.from('incidents').select('*, student:students(id,full_name,grade_level), reporter:profiles!reported_by(full_name)').order('incident_date',{ascending:false}),
      supabase.from('students').select('id,full_name,grade_level').eq('status','active').order('full_name'),
      supabase.from('profiles').select('id,full_name').in('role',['teacher','admin']).order('full_name'),
    ])
    setIncidents(inc||[]); setStudents(stu||[]); setStaff(stf||[])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  function openNew() {
    setEditItem(null)
    setForm({ student_id:'', reported_by:profile.id, incident_date:new Date().toISOString().slice(0,16), incident_type:'Disruptive Behavior', severity:'low', location:'', description:'', witnesses:'', consequence:'Verbal Warning', parent_notified:false, parent_notified_date:'', follow_up:'', status:'open' })
    setShowModal(true)
  }

  function openEdit(inc) { setEditItem(inc); setForm({...inc, incident_date:inc.incident_date?.slice(0,16)||''}); setShowModal(true) }

  async function saveIncident() {
    if (!form.student_id || !form.description.trim()) return
    setSaving(true)
    const payload = { ...form }
    if (editItem) await supabase.from('incidents').update(payload).eq('id', editItem.id)
    else          await supabase.from('incidents').insert([payload])
    setSaving(false); setShowModal(false)
    loadAll(); showToast(editItem?'Incident updated':'Incident logged')
  }

  const filtered = incidents.filter(inc => {
    const matchStatus   = !filterStatus   || inc.status === filterStatus
    const matchSeverity = !filterSeverity || inc.severity === filterSeverity
    const matchSearch   = !search || inc.student?.full_name?.toLowerCase().includes(search.toLowerCase()) || inc.incident_type?.toLowerCase().includes(search.toLowerCase()) || inc.description?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSeverity && matchSearch
  })

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}

      <div className="page-header fade-up">
        <div><h2>🚨 Incident Log</h2><div style={{fontSize:13,color:'var(--muted)'}}>{incidents.length} incidents on record</div></div>
        <button className="btn btn-primary" onClick={openNew}>+ Log Incident</button>
      </div>

      <div className="grid-4 fade-up-2" style={{marginBottom:16}}>
        {[
          { label:'Total',     value:incidents.length,                                        icon:'🚨', cls:'sc-teal'   },
          { label:'Open',      value:incidents.filter(i=>i.status==='open').length,            icon:'🔴', cls:'sc-coral'  },
          { label:'High/Crit', value:incidents.filter(i=>['high','critical'].includes(i.severity)).length, icon:'⚠️', cls:'sc-violet' },
          { label:'Resolved',  value:incidents.filter(i=>i.status==='resolved').length,        icon:'✅', cls:'sc-gold'   },
        ].map(s=>(
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-row fade-up-3">
        <select className="input" style={{width:160}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input" style={{width:160}} value={filterSeverity} onChange={e=>setFilterSeverity(e.target.value)}>
          <option value="">All Severity</option>
          {Object.entries(SEVERITY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <input className="input" style={{marginLeft:'auto',width:220}} placeholder="🔍 Search student, type…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div className="card fade-up-4" style={{padding:0,overflow:'hidden'}}>
        {loading ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
        : filtered.length===0 ? <div className="empty-state"><div className="es-icon">🚨</div><div className="es-text">No incidents found.</div></div>
        : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Type</th>
                <th>Date</th>
                <th>Severity</th>
                <th>Consequence</th>
                <th>Parent Notified</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inc=>{
                const sev = SEVERITY[inc.severity]||SEVERITY.low
                const sm  = STATUS_META[inc.status]||STATUS_META.open
                return (
                  <tr key={inc.id}>
                    <td>
                      <div style={{fontWeight:700,fontSize:13}}>{inc.student?.full_name||'—'}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{inc.student?.grade_level||''}</div>
                    </td>
                    <td style={{fontSize:12}}>{inc.incident_type}</td>
                    <td style={{fontSize:12}}>{inc.incident_date?new Date(inc.incident_date).toLocaleDateString():'—'}</td>
                    <td><span style={{background:sev.bg,color:sev.color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{sev.label}</span></td>
                    <td style={{fontSize:11}}>{inc.consequence||'—'}</td>
                    <td style={{fontSize:11}}>{inc.parent_notified?<span style={{color:'#00804a',fontWeight:700}}>Yes</span>:<span style={{color:'#cc3333'}}>No</span>}</td>
                    <td><span style={{background:sm.bg,color:sm.color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{sm.label}</span></td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-outline btn-sm" onClick={()=>setViewItem(inc)}>View</button>
                        <button className="btn btn-outline btn-sm" onClick={()=>openEdit(inc)}>Edit</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}>
            <div className="modal-header">
              <div className="modal-title">{editItem?'Edit Incident':'Log New Incident'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="input-label">Student *</label>
                <select className="input" value={form.student_id} onChange={e=>setForm(p=>({...p,student_id:e.target.value}))}>
                  <option value="">Select student</option>
                  {students.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.grade_level})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Date and Time *</label>
                <input className="input" type="datetime-local" value={form.incident_date} onChange={e=>setForm(p=>({...p,incident_date:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="input-label">Incident Type</label>
                <select className="input" value={form.incident_type} onChange={e=>setForm(p=>({...p,incident_type:e.target.value}))}>
                  {INCIDENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Severity</label>
                <select className="input" value={form.severity} onChange={e=>setForm(p=>({...p,severity:e.target.value}))}>
                  {Object.entries(SEVERITY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Location</label>
                <input className="input" value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="Classroom, hallway, cafeteria…"/>
              </div>
              <div className="form-group">
                <label className="input-label">Reported By</label>
                <select className="input" value={form.reported_by} onChange={e=>setForm(p=>({...p,reported_by:e.target.value}))}>
                  <option value="">Select staff</option>
                  {staff.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="input-label">Description *</label>
              <textarea className="input" rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={{resize:'vertical'}} placeholder="Detailed description of the incident…"/>
            </div>
            <div className="form-group">
              <label className="input-label">Witnesses</label>
              <input className="input" value={form.witnesses} onChange={e=>setForm(p=>({...p,witnesses:e.target.value}))} placeholder="Names of any witnesses…"/>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="input-label">Consequence</label>
                <select className="input" value={form.consequence} onChange={e=>setForm(p=>({...p,consequence:e.target.value}))}>
                  {CONSEQUENCES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Status</label>
                <select className="input" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  {Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,padding:'10px 14px',background:'var(--bg)',borderRadius:10}}>
              <input type="checkbox" id="pn" checked={form.parent_notified} onChange={e=>setForm(p=>({...p,parent_notified:e.target.checked}))}/>
              <label htmlFor="pn" style={{fontSize:13,fontWeight:600,flex:1}}>Parent/Guardian Notified</label>
              {form.parent_notified&&<input className="input" type="date" value={form.parent_notified_date} onChange={e=>setForm(p=>({...p,parent_notified_date:e.target.value}))} style={{width:160}}/>}
            </div>
            <div className="form-group">
              <label className="input-label">Follow-up Notes</label>
              <textarea className="input" rows={2} value={form.follow_up} onChange={e=>setForm(p=>({...p,follow_up:e.target.value}))} style={{resize:'vertical'}} placeholder="Any follow-up actions or notes…"/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveIncident} disabled={saving||!form.student_id||!form.description.trim()}>
                {saving?'Saving…':'Save Incident'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="modal-overlay" onClick={()=>setViewItem(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
            <div className="modal-header">
              <div className="modal-title">Incident — {viewItem.student?.full_name}</div>
              <button className="modal-close" onClick={()=>setViewItem(null)}>✕</button>
            </div>
            {[
              ['Type',         viewItem.incident_type],
              ['Date',         viewItem.incident_date?new Date(viewItem.incident_date).toLocaleString():'—'],
              ['Location',     viewItem.location||'—'],
              ['Severity',     SEVERITY[viewItem.severity]?.label||'—'],
              ['Consequence',  viewItem.consequence||'—'],
              ['Reported By',  viewItem.reporter?.full_name||'—'],
              ['Witnesses',    viewItem.witnesses||'—'],
              ['Parent Notified', viewItem.parent_notified?('Yes'+(viewItem.parent_notified_date?' on '+new Date(viewItem.parent_notified_date).toLocaleDateString():'')):  'No'],
            ].map(([l,v])=>(
              <div key={l} style={{display:'flex',gap:10,marginBottom:8,fontSize:13}}>
                <span style={{fontWeight:700,minWidth:130,color:'var(--muted)'}}>{l}</span>
                <span>{v}</span>
              </div>
            ))}
            {viewItem.description&&<div style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px',fontSize:13,marginTop:8,lineHeight:1.6}}>{viewItem.description}</div>}
            {viewItem.follow_up&&<div style={{marginTop:10}}><div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:4}}>FOLLOW-UP</div><div style={{fontSize:13,lineHeight:1.6}}>{viewItem.follow_up}</div></div>}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:16}}>
              <button className="btn btn-outline" onClick={()=>setViewItem(null)}>Close</button>
              <button className="btn btn-primary" onClick={()=>{setViewItem(null);openEdit(viewItem)}}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
