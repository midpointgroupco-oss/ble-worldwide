import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const ROLES = ['admin', 'teacher', 'parent']
const ROLE_COLORS = { admin: 'av-1', teacher: 'av-2', parent: 'av-4' }
const ROLE_BADGES = { admin: 'badge-purple', teacher: 'badge-blue', parent: 'badge-green' }
const AV = ['av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8']

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo',
  'Asia/Dubai', 'Asia/Kolkata', 'Africa/Accra', 'Australia/Sydney'
]

const SUBJECTS = [
  'English', 'Mathematics', 'Science', 'Social Studies', 'World Language',
  'Physical Education', 'Fine Arts', 'Technology', 'Health', 'Elective',
  'History', 'Music', 'Drama', 'Art', 'Administration'
]

const GRADE_LEVELS = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th','All Grades']

export default function AdminStaff() {
  const [staff, setStaff]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterRole, setFilterRole] = useState('all')
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'invite'
  const [selected, setSelected]   = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [deactivateModal, setDeactivateModal] = useState(null)
  const [deactivateReason, setDeactivateReason] = useState('')

  useEffect(() => { loadStaff() }, [])

  async function loadStaff() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('role')
      .order('full_name')
    setStaff(data || [])
    setLoading(false)
  }

  const filtered = staff.filter(s => {
    const matchRole   = filterRole === 'all' || s.role === filterRole
    const matchSearch = s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                        s.email?.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const counts = {
    all:     staff.length,
    admin:   staff.filter(s => s.role === 'admin').length,
    teacher: staff.filter(s => s.role === 'teacher').length,
    parent:  staff.filter(s => s.role === 'parent').length,
    substitutes: staff.filter(s => s.is_substitute).length,
  }

  function openCreate() { setModalMode('create'); setShowModal(true) }
  function openInvite() { setModalMode('invite'); setShowModal(true) }

  function openDetail(member) { setSelected(member); setShowDetail(true) }

  async function deactivateStaff(member) {
    await supabase.from('profiles').update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
      deactivated_reason: deactivateReason || 'Deactivated by admin'
    }).eq('id', member.id)
    setDeactivateModal(null)
    setDeactivateReason('')
    loadStaff()
  }

  async function toggleMessagingBlock(member) {
    const blocked = !member.messaging_blocked
    await supabase.from('profiles').update({
      messaging_blocked: blocked,
      messaging_blocked_reason: blocked ? 'Blocked by admin' : null
    }).eq('id', member.id)
    loadStaff()
  }

  async function reactivateStaff(member) {
    await supabase.from('profiles').update({
      is_active: true,
      deactivated_at: null,
      deactivated_reason: null
    }).eq('id', member.id)
    loadStaff()
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header fade-up">
        <h2>Staff & Users</h2>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline" onClick={openInvite}>✉️ Send Invite</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Create Login</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-4 fade-up-2">
        {[
          { label:'Total Users',  value: counts.all,     icon:'👥', cls:'sc-teal' },
          { label:'Admins',       value: counts.admin,   icon:'🏛️', cls:'sc-violet' },
          { label:'Teachers',     value: counts.teacher, icon:'👩‍🏫', cls:'sc-coral' },
          { label:'Parents',      value: counts.parent,  icon:'👨‍👩‍👧', cls:'sc-gold' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-row fade-up-3">
        {['all','admin','teacher','parent'].map(r => (
          <div key={r} className={`filter-chip ${filterRole===r?'active':''}`} onClick={() => setFilterRole(r)}>
            {r === 'all' ? `All (${counts.all})` : `${r.charAt(0).toUpperCase()+r.slice(1)}s (${counts[r]})`}
          </div>
        ))}
        <div className={`filter-chip ${filterRole==='substitutes'?'active':''}`} onClick={() => setFilterRole('substitutes')}>
          🔄 Substitutes ({counts.substitutes})
        </div>
        <input
          className="input"
          style={{ marginLeft:'auto', width:200 }}
          placeholder="🔍 Search staff…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filterRole === 'substitutes' && (
        <div className="card fade-up-3" style={{marginBottom:16}}>
          <div className="card-header">
            <div className="card-title">🔄 Substitute Availability</div>
            <div style={{fontSize:12,color:'var(--muted)'}}>{staff.filter(s=>s.is_substitute&&s.sub_available).length} available now</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10}}>
            {staff.filter(s=>s.is_substitute).sort((a,b)=>(b.sub_available?1:0)-(a.sub_available?1:0)).map(s=>(
              <div key={s.id} style={{border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',background:s.sub_available?'#f0fff8':'#fff8f8'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <div className="avatar avatar-sm av-2" style={{width:32,height:32,fontSize:11}}>
                    {s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'?'}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{s.full_name}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>{s.subject||'Any subject'}</div>
                  </div>
                  <span className={'badge '+(s.sub_available?'badge-green':'badge-red')}>
                    {s.sub_available?'Available':'Unavailable'}
                  </span>
                </div>
                {s.sub_notes&&<div style={{fontSize:11,color:'var(--muted)',lineHeight:1.5,marginTop:4}}>{s.sub_notes}</div>}
                <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{s.email}</div>
              </div>
            ))}
            {staff.filter(s=>s.is_substitute).length===0&&(
              <div style={{textAlign:'center',padding:20,color:'var(--muted)',fontSize:13,gridColumn:'1/-1'}}>
                No staff marked as substitutes yet. Edit a staff member to enable.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff table */}
      <div className="card fade-up-4">
        {loading ? (
          <div className="loading-screen" style={{ height:200 }}><div className="spinner"/></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="es-icon">👥</div>
            <div className="es-text">No staff members found.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Subject / Grade</th>
                <th>Timezone</th>
                <th>Sub</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member, i) => (
                <tr key={member.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <div className={`avatar avatar-sm ${AV[i%8]}`}>
                        {member.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2) || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:12 }}>
                          {member.full_name}
                          {member.is_active===false && <span style={{marginLeft:6,fontSize:10,fontWeight:700,color:'#cc3333',background:'#fff0f0',padding:'1px 6px',borderRadius:4}}>Inactive</span>}
                          {member.messaging_blocked && <span style={{marginLeft:4,fontSize:10,fontWeight:700,color:'#7b5ea7',background:'#f5f0ff',padding:'1px 6px',borderRadius:4}}>Msgs Blocked</span>}
                        </div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>
                          Joined {new Date(member.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${ROLE_BADGES[member.role]}`}>
                      {member.role}
                    </span>
                  </td>
                  <td style={{ fontSize:11 }}>{member.email || '—'}</td>
                  <td style={{ fontSize:11 }}>{member.phone || '—'}</td>
                  <td style={{ fontSize:11 }}>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      {member.subject && member.subject.split(',').map(s=>s.trim()).filter(Boolean).map(s=>(
                        <span key={s} className="badge badge-blue" style={{fontSize:9,padding:'2px 7px'}}>{s}</span>
                      ))}
                      {member.grade_assigned && member.grade_assigned.split(',').map(s=>s.trim()).filter(Boolean).map(g=>(
                        <span key={g} className="badge" style={{fontSize:9,padding:'2px 7px',background:'#ede9f7',color:'#5a3e9a',fontWeight:700}}>{g}</span>
                      ))}
                      {!member.subject && !member.grade_assigned && '—'}
                    </div>
                  </td>
                  <td style={{ fontSize:11 }}>{member.timezone || 'UTC'}</td>
                  <td>
                    {member.is_substitute
                      ? <span className={'badge '+(member.sub_available?'badge-green':'badge-yellow')}>{member.sub_available?'✅ Available':'⏸ Unavail.'}</span>
                      : <span style={{color:'var(--muted)',fontSize:11}}>—</span>}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openDetail(member)}>
                        View
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => { setSelected(member); setModalMode('edit'); setShowModal(true) }}
                      >
                        Edit
                      </button>
                      {member.is_active === false
                        ? <button className="btn btn-sm" style={{background:'#e6fff4',color:'#00804a',border:'1px solid #b0eedd'}} onClick={()=>reactivateStaff(member)}>✅ Reactivate</button>
                        : <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc'}} onClick={()=>{ setDeactivateModal(member); setDeactivateReason('') }}>🚫 Deactivate</button>
                      }
                      {member.role === 'parent' && (
                        member.messaging_blocked
                          ? <button className="btn btn-sm" style={{background:'#e6fff4',color:'#00804a',border:'1px solid #b0eedd',fontSize:11}} onClick={()=>toggleMessagingBlock(member)}>💬 Unblock</button>
                          : <button className="btn btn-sm" style={{background:'#f5f0ff',color:'#7b5ea7',border:'1px solid #d4b0ff',fontSize:11}} onClick={()=>toggleMessagingBlock(member)}>🔇 Block Msgs</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <StaffModal
          mode={modalMode}
          member={modalMode === 'edit' ? selected : null}
          onClose={() => { setShowModal(false); setSelected(null) }}
          onSaved={() => { setShowModal(false); setSelected(null); loadStaff() }}
        />
      )}

      {showDetail && selected && (
        <StaffDetailModal
          member={selected}
          onClose={() => { setShowDetail(false); setSelected(null) }}
          onEdit={() => { setShowDetail(false); setModalMode('edit'); setShowModal(true) }}
        />
      )}

      {deactivateModal && (
        <div className="modal-overlay" onClick={()=>{ setDeactivateModal(null); setDeactivateReason('') }}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
            <div className="modal-header">
              <div className="modal-title">🚫 Deactivate Staff Member</div>
              <button className="modal-close" onClick={()=>{ setDeactivateModal(null); setDeactivateReason('') }}>✕</button>
            </div>
            <p style={{fontSize:13,color:'var(--text)',marginBottom:12}}>
              Deactivating <strong>{deactivateModal.full_name}</strong> will prevent them from logging in. Their records and classes are preserved. You can reactivate them at any time.
            </p>
            <div className="form-group">
              <label className="input-label">Reason</label>
              <select className="input" value={deactivateReason} onChange={e=>setDeactivateReason(e.target.value)}>
                <option value="">— Select reason —</option>
                <option>Resigned</option>
                <option>Contract ended</option>
                <option>Terminated</option>
                <option>On leave</option>
                <option>Retired</option>
                <option>Other</option>
              </select>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
              <button className="btn btn-outline" onClick={()=>{ setDeactivateModal(null); setDeactivateReason('') }}>Cancel</button>
              <button className="btn" style={{background:'#cc3333',color:'white'}} onClick={()=>deactivateStaff(deactivateModal)} disabled={!deactivateReason}>Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CREATE / EDIT / INVITE MODAL ──
function StaffModal({ mode, member, onClose, onSaved }) {
  const isInvite = mode === 'invite'
  const isEdit   = mode === 'edit'

  const [form, setForm] = useState({
    full_name:      member?.full_name      || '',
    email:          member?.email          || '',
    password:       '',
    role:           member?.role           || 'teacher',
    phone:          member?.phone          || '',
    subjects:       member?.subject ? member.subject.split(',').map(s=>s.trim()).filter(Boolean) : [],
    is_admin:       member?.is_admin || false,
    grade_assigned: member?.grade_assigned ? member.grade_assigned.split(',').map(s=>s.trim()).filter(Boolean) : [],
    timezone:       member?.timezone       || 'UTC',
    notes:          member?.notes          || '',
    is_substitute:  member?.is_substitute  || false,
    sub_available:  member?.sub_available  || false,
    sub_notes:      member?.sub_notes      || '',
  })

  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  function update(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        mode:           isInvite ? 'invite' : isEdit ? 'update' : 'create',
        email:          form.email,
        password:       form.password,
        full_name:      form.full_name,
        role:           form.role,
        phone:          form.phone,
        subject:        form.subjects.join(', '),
        is_admin:       form.is_admin,
        grade_assigned: form.grade_assigned.join(', '),
        timezone:       form.timezone,
        notes:          form.notes,
        ...(isEdit && { userId: member.id })
      }

      const res  = await fetch('/.netlify/functions/create-user', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong')
        setSaving(false)
        return
      }

      setSuccess(data.message)
      setSaving(false)
      setTimeout(onSaved, 1500)

    } catch (err) {
      setError(err.message || 'Network error')
      setSaving(false)
    }
  }

  const title = isInvite ? '✉️ Send Staff Invite' : isEdit ? '✏️ Edit Staff Member' : '+ Create Staff Login'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error   && <div className="error-msg">{error}</div>}
        {success && <div style={{ background:'#e6faf5', border:'1px solid #b0eedd', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#067a60', marginBottom:12 }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="input-label">Full Name</label>
              <input className="input" required value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="First and last name"/>
            </div>
            <div className="form-group">
              <label className="input-label">Role</label>
              <select className="select" value={form.role} onChange={e => update('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Email Address</label>
              <input className="input" type="email" required value={form.email} onChange={e => update('email', e.target.value)} placeholder="email@example.com" disabled={isEdit}/>
            </div>
            {!isInvite && !isEdit && (
              <div className="form-group">
                <label className="input-label">Temporary Password</label>
                <input className="input" type="password" required={!isInvite} value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min 6 characters"/>
              </div>
            )}
            <div className="form-group">
              <label className="input-label">Phone Number</label>
              <input className="input" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="(555) 000-0000"/>
            </div>
            <div className="form-group">
              <label className="input-label">Timezone</label>
              <select className="select" value={form.timezone} onChange={e => update('timezone', e.target.value)}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            {form.role === 'teacher' && (
              <>
                <div className="form-group">
                  <label className="input-label">Subjects Taught</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:10,background:'var(--bg)'}}>
                    {SUBJECTS.map(s => {
                      const checked = form.subjects.includes(s)
                      return (
                        <button type="button" key={s} onClick={() => {
                          update('subjects', checked ? form.subjects.filter(x=>x!==s) : [...form.subjects, s])
                        }} style={{padding:'4px 12px',borderRadius:20,border:'2px solid',fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .15s',
                          borderColor: checked ? 'var(--teal)' : 'var(--border)',
                          background:  checked ? 'var(--teal)' : 'white',
                          color:       checked ? 'white' : 'var(--muted)'}}>
                          {s}
                        </button>
                      )
                    })}
                  </div>
                  {form.subjects.length === 0 && <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Select at least one subject</div>}
                </div>
                <div className="form-group">
                  <label className="input-label">Grade Levels</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:10,background:'var(--bg)'}}>
                    {GRADE_LEVELS.map(g => {
                      const checked = form.grade_assigned.includes(g)
                      return (
                        <button type="button" key={g} onClick={() => {
                          update('grade_assigned', checked ? form.grade_assigned.filter(x=>x!==g) : [...form.grade_assigned, g])
                        }} style={{padding:'4px 12px',borderRadius:20,border:'2px solid',fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .15s',
                          borderColor: checked ? 'var(--violet,#7b5ea7)' : 'var(--border)',
                          background:  checked ? 'var(--violet,#7b5ea7)' : 'white',
                          color:       checked ? 'white' : 'var(--muted)'}}>
                          {g}
                        </button>
                      )
                    })}
                  </div>
                  {form.grade_assigned.length === 0 && <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Select at least one grade level</div>}
                </div>
                <div className="form-group">
                  <label className="input-label">Admin Access</label>
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',border:'1px solid var(--border)',borderRadius:10,background:form.is_admin?'#fff0f5':'var(--bg)'}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>Grant Admin Portal Access</div>
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Teacher can switch between Teacher and Admin portals</div>
                    </div>
                    <button type="button" onClick={()=>update('is_admin',!form.is_admin)}
                      style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',transition:'all .2s',position:'relative',
                        background:form.is_admin?'#f72585':'#ccc'}}>
                      <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,
                        left:form.is_admin?23:3,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="form-group">
            <label className="input-label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional notes about this staff member…" style={{ resize:'vertical' }}/>
          </div>

          {/* Substitute settings */}
          <div style={{background:'var(--bg)',borderRadius:10,padding:'12px 14px',marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:12,marginBottom:10}}>🔄 Substitute Teacher</div>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,marginBottom:8,cursor:'pointer'}}>
              <input type="checkbox" checked={form.is_substitute} onChange={e=>update('is_substitute',e.target.checked)}/>
              This staff member is available as a substitute teacher
            </label>
            {form.is_substitute && (
              <>
                <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,marginBottom:8,cursor:'pointer'}}>
                  <input type="checkbox" checked={form.sub_available} onChange={e=>update('sub_available',e.target.checked)}/>
                  Currently available for sub assignments
                </label>
                <textarea
                  className="input" rows={2}
                  placeholder="Grades/subjects they can cover, scheduling notes..."
                  value={form.sub_notes} onChange={e=>update('sub_notes',e.target.value)}
                  style={{resize:'vertical'}}/>
              </>
            )}
          </div>

          {isInvite && (
            <div style={{ background:'#e6f4ff', border:'1px solid #b0d8ff', borderRadius:10, padding:'10px 14px', fontSize:11, color:'#005eb0', marginBottom:12 }}>
              ℹ️ An invite email will be sent to this address. They will set their own password when they accept.
            </div>
          )}
          {!isInvite && !isEdit && (
            <div style={{ background:'#fff9e6', border:'1px solid #ffe599', borderRadius:10, padding:'10px 14px', fontSize:11, color:'#b07800', marginBottom:12 }}>
              ⚠️ Share the temporary password with the staff member. They should change it after first login.
            </div>
          )}

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isInvite ? 'Send Invite ✉️' : isEdit ? 'Save Changes' : 'Create Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── STAFF DETAIL MODAL ──
function StaffDetailModal({ member, onClose, onEdit }) {
  const avColor = ROLE_COLORS[member.role] || 'av-1'
  const initials = member.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2) || '?'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width:460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Staff Profile</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Profile header */}
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 0 20px', borderBottom:'1px solid var(--bg)', marginBottom:16 }}>
          <div className={`avatar avatar-lg ${avColor}`}>{initials}</div>
          <div>
            <div style={{ fontFamily:'Nunito,sans-serif', fontWeight:900, fontSize:18 }}>{member.full_name}</div>
            <div style={{ display:'flex', gap:7, alignItems:'center', marginTop:4 }}>
              <span className={`badge ${ROLE_BADGES[member.role]}`}>{member.role}</span>
              {member.subject && member.subject.split(',').map(s=>s.trim()).filter(Boolean).map(s=>(
                <span key={s} className="badge badge-blue" style={{marginRight:4}}>{s}</span>
              ))}
              {member.grade_assigned && member.grade_assigned.split(',').map(s=>s.trim()).filter(Boolean).map(g=>(
                <span key={g} className="badge" style={{marginRight:4,background:'#ede9f7',color:'#5a3e9a',fontWeight:700}}>{g}</span>
              ))}
              {member.grade_assigned && <span className="badge badge-gray">{member.grade_assigned}</span>}
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 20px', marginBottom:16 }}>
          {[
            ['📧 Email',    member.email    || '—'],
            ['📞 Phone',    member.phone    || '—'],
            ['🌍 Timezone', member.timezone || 'UTC'],
            ['📅 Joined',   new Date(member.created_at).toLocaleDateString()],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:2 }}>{label}</div>
              <div style={{ fontSize:13, fontWeight:500 }}>{value}</div>
            </div>
          ))}
        </div>

        {member.notes && (
          <div style={{ background:'var(--bg)', borderRadius:10, padding:'10px 13px', fontSize:12, color:'var(--muted)', marginBottom:16 }}>
            📝 {member.notes}
          </div>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={onEdit}>✏️ Edit Profile</button>
        </div>
      </div>
    </div>
  )
}