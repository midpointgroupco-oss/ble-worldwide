import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

export default function AdminSettings() {
  const { user, profile } = useAuth()
  const [settings,  setSettings]  = useState({})
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [pwForm,    setPwForm]    = useState({ current: '', newPw: '', confirm: '' })
  const [pwMsg,     setPwMsg]     = useState('')
  const [pwSaving,  setPwSaving]  = useState(false)
  const [activeTab, setActiveTab] = useState('school')

  useEffect(() => {
    supabase.from('platform_settings').select('*').then(({ data }) => {
      const map = {}
      ;(data || []).forEach(s => { map[s.key] = s.value })
      setSettings(map)
      setLoading(false)
    })
  }, [])

  function update(key, value) { setSettings(p => ({ ...p, [key]: value })) }

  async function saveSettings() {
    setSaving(true)
    const updates = Object.entries(settings).map(([key, value]) =>
      supabase.from('platform_settings').upsert(
        { key, value, updated_by: profile?.id, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
    )
    await Promise.all(updates)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function changePassword() {
    if (!pwForm.newPw || pwForm.newPw !== pwForm.confirm) {
      setPwMsg('❌ Passwords do not match.')
      return
    }
    if (pwForm.newPw.length < 8) {
      setPwMsg('❌ Password must be at least 8 characters.')
      return
    }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    if (error) {
      setPwMsg(`❌ ${error.message}`)
    } else {
      setPwMsg('✅ Password updated successfully.')
      setPwForm({ current: '', newPw: '', confirm: '' })
    }
    setPwSaving(false)
    setTimeout(() => setPwMsg(''), 4000)
  }

  const TABS = [['school','🏫 School Profile'],['platform','⚙️ Platform Controls'],['account','🔐 My Account']]

  if (loading) return <div className="loading-screen" style={{height:300}}><div className="spinner"/></div>

  return (
    <div>
      <div className="page-header fade-up">
        <h2>⚙️ Settings</h2>
        {activeTab !== 'account' && (
          <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? '💾 Saving…' : saved ? '✅ Saved!' : '💾 Save Changes'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,borderBottom:'2px solid var(--border)',marginBottom:20}}>
        {TABS.map(([k,l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            padding:'9px 18px', border:'none', cursor:'pointer', fontSize:13,
            fontWeight: activeTab===k ? 800 : 500,
            borderBottom: activeTab===k ? '3px solid var(--teal)' : '3px solid transparent',
            marginBottom: -2, background: 'none',
            color: activeTab===k ? 'var(--teal)' : 'var(--muted)'
          }}>{l}</button>
        ))}
      </div>

      {/* ── SCHOOL PROFILE ── */}
      {activeTab === 'school' && (
        <div className="grid-2 fade-up">
          <div className="card">
            <div className="card-header"><div className="card-title">🏫 School Information</div></div>
            {[
              ['school_name',     'School Name',      'text',  'BLE Worldwide'],
              ['school_email',    'Admin Email',       'email', 'admin@bleworldwide.edu'],
              ['school_phone',    'Phone Number',      'text',  '+1 (555) 000-0000'],
              ['school_address',  'Address',           'text',  '123 School Lane'],
              ['academic_year',   'Academic Year',     'text',  '2025-2026'],
              ['default_timezone','Default Timezone',  'text',  'UTC'],
            ].map(([key, label, type, placeholder]) => (
              <div key={key} className="form-group">
                <label className="input-label">{label}</label>
                <input className="input" type={type}
                  value={settings[key] || ''}
                  onChange={e => update(key, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">🎨 Branding</div></div>
            <div className="form-group">
              <label className="input-label">Primary Brand Color</label>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <input type="color"
                  value={settings.primary_color || '#00c9b1'}
                  onChange={e => update('primary_color', e.target.value)}
                  style={{width:44,height:36,borderRadius:8,border:'1px solid var(--border)',cursor:'pointer',padding:2}}
                />
                <input className="input" style={{flex:1}}
                  value={settings.primary_color || '#00c9b1'}
                  onChange={e => update('primary_color', e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="input-label">School Logo URL (optional)</label>
              <input className="input"
                value={settings.logo_url || ''}
                onChange={e => update('logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              {settings.logo_url && (
                <img src={settings.logo_url} alt="Logo preview"
                  style={{marginTop:8,maxHeight:60,borderRadius:6,border:'1px solid var(--border)'}}
                  onError={e => e.target.style.display='none'}
                />
              )}
            </div>
            <div style={{marginTop:12,padding:12,background:'var(--bg)',borderRadius:8,fontSize:12,color:'var(--muted)'}}>
              💡 Tip: Changes to school profile are visible to all portal users in headers and documents.
            </div>
          </div>
        </div>
      )}

      {/* ── PLATFORM CONTROLS ── */}
      {activeTab === 'platform' && (
        <div className="grid-2 fade-up">
          <div className="card">
            <div className="card-header"><div className="card-title">🔧 Platform Toggles</div></div>
            {[
              { key:'allow_enrollment', label:'Allow New Enrollments', desc:'Accept new student applications via the public /apply form' },
              { key:'maintenance_mode', label:'Maintenance Mode',      desc:'Show a maintenance message to non-admin users' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13}}>{label}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{desc}</div>
                </div>
                <button type="button" onClick={() => update(key, settings[key]==='true' ? 'false' : 'true')}
                  style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',position:'relative',transition:'all .2s',
                    background: settings[key]==='true' ? 'var(--teal)' : '#ccc', flexShrink:0}}>
                  <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,
                    left: settings[key]==='true' ? 23 : 3, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
                </button>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📧 Notification Preferences</div></div>
            {[
              { key:'notif_new_enrollment', label:'New Enrollments',  desc:'Notify when a new application is submitted' },
              { key:'notif_new_message',    label:'New Messages',     desc:'Notify on incoming staff messages' },
              { key:'notif_grade_posted',   label:'Grade Alerts',     desc:'Notify parents when grades are posted' },
              { key:'notif_weekly_digest',  label:'Weekly Digest',    desc:'Send a summary email every Sunday' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13}}>{label}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{desc}</div>
                </div>
                <button type="button" onClick={() => update(key, settings[key]==='false' ? 'true' : 'false')}
                  style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',position:'relative',transition:'all .2s',
                    background: settings[key]==='false' ? '#ccc' : 'var(--teal)', flexShrink:0}}>
                  <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,
                    left: settings[key]==='false' ? 3 : 23, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MY ACCOUNT ── */}
      {activeTab === 'account' && (
        <div className="fade-up" style={{maxWidth:500}}>
          <div className="card" style={{marginBottom:16}}>
            <div className="card-header"><div className="card-title">👤 Account Info</div></div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                ['Name',  profile?.full_name || '—'],
                ['Email', user?.email || '—'],
                ['Role',  profile?.role || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{display:'flex',gap:12,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{width:80,fontSize:12,color:'var(--muted)',fontWeight:600}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:700,textTransform:'capitalize'}}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">🔐 Change Password</div></div>
            {pwMsg && (
              <div style={{
                padding:'8px 12px', borderRadius:8, marginBottom:12, fontSize:13, fontWeight:700,
                background: pwMsg.startsWith('✅') ? '#f0fdf9' : '#fff0f0',
                color: pwMsg.startsWith('✅') ? 'var(--teal)' : '#cc3333',
                border: `1px solid ${pwMsg.startsWith('✅') ? 'var(--teal)' : '#ffcccc'}`
              }}>{pwMsg}</div>
            )}
            <div className="form-group">
              <label className="input-label">New Password</label>
              <input className="input" type="password" placeholder="Min. 8 characters"
                value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="input-label">Confirm New Password</label>
              <input className="input" type="password" placeholder="Re-enter new password"
                value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={changePassword} disabled={pwSaving || !pwForm.newPw || !pwForm.confirm}>
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
