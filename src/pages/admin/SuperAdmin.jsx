import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const TABS = [
  ['dashboard',  '👑 Overview'],
  ['users',      '👥 User Management'],
  ['settings',   '⚙️ Platform Settings'],
  ['audit',      '📋 Audit Log'],
  ['danger',     '⚠️ Danger Zone'],
]

// ── Shared save to audit log ───────────────────────────────────────────────
async function logAction(actorId, actorName, action, targetType='', targetId='', details='') {
  await supabase.from('audit_log').insert([{ actor_id:actorId, actor_name:actorName, action, target_type:targetType, target_id:targetId, details }])
}

export default function SuperAdminDashboard() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('dashboard')

  return (
    <div>
      <div className="page-header fade-up">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#f72585,#7b5ea7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>👑</div>
          <div>
            <h2 style={{margin:0}}>Super Admin Panel</h2>
            <div style={{fontSize:11,color:'var(--muted)'}}>Full platform control — restricted access</div>
          </div>
        </div>
        <div style={{background:'#fff0f7',border:'1px solid #ffccdd',borderRadius:8,padding:'4px 12px',fontSize:11,fontWeight:700,color:'#f72585'}}>
          👑 {profile?.full_name}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,borderBottom:'2px solid var(--border)',marginBottom:20}}>
        {TABS.map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding:'9px 16px', border:'none', cursor:'pointer', fontSize:12, fontWeight: tab===k?800:500,
            borderBottom: tab===k?'3px solid #f72585':'3px solid transparent',
            marginBottom:-2, background:'none',
            color: tab===k?'#f72585':'var(--muted)', whiteSpace:'nowrap'
          }}>{l}</button>
        ))}
      </div>

      {tab === 'dashboard'  && <OverviewTab/>}
      {tab === 'users'      && <UserManagementTab/>}
      {tab === 'settings'   && <PlatformSettingsTab/>}
      {tab === 'audit'      && <AuditLogTab/>}
      {tab === 'danger'     && <DangerZoneTab/>}
    </div>
  )
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────
function OverviewTab() {
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id,role'),
      supabase.from('students').select('id',{count:'exact',head:true}),
      supabase.from('courses').select('id',{count:'exact',head:true}).eq('is_active',true),
      supabase.from('billing').select('amount,status'),
      supabase.from('audit_log').select('id,action,actor_name,created_at').order('created_at',{ascending:false}).limit(5),
    ]).then(([{data:prof},{count:studs},{count:courses},{data:bill},{data:audit}]) => {
      const roles = {}
      ;(prof||[]).forEach(p => { roles[p.role] = (roles[p.role]||0)+1 })
      const revenue = (bill||[]).filter(b=>b.status==='paid').reduce((a,b)=>a+Number(b.amount||0),0)
      setCounts({ ...roles, students:studs||0, courses:courses||0, revenue, recentAudit:audit||[] })
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>

  return (
    <>
      <div className="grid-4 fade-up-2">
        {[
          {icon:'👥',label:'Students',     value:counts.students||0,     color:'var(--teal)'},
          {icon:'👩‍🏫',label:'Teachers',     value:counts.teacher||0,      color:'var(--sky)'},
          {icon:'🛡',label:'Admins',        value:(counts.admin||0)+(counts.super_admin||0), color:'#f72585'},
          {icon:'📚',label:'Active Courses',value:counts.courses||0,      color:'var(--violet,#7b5ea7)'},
        ].map(s=>(
          <div key={s.label} className="card" style={{textAlign:'center',padding:20,borderTop:`4px solid ${s.color}`}}>
            <div style={{fontSize:28}}>{s.icon}</div>
            <div style={{fontSize:26,fontWeight:900,color:s.color,margin:'6px 0'}}>{s.value}</div>
            <div style={{fontSize:12,color:'var(--muted)'}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid-2 fade-up-3" style={{marginTop:16}}>
        <div className="card">
          <div className="card-header"><div className="card-title">💳 Revenue Collected</div></div>
          <div style={{fontSize:32,fontWeight:900,color:'var(--teal)',padding:'8px 0'}}>${counts.revenue?.toLocaleString()||'0'}</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>Total paid billing</div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">📋 Recent Activity</div></div>
          {counts.recentAudit?.length === 0
            ? <div style={{fontSize:12,color:'var(--muted)'}}>No activity logged yet.</div>
            : counts.recentAudit?.map((a,i) => (
                <div key={a.id} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:8,paddingBottom:8,borderBottom:i<counts.recentAudit.length-1?'1px solid var(--border)':'none'}}>
                  <div style={{fontSize:11,flex:1}}>
                    <span style={{fontWeight:700}}>{a.actor_name||'System'}</span>
                    <span style={{color:'var(--muted)'}}> {a.action}</span>
                  </div>
                  <div style={{fontSize:10,color:'var(--muted)',whiteSpace:'nowrap'}}>{new Date(a.created_at).toLocaleDateString()}</div>
                </div>
              ))
          }
        </div>
      </div>
    </>
  )
}

// ── USER MANAGEMENT TAB ────────────────────────────────────────────────────
function UserManagementTab() {
  const { profile } = useAuth()
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editUser,   setEditUser]   = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState('')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('role').order('full_name')
    setUsers(data || [])
    setLoading(false)
  }

  const ROLE_BADGE = {
    super_admin:'#f72585', admin:'var(--coral)', teacher:'var(--teal)',
    parent:'var(--sky)', student:'var(--gold)'
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  async function saveUser(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('profiles').update({
      full_name: editUser.full_name,
      role:      editUser.role,
      is_admin:  editUser.role === 'teacher' ? editUser.is_admin : false,
    }).eq('id', editUser.id)
    await logAction(profile.id, profile.full_name, `Updated user role/name`, 'profile', editUser.id, `Set role to ${editUser.role}`)
    setSaving(false)
    setMsg('✅ User updated')
    setEditUser(null)
    loadUsers()
    setTimeout(() => setMsg(''), 3000)
  }

  async function promoteToAdmin(u) {
    if (!confirm(`Promote ${u.full_name} to Admin? They will have full admin portal access.`)) return
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', u.id)
    await logAction(profile.id, profile.full_name, `Promoted user to admin`, 'profile', u.id, u.full_name)
    loadUsers()
  }

  async function demoteToTeacher(u) {
    if (!confirm(`Demote ${u.full_name} back to Teacher?`)) return
    await supabase.from('profiles').update({ role: 'teacher', is_admin: false }).eq('id', u.id)
    await logAction(profile.id, profile.full_name, `Demoted admin to teacher`, 'profile', u.id, u.full_name)
    loadUsers()
  }

  return (
    <div>
      {msg && <div style={{background:'#f0fdf9',border:'1px solid var(--teal)',borderRadius:8,padding:'8px 14px',marginBottom:12,fontSize:13,fontWeight:700,color:'var(--teal)'}}>{msg}</div>}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <input className="input" style={{width:220}} placeholder="🔍 Search name or email…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="filter-row" style={{margin:0}}>
          {['all','super_admin','admin','teacher','parent','student'].map(r=>(
            <div key={r} className={`filter-chip ${roleFilter===r?'active':''}`} onClick={()=>setRoleFilter(r)} style={{textTransform:'capitalize'}}>
              {r==='all'?'All Roles':r.replace('_',' ')}
            </div>
          ))}
        </div>
        <div style={{marginLeft:'auto',fontSize:12,color:'var(--muted)'}}>{filtered.length} users</div>
      </div>

      {loading ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
      : <div className="card" style={{padding:0}}>
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Admin Access</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td style={{fontWeight:700}}>{u.full_name||'—'}</td>
                  <td style={{fontSize:12,color:'var(--muted)'}}>{u.email||'—'}</td>
                  <td>
                    <span style={{
                      padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:800,
                      background: ROLE_BADGE[u.role]+'22',
                      color: ROLE_BADGE[u.role]||'var(--muted)',
                      border:`1px solid ${ROLE_BADGE[u.role]||'var(--border)'}`,
                      textTransform:'capitalize'
                    }}>{u.role?.replace('_',' ')||'—'}</span>
                  </td>
                  <td>
                    {u.is_admin && u.role==='teacher'
                      ? <span className="badge" style={{background:'#fff0f5',color:'#f72585',border:'1px solid #ffccdd'}}>+Admin</span>
                      : <span style={{color:'var(--muted)',fontSize:12}}>—</span>
                    }
                  </td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-sm btn-outline" onClick={()=>setEditUser({...u})}>✏️ Edit</button>
                      {u.role==='teacher' && (
                        <button className="btn btn-sm" style={{background:'#fff0f5',color:'#f72585',border:'1px solid #ffccdd',fontSize:11}}
                          onClick={()=>promoteToAdmin(u)}>⬆️ Admin</button>
                      )}
                      {u.role==='admin' && (
                        <button className="btn btn-sm btn-outline" style={{fontSize:11}} onClick={()=>demoteToTeacher(u)}>⬇️ Teacher</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }

      {/* Edit modal */}
      {editUser && (
        <div className="modal-overlay" onClick={()=>setEditUser(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
            <div className="modal-header">
              <div className="modal-title">✏️ Edit User — {editUser.full_name}</div>
              <button className="modal-close" onClick={()=>setEditUser(null)}>✕</button>
            </div>
            <form onSubmit={saveUser}>
              <div className="form-group">
                <label className="input-label">Full Name</label>
                <input className="input" value={editUser.full_name||''} onChange={e=>setEditUser(p=>({...p,full_name:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="input-label">Role</label>
                <select className="input" value={editUser.role} onChange={e=>setEditUser(p=>({...p,role:e.target.value}))}>
                  {['super_admin','admin','teacher','parent','student'].map(r=>(
                    <option key={r} value={r} style={{textTransform:'capitalize'}}>{r.replace('_',' ')}</option>
                  ))}
                </select>
              </div>
              {editUser.role==='teacher' && (
                <div className="form-group">
                  <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                    <input type="checkbox" checked={editUser.is_admin||false} onChange={e=>setEditUser(p=>({...p,is_admin:e.target.checked}))}/>
                    <span className="input-label" style={{margin:0}}>Grant Admin Portal Access</span>
                  </label>
                </div>
              )}
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
                <button type="button" className="btn btn-outline" onClick={()=>setEditUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── PLATFORM SETTINGS TAB ─────────────────────────────────────────────────
function PlatformSettingsTab() {
  const { profile } = useAuth()
  const [settings, setSettings] = useState({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    supabase.from('platform_settings').select('*').then(({ data }) => {
      const map = {}
      ;(data||[]).forEach(s => { map[s.key] = s.value })
      setSettings(map)
      setLoading(false)
    })
  }, [])

  function update(key, value) { setSettings(p => ({ ...p, [key]: value })) }

  async function saveAll() {
    setSaving(true)
    const updates = Object.entries(settings).map(([key, value]) =>
      supabase.from('platform_settings').upsert({ key, value, updated_by: profile.id, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    )
    await Promise.all(updates)
    await logAction(profile.id, profile.full_name, 'Updated platform settings', 'settings', '', Object.keys(settings).join(', '))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>

  return (
    <div>
      {saved && <div style={{background:'#f0fdf9',border:'1px solid var(--teal)',borderRadius:8,padding:'8px 14px',marginBottom:12,fontSize:13,fontWeight:700,color:'var(--teal)'}}>✅ Settings saved successfully</div>}
      <div className="grid-2 fade-up">
        <div className="card">
          <div className="card-header"><div className="card-title">🏫 School Profile</div></div>
          {[
            ['school_name',    'School Name',    'text',  'BLE Worldwide'],
            ['school_email',   'Admin Email',    'email', 'admin@bleworldwide.edu'],
            ['school_phone',   'Phone Number',   'text',  '+1 (555) 000-0000'],
            ['school_address', 'Address',        'text',  '123 School Lane'],
            ['academic_year',  'Academic Year',  'text',  '2025-2026'],
            ['default_timezone','Default Timezone','text','UTC'],
          ].map(([key, label, type, placeholder]) => (
            <div key={key} className="form-group">
              <label className="input-label">{label}</label>
              <input className="input" type={type} value={settings[key]||''} onChange={e=>update(key,e.target.value)} placeholder={placeholder}/>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">⚙️ Platform Controls</div></div>
          {[
            ['allow_enrollment', 'Allow New Enrollments',   'Accept new student applications via /apply'],
            ['maintenance_mode', 'Maintenance Mode',         'Show maintenance page to non-admin users'],
          ].map(([key, label, desc]) => (
            <div key={key} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{label}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{desc}</div>
              </div>
              <button type="button" onClick={()=>update(key, settings[key]==='true'?'false':'true')}
                style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',position:'relative',transition:'all .2s',
                  background:settings[key]==='true'?'var(--teal)':'#ccc'}}>
                <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,
                  left:settings[key]==='true'?23:3,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
              </button>
            </div>
          ))}
          <div className="form-group" style={{marginTop:16}}>
            <label className="input-label">Primary Brand Color</label>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <input type="color" value={settings.primary_color||'#00c9b1'} onChange={e=>update('primary_color',e.target.value)}
                style={{width:44,height:36,borderRadius:8,border:'1px solid var(--border)',cursor:'pointer',padding:2}}/>
              <input className="input" value={settings.primary_color||'#00c9b1'} onChange={e=>update('primary_color',e.target.value)} style={{flex:1}}/>
            </div>
          </div>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
        <button className="btn btn-primary" onClick={saveAll} disabled={saving} style={{minWidth:140}}>
          {saving ? '💾 Saving…' : saved ? '✅ Saved!' : '💾 Save All Settings'}
        </button>
      </div>
    </div>
  )
}

// ── AUDIT LOG TAB ─────────────────────────────────────────────────────────
function AuditLogTab() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(0)
  const PAGE_SIZE = 25

  useEffect(() => {
    supabase.from('audit_log').select('*').order('created_at',{ascending:false}).range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1)
      .then(({ data }) => { setLogs(data||[]); setLoading(false) })
  }, [page])

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontSize:13,color:'var(--muted)'}}>Showing most recent {PAGE_SIZE} entries</div>
        <button className="btn btn-outline btn-sm" onClick={()=>{ setLoading(true); setPage(0); }}>🔄 Refresh</button>
      </div>
      {loading ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
      : logs.length === 0 ? <div className="empty-state"><div className="es-icon">📋</div><div className="es-text">No activity logged yet.</div></div>
      : <div className="card" style={{padding:0}}>
          <table className="data-table">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap'}}>
                    {new Date(log.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
                  </td>
                  <td style={{fontWeight:700,fontSize:12}}>{log.actor_name||'System'}</td>
                  <td style={{fontSize:12}}>{log.action}</td>
                  <td style={{fontSize:11,color:'var(--muted)'}}>{log.target_type||'—'}</td>
                  <td style={{fontSize:11,color:'var(--muted)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.details||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{display:'flex',gap:8,padding:12,justifyContent:'center'}}>
            <button className="btn btn-sm btn-outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>← Prev</button>
            <span style={{fontSize:12,color:'var(--muted)',padding:'4px 8px'}}>Page {page+1}</span>
            <button className="btn btn-sm btn-outline" disabled={logs.length<PAGE_SIZE} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        </div>
      }
    </div>
  )
}

// ── DANGER ZONE TAB ───────────────────────────────────────────────────────
function DangerZoneTab() {
  const { profile } = useAuth()
  const [confirm1, setConfirm1] = useState('')
  const [confirm2, setConfirm2] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [msg,      setMsg]      = useState('')

  async function clearAttendance() {
    if (confirm1 !== 'DELETE ATTENDANCE') return
    await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await logAction(profile.id, profile.full_name, 'DANGER: Cleared all attendance records', 'attendance', '', '')
    setConfirm1('')
    setMsg('✅ All attendance records cleared.')
    setTimeout(() => setMsg(''), 4000)
  }

  async function clearSubmissions() {
    if (confirm2 !== 'DELETE SUBMISSIONS') return
    await supabase.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await logAction(profile.id, profile.full_name, 'DANGER: Cleared all submissions', 'submissions', '', '')
    setConfirm2('')
    setMsg('✅ All submission records cleared.')
    setTimeout(() => setMsg(''), 4000)
  }

  return (
    <div>
      <div style={{background:'#fff8f0',border:'2px solid var(--coral)',borderRadius:12,padding:16,marginBottom:20}}>
        <div style={{fontWeight:800,fontSize:14,color:'var(--coral)',marginBottom:6}}>⚠️ Danger Zone</div>
        <div style={{fontSize:13,color:'var(--text)'}}>Actions here are <strong>irreversible</strong>. All actions are logged in the audit trail. Only proceed if you are absolutely certain.</div>
      </div>

      {msg && <div style={{background:'#f0fdf9',border:'1px solid var(--teal)',borderRadius:8,padding:'8px 14px',marginBottom:12,fontSize:13,fontWeight:700,color:'var(--teal)'}}>{msg}</div>}

      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {[
          {
            title:'Clear All Attendance Records',
            desc:'Permanently deletes every attendance record. Student attendance history will be lost.',
            confirm: confirm1, setConfirm: setConfirm1,
            phrase:'DELETE ATTENDANCE', action: clearAttendance,
            color:'var(--coral)'
          },
          {
            title:'Clear All Submission Records',
            desc:'Permanently deletes all homework submissions and grades. All graded work will be lost.',
            confirm: confirm2, setConfirm: setConfirm2,
            phrase:'DELETE SUBMISSIONS', action: clearSubmissions,
            color:'var(--coral)'
          },
        ].map(z => (
          <div key={z.title} className="card" style={{borderLeft:`4px solid ${z.color}`}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>{z.title}</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>{z.desc}</div>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <input className="input" style={{flex:1,maxWidth:300}}
                placeholder={`Type "${z.phrase}" to confirm`}
                value={z.confirm} onChange={e=>z.setConfirm(e.target.value)}/>
              <button className="btn" style={{background:z.color,color:'white',border:'none',opacity:z.confirm===z.phrase?1:.4,cursor:z.confirm===z.phrase?'pointer':'not-allowed'}}
                onClick={z.action} disabled={z.confirm!==z.phrase}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
