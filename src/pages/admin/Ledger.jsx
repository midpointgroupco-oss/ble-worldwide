import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const AV = ['av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8']
const CHARGE_CATS = ['tuition','fee','activity','field_trip','supply','other']
const CAT_ICON = { tuition:'🏫', fee:'📋', activity:'🎭', field_trip:'🚌', supply:'📦', other:'📝' }
const CAT_LABEL = { tuition:'Tuition', fee:'Fee', activity:'Activity', field_trip:'Field Trip', supply:'Supply', other:'Other' }

export default function AdminLedger() {
  const { profile } = useAuth()
  const [parents,  setParents]  = useState([])
  const [selected, setSelected] = useState(null)
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('all') // all | debit | credit
  const [search,   setSearch]   = useState('')
  const [showCharge, setShowCharge] = useState(false)
  const [showPay,    setShowPay]    = useState(false)
  const [form,     setForm]     = useState({ description:'', amount:'', category:'tuition', due_date:'' })
  const [payForm,  setPayForm]  = useState({ amount:'', note:'' })
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { loadParents() }, [])
  useEffect(() => { if (selected) loadEntries(selected.id) }, [selected, tab])

  async function loadParents() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id,full_name,email')
      .eq('role','parent')
      .order('full_name')
    // For each parent get their balance
    const parents = data || []
    const withBal = await Promise.all(parents.map(async p => {
      const { data: bal } = await supabase
        .from('parent_ledger')
        .select('type,amount')
        .eq('parent_id', p.id)
      const balance = (bal||[]).reduce((acc, e) => {
        return acc + (e.type === 'debit' ? Number(e.amount) : -Number(e.amount))
      }, 0)
      return { ...p, balance }
    }))
    setParents(withBal)
    setLoading(false)
  }

  async function loadEntries(parentId) {
    let q = supabase
      .from('parent_ledger')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false })
    if (tab !== 'all') q = q.eq('type', tab)
    const { data } = await q
    setEntries(data || [])
  }

  async function postCharge() {
    if (!form.description.trim() || !form.amount || !selected) return
    setSaving(true)
    const amount = Number(form.amount)
    // Get current balance first
    const { data: existing } = await supabase
      .from('parent_ledger')
      .select('type,amount')
      .eq('parent_id', selected.id)
    const currentBal = (existing||[]).reduce((acc, e) =>
      acc + (e.type === 'debit' ? Number(e.amount) : -Number(e.amount)), 0)
    const balanceAfter = currentBal + amount

    await supabase.from('parent_ledger').insert({
      parent_id:     selected.id,
      type:          'debit',
      amount,
      description:   form.description.trim(),
      category:      form.category,
      due_date:      form.due_date || null,
      balance_after: balanceAfter,
      created_by:    profile?.id,
    })
    setSaving(false)
    setShowCharge(false)
    setForm({ description:'', amount:'', category:'tuition', due_date:'' })
    loadParents()
    loadEntries(selected.id)
  }

  async function postManualPayment() {
    if (!payForm.amount || !selected) return
    setSaving(true)
    const amount = Number(payForm.amount)
    const { data: existing } = await supabase
      .from('parent_ledger')
      .select('type,amount')
      .eq('parent_id', selected.id)
    const currentBal = (existing||[]).reduce((acc, e) =>
      acc + (e.type === 'debit' ? Number(e.amount) : -Number(e.amount)), 0)
    const balanceAfter = currentBal - amount

    await supabase.from('parent_ledger').insert({
      parent_id:     selected.id,
      type:          'credit',
      amount,
      description:   payForm.note.trim() || 'Payment received',
      category:      'payment',
      balance_after: balanceAfter,
      created_by:    profile?.id,
    })
    setSaving(false)
    setShowPay(false)
    setPayForm({ amount:'', note:'' })
    loadParents()
    loadEntries(selected.id)
  }

  async function sendPayLink() {
    if (!selected) return
    const bal = selected.balance
    if (bal <= 0) return alert('No outstanding balance.')
    setSaving(true)
    try {
      const res = await fetch('/.netlify/functions/pay-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId:    selected.id,
          parentEmail: selected.email,
          parentName:  selected.full_name,
          amount:      bal,
          successUrl:  window.location.origin + '/parent/billing',
          cancelUrl:   window.location.origin + '/parent/billing',
        }),
      })
      const { url } = await res.json()
      if (url) {
        navigator.clipboard.writeText(url)
        alert('Payment link copied to clipboard! Share it with ' + selected.full_name)
      }
    } catch (e) {
      alert('Stripe not configured yet.')
    }
    setSaving(false)
  }

  const filtered = parents.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.email||'').toLowerCase().includes(search.toLowerCase())
  )
  const totalOwed = parents.reduce((a, p) => a + Math.max(0, p.balance), 0)

  return (
    <div>
      <div className="page-header fade-up">
        <div>
          <h2>💳 Parent Ledger</h2>
          <div style={{fontSize:13,color:'var(--muted)'}}>Running account balances for every parent</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:11,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>Total Outstanding</div>
          <div style={{fontSize:28,fontWeight:900,color:'#cc3333'}}>${totalOwed.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid-2 fade-up-2" style={{gap:16,alignItems:'start'}}>

        {/* Parent List */}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
            <input className="input" placeholder="Search parents..." value={search}
              onChange={e=>setSearch(e.target.value)} style={{margin:0}}/>
          </div>
          {loading
            ? <div style={{textAlign:'center',padding:32}}><div className="spinner"/></div>
            : filtered.length === 0
              ? <div className="empty-state" style={{padding:32}}><div className="es-icon">👨‍👩‍👧</div><div className="es-text">No parents found</div></div>
              : filtered.map((p, idx) => (
                <div key={p.id} onClick={() => setSelected(p)}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',
                    background: selected?.id===p.id ? 'rgba(0,201,177,.07)' : 'white',
                    borderBottom:'1px solid var(--border)',
                    borderLeft: selected?.id===p.id ? '3px solid var(--teal)' : '3px solid transparent'}}>
                  <div className={`avatar avatar-sm ${AV[idx%8]}`}>
                    {p.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'??'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13}}>{p.full_name}</div>
                    <div style={{fontSize:11,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.email}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontWeight:900,fontSize:14,color: p.balance>0 ? '#cc3333' : p.balance<0 ? 'var(--teal)' : 'var(--muted)'}}>
                      {p.balance > 0 ? '+' : ''}{p.balance.toFixed(2)}
                    </div>
                    <div style={{fontSize:10,color:'var(--muted)'}}>
                      {p.balance > 0 ? 'owes' : p.balance < 0 ? 'credit' : 'even'}
                    </div>
                  </div>
                </div>
              ))
          }
        </div>

        {/* Ledger Detail */}
        <div>
          {!selected ? (
            <div className="card">
              <div className="empty-state"><div className="es-icon">👈</div><div className="es-text">Select a parent to view their ledger</div></div>
            </div>
          ) : (
            <div>
              {/* Balance card */}
              <div className="card" style={{marginBottom:12,borderTop:`3px solid ${selected.balance>0?'#cc3333':'var(--teal)'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                  <div>
                    <div style={{fontWeight:900,fontSize:16,marginBottom:2}}>{selected.full_name}</div>
                    <div style={{fontSize:12,color:'var(--muted)'}}>{selected.email}</div>
                    <div style={{marginTop:8}}>
                      <span style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1}}>Current Balance </span>
                      <span style={{fontSize:24,fontWeight:900,color:selected.balance>0?'#cc3333':selected.balance<0?'var(--teal)':'var(--muted)'}}>
                        ${Math.abs(selected.balance).toFixed(2)}
                      </span>
                      <span style={{fontSize:12,color:'var(--muted)',marginLeft:6}}>
                        {selected.balance>0 ? 'owed' : selected.balance<0 ? 'credit on account' : 'all paid up'}
                      </span>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <button className="btn btn-outline" style={{fontSize:12}} onClick={()=>setShowPay(true)}>+ Record Payment</button>
                    <button className="btn btn-outline" style={{fontSize:12}} onClick={sendPayLink} disabled={saving}>&#128279; Send Pay Link</button>
                    <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>setShowCharge(true)}>+ Post Charge</button>
                  </div>
                </div>
              </div>

              {/* Transaction history */}
              <div className="card" style={{padding:0,overflow:'hidden'}}>
                <div style={{display:'flex',gap:4,padding:'10px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg)'}}>
                  {[['all','All'],['debit','Charges'],['credit','Payments']].map(([k,l]) => (
                    <button key={k} onClick={()=>setTab(k)} style={{padding:'5px 12px',border:'none',borderRadius:20,cursor:'pointer',fontWeight:700,fontSize:11,background:tab===k?'var(--teal)':'transparent',color:tab===k?'white':'var(--muted)'}}>{l}</button>
                  ))}
                </div>
                {entries.length === 0
                  ? <div className="empty-state" style={{padding:32}}><div className="es-icon">📋</div><div className="es-text">No transactions yet</div></div>
                  : (
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                      <thead>
                        <tr style={{background:'var(--bg)',borderBottom:'2px solid var(--border)'}}>
                          {['Date','Description','Category','Amount','Balance'].map(h => (
                            <th key={h} style={{padding:'9px 14px',textAlign:'left',fontWeight:700,fontSize:11,color:'var(--muted)',textTransform:'uppercase'}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map(e => (
                          <tr key={e.id} style={{borderBottom:'1px solid var(--border)'}}>
                            <td style={{padding:'10px 14px',color:'var(--muted)',fontSize:12,whiteSpace:'nowrap'}}>
                              {new Date(e.created_at).toLocaleDateString()}
                            </td>
                            <td style={{padding:'10px 14px',fontWeight:600}}>{e.description}</td>
                            <td style={{padding:'10px 14px'}}>
                              <span style={{fontSize:11}}>{CAT_ICON[e.category]||'📋'} {CAT_LABEL[e.category]||e.category}</span>
                            </td>
                            <td style={{padding:'10px 14px',fontWeight:800,color:e.type==='debit'?'#cc3333':'var(--teal)'}}>
                              {e.type==='debit'?'+':'-'}${Number(e.amount).toFixed(2)}
                            </td>
                            <td style={{padding:'10px 14px',fontWeight:700,color:'var(--muted)',fontSize:12}}>
                              ${Number(e.balance_after||0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post Charge Modal */}
      {showCharge && (
        <div className="modal-overlay" onClick={()=>setShowCharge(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
            <div className="modal-header">
              <div className="modal-title">Post Charge — {selected?.full_name}</div>
              <button className="modal-close" onClick={()=>setShowCharge(false)}>&#x2715;</button>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="input" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="e.g. October Tuition"/>
            </div>
            <div className="grid-2" style={{gap:8}}>
              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} placeholder="0.00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="input" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                  {CHARGE_CATS.map(c=><option key={c} value={c}>{CAT_LABEL[c]||c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date (optional)</label>
              <input className="input" type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))}/>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button className="btn btn-outline" onClick={()=>setShowCharge(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={postCharge} disabled={saving||!form.description.trim()||!form.amount}>
                {saving?'Posting...':'Post Charge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPay && (
        <div className="modal-overlay" onClick={()=>setShowPay(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:380}}>
            <div className="modal-header">
              <div className="modal-title">Record Payment — {selected?.full_name}</div>
              <button className="modal-close" onClick={()=>setShowPay(false)}>&#x2715;</button>
            </div>
            <div style={{background:'var(--bg)',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:13}}>
              Current balance: <strong style={{color:'#cc3333'}}>${selected?.balance?.toFixed(2)}</strong>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Amount ($)</label>
              <input className="input" type="number" step="0.01" min="0" value={payForm.amount}
                onChange={e=>setPayForm(p=>({...p,amount:e.target.value}))} placeholder="0.00"/>
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input className="input" value={payForm.note} onChange={e=>setPayForm(p=>({...p,note:e.target.value}))} placeholder="e.g. Cash payment, check #1234"/>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button className="btn btn-outline" onClick={()=>setShowPay(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={postManualPayment} disabled={saving||!payForm.amount}>
                {saving?'Saving...':'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
