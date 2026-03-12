import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { callClaude, AIPanel } from '../../components/AIAssistant'

export default function TeacherAI() {
  const { user } = useAuth()
  const [tab, setTab] = useState('feedback')
  const [toast, setToast] = useState('')
  const [courses, setCourses] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [selCourse, setSelCourse] = useState('')
  const [selSub, setSelSub] = useState(null)
  const [lpTopic, setLpTopic] = useState('')
  const [lpGrade, setLpGrade] = useState('')
  const [lpMins, setLpMins] = useState('60')
  const [lpDraft, setLpDraft] = useState('')
  const [analysisCourse, setAnalysisCourse] = useState('')
  const [analysisText, setAnalysisText] = useState('')
  const [rcStudents, setRcStudents] = useState([])
  const [rcSel, setRcSel] = useState('')
  const [rcContext, setRcContext] = useState('')
  const [rcComment, setRcComment] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''), 3000) }

  useEffect(() => {
    if (!user) return
    supabase.from('courses').select('id,name,grade_level').eq('teacher_id',user.id).order('name').then(({data})=>setCourses(data||[]))
    supabase.from('enrollments').select('student:students(id,full_name,grade_level)').eq('status','active').then(({data})=>{
      const seen={}
      ;(data||[]).forEach(e=>{if(e.student)seen[e.student.id]=e.student})
      setRcStudents(Object.values(seen))
    })
  },[user])

  async function loadSubmissions(courseId) {
    setSelCourse(courseId); setSelSub(null)
    const {data} = await supabase.from('submissions')
      .select('id,content,submitted_at,student:students(full_name,grade_level),assignment:assignments(title,max_points,course_id)')
      .not('content','is',null).order('submitted_at',{ascending:false}).limit(40)
    setSubmissions((data||[]).filter(s=>s.content&&s.assignment?.course_id===courseId))
  }

  async function loadGrades() {
    if (!analysisCourse) return
    const {data} = await supabase.from('submissions')
      .select('points_earned,assignment:assignments(title,max_points,course_id),student:students(full_name)')
      .not('points_earned','is',null)
    const filtered=(data||[]).filter(g=>g.assignment?.course_id===analysisCourse)
    if (!filtered.length) { showToast('No graded submissions found'); return }
    const byAssign={}
    filtered.forEach(g=>{
      const t=g.assignment?.title||'Unknown'
      if(!byAssign[t])byAssign[t]={title:t,scores:[],max:g.assignment?.max_points||100}
      byAssign[t].scores.push(Number(g.points_earned))
    })
    const summary=Object.values(byAssign).map(a=>{
      const avg=(a.scores.reduce((s,v)=>s+v,0)/a.scores.length).toFixed(1)
      const failing=a.scores.filter(s=>(s/a.max)<0.7).length
      return a.title+': avg '+avg+'/'+a.max+' ('+a.scores.length+' students, '+failing+' below 70%)'
    }).join('\n')
    setAnalysisText(summary)
  }

  const TABS=[
    {id:'feedback',   icon:'✍️', label:'Assignment Feedback'},
    {id:'lessonplan', icon:'📚', label:'Lesson Plans'},
    {id:'analysis',   icon:'📊', label:'Grade Analysis'},
    {id:'reportcard', icon:'📋', label:'Report Card Comments'},
  ]
  const GRADES=['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th']

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:9999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}
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

      {tab==='feedback' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">📂 Select Submission</div></div>
              <div className="form-group">
                <label className="input-label">Course</label>
                <select className="input" value={selCourse} onChange={e=>loadSubmissions(e.target.value)}>
                  <option value="">Select course...</option>
                  {courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {submissions.length>0&&(
                <div style={{maxHeight:200,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8}}>
                  {submissions.map(s=>(
                    <div key={s.id} onClick={()=>setSelSub(s)} style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:selSub?.id===s.id?'rgba(0,201,177,.06)':'white'}}>
                      <div style={{fontWeight:700,fontSize:12}}>{s.student?.full_name||'Student'}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{s.assignment?.title||'Assignment'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selSub&&<div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">📄 Submission Preview</div></div>
              <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>{selSub.student?.full_name} — {selSub.assignment?.title}</div>
              <div style={{fontSize:12,background:'var(--bg)',padding:10,borderRadius:8,maxHeight:120,overflowY:'auto',lineHeight:1.6}}>{selSub.content}</div>
            </div>}
            {selSub&&<AIPanel title="Feedback Generator" icon="✍️"
              placeholder="Any rubric criteria or areas to focus on?"
              generateLabel="✨ Generate Feedback" insertLabel="Save Feedback"
              onGenerate={input=>callClaude(
                'You are an encouraging teacher at BLE Worldwide. Write constructive, specific, motivating feedback. Balance positives with improvements.',
                'Student: '+selSub.student?.full_name+' ('+selSub.student?.grade_level+' grade)\nAssignment: '+selSub.assignment?.title+'\nMax Points: '+(selSub.assignment?.max_points||100)+'\n\nSubmission:\n'+selSub.content+'\n\nFocus: '+(input||'General feedback')
              )}
              onInsert={async text=>{
                await supabase.from('submissions').update({feedback:text}).eq('id',selSub.id)
                showToast('Feedback saved!')
              }}
            />}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">💡 Feedback Tips</div></div>
            {[['Start positive','Begin with what the student did well'],['Be specific','Reference exact parts of their work'],['Action items','Give 2-3 concrete things to do next time'],['Growth mindset','Frame weaknesses as opportunities']].map(([t,d])=>(
              <div key={t} style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{fontWeight:700,fontSize:12}}>{t}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2,lineHeight:1.5}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='lessonplan' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">📚 Lesson Details</div></div>
              <div className="form-group"><label className="input-label">Topic</label>
                <input className="input" value={lpTopic} onChange={e=>setLpTopic(e.target.value)} placeholder="e.g. Introduction to fractions"/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group"><label className="input-label">Grade</label>
                  <select className="input" value={lpGrade} onChange={e=>setLpGrade(e.target.value)}>
                    <option value="">Grade...</option>
                    {GRADES.map(g=><option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="input-label">Duration</label>
                  <select className="input" value={lpMins} onChange={e=>setLpMins(e.target.value)}>
                    {['30','45','60','75','90'].map(m=><option key={m} value={m}>{m} minutes</option>)}
                  </select>
                </div>
              </div>
            </div>
            <AIPanel title="Lesson Plan Generator" icon="📚"
              placeholder="Special requirements, materials, or preferences?"
              generateLabel="✨ Generate Lesson Plan" insertLabel="Use This Plan"
              onGenerate={input=>callClaude(
                'You are an expert curriculum designer for BLE Worldwide. Create detailed, practical lesson plans with clear timing.',
                'Create a '+lpMins+'-minute lesson plan:\nTopic: '+lpTopic+'\nGrade: '+(lpGrade||'Middle school')+'\nNotes: '+(input||'None')+'\n\nInclude: Objectives, Materials, Warm-Up (timed), Main Instruction (timed), Activity (timed), Assessment, Homework, Differentiation tips.',
                1500
              )}
              onInsert={text=>{setLpDraft(text);showToast('Plan ready')}}
            />
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📄 Lesson Plan Editor</div></div>
            <textarea value={lpDraft} onChange={e=>setLpDraft(e.target.value)} rows={22} placeholder="Your lesson plan will appear here..."
              style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:12,resize:'vertical',fontFamily:'inherit',lineHeight:1.7,outline:'none',boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8,marginTop:8,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>{navigator.clipboard.writeText(lpDraft);showToast('Copied!')}}>📋 Copy</button>
              <button className="btn btn-primary" onClick={()=>window.print()}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      {tab==='analysis' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">📊 Load Grade Data</div></div>
              <div className="form-group"><label className="input-label">Course</label>
                <select className="input" value={analysisCourse} onChange={e=>setAnalysisCourse(e.target.value)}>
                  <option value="">Select course...</option>
                  {courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" disabled={!analysisCourse} onClick={loadGrades}>📊 Load Grades</button>
              {analysisText&&<div style={{marginTop:12,background:'var(--bg)',borderRadius:8,padding:'10px 12px',fontSize:12,fontFamily:'monospace',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{analysisText}</div>}
            </div>
            {analysisText&&<AIPanel title="Grade Analysis" icon="📊"
              placeholder="Any context about this class?"
              generateLabel="✨ Analyze and Recommend" insertLabel="Copy Analysis"
              onGenerate={input=>callClaude(
                'You are an educator and data analyst. Analyze grade data and provide actionable insights for teachers.',
                'Analyze these results:\n\n'+analysisText+'\n\nContext: '+(input||'None')+'\n\nProvide: 1) Overall summary, 2) Hardest assignments, 3) Students needing intervention, 4) What is working, 5) Recommendations.'
              )}
              onInsert={text=>{navigator.clipboard.writeText(text);showToast('Copied!')}}
            />}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">💡 What to Look For</div></div>
            {[['Low class average','If avg below 70%, the assignment may have been too hard'],['High failure rate','More than 30% failing means reteach before moving on'],['Wide score range','Big gaps suggest differentiation is needed'],['Consistent low performer','Same student failing multiple times needs intervention']].map(([t,d])=>(
              <div key={t} style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{fontWeight:700,fontSize:12}}>{t}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2,lineHeight:1.5}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='reportcard' && (
        <div className="grid-2 fade-up" style={{gap:20,alignItems:'start'}}>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">📋 Select Student</div></div>
              <div className="form-group"><label className="input-label">Student</label>
                <select className="input" value={rcSel} onChange={e=>setRcSel(e.target.value)}>
                  <option value="">Select student...</option>
                  {rcStudents.map(s=><option key={s.id} value={s.id}>{s.full_name} — {s.grade_level}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="input-label">Student Context</label>
                <textarea className="input" rows={4} value={rcContext} onChange={e=>setRcContext(e.target.value)}
                  placeholder="Grades, behavior, strengths, challenges, improvements this term..."/>
              </div>
            </div>
            <AIPanel title="Report Card Comments" icon="📋"
              placeholder="Tone: encouraging, concerned, celebratory?"
              generateLabel="✨ Generate Comments" insertLabel="Use These Comments"
              onGenerate={input=>callClaude(
                'You are a teacher writing report card narrative comments at BLE Worldwide. Write warm, professional, specific 3-5 sentence comments.',
                'Write report card comments for:\nStudent: '+(rcStudents.find(s=>s.id===rcSel)?.full_name||'Student')+'\n\nContext:\n'+rcContext+'\n\nTone: '+(input||'Professional and encouraging')+'\n\nWrite: 1) Academic performance, 2) Social/behavioral, 3) Personal message to parent.'
              )}
              onInsert={text=>{setRcComment(text);showToast('Comments ready')}}
            />
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📝 Comment Editor</div></div>
            <textarea value={rcComment} onChange={e=>setRcComment(e.target.value)} rows={14} placeholder="Comments will appear here..."
              style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:13,resize:'vertical',fontFamily:'inherit',lineHeight:1.7,outline:'none',boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8,marginTop:8,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>{navigator.clipboard.writeText(rcComment);showToast('Copied!')}}>📋 Copy</button>
            </div>
            <div style={{marginTop:10,padding:'10px 12px',background:'#fff9e6',borderRadius:8,border:'1px solid #ffe599',fontSize:11,color:'#b07800'}}>
              After editing, go to Report Cards and paste into the student narrative field.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
