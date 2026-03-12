import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const FEE_TYPES = ['Lab Fee','Activity Fee','Technology Fee','Field Trip','Uniform','Sports Fee','Art Supplies','Music Fee','Graduation Fee','Registration Fee','Late Fee','Library Fine','Other']
const FEE_STATUS = { unpaid:{ label:'Unpaid', color:'#cc3333', bg:'#fff0f0' }, paid:{ label:'Paid', color:'#00804a', bg:'#e6fff4' }, waived:{ label:'Waived', color:'#777', bg:'#f5f5f5' }, partial:{ label:'Partial', color:'#e67e22', bg:'#fff3e0' } }

export default function AdminFees() {
  const [fees,       setFees]       = useState([])
  const [students,   setStudents]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editItem,   setEditItem]   = useState(null)
  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterType,    setFilterType]    = useState('')
  const [filterStudent, setFilterStudent] = useState('')
  const [search,        setSearch]        = useState('')
  const [toast,         setToast]         = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [bulkModal,     setBulkModal]     = useState(false)
  const [bulkForm,      setBulkForm]      = useState({ fee_type:'Lab Fee', title:'', amount:'', due_date:'', grade_filter:'' })
  const [grades,        setGrades]        = useState([])
  const [form, setForm] = useState({ student_id:'', fee_type:'Lab Fee', title:'', amount:'', due_date:'', status:'unpaid', paid_date:'', notes:'' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: f }, { data: s }, { data: g }] = await Promise.all([
      supabase.from('student_fees').select('*, student:students(id,full_name,grade_level)').order('created_at',{ascending:false}),
      supabase.from('students').select('id,full_name,grade_level').eq('status','active').order('full_name'),
      supabase.from('students').select('grade_level').eq('status','active'),
    ])
    setFees(f||[]); setStudents(s||[])
    const uniqueGrades = [...new Set((g||[]).map(x=>x.grade_level).filter(Boolean))].sort()
    setGrades(uniqueGrades)
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  function openNew() {
    setEditItem(null)
    setForm({ student_id:'', fee_type:'Lab Fee', title:'', amount:'', due_date:'', status:'unpaid', paid_date:'', notes:'' })
    setShowModal(true)
  }

  function openEdit(f) { setEditItem(f); setForm({...f, due_date:f.due_date?.slice(0,10)||'', paid_date:f.paid_date?.slice(0,10)||''}); setShowModal(true) }

  async function saveFee() {
    if (!form.student_id || !form.title.trim() || !form.amount) return
    setSaving(true)
    const payload = { ...form, amount: parseFloat(form.amount) }
    if (editItem) await supabase.from('student_fees').update(payload).eq('id', editItem.id)
    else          await supabase.from('student_fees').insert([payload])
    setSaving(false); setShowModal(false)
    loadAll(); showToast(editItem?'Fee updated':'Fee added')
  }

  async function markPaid(fee) {
    await supabase.from('student_fees').update({ status:'paid', paid_date: new Date().toISOString().slice(0,10) }).eq('id', fee.id)
    loadAll(); showToast('Marked as paid')
  }

  async function bulkAssign() {
    if (!bulkForm.title.trim() || !bulkForm.amount) return
    setSaving(true)
    let studs = students
    if (bulkForm.grade_filter) studs = studs.filter(s=>s.grade_level===bulkForm.grade_filter)
    const rows = studs.map(s=>({ student_id:s.id, fee_type:bulkForm.fee_type, title:bulkForm.title, amount:parseFloat(bulkForm.amount), due_date:bulkForm.due_date||null, status:'unpaid' }))
    if (rows.length) await supabase.from('student_fees').insert(rows)
    setSaving(false); setBulkModal(false)
    loadAll(); showToast(`Fee assigned to ${rows.length} students`)
  }

  const filtered = fees.filter(f => {
    const matchStatus  = !filterStatus  || f.status === filterStatus
    const matchType    = !filterType    || f.fee_type === filterType
    const matchStudent = !filterStudent || f.student_id === filterStudent
    const matchSearch  = !search || f.title?.toLowerCase().includes(search.toLowerCase()) || f.student?.full_name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchType && matchStudent && matchSearch
  })

  const totalUnpaid = fees.filter(f=>f.status==='unpaid').reduce((a,f)=>a+Number(f.amount||0),0)
  const totalPaid   = fees.filter(f=>f.status==='paid').reduce((a,f)=>a+Number(f.amount||0),0)

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}

      <div className="page-header fade-up">
        <div><h2>💰 Fee Management</h2><div style={{fontSize:13,color:'var(--muted)'}}>{fees.length} fees on record</div></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-outline" onClick={()=>{ setBulkForm({ fee_type:'Lab Fee', title:'', amount:'', due_date:'', grade_filter:'' }); setBulkModal(true) }}>Bulk Assign</button>
          <button className="btn btn-primary" onClick={openNew}>+ Add Fee</button>
        </div>
      </div>

      <div className="grid-4 fade-up-2" style={{marginBottom:16}}>
        {[
          { label:'Total Fees',  value:fees.length,                                    icon:'💰', cls:'sc-teal'   },
          { label:'Unpaid',      value:fees.filter(f=>f.status==='unpaid').length,      icon:'🔴', cls:'sc-coral'  },
          { label:'Outstanding', value:'$'+totalUnpaid.toFixed(2),                     icon:'⚠️', cls:'sc-violet' },
          { label:'Collected',   value:'$'+totalPaid.toFixed(2),                       icon:'✅', cls:'sc-gold'   },
        ].map(s=>(
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{fontSize:s.value.length>8?18:undefined}}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-row fade-up-3">
        <select className="input" style={{width:180}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {Object.entries(FEE_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input" style={{width:180}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="">All Fee Types</option>
          {FEE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input" style={{width:200}} value={filterStudent} onChange={e=>setFilterStudent(e.target.value)}>
          <option value="">All Students</option>
          {students.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <input className="input" style={{marginLeft:'auto',width:200}} placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div className="card fade-up-4" style={{padding:0,overflow:'hidden'}}>
        {loading ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
        : filtered.length===0 ? <div className="empty-state"><div className="es-icon">💰</div><div className="es-text">No fees found.</div></div>
        : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Fee</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(fee=>{
                const sm = FEE_STATUS[fee.status]||FEE_STATUS.unpaid
                return (
                  <tr key={fee.id}>
                    <td>
                      <div style={{fontWeight:700,fontSize:13}}>{fee.student?.full_name||'—'}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{fee.student?.grade_level||''}</div>
                    </td>
                    <td>
                      <div style={{fontWeight:600,fontSize:13}}>{fee.title}</div>
                      {fee.notes&&<div style={{fontSize:11,color:'var(--muted)'}}>{fee.notes}</div>}
                    </td>
                    <td style={{fontSize:11}}>{fee.fee_type}</td>
                    <td style={{fontWeight:700,fontSize:14}}>${Number(fee.amount||0).toFixed(2)}</td>
                    <td style={{fontSize:11}}>{fee.due_date?new Date(fee.due_date).toLocaleDateString():'—'}</td>
                    <td><span style={{background:sm.bg,color:sm.color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{sm.label}</span></td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        {fee.status==='unpaid'&&<button className="btn btn-sm" style={{background:'#e6fff4',color:'#00804a',border:'1px solid #b0f0d4'}} onClick={()=>markPaid(fee)}>✓ Paid</button>}
                        <button className="btn btn-outline btn-sm" onClick={()=>openEdit(fee)}>Edit</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:480}}>
            <div className="modal-header">
              <div className="modal-title">{editItem?'Edit Fee':'Add Student Fee'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="grid-2">
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="input-label">Student *</label>
                <select className="input" value={form.student_id} onChange={e=>setForm(p=>({...p,student_id:e.target.value}))}>
                  <option value="">Select student</option>
                  {students.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.grade_level})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Fee Type</label>
                <select className="input" value={form.fee_type} onChange={e=>setForm(p=>({...p,fee_type:e.target.value}))}>
                  {FEE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Status</label>
                <select className="input" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  {Object.entries(FEE_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="input-label">Fee Title *</label>
                <input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Chemistry Lab Fee Spring 2025"/>
              </div>
              <div className="form-group">
                <label className="input-label">Amount ($) *</label>
                <input className="input" type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} placeholder="0.00" min="0" step="0.01"/>
              </div>
              <div className="form-group">
                <label className="input-label">Due Date</label>
                <input className="input" type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))}/>
              </div>
              {form.status==='paid'&&(
                <div className="form-group">
                  <label className="input-label">Paid Date</label>
                  <input className="input" type="date" value={form.paid_date} onChange={e=>setForm(p=>({...p,paid_date:e.target.value}))}/>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="input-label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={{resize:'vertical'}}/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveFee} disabled={saving||!form.student_id||!form.title.trim()||!form.amount}>
                {saving?'Saving…':'Save Fee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {bulkModal && (
        <div className="modal-overlay" onClick={()=>setBulkModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:440}}>
            <div className="modal-header">
              <div className="modal-title">Bulk Assign Fee</div>
              <button className="modal-close" onClick={()=>setBulkModal(false)}>✕</button>
            </div>
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:14}}>Assign a fee to multiple students at once. Leave grade filter blank to assign to all active students.</p>
            <div className="grid-2">
              <div className="form-group">
                <label className="input-label">Fee Type</label>
                <select className="input" value={bulkForm.fee_type} onChange={e=>setBulkForm(p=>({...p,fee_type:e.target.value}))}>
                  {FEE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Grade Level (optional)</label>
                <select className="input" value={bulkForm.grade_filter} onChange={e=>setBulkForm(p=>({...p,grade_filter:e.target.value}))}>
                  <option value="">All Grades</option>
                  {grades.map(g=><option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="input-label">Fee Title *</label>
                <input className="input" value={bulkForm.title} onChange={e=>setBulkForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Lab Fee Spring 2025"/>
              </div>
              <div className="form-group">
                <label className="input-label">Amount ($) *</label>
                <input className="input" type="number" value={bulkForm.amount} onChange={e=>setBulkForm(p=>({...p,amount:e.target.value}))} placeholder="0.00" min="0" step="0.01"/>
              </div>
              <div className="form-group">
                <label className="input-label">Due Date</label>
                <input className="input" type="date" value={bulkForm.due_date} onChange={e=>setBulkForm(p=>({...p,due_date:e.target.value}))}/>
              </div>
            </div>
            <div style={{background:'var(--bg)',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'var(--muted)'}}>
              This will assign the fee to <strong style={{color:'var(--text)'}}>{bulkForm.grade_filter ? students.filter(s=>s.grade_level===bulkForm.grade_filter).length : students.length} students</strong>.
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setBulkModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={bulkAssign} disabled={saving||!bulkForm.title.trim()||!bulkForm.amount}>
                {saving?'Assigning…':'Assign to Students'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
