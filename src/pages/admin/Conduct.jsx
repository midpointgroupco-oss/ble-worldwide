import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const TYPE_META = {
  positive: { color:'#00804a', bg:'#e6fff4', border:'#b0eedd', badge:'badge-green', icon:'⭐' },
  negative: { color:'#cc3333', bg:'#fff0f0', border:'#ffcccc', badge:'badge-red',   icon:'⚠️' },
  neutral:  { color:'#0050b0', bg:'#e6f4ff', border:'#b0d4ff', badge:'badge-blue',  icon:'📝' },
}
const CATEGORIES = ['academic','behavior','attendance','other']
const CATEGORY_ICON = { academic:'📚', behavior:'🧠', attendance:'📅', other:'📌' }

export default function AdminConduct() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [records,  setRecords]  = useState([])
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showModal,setShowModal]= useState(false)
  const [filterStu,setFilterStu]= useState('')
  const [filterType,setFilterType] = useState('all')
  const [search,   setSearch]   = useState('')
  const [form,     setForm]     = useState({ student_id:'', type:'positive', category:'behavior', title:'', description:'', points:0, date: new Date().toISOString().split('T')[0] })
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: recs }, { data: studs }] = await Promise.all([
      supabase.from('conduct_records').select('*, student:students(id,full_name,grade_level), recorder:profiles!recorded_by(full_name)').order('date',{ascending:false}).limit(200),
      supabase.from('students').select('id,full_name,grade_level,conduct_points').eq('status','active').order('full_name'),
    ])
    setRecords(recs||[])
    setStudents(studs||[])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  async function saveRecord() {
    if (!form.student_id || !form.title.trim()) return
    setSaving(true)
    await supabase.from('conduct_records').insert([{ ...form, recorded_by: profile.id, points: Number(form.points)||0 }])
    // Update student conduct_points
    const student = students.find(s=>s.id===form.student_id)
    const delta = form.type==='positive' ? Number(form.points)||0 : form.type==='negative' ? -(Number(form.points)||0) : 0
    if (delta !== 0) {
      await supabase.from('students').update({ conduct_points: (student?.conduct_points||0) + delta }).eq('id', form.student_id)
    }
    setSaving(false)
    setShowModal(false)
    setForm({ student_id:'', type:'positive', category:'behavior', title:'', description:'', points:0, date: new Date().toISOString().split('T')[0] })
    loadAll()
    showToast('✅ Record saved')
  }

  async function deleteRecord(id, studentId, type, points) {
    if (!confirm('Delete this record?')) return
    await supabase.from('conduct_records').delete().eq('id', id)
    const student = students.find(s=>s.id===studentId)
    const delta = type==='positive' ? -(points||0) : type==='negative' ? (points||0) : 0
    if (delta !== 0) await supabase.from('students').update({ conduct_points: (student?.conduct_points||0) + delta }).eq('id', studentId)
    loadAll()
  }

  const filtered = records.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false
    if (filterStu && r.student_id !== filterStu) return false
    if (search && !r.title?.toLowerCase().includes(search.toLowerCase()) && !r.student?.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Top students by conduct points
  const topStudents = [...students].sort((a,b)=>(b.conduct_points||0)-(a.conduct_points||0)).slice(0,5)

  return (
    <div>
      {toast && <div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}

      <div className="page-header fade-up">
        <div><h2>🧠 Student Conduct</h2><div style={{fontSize:13,color:'var(--muted)'}}>{records.length} records total</div></div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Add Record</button>
      </div>

      {/* Summary cards */}
      <div className="grid-4 fade-up-2" style={{marginBottom:16}}>
        {[['⭐','Positive',records.filter(r=>r.type==='positive').length,'#00804a'],
          ['⚠️','Negative',records.filter(r=>r.type==='negative').length,'#cc3333'],
          ['📝','Neutral', records.filter(r=>r.type==='neutral').length, '#0050b0'],
          ['🧑‍🎓','Students',students.length,'var(--teal)']
        ].map(([ic,l,n,c])=>(
          <div key={l} className="stat-card"><div className="stat-icon">{ic}</div><div className="stat-value" style={{color:c}}>{n}</div><div className="stat-label">{l}</div></div>
        ))}
      </div>

      <div className="grid-2 fade-up-3">
        {/* Records list */}
        <div>
          {/* Filters */}
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            <input className="input" style={{maxWidth:200}} placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <select className="input" style={{maxWidth:180}} value={filterStu} onChange={e=>setFilterStu(e.target.value)}>
              <option value="">All Students</option>
              {students.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            <div style={{display:'flex',gap:4}}>
              {['all','positive','negative','neutral'].map(t=>(
                <button key={t} onClick={()=>setFilterType(t)}
                  style={{padding:'5px 12px',borderRadius:8,border:'1px solid var(--border)',background:filterType===t?'var(--teal)':'white',color:filterType===t?'white':'var(--text)',fontWeight:700,fontSize:11,cursor:'pointer',textTransform:'capitalize'}}>
                  {t==='all'?'All':TYPE_META[t]?.icon+' '+t}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {loading ? <div style={{padding:40,textAlign:'center'}}><div className="spinner"/></div>
            : filtered.length===0 ? <div className="empty-state" style={{padding:40}}><div className="es-icon">🧠</div><div className="es-text">No records found</div></div>
            : filtered.map((r,i)=>{
                const m = TYPE_META[r.type]||TYPE_META.neutral
                return (
                  <div key={r.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',background:i%2===0?'white':'#fafbff',display:'flex',gap:12,alignItems:'flex-start'}}>
                    <div style={{width:36,height:36,borderRadius:10,background:m.bg,border:`1px solid ${m.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{m.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{fontWeight:700,fontSize:13}}>{r.title}</span>
                        <span className={`badge ${m.badge}`} style={{fontSize:9}}>{r.type}</span>
                        <span style={{fontSize:10,color:'var(--muted)',background:'var(--bg)',padding:'1px 6px',borderRadius:4}}>{CATEGORY_ICON[r.category]} {r.category}</span>
                      </div>
                      <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
                        <span style={{cursor:'pointer',fontWeight:600,color:'var(--text)'}} onClick={()=>navigate(`/admin/students/${r.student_id}`)}>{r.student?.full_name}</span>
                        {' · '}{r.student?.grade_level}{' · '}{r.date}
                      </div>
                      {r.description && <div style={{fontSize:11,color:'var(--muted)',marginTop:3,lineHeight:1.5}}>{r.description}</div>}
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      {r.points ? <div style={{fontWeight:800,fontSize:14,color:m.color}}>{r.type==='negative'?'-':'+'}{r.points}pts</div> : null}
                      <button onClick={()=>deleteRecord(r.id,r.student_id,r.type,r.points)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--muted)',marginTop:4}}>🗑</button>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>

        {/* Leaderboard */}
        <div>
          <div className="card" style={{marginBottom:16}}>
            <div className="card-header"><div className="card-title">⭐ Conduct Leaderboard</div></div>
            {topStudents.map((s,i)=>(
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)',cursor:'pointer'}} onClick={()=>navigate(`/admin/students/${s.id}`)}>
                <div style={{width:28,height:28,borderRadius:'50%',background:i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13}}>{s.full_name}</div>
                  <div style={{fontSize:10,color:'var(--muted)'}}>{s.grade_level}</div>
                </div>
                <div style={{fontWeight:800,fontSize:15,color:(s.conduct_points||0)>=0?'#00804a':'#cc3333'}}>{(s.conduct_points||0)>=0?'+':''}{s.conduct_points||0}</div>
              </div>
            ))}
            {topStudents.length===0&&<div className="empty-state" style={{padding:20}}><div className="es-text">No students yet</div></div>}
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">📊 By Category</div></div>
            {CATEGORIES.map(cat=>{
              const count = records.filter(r=>r.category===cat).length
              const pct   = records.length ? Math.round((count/records.length)*100) : 0
              return (
                <div key={cat} className="prog-item">
                  <div className="prog-label">
                    <span>{CATEGORY_ICON[cat]} {cat}</span>
                    <span style={{fontWeight:700}}>{count}</span>
                  </div>
                  <div className="prog-bar"><div className="prog-fill" style={{width:`${pct}%`}}/></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add Record Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
            <div className="modal-header">
              <div className="modal-title">📝 Add Conduct Record</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="input-label">Student *</label>
              <select className="input" value={form.student_id} onChange={e=>setForm(p=>({...p,student_id:e.target.value}))}>
                <option value="">— Select student —</option>
                {students.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.grade_level})</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="input-label">Type *</label>
                <select className="input" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                  <option value="positive">⭐ Positive</option>
                  <option value="negative">⚠️ Negative</option>
                  <option value="neutral">📝 Neutral</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Category *</label>
                <select className="input" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{CATEGORY_ICON[c]} {c}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="input-label">Title *</label>
                <input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Outstanding Participation"/>
              </div>
              <div className="form-group">
                <label className="input-label">Points</label>
                <input className="input" type="number" min={0} max={100} value={form.points} onChange={e=>setForm(p=>({...p,points:e.target.value}))} placeholder="0"/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="input-label">Date</label>
                <input className="input" type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="input-label">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Additional details…" style={{resize:'vertical'}}/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveRecord} disabled={saving||!form.student_id||!form.title.trim()}>{saving?'Saving…':'Save Record'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
