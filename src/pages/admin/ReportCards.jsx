import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const GRADE_MAP = { A:4.0,'A-':3.7,'B+':3.3,B:3.0,'B-':2.7,'C+':2.3,C:2.0,'C-':1.7,'D+':1.3,D:1.0,F:0.0 }
const GRADE_OPTS = ['A','A-','B+','B','B-','C+','C','C-','D+','D','F']

export default function AdminReportCards() {
  const [students,    setStudents]    = useState([])
  const [terms,       setTerms]       = useState([])
  const [reportCards, setReportCards] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState(null) // student
  const [modal,       setModal]       = useState(null) // {student, term?, rc?}
  const [filterGrade, setFilterGrade] = useState('all')
  const GRADES = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th']

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data:sts },{ data:ts },{ data:rcs }] = await Promise.all([
      supabase.from('students').select('*').eq('status','active').order('grade_level').order('full_name'),
      supabase.from('terms').select('*,school_year:school_years(name)').order('start_date'),
      supabase.from('report_cards').select('*').order('created_at',{ascending:false})
    ])
    setStudents(sts||[]); setTerms(ts||[]); setReportCards(rcs||[])
    setLoading(false)
  }

  async function togglePublish(rc) {
    await supabase.from('report_cards').update({ published:!rc.published, published_at: !rc.published ? new Date().toISOString() : null }).eq('id',rc.id)
    // Send email to parent when publishing
    if (!rc.published) {
      const student = students.find(s=>s.id===rc.student_id)
      if (student?.guardian_email) {
        fetch('/.netlify/functions/send-email', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ to: student.guardian_email, template:'report_card_published',
            data:{ studentName: student.full_name, parentName:'Parent', termName: rc.term_name||'Term', gpa: rc.gpa }})
        }).catch(()=>{})
      }
    }
    load()
  }

  async function deleteRc(id) {
    if (!confirm('Delete this report card?')) return
    await supabase.from('report_cards').delete().eq('id',id)
    load()
  }

  const currentTerm = terms.find(t=>t.is_current)
  const filtered = students.filter(s => filterGrade==='all' || s.grade_level===filterGrade)

  return (
    <div>
      <div className="page-header fade-up">
        <h2>📊 Report Cards</h2>
        <div style={{fontSize:12,color:'var(--muted)'}}>Current term: <strong>{currentTerm?.name||'None set'}</strong></div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <button onClick={()=>setFilterGrade('all')} className={`filter-chip ${filterGrade==='all'?'active':''}`}>All Grades</button>
        {GRADES.map(g=><button key={g} onClick={()=>setFilterGrade(g)} className={`filter-chip ${filterGrade===g?'active':''}`}>{g}</button>)}
      </div>

      {loading ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
      : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
          {filtered.map(s=>{
            const studentRcs = reportCards.filter(rc=>rc.student_id===s.id)
            return (
              <div key={s.id} className="card fade-up" style={{padding:'14px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <div className="avatar av-2" style={{width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0}}>
                    {s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{s.full_name}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>{s.grade_level} Grade</div>
                  </div>
                  <button className="btn btn-sm btn-primary" style={{fontSize:10}} onClick={()=>setModal({student:s,rc:null})}>+ Generate</button>
                </div>
                {studentRcs.length===0
                  ? <div style={{fontSize:11,color:'var(--muted)',fontStyle:'italic'}}>No report cards yet</div>
                  : studentRcs.slice(0,3).map(rc=>(
                      <div key={rc.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 0',borderTop:'1px solid var(--border)'}}>
                        <div style={{flex:1,fontSize:12}}>
                          <span style={{fontWeight:700}}>{rc.school_year}</span> — {rc.term_name}
                          {rc.gpa&&<span style={{color:'var(--teal)',marginLeft:6,fontWeight:700}}>GPA {rc.gpa}</span>}
                        </div>
                        <span className={`badge ${rc.published?'badge-green':'badge-gold'}`} style={{fontSize:9}}>{rc.published?'Published':'Draft'}</span>
                        <button className="btn btn-sm" style={{fontSize:10,padding:'2px 6px',background:rc.published?'#fff9e6':'#e6fff4',border:'none',cursor:'pointer',borderRadius:4,color:rc.published?'#b07800':'#00804a',fontWeight:700}} onClick={()=>togglePublish(rc)}>
                          {rc.published?'Unpublish':'Publish'}
                        </button>
                        <button className="btn btn-sm" style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--muted)'}} onClick={()=>setModal({student:s,rc})}>✏️</button>
                        <button className="btn btn-sm" style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'#cc3333'}} onClick={()=>deleteRc(rc.id)}>🗑</button>
                      </div>
                    ))
                }
              </div>
            )
          })}
        </div>
      }

      {modal&&<ReportCardModal student={modal.student} rc={modal.rc} terms={terms} onClose={()=>setModal(null)} onSaved={()=>{ setModal(null); load() }}/>}
    </div>
  )
}

