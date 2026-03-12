import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const CRITERIA = [
  { key:'classroom_management', label:'Classroom Management' },
  { key:'curriculum_delivery',  label:'Curriculum Delivery' },
  { key:'student_engagement',   label:'Student Engagement'  },
  { key:'professionalism',      label:'Professionalism'     },
  { key:'communication',        label:'Communication'       },
  { key:'lesson_planning',      label:'Lesson Planning'     },
]

const RATING_LABELS = { 1:'Unsatisfactory', 2:'Needs Improvement', 3:'Meets Expectations', 4:'Exceeds Expectations', 5:'Outstanding' }
const RATING_COLORS = { 1:'#cc3333', 2:'#e67e22', 3:'#f0c040', 4:'#00897B', 5:'#00c9b1' }
const STATUS_META   = { draft:{ label:'Draft', color:'#777', bg:'#f5f5f5' }, submitted:{ label:'Submitted', color:'#2D8CFF', bg:'#e8f3ff' }, acknowledged:{ label:'Acknowledged', color:'#00804a', bg:'#e6fff4' } }

export default function AdminEvaluations() {
  const { profile } = useAuth()
  const [evals,      setEvals]      = useState([])
  const [teachers,   setTeachers]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editItem,   setEditItem]   = useState(null)
  const [viewItem,   setViewItem]   = useState(null)
  const [filterTeacher, setFilterTeacher] = useState('')
  const [toast,      setToast]      = useState(null)
  const [form,       setForm]       = useState({
    teacher_id:'', period:'', eval_date: new Date().toISOString().slice(0,10),
    status:'draft', overall_rating:3, strengths:'', areas_for_growth:'', goals:'', comments:'',
    classroom_management:3, curriculum_delivery:3, student_engagement:3, professionalism:3, communication:3, lesson_planning:3,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: ev }, { data: tc }] = await Promise.all([
      supabase.from('teacher_evaluations').select('*, teacher:profiles!teacher_id(full_name,email), evaluator:profiles!evaluator_id(full_name)').order('eval_date',{ascending:false}),
      supabase.from('profiles').select('id,full_name,email').eq('role','teacher').order('full_name'),
    ])
    setEvals(ev||[]); setTeachers(tc||[])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  function openNew() {
    setEditItem(null)
    setForm({ teacher_id:'', period:'', eval_date:new Date().toISOString().slice(0,10), status:'draft', overall_rating:3, strengths:'', areas_for_growth:'', goals:'', comments:'', classroom_management:3, curriculum_delivery:3, student_engagement:3, professionalism:3, communication:3, lesson_planning:3 })
    setShowModal(true)
  }

  function openEdit(ev) {
    setEditItem(ev)
    setForm({ ...ev, eval_date: ev.eval_date?.slice(0,10)||new Date().toISOString().slice(0,10) })
    setShowModal(true)
  }

  function calcOverall() {
    const scores = CRITERIA.map(c => Number(form[c.key])||3)
    return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)
  }

  async function saveEval() {
    if (!form.teacher_id) return
    setSaving(true)
    const payload = { ...form, evaluator_id: profile.id, overall_rating: calcOverall() }
    if (editItem) await supabase.from('teacher_evaluations').update(payload).eq('id', editItem.id)
    else          await supabase.from('teacher_evaluations').insert([payload])
    setSaving(false); setShowModal(false)
    loadAll(); showToast(editItem?'Evaluation updated':'Evaluation saved')
  }

  async function deleteEval(id) {
    if (!confirm('Delete this evaluation?')) return
    await supabase.from('teacher_evaluations').delete().eq('id', id)
    loadAll(); showToast('Deleted')
  }

  const filtered = evals.filter(e => !filterTeacher || e.teacher_id === filterTeacher)

  function StarRating({ value, onChange }) {
    return (
      <div style={{display:'flex',gap:4}}>
        {[1,2,3,4,5].map(n=>(
          <button key={n} type="button" onClick={()=>onChange(n)}
            style={{fontSize:20,background:'none',border:'none',cursor:'pointer',color:n<=value?'#f0c040':'#ddd',padding:0,lineHeight:1}}>
            ★
          </button>
        ))}
        <span style={{fontSize:11,color:RATING_COLORS[value],fontWeight:700,marginLeft:4,alignSelf:'center'}}>{RATING_LABELS[value]}</span>
      </div>
    )
  }

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}

      <div className="page-header fade-up">
        <div><h2>⭐ Teacher Evaluations</h2><div style={{fontSize:13,color:'var(--muted)'}}>{evals.length} evaluations on record</div></div>
        <button className="btn btn-primary" onClick={openNew}>+ New Evaluation</button>
      </div>

      {/* Stats */}
      <div className="grid-4 fade-up-2" style={{marginBottom:16}}>
        {[
          { label:'Total',       value:evals.length,                                    icon:'📋', cls:'sc-teal'   },
          { label:'Drafts',      value:evals.filter(e=>e.status==='draft').length,       icon:'✏️',  cls:'sc-violet' },
          { label:'Submitted',   value:evals.filter(e=>e.status==='submitted').length,   icon:'📤', cls:'sc-coral'  },
          { label:'Avg Rating',  value:(evals.length ? (evals.reduce((a,e)=>a+(e.overall_rating||0),0)/evals.length).toFixed(1) : '—'), icon:'⭐', cls:'sc-gold' },
        ].map(s=>(
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="filter-row fade-up-3">
        <select className="input" style={{width:220}} value={filterTeacher} onChange={e=>setFilterTeacher(e.target.value)}>
          <option value="">All Teachers</option>
          {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card fade-up-4" style={{padding:0,overflow:'hidden'}}>
        {loading ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
        : filtered.length===0 ? <div className="empty-state"><div className="es-icon">⭐</div><div className="es-text">No evaluations yet.</div></div>
        : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Period</th>
                <th>Date</th>
                <th>Overall</th>
                <th>Status</th>
                <th>Evaluator</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ev=>{
                const sm = STATUS_META[ev.status]||STATUS_META.draft
                const rc = RATING_COLORS[ev.overall_rating]||'#777'
                return (
                  <tr key={ev.id}>
                    <td>
                      <div style={{fontWeight:700,fontSize:13}}>{ev.teacher?.full_name||'—'}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{ev.teacher?.email||''}</div>
                    </td>
                    <td style={{fontSize:12}}>{ev.period||'—'}</td>
                    <td style={{fontSize:12}}>{ev.eval_date?new Date(ev.eval_date).toLocaleDateString():'—'}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:16,color:'#f0c040'}}>{'★'.repeat(ev.overall_rating||0)}</span>
                        <span style={{fontSize:11,fontWeight:700,color:rc}}>{RATING_LABELS[ev.overall_rating]||'—'}</span>
                      </div>
                    </td>
                    <td><span style={{background:sm.bg,color:sm.color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{sm.label}</span></td>
                    <td style={{fontSize:12}}>{ev.evaluator?.full_name||'—'}</td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-outline btn-sm" onClick={()=>setViewItem(ev)}>View</button>
                        <button className="btn btn-outline btn-sm" onClick={()=>openEdit(ev)}>Edit</button>
                        <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc'}} onClick={()=>deleteEval(ev.id)}>Del</button>
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
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:580}}>
            <div className="modal-header">
              <div className="modal-title">{editItem?'Edit Evaluation':'New Teacher Evaluation'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="input-label">Teacher *</label>
                <select className="input" value={form.teacher_id} onChange={e=>setForm(p=>({...p,teacher_id:e.target.value}))}>
                  <option value="">Select teacher</option>
                  {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Evaluation Period</label>
                <input className="input" value={form.period} onChange={e=>setForm(p=>({...p,period:e.target.value}))} placeholder="e.g. Fall 2024, Q1 2025"/>
              </div>
              <div className="form-group">
                <label className="input-label">Date</label>
                <input className="input" type="date" value={form.eval_date} onChange={e=>setForm(p=>({...p,eval_date:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="input-label">Status</label>
                <select className="input" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="acknowledged">Acknowledged</option>
                </select>
              </div>
            </div>

            <div style={{background:'var(--bg)',borderRadius:10,padding:'14px 16px',marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>Performance Ratings</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {CRITERIA.map(c=>(
                  <div key={c.key}>
                    <div style={{fontSize:12,fontWeight:600,marginBottom:4}}>{c.label}</div>
                    <StarRating value={form[c.key]||3} onChange={v=>setForm(p=>({...p,[c.key]:v}))}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,padding:'10px 14px',background:'white',borderRadius:8,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:13,fontWeight:700,color:'var(--muted)'}}>Overall (auto):</span>
                <span style={{fontSize:18,color:'#f0c040'}}>{'★'.repeat(calcOverall())}</span>
                <span style={{fontSize:12,fontWeight:700,color:RATING_COLORS[calcOverall()]}}>{RATING_LABELS[calcOverall()]}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Strengths</label>
              <textarea className="input" rows={2} value={form.strengths} onChange={e=>setForm(p=>({...p,strengths:e.target.value}))} style={{resize:'vertical'}} placeholder="Key strengths observed…"/>
            </div>
            <div className="form-group">
              <label className="input-label">Areas for Growth</label>
              <textarea className="input" rows={2} value={form.areas_for_growth} onChange={e=>setForm(p=>({...p,areas_for_growth:e.target.value}))} style={{resize:'vertical'}} placeholder="Areas needing improvement…"/>
            </div>
            <div className="form-group">
              <label className="input-label">Goals for Next Period</label>
              <textarea className="input" rows={2} value={form.goals} onChange={e=>setForm(p=>({...p,goals:e.target.value}))} style={{resize:'vertical'}} placeholder="Agreed upon goals…"/>
            </div>
            <div className="form-group">
              <label className="input-label">Additional Comments</label>
              <textarea className="input" rows={2} value={form.comments} onChange={e=>setForm(p=>({...p,comments:e.target.value}))} style={{resize:'vertical'}}/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-outline" onClick={()=>{setForm(p=>({...p,status:'draft'}));setTimeout(saveEval,0)}} disabled={saving||!form.teacher_id}>Save Draft</button>
              <button className="btn btn-primary" onClick={()=>{setForm(p=>({...p,status:'submitted'}));setTimeout(saveEval,0)}} disabled={saving||!form.teacher_id}>
                {saving?'Saving…':'Submit Evaluation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="modal-overlay" onClick={()=>setViewItem(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:540}}>
            <div className="modal-header">
              <div className="modal-title">Evaluation — {viewItem.teacher?.full_name}</div>
              <button className="modal-close" onClick={()=>setViewItem(null)}>✕</button>
            </div>
            <div style={{display:'flex',gap:14,marginBottom:16,padding:'12px 14px',background:'var(--bg)',borderRadius:10}}>
              <div style={{flex:1}}><div style={{fontSize:11,color:'var(--muted)'}}>Period</div><div style={{fontWeight:700}}>{viewItem.period||'—'}</div></div>
              <div style={{flex:1}}><div style={{fontSize:11,color:'var(--muted)'}}>Date</div><div style={{fontWeight:700}}>{viewItem.eval_date?new Date(viewItem.eval_date).toLocaleDateString():'—'}</div></div>
              <div style={{flex:1}}><div style={{fontSize:11,color:'var(--muted)'}}>Evaluator</div><div style={{fontWeight:700}}>{viewItem.evaluator?.full_name||'—'}</div></div>
            </div>
            <div style={{marginBottom:14}}>
              {CRITERIA.map(c=>(
                <div key={c.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid var(--bg)'}}>
                  <span style={{fontSize:13,fontWeight:600}}>{c.label}</span>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{color:'#f0c040'}}>{'★'.repeat(viewItem[c.key]||0)}</span>
                    <span style={{fontSize:11,color:RATING_COLORS[viewItem[c.key]]||'#777',fontWeight:700}}>{RATING_LABELS[viewItem[c.key]]||'—'}</span>
                  </div>
                </div>
              ))}
            </div>
            {viewItem.strengths&&<div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:'#00804a',marginBottom:4}}>STRENGTHS</div><div style={{fontSize:13,lineHeight:1.6}}>{viewItem.strengths}</div></div>}
            {viewItem.areas_for_growth&&<div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:'#e67e22',marginBottom:4}}>AREAS FOR GROWTH</div><div style={{fontSize:13,lineHeight:1.6}}>{viewItem.areas_for_growth}</div></div>}
            {viewItem.goals&&<div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:'#2D8CFF',marginBottom:4}}>GOALS</div><div style={{fontSize:13,lineHeight:1.6}}>{viewItem.goals}</div></div>}
            {viewItem.comments&&<div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:4}}>COMMENTS</div><div style={{fontSize:13,lineHeight:1.6}}>{viewItem.comments}</div></div>}
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
