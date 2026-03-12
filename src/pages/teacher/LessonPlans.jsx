import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const PLAN_STATUS = { draft:{ label:'Draft', color:'#777', bg:'#f5f5f5' }, published:{ label:'Published', color:'#2D8CFF', bg:'#e8f3ff' }, archived:{ label:'Archived', color:'#bbb', bg:'#f0f0f0' } }
const OBJECTIVES_HINT = 'e.g. Students will be able to identify key themes in the text'

export default function TeacherLessonPlans() {
  const { profile } = useAuth()
  const [plans,      setPlans]      = useState([])
  const [courses,    setCourses]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [viewItem,   setViewItem]   = useState(null)
  const [editItem,   setEditItem]   = useState(null)
  const [filterCourse, setFilterCourse] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search,       setSearch]       = useState('')
  const [toast,        setToast]        = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [form, setForm] = useState({
    course_id:'', title:'', lesson_date:'', duration_min:45, status:'draft',
    objectives:'', materials:'', warm_up:'', instruction:'', guided_practice:'',
    independent_practice:'', closure:'', assessment:'', differentiation:'', notes:'',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: pl }, { data: co }] = await Promise.all([
      supabase.from('lesson_plans').select('*, course:courses(id,name,grade_level)').eq('teacher_id', profile.id).order('lesson_date',{ascending:false}),
      supabase.from('courses').select('id,name,grade_level').eq('teacher_id', profile.id).order('name'),
    ])
    setPlans(pl||[]); setCourses(co||[])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  function openNew() {
    setEditItem(null)
    setForm({ course_id:'', title:'', lesson_date:'', duration_min:45, status:'draft', objectives:'', materials:'', warm_up:'', instruction:'', guided_practice:'', independent_practice:'', closure:'', assessment:'', differentiation:'', notes:'' })
    setShowModal(true)
  }

  function openEdit(p) { setEditItem(p); setForm({...p, lesson_date:p.lesson_date?.slice(0,10)||''}); setShowModal(true) }

  async function savePlan(status) {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = { ...form, status: status||form.status, teacher_id: profile.id }
    if (editItem) await supabase.from('lesson_plans').update(payload).eq('id', editItem.id)
    else          await supabase.from('lesson_plans').insert([payload])
    setSaving(false); setShowModal(false)
    loadAll(); showToast(editItem?'Lesson plan updated':'Lesson plan saved')
  }

  async function deletePlan(id) {
    if (!confirm('Delete this lesson plan?')) return
    await supabase.from('lesson_plans').delete().eq('id', id)
    loadAll(); showToast('Deleted')
  }

  const filtered = plans.filter(p => {
    const matchCourse = !filterCourse || p.course_id === filterCourse
    const matchStatus = !filterStatus || p.status === filterStatus
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.course?.name?.toLowerCase().includes(search.toLowerCase())
    return matchCourse && matchStatus && matchSearch
  })

  function Section({ label, field, rows=3, hint='' }) {
    return (
      <div className="form-group">
        <label className="input-label">{label}</label>
        <textarea className="input" rows={rows} value={form[field]||''} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))} style={{resize:'vertical'}} placeholder={hint}/>
      </div>
    )
  }

  function ViewSection({ label, value, color='var(--muted)' }) {
    if (!value) return null
    return (
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:1,color,marginBottom:4}}>{label.toUpperCase()}</div>
        <div style={{fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{value}</div>
      </div>
    )
  }

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}

      <div className="page-header fade-up">
        <div><h2>📖 Lesson Plans</h2><div style={{fontSize:13,color:'var(--muted)'}}>{plans.length} plans created</div></div>
        <button className="btn btn-primary" onClick={openNew}>+ New Lesson Plan</button>
      </div>

      <div className="grid-4 fade-up-2" style={{marginBottom:16}}>
        {[
          { label:'Total',     value:plans.length,                                         icon:'📖', cls:'sc-teal'   },
          { label:'Drafts',    value:plans.filter(p=>p.status==='draft').length,            icon:'✏️',  cls:'sc-violet' },
          { label:'Published', value:plans.filter(p=>p.status==='published').length,        icon:'📤', cls:'sc-coral'  },
          { label:'This Week', value:plans.filter(p=>{ const d=new Date(p.lesson_date); const n=new Date(); return Math.abs(d-n)<7*86400000 }).length, icon:'📅', cls:'sc-gold' },
        ].map(s=>(
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-row fade-up-3">
        <select className="input" style={{width:200}} value={filterCourse} onChange={e=>setFilterCourse(e.target.value)}>
          <option value="">All Courses</option>
          {courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" style={{width:160}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {Object.entries(PLAN_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <input className="input" style={{marginLeft:'auto',width:220}} placeholder="🔍 Search plans…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"/></div>
      : filtered.length===0 ? (
        <div className="card"><div className="empty-state"><div className="es-icon">📖</div><div className="es-text">No lesson plans yet. Create your first one!</div></div></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}} className="fade-up-4">
          {filtered.map(plan=>{
            const sm = PLAN_STATUS[plan.status]||PLAN_STATUS.draft
            return (
              <div key={plan.id} className="card" style={{padding:0,overflow:'hidden'}}>
                <div style={{padding:'14px 16px',borderBottom:'1px solid var(--bg)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div style={{fontWeight:700,fontSize:14,flex:1,marginRight:8}}>{plan.title}</div>
                    <span style={{background:sm.bg,color:sm.color,padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,whiteSpace:'nowrap'}}>{sm.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{plan.course?.name||'No course'} • {plan.lesson_date?new Date(plan.lesson_date).toLocaleDateString():'No date'}</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>{plan.duration_min} min</div>
                </div>
                {plan.objectives && (
                  <div style={{padding:'10px 16px',fontSize:12,color:'#444',lineHeight:1.5,borderBottom:'1px solid var(--bg)'}}>
                    {plan.objectives.slice(0,120)}{plan.objectives.length>120?'…':''}
                  </div>
                )}
                <div style={{padding:'10px 16px',display:'flex',gap:8}}>
                  <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={()=>setViewItem(plan)}>View</button>
                  <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={()=>openEdit(plan)}>Edit</button>
                  <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc'}} onClick={()=>deletePlan(plan.id)}>Del</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:620,maxHeight:'90vh',overflowY:'auto'}}>
            <div className="modal-header" style={{position:'sticky',top:0,background:'white',zIndex:10}}>
              <div className="modal-title">{editItem?'Edit Lesson Plan':'New Lesson Plan'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="grid-2">
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="input-label">Title *</label>
                <input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Introduction to Fractions"/>
              </div>
              <div className="form-group">
                <label className="input-label">Course</label>
                <select className="input" value={form.course_id} onChange={e=>setForm(p=>({...p,course_id:e.target.value}))}>
                  <option value="">No specific course</option>
                  {courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Lesson Date</label>
                <input className="input" type="date" value={form.lesson_date} onChange={e=>setForm(p=>({...p,lesson_date:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="input-label">Duration (minutes)</label>
                <input className="input" type="number" value={form.duration_min} onChange={e=>setForm(p=>({...p,duration_min:e.target.value}))} min={5} max={300}/>
              </div>
              <div className="form-group">
                <label className="input-label">Status</label>
                <select className="input" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  {Object.entries(PLAN_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            <Section label="Learning Objectives" field="objectives" rows={2} hint={OBJECTIVES_HINT}/>
            <Section label="Materials Needed" field="materials" rows={2} hint="Textbooks, worksheets, manipulatives…"/>
            <Section label="Warm-Up / Hook" field="warm_up" rows={2} hint="Opening activity to engage students…"/>
            <Section label="Direct Instruction" field="instruction" rows={3} hint="Core lesson content and delivery…"/>
            <Section label="Guided Practice" field="guided_practice" rows={2} hint="Teacher-led practice activities…"/>
            <Section label="Independent Practice" field="independent_practice" rows={2} hint="Student independent work…"/>
            <Section label="Closure / Summary" field="closure" rows={2} hint="Wrap-up and key takeaways…"/>
            <Section label="Assessment" field="assessment" rows={2} hint="How you will assess understanding…"/>
            <Section label="Differentiation" field="differentiation" rows={2} hint="Modifications for different learners…"/>
            <Section label="Notes" field="notes" rows={2}/>

            <div style={{display:'flex',gap:10,justifyContent:'flex-end',position:'sticky',bottom:0,background:'white',paddingTop:12}}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-outline" onClick={()=>savePlan('draft')} disabled={saving||!form.title.trim()}>Save Draft</button>
              <button className="btn btn-primary" onClick={()=>savePlan('published')} disabled={saving||!form.title.trim()}>
                {saving?'Saving…':'Publish Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="modal-overlay" onClick={()=>setViewItem(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:580,maxHeight:'90vh',overflowY:'auto'}}>
            <div className="modal-header" style={{position:'sticky',top:0,background:'white',zIndex:10}}>
              <div className="modal-title">{viewItem.title}</div>
              <button className="modal-close" onClick={()=>setViewItem(null)}>✕</button>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16,fontSize:12}}>
              <span style={{background:'var(--bg)',padding:'4px 10px',borderRadius:20}}>{viewItem.course?.name||'No course'}</span>
              <span style={{background:'var(--bg)',padding:'4px 10px',borderRadius:20}}>{viewItem.lesson_date?new Date(viewItem.lesson_date).toLocaleDateString():'No date'}</span>
              <span style={{background:'var(--bg)',padding:'4px 10px',borderRadius:20}}>{viewItem.duration_min} min</span>
              <span style={{background:PLAN_STATUS[viewItem.status]?.bg,color:PLAN_STATUS[viewItem.status]?.color,padding:'4px 10px',borderRadius:20,fontWeight:700}}>{PLAN_STATUS[viewItem.status]?.label}</span>
            </div>
            <ViewSection label="Learning Objectives" value={viewItem.objectives} color="#2D8CFF"/>
            <ViewSection label="Materials" value={viewItem.materials} color="#00804a"/>
            <ViewSection label="Warm-Up / Hook" value={viewItem.warm_up} color="#e67e22"/>
            <ViewSection label="Direct Instruction" value={viewItem.instruction} color="var(--teal)"/>
            <ViewSection label="Guided Practice" value={viewItem.guided_practice} color="#7b5ea7"/>
            <ViewSection label="Independent Practice" value={viewItem.independent_practice} color="#00897B"/>
            <ViewSection label="Closure" value={viewItem.closure} color="#e91e8c"/>
            <ViewSection label="Assessment" value={viewItem.assessment} color="#cc3333"/>
            <ViewSection label="Differentiation" value={viewItem.differentiation} color="#f0c040"/>
            <ViewSection label="Notes" value={viewItem.notes} color="var(--muted)"/>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
              <button className="btn btn-outline" onClick={()=>setViewItem(null)}>Close</button>
              <button className="btn btn-primary" onClick={()=>{setViewItem(null);openEdit(viewItem)}}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