function ReportCardModal({ student, rc, terms, onClose, onSaved }) {
  const [termId,    setTermId]    = useState(rc?.term_id||terms.find(t=>t.is_current)?.id||'')
  const [grades,    setGrades]    = useState(rc?.grades||[])
  const [comments,  setComments]  = useState(rc?.teacher_comments||'')
  const [attendance,setAttendance]= useState({ present: rc?.attendance_days_present||0, absent: rc?.attendance_days_absent||0 })
  const [saving,    setSaving]    = useState(false)
  const [courses,   setCourses]   = useState([])

  useEffect(() => {
    // Load enrolled courses for this student
    supabase.from('enrollments').select('course:courses(id,name,subject,credits,teacher:profiles!teacher_id(full_name))')
      .eq('student_id',student.id).eq('status','active')
      .then(({data})=>{
        const cs = (data||[]).map(e=>e.course).filter(Boolean)
        setCourses(cs)
        if (!rc) {
          setGrades(cs.map(c=>({ course_id:c.id, course:c.name, subject:c.subject, credits:c.credits||1, grade:'', teacher:c.teacher?.full_name||'' })))
        }
      })
  }, [student.id])

  // Auto-calculate attendance when term changes
  useEffect(() => {
    if (!termId || rc) return  // skip if editing existing rc (keep saved values)
    const term = terms.find(t => t.id === termId)
    if (!term?.start_date || !term?.end_date) return

    supabase.from('attendance')
      .select('status')
      .eq('student_id', student.id)
      .gte('date', term.start_date)
      .lte('date', term.end_date)
      .then(({ data }) => {
        const records = data || []
        const present = records.filter(a => a.status === 'present').length
        const absent  = records.filter(a => a.status === 'absent').length
        const late    = records.filter(a => a.status === 'late').length
        // Count late as present for attendance purposes
        setAttendance({ present: present + late, absent })
      })
  }, [termId, student.id])

  function setGrade(idx, val) {
    setGrades(g=>g.map((r,i)=>i===idx?{...r,grade:val}:r))
  }

  function calcGpa() {
    const valid = grades.filter(g=>GRADE_MAP[g.grade]!==undefined)
    if (!valid.length) return null
    const total = valid.reduce((a,b)=>a+GRADE_MAP[b.grade]*Number(b.credits||1),0)
    const credits = valid.reduce((a,b)=>a+Number(b.credits||1),0)
    return credits>0 ? (total/credits).toFixed(2) : null
  }

  const currentTerm = terms.find(t=>t.id===termId)

  async function save() {
    if (!termId) return
    setSaving(true)
    const gpa = calcGpa()
    const payload = {
      student_id: student.id,
      term_id: termId,
      school_year: currentTerm?.school_year?.name || '',
      term_name: currentTerm?.name || '',
      grades,
      gpa: gpa ? parseFloat(gpa) : null,
      attendance_days_present: Number(attendance.present),
      attendance_days_absent:  Number(attendance.absent),
      teacher_comments: comments.trim()||null,
    }
    rc ? await supabase.from('report_cards').update(payload).eq('id',rc.id)
       : await supabase.from('report_cards').insert([payload])
    setSaving(false); onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:620,maxHeight:'90vh',display:'flex',flexDirection:'column'}}>
        <div className="modal-header">
          <div className="modal-title">📊 Report Card — {student.full_name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="input-label">Term</label>
              <select className="select" value={termId} onChange={e=>setTermId(e.target.value)}>
                <option value="">— Select Term —</option>
                {terms.map(t=><option key={t.id} value={t.id}>{t.school_year?.name} — {t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Days Present <span style={{fontSize:10,color:'var(--teal)',fontWeight:400}}>(auto-filled from attendance records)</span></label>
              <input className="input" type="number" min="0" value={attendance.present} onChange={e=>setAttendance(p=>({...p,present:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="input-label">Days Absent <span style={{fontSize:10,color:'var(--coral)',fontWeight:400}}>(auto-filled from attendance records)</span></label>
              <input className="input" type="number" min="0" value={attendance.absent} onChange={e=>setAttendance(p=>({...p,absent:e.target.value}))}/>
            </div>
            <div style={{display:'flex',alignItems:'flex-end',paddingBottom:4}}>
              <div style={{fontWeight:800,fontSize:18,color:'var(--teal)'}}>GPA: {calcGpa()||'—'}</div>
            </div>
          </div>

          <div style={{marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>Course Grades</div>
            {grades.length===0
              ? <div style={{fontSize:12,color:'var(--muted)',fontStyle:'italic'}}>No enrolled courses found. Enroll the student in courses first.</div>
              : <table className="data-table">
                  <thead><tr><th>Course</th><th>Subject</th><th>Credits</th><th>Teacher</th><th>Grade</th></tr></thead>
                  <tbody>{grades.map((g,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:700,fontSize:12}}>{g.course}</td>
                      <td style={{fontSize:11,color:'var(--muted)'}}>{g.subject}</td>
                      <td>{g.credits}</td>
                      <td style={{fontSize:11,color:'var(--muted)'}}>{g.teacher||'—'}</td>
                      <td>
                        <select style={{padding:'3px 8px',borderRadius:6,border:'1px solid var(--border)',fontSize:12,fontWeight:700,background:g.grade?'#e6fff4':'white'}}
                          value={g.grade} onChange={e=>setGrade(i,e.target.value)}>
                          <option value="">—</option>
                          {GRADE_OPTS.map(o=><option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
            }
          </div>

          <div className="form-group">
            <label className="input-label">Teacher Comments (optional)</label>
            <textarea className="input" rows={3} value={comments} onChange={e=>setComments(e.target.value)} placeholder="General comments about the student's progress…" style={{resize:'vertical'}}/>
          </div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:12,borderTop:'1px solid var(--border)'}}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving||!termId}>{saving?'Saving…':rc?'Save Changes':'Generate Report Card'}</button>
        </div>
      </div>
    </div>
  )
}
