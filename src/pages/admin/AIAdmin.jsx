import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { callClaude, AIPanel } from '../../components/AIAssistant'

export default function AdminAI() {
  const [tab, setTab] = useState('announcement')
  const [toast, setToast] = useState('')
  const [annDraft, setAnnDraft] = useState('')
  const [annAudience, setAnnAudience] = useState('all')
  const [reportStats, setReportStats] = useState(null)
  const [reportText, setReportText] = useState('')
  const [loadingStats, setLoadingStats] = useState(false)
  const [letterType, setLetterType] = useState('warning')
  const [letterName, setLetterName] = useState('')
  const [letterDraft, setLetterDraft] = useState('')
  const [appText, setAppText] = useState('')
  const [appNotes, setAppNotes] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function loadStats() {
    setLoadingStats(true)
    const [{ data: students }, { data: bills }, { data: att }] = await Promise.all([
      supabase.from('students').select('id').eq('status','active'),
      supabase.from('billing').select('amount,status'),
      supabase.from('attendance').select('status'),
    ])
    setReportStats({
      totalStudents: students?.length || 0,
      totalBilled: (bills||[]).reduce((s,b) => s+Number(b.amount||0), 0).toFixed(2),
      totalPaid:   (bills||[]).filter(b=>b.status==='paid').reduce((s,b) => s+Number(b.amount||0), 0).toFixed(2),
      outstanding: (bills||[]).filter(b=>b.status!=='paid').reduce((s,b) => s+Number(b.amount||0), 0).toFixed(2),
      presentPct:  att?.length ? Math.round((att||[]).filter(a=>a.status==='present').length/att.length*100) : 0,
      absentCount: (att||[]).filter(a=>a.status==='absent').length,
    })
    setLoadingStats(false)
  }

  const TABS = [
    { id:'announcement', icon:'📢', label:'Announcement Writer' },
    { id:'report',       icon:'📊', label:'Report Narrative' },
    { id:'letter',       icon:'✉️', label:'Letter Generator' },
    { id:'application',  icon:'📋', label:'Application Review' },
  ]
  const LETTER_TYPES = [
    ['warning','⚠️ Academic Warning'],['financial','💳 Financial Notice'],
    ['attendance','📅 Attendance Warning'],['welcome','👋 Welcome Letter'],
    ['acceptance','✅ Enrollment Acceptance'],['denial','❌ Enrollment Denial'],
    ['discipline','📋 Discipline Notice'],['commendation','⭐ Commendation Letter'],
  ]

  return (
    <div>
      {toast && <div style={{position:'fixed',top:20,right:24,zIndex:9999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}
      <div className="page-header fade-up">
        <div><h2>🤖 AI Assistant</h2><div style={{fontSize:13,color:'var(--muted)'}}>Powered by Claude</div></div>
      </div>
      <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'2px solid var(--border)',flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'9px 16px',border:'none',borderBottom:tab===t.id?'3px solid var(--teal)':'3px solid transparent',marginBottom:-2,background:'none',fontWeight:tab===t.id?800:500,color:tab===t.id?'var(--teal)':'var(--muted)',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',gap:5}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab==='announcement' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            <AIPanel title="Announcement Writer" icon="📢"
              placeholder="Describe what you want to announce..."
              generateLabel="✨ Draft Announcement" insertLabel="Use This Draft"
              onGenerate={input=>callClaude(
                'You are a professional school communications writer for BLE Worldwide. Write clear, warm, professional announcements.',
                'Write a school announcement for: '+input+'\nAudience: '+annAudience
              )}
              onInsert={text=>{setAnnDraft(text);showToast('Draft ready — edit below')}}
            />
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">✏️ Draft Editor</div>
              <select className="input" style={{maxWidth:140,fontSize:11}} value={annAudience} onChange={e=>setAnnAudience(e.target.value)}>
                {['all','parents','students','teachers','staff'].map(a=><option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>)}
              </select>
            </div>
            <textarea value={annDraft} onChange={e=>setAnnDraft(e.target.value)} rows={10} placeholder="Your announcement draft will appear here..."
              style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:13,resize:'vertical',fontFamily:'inherit',outline:'none',lineHeight:1.7,boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setAnnDraft('')}>Clear</button>
              <button className="btn btn-primary" disabled={!annDraft.trim()} onClick={async()=>{
                await supabase.from('announcements').insert([{title:annDraft.split('\n')[0].slice(0,80)||'Announcement',body:annDraft,audience:annAudience,published_at:new Date().toISOString()}])
                showToast('Posted!'); setAnnDraft('')
              }}>📢 Post Announcement</button>
            </div>
          </div>
        </div>
      )}

      {tab==='report' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">📊 School Data</div></div>
              <p style={{fontSize:13,color:'var(--muted)',marginBottom:12}}>Claude reads live data and writes a plain-English summary report.</p>
              <button className="btn btn-primary" onClick={loadStats} disabled={loadingStats}>{loadingStats?'Loading...':'📊 Pull Latest Stats'}</button>
              {reportStats && (
                <div style={{marginTop:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[['Students',reportStats.totalStudents],['Billed','$'+reportStats.totalBilled],['Paid','$'+reportStats.totalPaid],['Outstanding','$'+reportStats.outstanding],['Attendance',reportStats.presentPct+'%'],['Absences',reportStats.absentCount]].map(([k,v])=>(
                    <div key={k} style={{background:'var(--bg)',borderRadius:8,padding:'8px 12px'}}>
                      <div style={{fontSize:10,color:'var(--muted)',fontWeight:700}}>{k}</div>
                      <div style={{fontWeight:900,fontSize:16}}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {reportStats && (
              <AIPanel title="Report Narrative" icon="📝"
                placeholder="Any specific areas to focus on?"
                generateLabel="✨ Write Report" insertLabel="Copy to Editor"
                onGenerate={input=>callClaude(
                  'You are an experienced school administrator writing reports. Write in professional, readable prose.',
                  'Write a school status report for BLE Worldwide:\n\n'+JSON.stringify(reportStats,null,2)+'\n\nFocus: '+(input||'General overview'),
                  1500
                )}
                onInsert={text=>{setReportText(text);showToast('Report ready')}}
              />
            )}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📄 Report Editor</div></div>
            <textarea value={reportText} onChange={e=>setReportText(e.target.value)} rows={18} placeholder="AI-generated report will appear here..."
              style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:13,resize:'vertical',fontFamily:'inherit',outline:'none',lineHeight:1.7,boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8,marginTop:8,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>{navigator.clipboard.writeText(reportText);showToast('Copied!')}}>📋 Copy</button>
              <button className="btn btn-primary" onClick={()=>window.print()}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      {tab==='letter' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">✉️ Letter Settings</div></div>
              <div className="form-group">
                <label className="input-label">Letter Type</label>
                <select className="input" value={letterType} onChange={e=>setLetterType(e.target.value)}>
                  {LETTER_TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Recipient Name</label>
                <input className="input" value={letterName} onChange={e=>setLetterName(e.target.value)} placeholder="Parent or student name"/>
              </div>
            </div>
            <AIPanel title="Letter Generator" icon="✉️"
              placeholder="Add specific details, dates, amounts, or context..."
              generateLabel="✨ Generate Letter" insertLabel="Use This Letter"
              onGenerate={input=>callClaude(
                'You are writing formal school letters for BLE Worldwide. Write professional, empathetic letters with date, salutation, body, closing, and signature.',
                'Write a '+letterType+' letter to: '+(letterName||'Parent/Guardian')+'\nDetails: '+(input||'Standard letter')+'\nDate: '+new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}),
                1200
              )}
              onInsert={text=>{setLetterDraft(text);showToast('Letter ready')}}
            />
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📄 Letter Editor</div></div>
            <textarea value={letterDraft} onChange={e=>setLetterDraft(e.target.value)} rows={20} placeholder="Your letter will appear here..."
              style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:13,resize:'vertical',fontFamily:'inherit',lineHeight:1.8,outline:'none',boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8,marginTop:8,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>{navigator.clipboard.writeText(letterDraft);showToast('Copied!')}}>📋 Copy</button>
              <button className="btn btn-primary" onClick={()=>window.print()}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      {tab==='application' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">📋 Paste Application</div></div>
              <textarea value={appText} onChange={e=>setAppText(e.target.value)} rows={8} placeholder="Paste enrollment application text here..."
                style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:12,resize:'vertical',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
            </div>
            <AIPanel title="Application Review" icon="🔍"
              placeholder="Any specific concerns to check?"
              generateLabel="✨ Analyze Application" insertLabel="Save Notes"
              onGenerate={input=>callClaude(
                'You are a school admissions coordinator for BLE Worldwide. Review enrollment applications thoroughly.',
                'Review this application:\n\n'+appText+'\n\nConcerns: '+(input||'None')+'\n\nProvide: 1) Summary, 2) Missing info, 3) Strengths, 4) Concerns, 5) Recommendation (Approve/Deny/Waitlist)'
              )}
              onInsert={text=>{setAppNotes(text);showToast('Notes saved')}}
            />
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📝 Review Notes</div></div>
            <textarea value={appNotes} onChange={e=>setAppNotes(e.target.value)} rows={20} placeholder="AI review notes will appear here..."
              style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:13,resize:'vertical',fontFamily:'inherit',lineHeight:1.7,outline:'none',boxSizing:'border-box'}}/>
            <div style={{marginTop:8,display:'flex',justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>{navigator.clipboard.writeText(appNotes);showToast('Copied!')}}>📋 Copy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
