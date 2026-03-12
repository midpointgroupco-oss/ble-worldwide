import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const LEAVE_TYPES = ['vacation','sick','personal','fmla','bereavement','other']
const LEAVE_BADGE = {
  vacation:'badge-blue', sick:'badge-red', personal:'badge-green',
  fmla:'badge-yellow', bereavement:'badge-gray', other:'badge-gray',
}
const STATUS_BADGE = { pending:'badge-yellow', approved:'badge-green', denied:'badge-red' }
const STATUS_ICON  = { pending:'⏳', approved:'✅', denied:'❌' }

export function TeacherTimeOff() {
  const { profile } = useAuth()
  const [requests, setRequests]   = useState([])
  const [balances, setBalances]   = useState(null)
  const [loading,  setLoading]    = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form,     setForm]       = useState({ leave_type:'vacation', start_date:'', end_date:'', reason:'' })
  const [saving,   setSaving]     = useState(false)
  const [err,      setErr]        = useState('')
  const [success,  setSuccess]    = useState(false)

  useEffect(() => { if (profile?.id) load() }, [profile])

  async function load() {
    setLoading(true)
    const year = new Date().getFullYear()
    const [reqRes, balRes] = await Promise.all([
      supabase.from('hr_time_off').select('*').eq('staff_id', profile.id).order('created_at', {ascending:false}),
      supabase.from('hr_leave_balances').select('*').eq('staff_id', profile.id).eq('year', year).maybeSingle(),
    ])
    setRequests(reqRes.data||[])
    setBalances(balRes.data||null)
    setLoading(false)
  }

  function calcDays(start, end) {
    if (!start || !end) return 0
    const s = new Date(start), e = new Date(end)
    if (e < s) return 0
    let days = 0
    const cur = new Date(s)
    while (cur <= e) {
      const dow = cur.getDay()
      if (dow !== 0 && dow !== 6) days++
      cur.setDate(cur.getDate()+1)
    }
    return days
  }

  async function submit() {
    setErr('')
    if (!form.start_date || !form.end_date) { setErr('Please select start and end dates.'); return }
    const days = calcDays(form.start_date, form.end_date)
    if (days === 0) { setErr('Invalid date range.'); return }

    // Check balance if applicable
    if (balances && form.leave_type === 'vacation') {
      const remaining = (balances.vacation_total||0) - (balances.vacation_used||0)
      if (days > remaining) {
        setErr(`You only have ${remaining} vacation day${remaining!==1?'s':''} remaining.`)
        return
      }
    }

    setSaving(true)
    const { error } = await supabase.from('hr_time_off').insert({
      staff_id:      profile.id,
      leave_type:    form.leave_type,
      start_date:    form.start_date,
      end_date:      form.end_date,
      reason:        form.reason.trim()||null,
      days_requested: days,
      status:        'pending',
    })
    setSaving(false)
    if (error) { setErr('Failed to submit. Please try again.'); return }
    setShowForm(false)
    setForm({ leave_type:'vacation', start_date:'', end_date:'', reason:'' })
    setSuccess(true)
    setTimeout(() => setSuccess(false), 4000)
    load()
  }

  const days = calcDays(form.start_date, form.end_date)

  const balCards = balances ? [
    { label:'Vacation',  used: balances.vacation_used||0,  total: balances.vacation_total||0,  color:'var(--teal)' },
    { label:'Sick',      used: balances.sick_used||0,      total: balances.sick_total||0,       color:'#cc3333'    },
    { label:'Personal',  used: balances.personal_used||0,  total: balances.personal_total||0,   color:'#a855f7'    },
  ] : []

  return (
    <div>
      <div className="page-header fade-up">
        <div>
          <h2>🏖️ Time Off</h2>
          <div style={{fontSize:13,color:'var(--muted)'}}>Submit and track your leave requests</div>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowForm(true)}>+ Request Time Off</button>
      </div>

      {success && (
        <div style={{background:'rgba(0,201,177,.1)',border:'1px solid var(--teal)',borderRadius:10,padding:'12px 16px',marginBottom:16,color:'var(--teal)',fontWeight:700,fontSize:13}}>
          ✅ Request submitted! Your admin will review it shortly.
        </div>
      )}

      {/* Leave Balances */}
      {balances && (
        <div className="grid-3 fade-up-2" style={{gap:12,marginBottom:20}}>
          {balCards.map(b => {
            const remaining = b.total - b.used
            const pct = b.total > 0 ? Math.min(100, Math.round((b.used/b.total)*100)) : 0
            return (
              <div key={b.label} className="card" style={{borderTop:`3px solid ${b.color}`}}>
                <div style={{fontWeight:800,fontSize:13,marginBottom:8}}>{b.label} Leave</div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:700,marginBottom:6}}>
                  <span style={{color:'var(--muted)'}}>{b.used} used</span>
                  <span style={{color:b.color}}>{remaining} remaining</span>
                </div>
                <div style={{background:'#eee',borderRadius:20,height:6,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:20,width:pct+'%',background:b.color,transition:'width 0.3s'}}/>
                </div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>{b.total} total days this year</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Requests Table */}
      <div className="card fade-up-2" style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:800,fontSize:14}}>My Requests</div>
        {loading
          ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
          : requests.length===0
            ? <div className="empty-state" style={{padding:40}}><div className="es-icon">🏖️</div><div className="es-text">No requests yet. Submit your first one!</div></div>
            : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{background:'var(--bg)',borderBottom:'2px solid var(--border)'}}>
                    {['Type','Dates','Days','Reason','Status','Admin Notes'].map(h=>(
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:700,fontSize:11,color:'var(--muted)',textTransform:'uppercase'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} style={{borderBottom:'1px solid var(--border)'}}>
                      <td style={{padding:'10px 14px'}}><span className={`badge ${LEAVE_BADGE[r.leave_type]||'badge-gray'}`} style={{textTransform:'capitalize'}}>{r.leave_type}</span></td>
                      <td style={{padding:'10px 14px',fontSize:12,color:'var(--muted)'}}>{r.start_date}{r.end_date!==r.start_date&&<><br/>{r.end_date}</>}</td>
                      <td style={{padding:'10px 14px',fontWeight:800}}>{r.days_requested}</td>
                      <td style={{padding:'10px 14px',color:'var(--muted)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.reason||'—'}</td>
                      <td style={{padding:'10px 14px'}}>
                        <span className={`badge ${STATUS_BADGE[r.status]||'badge-gray'}`} style={{textTransform:'capitalize'}}>
                          {STATUS_ICON[r.status]} {r.status}
                        </span>
                      </td>
                      <td style={{padding:'10px 14px',fontSize:12,color:'var(--muted)'}}>{r.admin_notes||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }
      </div>

      {/* Request Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
            <div className="modal-header">
              <div className="modal-title">🏖️ Request Time Off</div>
              <button className="modal-close" onClick={()=>setShowForm(false)}>&#x2715;</button>
            </div>

            {err && <div style={{background:'#fff0f0',color:'#cc3333',borderRadius:8,padding:'10px 14px',fontSize:13,marginBottom:12,fontWeight:600}}>{err}</div>}

            <div className="form-group">
              <label className="form-label">Leave Type</label>
              <select className="input" value={form.leave_type} onChange={e=>setForm(p=>({...p,leave_type:e.target.value}))}>
                {LEAVE_TYPES.map(t=><option key={t} value={t} style={{textTransform:'capitalize'}}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>

            <div className="grid-2" style={{gap:8}}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input className="input" type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value,end_date:p.end_date||e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input className="input" type="date" value={form.end_date} min={form.start_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))}/>
              </div>
            </div>

            {days > 0 && (
              <div style={{background:'rgba(0,201,177,.08)',borderRadius:8,padding:'8px 14px',fontSize:13,fontWeight:700,color:'var(--teal)',marginBottom:12}}>
                📅 {days} business day{days!==1?'s':''} requested
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Reason (optional)</label>
              <textarea className="input" rows={3} value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} placeholder="Brief description of your request..."/>
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button className="btn btn-outline" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={saving||!form.start_date||!form.end_date}>{saving?'Submitting...':'Submit Request'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
