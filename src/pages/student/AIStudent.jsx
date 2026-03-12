import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { callClaude, AIPanel } from '../../components/AIAssistant'

export default function StudentAI() {
  const { user } = useAuth()
  const [tab, setTab] = useState('homework')
  const [toast, setToast] = useState('')
  const [student, setStudent] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [selAssign, setSelAssign] = useState(null)
  const [sgTopic, setSgTopic] = useState('')
  const [sgFormat, setSgFormat] = useState('flashcards')
  const [sgDraft, setSgDraft] = useState('')
  const [waDraft, setWaDraft] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''), 3000) }

  useEffect(() => {
    if (!user) return
    supabase.from('students').select('id,full_name,grade_level').eq('user_id',user.id).single().then(({data:st})=>{
      if (!st) return
      setStudent(st)
      supabase.from('enrollments').select('course_id').eq('student_id',st.id).eq('status','active').then(({data:enr})=>{
        const ids=(enr||[]).map(e=>e.course_id)
        if (!ids.length) return
        supabase.from('assignments').select('id,title,description,due_date,max_points,course:courses(name)').in('course_id',ids).gte('due_date',new Date().toISOString().split('T')[0]).order('due_date').limit(15).then(({data})=>setAssignments(data||[]))
      })
    })
  },[user])

  const TABS=[
    {id:'homework',   icon:'❓', label:'Homework Help'},
    {id:'studyguide', icon:'📖', label:'Study Guide'},
    {id:'writing',    icon:'✍️', label:'Writing Help'},
  ]
  const FORMATS=[['flashcards','🗂️ Flashcards'],['outline','📝 Outline'],['quiz','❓ Practice Quiz'],['summary','📄 Summary']]

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:9999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}
      <div className="page-header fade-up">
        <div><h2>🤖 AI Tutor</h2><div style={{fontSize:13,color:'var(--muted)'}}>Your personal study assistant</div></div>
      </div>
      <div style={{background:'rgba(0,201,177,.08)',border:'1px solid rgba(0,201,177,.2)',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:12}}>
        AI Tutor helps you <strong>understand</strong> concepts. It guides you to the answer — it does not do your homework for you.
      </div>
      <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'2px solid var(--border)',flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'9px 16px',border:'none',borderBottom:tab===t.id?'3px solid var(--teal)':'3px solid transparent',marginBottom:-2,background:'none',fontWeight:tab===t.id?800:500,color:tab===t.id?'var(--teal)':'var(--muted)',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',gap:5}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab==='homework' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            {assignments.length>0&&(
              <div className="card" style={{marginBottom:16}}>
                <div className="card-header"><div className="card-title">📚 Current Assignments</div></div>
                <div style={{maxHeight:180,overflowY:'auto'}}>
                  {assignments.map(a=>(
                    <div key={a.id} onClick={()=>setSelAssign(a)} style={{padding:'8px 10px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:selAssign?.id===a.id?'rgba(0,201,177,.06)':'white'}}>
                      <div style={{fontWeight:700,fontSize:12}}>{a.title}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{a.course?.name} — Due {a.due_date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selAssign&&(
              <div className="card" style={{marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:13}}>{selAssign.title}</div>
                <div style={{fontSize:12,color:'var(--muted)'}}>{selAssign.course?.name} — Due {selAssign.due_date}</div>
                {selAssign.description&&<div style={{fontSize:12,marginTop:8,lineHeight:1.6,background:'var(--bg)',padding:8,borderRadius:6}}>{selAssign.description}</div>}
              </div>
            )}
            <AIPanel title="Homework Help" icon="❓"
              placeholder={selAssign?'What part of '+selAssign.title+' are you stuck on?':'What concept are you stuck on?'}
              generateLabel="✨ Explain This" insertLabel="Got It!"
              onGenerate={input=>callClaude(
                'You are a patient tutor for a '+(student?.grade_level||'middle school')+' student. EXPLAIN and GUIDE — never give direct answers. Break concepts down clearly. End with a question that encourages the student to try it themselves.',
                (selAssign?'Assignment: '+selAssign.title+'\nDescription: '+(selAssign.description||'N/A')+'\n\n':'')+' Student question: '+input+'\n\nExplain the concept without solving it for them.'
              )}
              onInsert={()=>showToast('Keep going! You can do it.')}
            />
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">💡 Study Tips</div></div>
            {[['Ask WHY not WHAT','Ask why a formula works, not just what the answer is'],['Try first then ask','Attempt it yourself first, then describe where you got stuck'],['Ask for examples','Try: Can you give me a similar example problem?'],['Explain it back','After an explanation, try saying it in your own words']].map(([t,d])=>(
              <div key={t} style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{fontWeight:700,fontSize:12,color:'var(--teal)'}}>{t}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2,lineHeight:1.5}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='studyguide' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">📖 Study Guide Settings</div></div>
              <div className="form-group"><label className="input-label">Topic</label>
                <input className="input" value={sgTopic} onChange={e=>setSgTopic(e.target.value)} placeholder="e.g. Photosynthesis, World War II, Fractions"/>
              </div>
              <div className="form-group"><label className="input-label">Format</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {FORMATS.map(([v,l])=>(
                    <button key={v} onClick={()=>setSgFormat(v)} style={{padding:'6px 12px',borderRadius:8,border:'2px solid',fontSize:11,fontWeight:700,cursor:'pointer',borderColor:sgFormat===v?'var(--teal)':'var(--border)',background:sgFormat===v?'rgba(0,201,177,.08)':'white',color:sgFormat===v?'var(--teal)':'var(--muted)'}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <AIPanel title="Study Guide Generator" icon="📖"
              placeholder="Paste your notes or describe what to cover..."
              generateLabel="✨ Create Study Guide" insertLabel="Copy Study Guide"
              onGenerate={input=>callClaude(
                'Create study materials for a '+(student?.grade_level||'middle school')+' student. Be clear, accurate, and helpful.',
                'Create a '+sgFormat+' for: '+sgTopic+'\nGrade: '+(student?.grade_level||'middle school')+'\nContent: '+(input||'General overview')+'\n\nFormat: '+(sgFormat==='flashcards'?'10-15 Q&A pairs':sgFormat==='quiz'?'10 practice questions with answers':sgFormat==='outline'?'detailed structured outline':'comprehensive summary'),
                1200
              )}
              onInsert={text=>{setSgDraft(text);showToast('Study guide ready')}}
            />
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📄 Study Guide</div></div>
            <textarea value={sgDraft} onChange={e=>setSgDraft(e.target.value)} rows={20} placeholder="Study guide will appear here..."
              style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:12,resize:'vertical',fontFamily:'inherit',lineHeight:1.7,outline:'none',boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8,marginTop:8,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>{navigator.clipboard.writeText(sgDraft);showToast('Copied!')}}>📋 Copy</button>
              <button className="btn btn-primary" onClick={()=>window.print()}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      {tab==='writing' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">✍️ Your Draft</div></div>
              <p style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>Paste your writing. Claude gives feedback — not rewrites.</p>
              <textarea value={waDraft} onChange={e=>setWaDraft(e.target.value)} rows={10} placeholder="Paste your essay or paragraph here..."
                style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:12,resize:'vertical',fontFamily:'inherit',lineHeight:1.7,outline:'none',boxSizing:'border-box'}}/>
            </div>
            <AIPanel title="Writing Feedback" icon="✍️"
              placeholder="What kind of feedback? Grammar, structure, argument, all of the above?"
              generateLabel="✨ Get Feedback" insertLabel="Thanks, will revise!"
              onGenerate={input=>callClaude(
                'You are a writing coach for a '+(student?.grade_level||'middle school')+' student. Give honest, specific feedback. DO NOT rewrite anything — identify issues and explain how the student could fix them.',
                'Student writing:\n\n'+waDraft+'\n\nFeedback focus: '+(input||'Overall')+'\n\nProvide: 1) What is working well, 2) Areas to improve (with specific examples), 3) Grammar notes, 4) One main thing to fix next. Do not rewrite anything.'
              )}
              onInsert={()=>showToast('Now go revise!')}
            />
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">✍️ Writing Tips</div></div>
            {[['Strong opening','Hook the reader — a question, bold statement, or vivid detail'],['One idea per paragraph','Each paragraph: one main point with 3-5 supporting sentences'],['Vary sentence length','Mix short punchy sentences with longer explanatory ones'],['Show not tell','Instead of "he was angry" write "he slammed his fist on the table"'],['Read it aloud','If it sounds awkward spoken, it reads awkward too']].map(([t,d])=>(
              <div key={t} style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{fontWeight:700,fontSize:12,color:'var(--teal)'}}>{t}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2,lineHeight:1.5}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
