import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const STATUS_OPTS = ['pending','paid','overdue']
const STATUS_COLOR = { paid:'badge-green', pending:'badge-gold', overdue:'badge-red' }
const INTERVALS = ['weekly','monthly','quarterly','annually']
const AV = ['av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8']

function nextDue(interval, from) {
  const d = new Date(from)
  if (interval==='weekly')    d.setDate(d.getDate()+7)
  if (interval==='monthly')   d.setMonth(d.getMonth()+1)
  if (interval==='quarterly') d.setMonth(d.getMonth()+3)
  if (interval==='annually')  d.setFullYear(d.getFullYear()+1)
  return d.toISOString().split('T')[0]
}

export default function AdminBilling() {
  const [records,      setRecords]      = useState([])
  const [parents,      setParents]      = useState([])
  const [students,     setStudents]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [editRecord,   setEditRecord]   = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [tab,          setTab]          = useState('bills') // bills | history | statement
  const [stmtParent,   setStmtParent]   = useState('')
  const [filterParent, setFilterParent] = useState('all')
  const [search,       setSearch]       = useState('')

  const [printParent,  setPrintParent]  = useState(null)
  const printRef = useRef()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: bills }, { data: pars }, { data: studs }] = await Promise.all([
      supabase.from('billing').select('*, parent:profiles!parent_id(id,full_name,email)').order('due_date', { ascending: false }),
      supabase.from('profiles').select('id,full_name,email').eq('role','parent').order('full_name'),
      supabase.from('students').select('id,full_name,grade_level,parent_id').eq('status','active').order('full_name'),
    ])
    setRecords(bills||[])
    setParents(pars||[])
    setStudents(studs||[])
    setLoading(false)
  }

  async function markPaid(record) {
    await supabase.from('billing').update({ status:'paid', paid_at: new Date().toISOString() }).eq('id', record.id)
    if (record.is_recurring && record.recurrence_interval && record.due_date) {
      const nd = nextDue(record.recurrence_interval, record.due_date)
      if (!record.recurrence_end || nd <= record.recurrence_end) {
        await supabase.from('billing').insert([{
          parent_id: record.parent_id,
          description: record.description,
          amount: record.amount,
          status: 'pending',
          due_date: nd,
          is_recurring: true,
          recurrence_interval: record.recurrence_interval,
          recurrence_start: record.recurrence_start,
          recurrence_end: record.recurrence_end,
        }])
      }
    }
    loadAll()
  }

  async function markOverdue(record) {
    await supabase.from('billing').update({ status:'overdue' }).eq('id', record.id)
    loadAll()
  }

  async function deleteRecord(id) {
    if (!confirm('Delete this billing record?')) return
    await supabase.from('billing').delete().eq('id', id)
    loadAll()
  }

  function handlePrint(parentId) {
    setPrintParent(parentId)
    setTimeout(() => window.print(), 300)
  }

  const totalBilled  = records.reduce((a,b)=>a+Number(b.amount||0),0)
  const totalPaid    = records.filter(r=>r.status==='paid').reduce((a,b)=>a+Number(b.amount||0),0)
  const totalPending = records.filter(r=>r.status==='pending').reduce((a,b)=>a+Number(b.amount||0),0)
  const totalOverdue = records.filter(r=>r.status==='overdue').reduce((a,b)=>a+Number(b.amount||0),0)

  const invoices  = records.filter(r=>!r.is_recurring || r.status!=='pending' || r.due_date)
  const recurring = records.filter(r=>r.is_recurring)

  const filtered = invoices.filter(r => {
    if (filterStatus!=='all' && r.status!==filterStatus) return false
    if (filterParent!=='all' && r.parent_id!==filterParent) return false
    if (search && !r.parent?.full_name?.toLowerCase().includes(search.toLowerCase()) && !r.description?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const byParent = {}
  records.forEach(r => {
    const pid = r.parent_id
    if (!byParent[pid]) byParent[pid] = { parent: r.parent, total:0, paid:0, pending:0, overdue:0 }
    byParent[pid].total += Number(r.amount||0)
    if (r.status==='paid')    byParent[pid].paid    += Number(r.amount||0)
    if (r.status==='pending') byParent[pid].pending += Number(r.amount||0)
    if (r.status==='overdue') byParent[pid].overdue += Number(r.amount||0)
  })

  // Print statement data
  const printData = printParent ? {
    parent: parents.find(p=>p.id===printParent),
    student: students.find(s=>s.parent_id===printParent),
    bills: records.filter(r=>r.parent_id===printParent).sort((a,b)=>new Date(b.due_date||b.created_at)-new Date(a.due_date||a.created_at))
  } : null

  return (
    <div>
      {/* Print-only statement */}
      {printData && (
        <div className="print-only" ref={printRef}>
          <div style={{fontFamily:'Arial,sans-serif',maxWidth:700,margin:'0 auto',padding:40}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:30,borderBottom:'3px solid #1a1a2e',paddingBottom:20}}>
              <div>
                <div style={{fontSize:24,fontWeight:900,color:'#1a1a2e'}}>BLE Worldwide</div>
                <div style={{fontSize:12,color:'#666',marginTop:4}}>Billing Statement</div>
              </div>
              <div style={{textAlign:'right',fontSize:12,color:'#666'}}>
                <div>Date: {new Date().toLocaleDateString()}</div>
                <div>Statement #: BLE-{Date.now().toString().slice(-6)}</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:30}}>
              <div>
                <div style={{fontSize:11,color:'#999',fontWeight:700,textTransform:'uppercase',marginBottom:6}}>Billed To</div>
                <div style={{fontWeight:700,fontSize:15}}>{printData.parent?.full_name}</div>
                <div style={{fontSize:12,color:'#666'}}>{printData.parent?.email}</div>
                {printData.student && <div style={{fontSize:12,color:'#666',marginTop:4}}>Student: {printData.student.full_name} · {printData.student.grade_level} Grade</div>}
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:11,color:'#999',fontWeight:700,textTransform:'uppercase',marginBottom:6}}>Account Summary</div>
                <div style={{fontSize:13}}>Total Billed: <strong>${printData.bills.reduce((a,b)=>a+Number(b.amount||0),0).toFixed(2)}</strong></div>
                <div style={{fontSize:13,color:'#00804a'}}>Paid: <strong>${printData.bills.filter(b=>b.status==='paid').reduce((a,b)=>a+Number(b.amount||0),0).toFixed(2)}</strong></div>
                <div style={{fontSize:13,color:'#cc3333'}}>Balance Due: <strong>${printData.bills.filter(b=>b.status!=='paid').reduce((a,b)=>a+Number(b.amount||0),0).toFixed(2)}</strong></div>
              </div>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:'#1a1a2e',color:'white'}}>
                  <th style={{padding:'8px 12px',textAlign:'left'}}>Description</th>
                  <th style={{padding:'8px 12px',textAlign:'left'}}>Due Date</th>
                  <th style={{padding:'8px 12px',textAlign:'right'}}>Amount</th>
                  <th style={{padding:'8px 12px',textAlign:'center'}}>Status</th>
                  <th style={{padding:'8px 12px',textAlign:'left'}}>Paid On</th>
                </tr>
              </thead>
              <tbody>
                {printData.bills.map((b,i)=>(
                  <tr key={b.id} style={{background:i%2===0?'white':'#f9f9f9',borderBottom:'1px solid #eee'}}>
                    <td style={{padding:'8px 12px'}}>{b.description}{b.is_recurring?` (${b.recurrence_interval})`:''}</td>
                    <td style={{padding:'8px 12px'}}>{b.due_date||'—'}</td>
                    <td style={{padding:'8px 12px',textAlign:'right',fontWeight:700}}>${Number(b.amount||0).toFixed(2)}</td>
                    <td style={{padding:'8px 12px',textAlign:'center'}}>
                      <span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700,background:b.status==='paid'?'#e6fff4':b.status==='overdue'?'#fff0f0':'#fff9e6',color:b.status==='paid'?'#00804a':b.status==='overdue'?'#cc3333':'#b07800'}}>{b.status}</span>
                    </td>
                    <td style={{padding:'8px 12px',color:'#666'}}>{b.paid_at?new Date(b.paid_at).toLocaleDateString():'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{marginTop:40,borderTop:'1px solid #eee',paddingTop:16,fontSize:11,color:'#999',textAlign:'center'}}>
              BLE Worldwide · info@bleworldwide.com · Thank you for your payment
            </div>
          </div>
        </div>
      )}

      {/* Screen UI */}
      <div className="no-print">
        <div className="page-header fade-up">
          <h2>Billing & Payments</h2>
          <button className="btn btn-primary" onClick={() => { setEditRecord(null); setShowModal(true) }}>+ New Invoice</button>
        </div>

        <div className="grid-4 fade-up-2">
          <div className="stat-card sc-teal"><div className="stat-icon">💰</div><div className="stat-value">${totalBilled.toFixed(2)}</div><div className="stat-label">Total Billed</div></div>
          <div className="stat-card sc-green"><div className="stat-icon">✅</div><div className="stat-value">${totalPaid.toFixed(2)}</div><div className="stat-label">Collected</div></div>
          <div className="stat-card sc-gold"><div className="stat-icon">⏳</div><div className="stat-value">${totalPending.toFixed(2)}</div><div className="stat-label">Pending</div></div>
          <div className="stat-card sc-coral"><div className="stat-icon">🚨</div><div className="stat-value">${totalOverdue.toFixed(2)}</div><div className="stat-label">Overdue</div></div>
        </div>

        {/* Family balance cards */}
        {Object.keys(byParent).length > 0 && (
          <div className="card fade-up-3" style={{marginBottom:16}}>
            <div className="card-header">
              <div className="card-title">Balance by Family</div>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
              {Object.values(byParent).map((p,i) => (
                <div key={i} style={{flex:'1 1 200px',background:'var(--bg)',borderRadius:10,padding:'12px 14px',border:'1px solid var(--border)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <div className={`avatar avatar-sm ${AV[i%8]}`}>{p.parent?.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'?'}</div>
                    <div style={{fontWeight:700,fontSize:13,flex:1}}>{p.parent?.full_name||'Unknown'}</div>
                    <button className="btn btn-outline btn-sm" style={{fontSize:10,padding:'3px 8px'}} onClick={()=>handlePrint(p.parent?.id)}>🖨 Print</button>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                    <span style={{color:'var(--teal)',fontWeight:700}}>${p.paid.toFixed(2)} paid</span>
                    {p.pending>0&&<span style={{color:'#b07800',fontWeight:700}}>${p.pending.toFixed(2)} due</span>}
                    {p.overdue>0&&<span style={{color:'#cc3333',fontWeight:700}}>${p.overdue.toFixed(2)} overdue</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:'flex',gap:0,marginBottom:0}}>
          {['invoices','recurring'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:'9px 22px',border:'none',borderBottom: tab===t?'3px solid var(--teal)':'3px solid transparent',background:'none',fontWeight:tab===t?800:500,color:tab===t?'var(--teal)':'var(--muted)',cursor:'pointer',fontSize:13,textTransform:'capitalize'}}>
              {t==='recurring'?'🔄 Recurring':t==='invoices'?'📄 All Invoices':t}
            </button>
          ))}
        </div>

        <div className="card fade-up-4">
          {tab==='invoices' && (
            <>
              <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
                <input className="input" style={{maxWidth:220}} placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
                <select className="select" style={{width:140}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                  <option value="all">All Statuses</option>
                  {STATUS_OPTS.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
                <select className="select" style={{width:180}} value={filterParent} onChange={e=>setFilterParent(e.target.value)}>
                  <option value="all">All Families</option>
                  {parents.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
                {(filterStatus!=='all'||filterParent!=='all'||search) && (
                  <button className="btn btn-outline btn-sm" onClick={()=>{setFilterStatus('all');setFilterParent('all');setSearch('')}}>Clear ✕</button>
                )}
              </div>
              {loading ? <div style={{textAlign:'center',padding:30}}><div className="spinner"/></div>
              : filtered.length===0 ? <div className="empty-state"><div className="es-icon">💳</div><div className="es-text">No invoices found.</div></div>
              : (
                <table className="data-table">
                  <thead><tr><th>Family</th><th>Description</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Paid On</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map(r=>(
                      <tr key={r.id}>
                        <td><div style={{fontWeight:700}}>{r.parent?.full_name||'Unknown'}</div><div style={{fontSize:10,color:'var(--muted)'}}>{r.parent?.email}</div></td>
                        <td>{r.description}{r.is_recurring&&<span style={{fontSize:10,color:'var(--violet)',marginLeft:6}}>🔄 {r.recurrence_interval}</span>}</td>
                        <td style={{fontWeight:700}}>${Number(r.amount||0).toFixed(2)}</td>
                        <td style={{color:r.status==='overdue'?'var(--coral)':'inherit'}}>{r.due_date||'—'}</td>
                        <td><span className={`badge ${STATUS_COLOR[r.status]||'badge-gold'}`}>{r.status}</span></td>
                        <td style={{fontSize:11,color:'var(--muted)'}}>{r.paid_at?new Date(r.paid_at).toLocaleDateString():'—'}</td>
                        <td>
                          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                            {r.status!=='paid'&&<button className="btn btn-sm" style={{background:'#e6fff4',color:'#00804a',border:'1px solid #b0eedd',fontSize:11,fontWeight:700}} onClick={()=>markPaid(r)}>✅ Paid</button>}
                            {r.status==='pending'&&<button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc',fontSize:11,fontWeight:700}} onClick={()=>markOverdue(r)}>🚨</button>}
                            <button className="btn btn-sm btn-outline" style={{fontSize:11}} onClick={()=>{setEditRecord(r);setShowModal(true)}}>✏️</button>
                            <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc',fontSize:11}} onClick={()=>deleteRecord(r.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {tab==='recurring' && (
            <>
              <div style={{marginBottom:14,fontSize:12,color:'var(--muted)'}}>Recurring templates auto-generate the next invoice when marked paid.</div>
              {recurring.length===0 ? <div className="empty-state"><div className="es-icon">🔄</div><div className="es-text">No recurring billing set up yet. Create an invoice and toggle Recurring on.</div></div>
              : (
                <table className="data-table">
                  <thead><tr><th>Family</th><th>Description</th><th>Amount</th><th>Interval</th><th>Next Due</th><th>End Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {recurring.map(r=>(
                      <tr key={r.id}>
                        <td style={{fontWeight:700}}>{r.parent?.full_name||'Unknown'}</td>
                        <td>{r.description}</td>
                        <td style={{fontWeight:700}}>${Number(r.amount||0).toFixed(2)}</td>
                        <td><span className="badge badge-blue" style={{textTransform:'capitalize'}}>{r.recurrence_interval}</span></td>
                        <td>{r.due_date||'—'}</td>
                        <td style={{color:'var(--muted)'}}>{r.recurrence_end||'No end'}</td>
                        <td><span className={`badge ${STATUS_COLOR[r.status]||'badge-gold'}`}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <BillingModal
          record={editRecord}
          parents={parents}
          students={students}
          onClose={()=>setShowModal(false)}
          onSaved={()=>{setShowModal(false);loadAll()}}
        />
      )}
    </div>
  )
}

function BillingModal({ record, parents, students, onClose, onSaved }) {
  const [parentId,    setParentId]    = useState(record?.parent_id||'')
  const [description, setDescription] = useState(record?.description||'')
  const [amount,      setAmount]      = useState(record?.amount||'')
  const [dueDate,     setDueDate]     = useState(record?.due_date||'')
  const [status,      setStatus]      = useState(record?.status||'pending')
  const [isRecurring, setIsRecurring] = useState(record?.is_recurring||false)
  const [interval,    setInterval]    = useState(record?.recurrence_interval||'monthly')
  const [recurEnd,    setRecurEnd]    = useState(record?.recurrence_end||'')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  const TEMPLATES = ['Monthly Tuition','Registration Fee','Materials Fee','Activity Fee','Late Payment Fee','Technology Fee']
  const linkedStudent = students.find(s=>s.parent_id===parentId)

  async function handleSave() {
    if (!parentId||!description.trim()||!amount) { setError('Parent, description and amount are required.'); return }
    setSaving(true)
    const payload = {
      parent_id: parentId, description: description.trim(), amount: Number(amount),
      due_date: dueDate||null, status,
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? interval : null,
      recurrence_start: isRecurring ? (dueDate||new Date().toISOString().split('T')[0]) : null,
      recurrence_end: isRecurring && recurEnd ? recurEnd : null,
    }
    if (record) {
      await supabase.from('billing').update(payload).eq('id', record.id)
    } else {
      await supabase.from('billing').insert([payload])
    }
    setSaving(false); onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
        <div className="modal-header">
          <div className="modal-title">{record?'✏️ Edit Invoice':'+ New Invoice'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error&&<div style={{background:'#fff0f0',border:'1px solid #ffcccc',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#cc3333',marginBottom:12}}>{error}</div>}

        <div className="form-group">
          <label className="input-label">Family (Parent Account)</label>
          <select className="select" value={parentId} onChange={e=>{setParentId(e.target.value);setError('')}}>
            <option value="">— Select Parent —</option>
            {parents.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          {linkedStudent&&<div style={{fontSize:11,color:'var(--teal)',marginTop:4}}>👧 {linkedStudent.full_name} · {linkedStudent.grade_level} Grade</div>}
        </div>

        <div className="form-group">
          <label className="input-label">Description</label>
          <input className="input" value={description} onChange={e=>setDescription(e.target.value)} placeholder="e.g. Monthly Tuition — March 2026"/>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}}>
            {TEMPLATES.map(t=>(
              <button key={t} onClick={()=>setDescription(t)} style={{fontSize:10,padding:'2px 8px',borderRadius:20,border:'1px solid var(--border)',background:'white',cursor:'pointer',color:'var(--muted)'}}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="form-group">
            <label className="input-label">Amount ($)</label>
            <input className="input" type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/>
          </div>
          <div className="form-group">
            <label className="input-label">Due Date</label>
            <input className="input" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/>
          </div>
        </div>

        <div className="form-group">
          <label className="input-label">Status</label>
          <div style={{display:'flex',gap:8}}>
            {STATUS_OPTS.map(s=>(
              <button key={s} onClick={()=>setStatus(s)} style={{flex:1,padding:'7px 0',borderRadius:8,border:'2px solid',fontWeight:700,fontSize:12,cursor:'pointer',
                borderColor:status===s?(s==='paid'?'var(--teal)':s==='overdue'?'#cc3333':'#b07800'):'var(--border)',
                background:status===s?(s==='paid'?'#e6fff4':s==='overdue'?'#fff0f0':'#fff9e6'):'white',
                color:status===s?(s==='paid'?'#00804a':s==='overdue'?'#cc3333':'#b07800'):'var(--muted)'}}>
                {s==='paid'?'✅':s==='overdue'?'🚨':'⏳'} {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Recurring toggle */}
        <div className="form-group" style={{borderTop:'1px solid var(--border)',paddingTop:14,marginTop:4}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:isRecurring?12:0}}>
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',userSelect:'none'}}>
              <div onClick={()=>setIsRecurring(p=>!p)} style={{width:40,height:22,borderRadius:11,background:isRecurring?'var(--teal)':'#ddd',transition:'background .2s',position:'relative',cursor:'pointer'}}>
                <div style={{position:'absolute',top:3,left:isRecurring?20:3,width:16,height:16,borderRadius:'50%',background:'white',transition:'left .2s'}}/>
              </div>
              <span style={{fontWeight:700,fontSize:13}}>🔄 Recurring Billing</span>
            </label>
          </div>
          {isRecurring && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,background:'#f7f9ff',borderRadius:10,padding:12}}>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="input-label">Billing Interval</label>
                <select className="select" value={interval} onChange={e=>setInterval(e.target.value)}>
                  {INTERVALS.map(i=><option key={i} value={i}>{i.charAt(0).toUpperCase()+i.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="input-label">End Date (optional)</label>
                <input className="input" type="date" value={recurEnd} onChange={e=>setRecurEnd(e.target.value)}/>
              </div>
              <div style={{gridColumn:'1/-1',fontSize:11,color:'var(--muted)'}}>
                When marked paid, the next invoice is automatically created {interval==='weekly'?'1 week':interval==='monthly'?'1 month':interval==='quarterly'?'3 months':'1 year'} later.
              </div>
            </div>
          )}
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':record?'Save Changes':'Create Invoice'}</button>
        </div>
      </div>
    </div>
  )
}
