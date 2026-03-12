import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const GRAD_STATUS = ['Graduated','Transferred Out','Withdrawn','Non-Completer']
const COLLEGE_TYPES = ['4-Year University','Community College','Trade/Vocational','Military','Working','Other','Unknown']

export default function AdminAlumni() {
  const [alumni,     setAlumni]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editItem,   setEditItem]   = useState(null)
  const [viewItem,   setViewItem]   = useState(null)
  const [filterYear, setFilterYear] = useState('')
  const [search,     setSearch]     = useState('')
  const [toast,      setToast]      = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [form, setForm] = useState({
    full_name:'', grad_year:'', grad_status:'Graduated', gpa:'', grade_level:'12th',
    email:'', phone:'', post_secondary_type:'Unknown', post_secondary_name:'', scholarship_amount:'',
    activities:'', honors:'', notes:'', photo_url:'',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data } = await supabase.from('alumni').select('*').order('grad_year',{ascending:false})
    setAlumni(data||[]); setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  function openNew() {
    setEditItem(null)
    setForm({ full_name:'', grad_year:new Date().getFullYear().toString(), grad_status:'Graduated', gpa:'', grade_level:'12th', email:'', phone:'', post_secondary_type:'Unknown', post_secondary_name:'', scholarship_amount:'', activities:'', honors:'', notes:'', photo_url:'' })
    setShowModal(true)
  }

  function openEdit(a) { setEditItem(a); setForm({...a}); setShowModal(true) }

  async function saveAlum() {
    if (!form.full_name.trim()) return
    setSaving(true)
    const payload = { ...form, gpa: form.gpa ? parseFloat(form.gpa) : null, scholarship_amount: form.scholarship_amount ? parseFloat(form.scholarship_amount) : null }
    if (editItem) await supabase.from('alumni').update(payload).eq('id', editItem.id)
    else          await supabase.from('alumni').insert([payload])
    setSaving(false); setShowModal(false)
    loadAll(); showToast(editItem?'Alumni record updated':'Alumni added')
  }

  async function deleteAlum(id) {
    if (!confirm('Delete this alumni record?')) return
    await supabase.from('alumni').delete().eq('id', id)
    loadAll(); showToast('Deleted')
  }

  const gradYears = [...new Set(alumni.map(a=>a.grad_year).filter(Boolean))].sort((a,b)=>b-a)

  const filtered = alumni.filter(a => {
    const matchYear   = !filterYear || String(a.grad_year) === filterYear
    const matchSearch = !search || a.full_name?.toLowerCase().includes(search.toLowerCase()) || a.post_secondary_name?.toLowerCase().includes(search.toLowerCase())
    return matchYear && matchSearch
  })

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}

      <div className="page-header fade-up">
        <div><h2>🎓 Alumni</h2><div style={{fontSize:13,color:'var(--muted)'}}>{alumni.length} alumni on record</div></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Alumni</button>
      </div>

      <div className="grid-4 fade-up-2" style={{marginBottom:16}}>
        {[
          { label:'Total Alumni',  value:alumni.length,                                           icon:'🎓', cls:'sc-teal'   },
          { label:'Graduated',     value:alumni.filter(a=>a.grad_status==='Graduated').length,     icon:'📜', cls:'sc-violet' },
          { label:'In College',    value:alumni.filter(a=>['4-Year University','Community College'].includes(a.post_secondary_type)).length, icon:'🏫', cls:'sc-coral' },
          { label:'Classes',       value:gradYears.length,                                         icon:'📅', cls:'sc-gold'   },
        ].map(s=>(
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-row fade-up-3">
        <select className="input" style={{width:160}} value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
          <option value="">All Years</option>
          {gradYears.map(y=><option key={y} value={y}>Class of {y}</option>)}
        </select>
        <input className="input" style={{marginLeft:'auto',width:220}} placeholder="🔍 Search alumni…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"/></div>
      : filtered.length===0 ? (
        <div className="card"><div className="empty-state"><div className="es-icon">🎓</div><div className="es-text">No alumni found.</div></div></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}} className="fade-up-4">
          {filtered.map(alum=>(
            <div key={alum.id} className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'14px 16px',display:'flex',gap:12,alignItems:'center'}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:'var(--teal)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:'white',fontWeight:700,flexShrink:0}}>
                  {alum.photo_url ? <img src={alum.photo_url} alt="" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}}/> : alum.full_name?.[0]?.toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{alum.full_name}</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>Class of {alum.grad_year} {alum.gpa?`• GPA ${Number(alum.gpa).toFixed(2)}`:''}</div>
                </div>
                <span style={{fontSize:10,fontWeight:700,color:'#00804a',background:'#e6fff4',padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap'}}>{alum.grad_status}</span>
              </div>
              <div style={{padding:'10px 16px',borderTop:'1px solid var(--bg)',fontSize:12}}>
                {alum.post_secondary_name ? (
                  <div><span style={{color:'var(--muted)'}}>📍 </span><strong>{alum.post_secondary_name}</strong> <span style={{color:'var(--muted)'}}>({alum.post_secondary_type})</span></div>
                ) : (
                  <div style={{color:'var(--muted)'}}>{alum.post_secondary_type||'Post-secondary unknown'}</div>
                )}
                {alum.scholarship_amount&&<div style={{color:'#00804a',fontWeight:700,marginTop:4}}>🏆 ${Number(alum.scholarship_amount).toLocaleString()} scholarship</div>}
              </div>
              <div style={{padding:'10px 16px',display:'flex',gap:8,borderTop:'1px solid var(--bg)'}}>
                <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={()=>setViewItem(alum)}>View</button>
                <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={()=>openEdit(alum)}>Edit</button>
                <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc'}} onClick={()=>deleteAlum(alum.id)}>Del</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:540,maxHeight:'90vh',overflowY:'auto'}}>
            <div className="modal-header" style={{position:'sticky',top:0,background:'white',zIndex:10}}>
              <div className="modal-title">{editItem?'Edit Alumni':'Add Alumni Record'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="grid-2">
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="input-label">Full Name *</label>
                <input className="input" value={form.full_name} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))} placeholder="Student full name"/>
              </div>
              <div className="form-group">
                <label className="input-label">Graduation Year</label>
                <input className="input" type="number" value={form.grad_year} onChange={e=>setForm(p=>({...p,grad_year:e.target.value}))} placeholder="2024" min="1990" max="2100"/>
              </div>
              <div className="form-group">
                <label className="input-label">Status</label>
                <select className="input" value={form.grad_status} onChange={e=>setForm(p=>({...p,grad_status:e.target.value}))}>
                  {GRAD_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">GPA (at graduation)</label>
                <input className="input" type="number" value={form.gpa} onChange={e=>setForm(p=>({...p,gpa:e.target.value}))} placeholder="3.85" min="0" max="4.0" step="0.01"/>
              </div>
              <div className="form-group">
                <label className="input-label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="alumni@email.com"/>
              </div>
              <div className="form-group">
                <label className="input-label">Phone</label>
                <input className="input" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="(555) 000-0000"/>
              </div>
              <div className="form-group">
                <label className="input-label">Post-Secondary Type</label>
                <select className="input" value={form.post_secondary_type} onChange={e=>setForm(p=>({...p,post_secondary_type:e.target.value}))}>
                  {COLLEGE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Institution Name</label>
                <input className="input" value={form.post_secondary_name} onChange={e=>setForm(p=>({...p,post_secondary_name:e.target.value}))} placeholder="University of North Carolina…"/>
              </div>
              <div className="form-group">
                <label className="input-label">Scholarship Amount ($)</label>
                <input className="input" type="number" value={form.scholarship_amount} onChange={e=>setForm(p=>({...p,scholarship_amount:e.target.value}))} placeholder="0.00" min="0" step="100"/>
              </div>
            </div>
            <div className="form-group">
              <label className="input-label">Activities and Involvement</label>
              <textarea className="input" rows={2} value={form.activities} onChange={e=>setForm(p=>({...p,activities:e.target.value}))} style={{resize:'vertical'}} placeholder="Sports, clubs, leadership roles…"/>
            </div>
            <div className="form-group">
              <label className="input-label">Honors and Awards</label>
              <textarea className="input" rows={2} value={form.honors} onChange={e=>setForm(p=>({...p,honors:e.target.value}))} style={{resize:'vertical'}} placeholder="Valedictorian, Honor Society, scholarships…"/>
            </div>
            <div className="form-group">
              <label className="input-label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={{resize:'vertical'}}/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',position:'sticky',bottom:0,background:'white',paddingTop:12}}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveAlum} disabled={saving||!form.full_name.trim()}>
                {saving?'Saving…':'Save Alumni'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="modal-overlay" onClick={()=>setViewItem(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:480}}>
            <div className="modal-header">
              <div className="modal-title">{viewItem.full_name}</div>
              <button className="modal-close" onClick={()=>setViewItem(null)}>✕</button>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
              <span style={{fontSize:12,background:'#e6fff4',color:'#00804a',padding:'4px 12px',borderRadius:20,fontWeight:700}}>{viewItem.grad_status}</span>
              <span style={{fontSize:12,background:'var(--bg)',padding:'4px 12px',borderRadius:20}}>Class of {viewItem.grad_year}</span>
              {viewItem.gpa&&<span style={{fontSize:12,background:'var(--bg)',padding:'4px 12px',borderRadius:20}}>GPA {Number(viewItem.gpa).toFixed(2)}</span>}
            </div>
            {[
              ['Post-Secondary', viewItem.post_secondary_name ? viewItem.post_secondary_name + ' (' + viewItem.post_secondary_type + ')' : viewItem.post_secondary_type],
              ['Scholarship',    viewItem.scholarship_amount ? '$' + Number(viewItem.scholarship_amount).toLocaleString() : null],
              ['Email',         viewItem.email],
              ['Phone',         viewItem.phone],
            ].filter(([,v])=>v).map(([l,v])=>(
              <div key={l} style={{display:'flex',gap:10,marginBottom:8,fontSize:13}}>
                <span style={{fontWeight:700,minWidth:120,color:'var(--muted)'}}>{l}</span>
                <span>{v}</span>
              </div>
            ))}
            {viewItem.activities&&<div style={{marginTop:10}}><div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:4}}>ACTIVITIES</div><div style={{fontSize:13,lineHeight:1.6}}>{viewItem.activities}</div></div>}
            {viewItem.honors&&<div style={{marginTop:10}}><div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:4}}>HONORS</div><div style={{fontSize:13,lineHeight:1.6}}>{viewItem.honors}</div></div>}
            {viewItem.notes&&<div style={{marginTop:10}}><div style={{fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:4}}>NOTES</div><div style={{fontSize:13,lineHeight:1.6}}>{viewItem.notes}</div></div>}
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
