import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const AV = ['av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8']
function letterGrade(pct) {
  if (pct==null) return '—'
  if (pct>=93) return 'A'; if (pct>=90) return 'A-'
  if (pct>=87) return 'B+'; if (pct>=83) return 'B'; if (pct>=80) return 'B-'
  if (pct>=77) return 'C+'; if (pct>=73) return 'C'; if (pct>=70) return 'C-'
  if (pct>=67) return 'D+'; if (pct>=60) return 'D'; return 'F'
}
function gradeColor(pct) {
  if (pct==null) return 'var(--muted)'
  if (pct>=90) return '#00b86b'; if (pct>=80) return 'var(--teal)'
  if (pct>=70) return '#ffc845'; if (pct>=60) return '#ff8c42'
  return 'var(--coral)'
}

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student,     setStudent]     = useState(null)
  const [courses,     setCourses]     = useState([])
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [attendance,  setAttendance]  = useState([])
  const [billing,     setBilling]     = useState([])
  const [reportCards, setReportCards] = useState([])
  const [teachers,    setTeachers]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('overview')
  const [editing,     setEditing]     = useState(false)
  const [editForm,    setEditForm]    = useState({})
  const [saving,      setSaving]      = useState(false)
  const [savedMsg,    setSavedMsg]    = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    const [{ data: stu }, { data: tchs }] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).single(),
      supabase.from('profiles').select('id,full_name').eq('role','teacher').order('full_name'),
    ])
    if (!stu) { navigate('/admin/students'); return }
    setStudent(stu); setEditForm(stu); setTeachers(tchs||[])

    const { data: enr } = await supabase.from('enrollments')
      .select('course:courses(id,name,subject,grade_level,teacher:profiles!teacher_id(full_name))')
      .eq('student_id', id).eq('status','active')
    const studentCourses = (enr||[]).map(e=>e.course).filter(Boolean)
    setCourses(studentCourses)

    const cIds = studentCourses.map(c=>c.id)
    const [{ data: asgns }, { data: subs }, { data: att }, { data: bills }, { data: rcs }] = await Promise.all([
      cIds.length ? supabase.from('assignments').select('*,course:courses(name)').in('course_id',cIds).order('due_date',{ascending:false}) : { data: [] },
      supabase.from('submissions').select('*,assignment:assignments(title,max_points,course:courses(name))').eq('student_id',id).order('submitted_at',{ascending:false}),
      supabase.from('attendance').select('*,course:courses(name)').eq('student_id',id).order('date',{ascending:false}).limit(60),
      supabase.from('billing').select('*').eq('student_id',id).order('due_date',{ascending:false}),
      supabase.from('report_cards').select('*').eq('student_id',id).order('created_at',{ascending:false}),
    ])
    setAssignments(asgns||[]); setSubmissions(subs||[]); setAttendance(att||[])
    setBilling(bills||[]); setReportCards(rcs||[])
    setLoading(false)
  }

  async function saveEdits() {
    setSaving(true)
    const { full_name, grade_level, country, guardian_name, guardian_email, guardian_phone, student_id, notes, teacher_id } = editForm
    await supabase.from('students').update({ full_name, grade_level, country, guardian_name, guardian_email, guardian_phone, student_id, notes, teacher_id: teacher_id||null }).eq('id', id)
    setStudent(s => ({ ...s, ...editForm }))
    setSaving(false); setEditing(false)
    setSavedMsg('✅ Saved!'); setTimeout(() => setSavedMsg(''), 3000)
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `student-photos/${id}.${ext}`
    const { data, error } = await supabase.storage.from('ble-assets').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('ble-assets').getPublicUrl(path)
      await supabase.from('students').update({ photo_url: publicUrl }).eq('id', id)
      setStudent(s => ({ ...s, photo_url: publicUrl }))
    }
    setPhotoUploading(false)
  }

  // Computed stats
  const gradedSubs  = submissions.filter(s=>s.status==='graded'&&s.points!=null)
  const totalPts    = gradedSubs.reduce((a,s)=>a+Number(s.points||0),0)
  const totalMax    = gradedSubs.reduce((a,s)=>a+Number(s.assignment?.max_points||100),0)
  const overallPct  = gradedSubs.length&&totalMax ? Math.round((totalPts/totalMax)*100) : null
  const present     = attendance.filter(a=>a.status==='present'||a.status==='late').length
  const attRate     = attendance.length ? Math.round((present/attendance.length)*100) : null
  const balanceDue  = billing.filter(b=>b.status!=='paid').reduce((a,b)=>a+Number(b.amount||0),0)
  const GRADES = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th']

  const TABS = [['overview','📊 Overview'],['grades','🏆 Grades'],['attendance','📅 Attendance'],['billing','💳 Billing'],['report_cards','📋 Report Cards'],['edit','✏️ Edit Profile']]

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>
  if (!student) return null

  const avClass = AV[student.full_name?.charCodeAt(0)%8||0]

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',gap:20,marginBottom:20,padding:'20px 24px',background:'white',borderRadius:16,boxShadow:'var(--sh)'}}>
        <button onClick={()=>navigate('/admin/students')} style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 12px',cursor:'pointer',fontSize:12,fontWeight:700,flexShrink:0,marginTop:4}}>
          ← Back
        </button>
        <div style={{position:'relative',flexShrink:0}}>
          {student.photo_url
            ? <img src={student.photo_url} alt={student.full_name} style={{width:72,height:72,borderRadius:'50%',objectFit:'cover',border:'3px solid var(--teal)'}}/>
            : <div className={`avatar avatar-lg ${avClass}`} style={{width:72,height:72,fontSize:22}}>{student.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
          }
          <label style={{position:'absolute',bottom:0,right:0,width:22,height:22,borderRadius:'50%',background:'var(--teal)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:12,border:'2px solid white'}}>
            {photoUploading ? '…' : '📷'}
            <input type="file" accept="image/*" style={{display:'none'}} onChange={uploadPhoto}/>
          </label>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:22}}>{student.full_name}</div>
          <div style={{fontSize:13,color:'var(--muted)',marginTop:3}}>{student.grade_level} Grade · {student.country||'—'} · ID: {student.student_id||'—'}</div>
          <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
            <span className="badge badge-green">Active</span>
            {courses.map(c=><span key={c.id} className="badge badge-blue" style={{fontSize:9}}>{c.name}</span>)}
          </div>
        </div>
        {savedMsg && <div style={{padding:'6px 14px',background:'#f0fdf9',border:'1px solid var(--teal)',borderRadius:8,fontSize:12,fontWeight:700,color:'var(--teal)'}}>{savedMsg}</div>}
        <div style={{display:'flex',gap:20,textAlign:'center',flexShrink:0}}>
          {[['📊',overallPct!=null?`${overallPct}%`:'—','Grade'],[' 📅',attRate!=null?`${attRate}%`:'—','Attend.'],['💳',`$${balanceDue.toFixed(0)}`,'Balance'],['📚',courses.length,'Courses']].map(([ic,v,l])=>(
            <div key={l}><div style={{fontWeight:900,fontSize:17,color:'var(--teal)'}}>{v}</div><div style={{fontSize:10,color:'var(--muted)'}}>{l}</div></div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,borderBottom:'2px solid var(--border)',marginBottom:16,background:'white',borderRadius:'12px 12px 0 0',padding:'0 16px',boxShadow:'var(--sh)'}}>
        {TABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'10px 14px',border:'none',cursor:'pointer',fontSize:12,fontWeight:tab===k?800:500,
            borderBottom:tab===k?'3px solid var(--teal)':'3px solid transparent',marginBottom:-2,background:'none',
            color:tab===k?'var(--teal)':'var(--muted)',whiteSpace:'nowrap'}}>{l}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==='overview' && (
        <div className="grid-2 fade-up">
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">👤 Student Info</div></div>
              {[['Guardian',student.guardian_name||'—'],['Guardian Email',student.guardian_email||'—'],['Guardian Phone',student.guardian_phone||'—'],['Country',student.country||'—'],['Teacher',teachers.find(t=>t.id===student.teacher_id)?.full_name||'—']].map(([l,v])=>(
                <div key={l} style={{display:'flex',padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{width:130,fontSize:12,color:'var(--muted)',fontWeight:600}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:600}}>{v}</div>
                </div>
              ))}
              {student.notes && <div style={{marginTop:10,padding:'8px 12px',background:'var(--bg)',borderRadius:8,fontSize:12,color:'var(--text)',lineHeight:1.5}}>{student.notes}</div>}
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">📅 Recent Attendance</div></div>
              {attendance.slice(0,10).map(a=>(
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:14}}>{a.status==='present'?'✅':a.status==='late'?'⏰':'❌'}</span>
                  <div style={{flex:1,fontSize:12}}>{a.course?.name||'Homeroom'}</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>{a.date}</div>
                </div>
              ))}
              {attendance.length===0&&<div className="empty-state" style={{padding:20}}><div className="es-text">No attendance records.</div></div>}
            </div>
          </div>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><div className="card-title">📚 Enrolled Courses</div></div>
              {courses.length===0
                ? <div className="empty-state" style={{padding:20}}><div className="es-text">No courses enrolled.</div></div>
                : courses.map(c=>(
                    <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:13}}>{c.name}</div>
                        <div style={{fontSize:11,color:'var(--muted)'}}>{c.subject} · {c.teacher?.full_name||'Unassigned'}</div>
                      </div>
                    </div>
                  ))
              }
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">💰 Billing Summary</div></div>
              {[['Total Billed',`$${billing.reduce((a,b)=>a+Number(b.amount||0),0).toFixed(2)}`],
                ['Paid',`$${billing.filter(b=>b.status==='paid').reduce((a,b)=>a+Number(b.amount||0),0).toFixed(2)}`],
                ['Balance Due',`$${balanceDue.toFixed(2)}`]].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                    <div style={{fontSize:12,color:'var(--muted)'}}>{l}</div>
                    <div style={{fontWeight:700,fontSize:13}}>{v}</div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── GRADES ── */}
      {tab==='grades' && (
        <div className="fade-up">
          {submissions.length===0
            ? <div className="empty-state"><div className="es-icon">📊</div><div className="es-text">No graded work yet.</div></div>
            : submissions.map(s=>{
                const pct = s.assignment?.max_points&&s.points!=null ? Math.round((s.points/s.assignment.max_points)*100) : null
                return (
                  <div key={s.id} className="card" style={{marginBottom:8,padding:'12px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:13}}>{s.assignment?.title||'Assignment'}</div>
                        <div style={{fontSize:11,color:'var(--muted)'}}>{s.assignment?.course?.name} · {s.status}</div>
                        {s.feedback&&<div style={{fontSize:11,color:'var(--text)',marginTop:4,padding:'3px 8px',background:'var(--bg)',borderRadius:6}}>💬 {s.feedback}</div>}
                        {s.content&&<div style={{fontSize:11,color:'var(--muted)',marginTop:4,fontStyle:'italic'}}>{s.content.slice(0,100)}{s.content.length>100?'…':''}</div>}
                      </div>
                      {s.status==='graded'&&<div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontWeight:900,fontSize:17,color:gradeColor(pct)}}>{s.points}/{s.assignment?.max_points||100}</div>
                        <div style={{fontSize:12,fontWeight:800,color:gradeColor(pct)}}>{letterGrade(pct)}</div>
                      </div>}
                      <span className={`badge ${s.status==='graded'?'badge-green':s.status==='submitted'?'badge-blue':'badge-gold'}`}>{s.status}</span>
                    </div>
                  </div>
                )
              })
          }
        </div>
      )}

      {/* ── ATTENDANCE ── */}
      {tab==='attendance' && (
        <div className="fade-up">
          <div className="grid-3" style={{marginBottom:16}}>
            {[['✅','Present',attendance.filter(a=>a.status==='present').length,'#00b86b'],['⏰','Late',attendance.filter(a=>a.status==='late').length,'#b07800'],['❌','Absent',attendance.filter(a=>a.status==='absent').length,'#cc3333']].map(([ic,l,n,c])=>(
              <div key={l} className="card" style={{textAlign:'center',padding:16}}>
                <div style={{fontSize:24,marginBottom:4}}>{ic}</div>
                <div style={{fontWeight:900,fontSize:24,color:c}}>{n}</div>
                <div style={{fontSize:12,color:'var(--muted)'}}>{l} · {attendance.length?Math.round((n/attendance.length)*100):0}%</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Attendance Log</div></div>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Course</th><th>Status</th></tr></thead>
              <tbody>
                {attendance.map(a=>(
                  <tr key={a.id}>
                    <td style={{fontWeight:600}}>{a.date}</td>
                    <td style={{color:'var(--muted)'}}>{a.course?.name||'Homeroom'}</td>
                    <td><span className={`badge ${a.status==='present'?'badge-green':a.status==='late'?'badge-gold':'badge-red'}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {attendance.length===0&&<div className="empty-state"><div className="es-text">No records.</div></div>}
          </div>
        </div>
      )}

      {/* ── BILLING ── */}
      {tab==='billing' && (
        <div className="fade-up card">
          <div className="card-header"><div className="card-title">Billing History</div></div>
          <table className="data-table">
            <thead><tr><th>Description</th><th>Amount</th><th>Due</th><th>Status</th><th>Paid On</th></tr></thead>
            <tbody>
              {billing.map(b=>(
                <tr key={b.id}>
                  <td>{b.description}</td>
                  <td style={{fontWeight:700}}>${Number(b.amount||0).toFixed(2)}</td>
                  <td>{b.due_date||'—'}</td>
                  <td><span className={`badge ${b.status==='paid'?'badge-green':b.status==='overdue'?'badge-red':'badge-gold'}`}>{b.status}</span></td>
                  <td style={{color:'var(--muted)',fontSize:11}}>{b.paid_at?new Date(b.paid_at).toLocaleDateString():'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {billing.length===0&&<div className="empty-state"><div className="es-text">No billing records.</div></div>}
        </div>
      )}

      {/* ── REPORT CARDS ── */}
      {tab==='report_cards' && (
        <div className="fade-up">
          {reportCards.length===0
            ? <div className="empty-state"><div className="es-icon">📋</div><div className="es-text">No report cards yet.</div></div>
            : reportCards.map(rc=>(
                <div key={rc.id} className="card" style={{marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,fontSize:14}}>{rc.term_name||'Report Card'}</div>
                      <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>GPA: <strong>{rc.gpa||'—'}</strong> · Overall: <strong>{rc.overall_grade||'—'}</strong></div>
                      {rc.teacher_comments&&<div style={{fontSize:12,marginTop:4,lineHeight:1.5}}>"{rc.teacher_comments}"</div>}
                    </div>
                    <span className={`badge ${rc.published?'badge-green':'badge-gold'}`}>{rc.published?'Published':'Draft'}</span>
                    <div style={{textAlign:'center',padding:'8px 16px',background:'var(--bg)',borderRadius:10}}>
                      <div style={{fontWeight:900,fontSize:20,color:'var(--teal)'}}>{rc.gpa||'—'}</div>
                      <div style={{fontSize:10,color:'var(--muted)'}}>GPA</div>
                    </div>
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* ── EDIT ── */}
      {tab==='edit' && (
        <div className="fade-up">
          <div className="grid-2">
            <div className="card">
              <div className="card-header"><div className="card-title">Student Information</div></div>
              {[['full_name','Full Name','text'],['student_id','Student ID','text'],['grade_level','Grade Level','select'],['country','Country','text']].map(([k,l,t])=>(
                <div key={k} className="form-group">
                  <label className="input-label">{l}</label>
                  {t==='select'
                    ? <select className="input" value={editForm[k]||''} onChange={e=>setEditForm(p=>({...p,[k]:e.target.value}))}>
                        {GRADES.map(g=><option key={g} value={g}>{g} Grade</option>)}
                      </select>
                    : <input className="input" type={t} value={editForm[k]||''} onChange={e=>setEditForm(p=>({...p,[k]:e.target.value}))}/>
                  }
                </div>
              ))}
              <div className="form-group">
                <label className="input-label">Homeroom Teacher</label>
                <select className="input" value={editForm.teacher_id||''} onChange={e=>setEditForm(p=>({...p,teacher_id:e.target.value}))}>
                  <option value="">None</option>
                  {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Guardian Information</div></div>
              {[['guardian_name','Guardian Name','text'],['guardian_email','Email','email'],['guardian_phone','Phone','text']].map(([k,l,t])=>(
                <div key={k} className="form-group">
                  <label className="input-label">{l}</label>
                  <input className="input" type={t} value={editForm[k]||''} onChange={e=>setEditForm(p=>({...p,[k]:e.target.value}))}/>
                </div>
              ))}
              <div className="form-group">
                <label className="input-label">Notes</label>
                <textarea className="input" rows={4} value={editForm.notes||''} onChange={e=>setEditForm(p=>({...p,notes:e.target.value}))} placeholder="Internal notes about this student…"/>
              </div>
              <button className="btn btn-primary" onClick={saveEdits} disabled={saving}>{saving?'Saving…':'💾 Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
