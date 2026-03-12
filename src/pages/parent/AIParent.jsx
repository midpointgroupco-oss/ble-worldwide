import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { callClaude, AIPanel } from '../../components/AIAssistant'

export default function ParentAI() {
  const { user } = useAuth()
  const [tab, setTab] = useState('summary')
  const [toast, setToast] = useState('')
  const [children, setChildren] = useState([])
  const [selChild, setSelChild] = useState(null)
  const [childData, setChildData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [transInput, setTransInput] = useState('')
  const [transLang, setTransLang] = useState('Spanish')
  const [transOutput, setTransOutput] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''), 3000) }

  useEffect(() => {
    if (!user) return
    supabase.from('students').select('id,full_name,grade_level').eq('parent_id',user.id).eq('status','active').then(({data})=>{
      setChildren(data||[])
      if (data?.length) { setSelChild(data[0]); loadChild(data[0].id) }
    })
  },[user])

  async function loadChild(id) {
    setLoading(true); setChildData(null)
    const [{data:grades},{data:att},{data:hw}] = await Promise.all([
      supabase.from('submissions').select('points_earned,assignment:assignments(title,max_points,course:courses(name))').eq('student_id',id).not('points_earned','is',null).order('submitted_at',{ascending:false}).limit(20),
      supabase.from('attendance').select('status,date').eq('student_id',id).order('date',{ascending:false}).limit(30),
      supabase.from('submissions').select('late').eq('student_id',id).limit(20),
    ])
    const a=att||[], g=grades||[]
    setChildData({
      avgGrade: g.length?(g.reduce((s,x)=>s+Number(x.points_earned||0),0)/g.length).toFixed(1):null,
      presentPct: a.length?Math.round(a.filter(x=>x.status==='present').length/a.length*100):null,
      absences: a.filter(x=>x.status==='absent').length,
      lateWork: (hw||[]).filter(x=>x.late).length,
      recentGrades: g.slice(0,5).map(x=>(x.assignment?.course?.name||'Course')+': '+x.points_earned+'/'+(x.assignment?.max_points||100)),
    })
    setLoading(false)
  }

  const TABS=[
    {id:'summary',   icon:'📊', label:'Child Summary'},
    {id:'ask',       icon:'💬', label:'Ask About My Child'},
    {id:'translate', icon:'🌐', label:'Translation'},
  ]
  const LANGS=['Spanish','French','Portuguese','Haitian Creole','Arabic','Mandarin','Vietnamese','Korean','Tagalog','Hindi','Somali','Russian']

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:9999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}
      <div className="page-header fade-up">
        <div><h2>🤖 AI Assistant</h2><div style={{fontSize:13,color:'var(--muted)'}}>Powered by Claude</div></div>
        {children.length>1&&(
          <select className="input" style={{maxWidth:180}} value={selChild?.id||''} onChange={e=>{const c=children.find(x=>x.id===e.target.value);setSelChild(c);loadChild(c.id)}}>
            {children.map(c=><option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        )}
      </div>
      <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'2px solid var(--border)',flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'9px 16px',border:'none',borderBottom:tab===t.id?'3px solid var(--teal)':'3px solid transparent',marginBottom:-2,background:'none',fontWeight:tab===t.id?800:500,color:tab===t.id?'var(--teal)':'var(--muted)',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',gap:5}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab==='summary' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            {loading&&<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>Loading {selChild?.full_name}...</div>}
            {childData&&(
              <div className="card" style={{marginBottom:16}}>
                <div className="card-header"><div className="card-title">📈 Stats — {selChild?.full_name}</div></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                  {[
                    ['Avg Grade',childData.avgGrade?childData.avgGrade+' pts':'N/A',Number(childData.avgGrade)>70?'#00804a':'#cc3333'],
                    ['Attendance',childData.presentPct!=null?childData.presentPct+'%':'N/A',childData.presentPct>=90?'#00804a':'#b07800'],
                    ['Absences',childData.absences,childData.absences>5?'#cc3333':'var(--text)'],
                    ['Late Work',childData.lateWork,childData.lateWork>2?'#b07800':'var(--text)'],
                  ].map(([k,v,color])=>(
                    <div key={k} style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px'}}>
                      <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase'}}>{k}</div>
                      <div style={{fontWeight:900,fontSize:20,color}}>{v}</div>
                    </div>
                  ))}
                </div>
                {childData.recentGrades.map((g,i)=><div key={i} style={{fontSize:12,padding:'3px 0',borderBottom:'1px solid var(--border)',color:'var(--muted)'}}>{g}</div>)}
              </div>
            )}
            {childData&&<AIPanel title={'Summary — '+(selChild?.full_name||'')} icon="📊"
              placeholder="Any specific areas you want focused on?"
              generateLabel="✨ Generate Summary" insertLabel="Copy Summary"
              onGenerate={input=>callClaude(
                'You are a helpful school assistant at BLE Worldwide talking to a parent. Write in plain, friendly English. Be honest but encouraging.',
                'Write a plain-English summary:\nStudent: '+selChild?.full_name+' ('+selChild?.grade_level+' grade)\nAvg grade: '+childData.avgGrade+'\nAttendance: '+childData.presentPct+'%\nAbsences: '+childData.absences+'\nLate work: '+childData.lateWork+'\nRecent grades: '+childData.recentGrades.join(', ')+'\n\nFocus: '+(input||'General overview')
              )}
              onInsert={text=>{navigator.clipboard.writeText(text);showToast('Copied!')}}
            />}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">💡 Understanding the Report</div></div>
            {[['Grade average','Scores above 70% are passing. Above 90% is excellent.'],['Attendance','90%+ expected. Missing more than 2 days/month impacts learning.'],['Late work','Occasional late work is normal. A pattern needs attention.'],['What to do','Concerned? Book a parent-teacher conference in Meetings.']].map(([t,d])=>(
              <div key={t} style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{fontWeight:700,fontSize:12}}>{t}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2,lineHeight:1.5}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='ask' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            {childData?(
              <AIPanel title={'Ask About '+(selChild?.full_name||'My Child')} icon="💬"
                placeholder="How is my child doing in math? Should I be worried about attendance?"
                generateLabel="✨ Get Answer" insertLabel="Copy Answer"
                onGenerate={input=>callClaude(
                  'You are a helpful school advisor at BLE Worldwide answering a parent about their child. Be honest, specific, and practical.',
                  'Parent question: '+input+'\n\nStudent data:\nName: '+selChild?.full_name+'\nGrade: '+selChild?.grade_level+'\nAvg score: '+childData.avgGrade+'\nAttendance: '+childData.presentPct+'%\nAbsences: '+childData.absences+'\nLate work: '+childData.lateWork
                )}
                onInsert={text=>{navigator.clipboard.writeText(text);showToast('Copied!')}}
              />
            ):(
              <div className="card" style={{textAlign:'center',padding:40,color:'var(--muted)'}}>{loading?'Loading...':'Select a child above'}</div>
            )}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">💬 Sample Questions</div></div>
            {['How is my child doing overall this term?','Should I be concerned about their attendance?','Are there subjects my child is struggling with?','What can I do at home to support learning?','Is my child turning in assignments on time?'].map(q=>(
              <div key={q} style={{padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:12,color:'var(--teal)',cursor:'pointer'}}>
                💬 {q}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='translate' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">🌐 Translate School Communication</div></div>
              <div className="form-group"><label className="input-label">Target Language</label>
                <select className="input" value={transLang} onChange={e=>setTransLang(e.target.value)}>
                  {LANGS.map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="input-label">Text to Translate</label>
                <textarea className="input" rows={6} value={transInput} onChange={e=>setTransInput(e.target.value)} placeholder="Paste any school letter, announcement, or message here..."/>
              </div>
            </div>
            <AIPanel title="Translator" icon="🌐"
              generateLabel={'✨ Translate to '+transLang} insertLabel="Copy Translation"
              onGenerate={()=>callClaude(
                'You are an expert translator specializing in school communications. Translate accurately preserving names, dates, and numbers exactly.',
                'Translate to '+transLang+'. Provide only the translation:\n\n'+transInput
              )}
              onInsert={text=>{setTransOutput(text);navigator.clipboard.writeText(text);showToast('Copied!')}}
            />
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📄 Translation</div></div>
            <textarea value={transOutput} onChange={e=>setTransOutput(e.target.value)} rows={16} placeholder="Translation will appear here..."
              style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:13,resize:'vertical',fontFamily:'inherit',lineHeight:1.7,outline:'none',boxSizing:'border-box'}}/>
            <div style={{marginTop:8,display:'flex',justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>{navigator.clipboard.writeText(transOutput);showToast('Copied!')}}>📋 Copy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
