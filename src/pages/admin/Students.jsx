import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const GRADE_LEVELS = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th']
const GRADE_COLORS = {
  '1st':'#06d6a0','2nd':'#00c9b1','3rd':'#3b9eff','4th':'#00c9b1','5th':'#3b9eff','6th':'#f72585','7th':'#ffc845',
  '8th':'#ff6058','9th':'#7b5ea7','10th':'#06d6a0','11th':'#ff8c42','12th':'#00b4d8'
}
const AV_COLORS = ['av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8']

export default function AdminStudents() {
  const [students,       setStudents]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [filterGrade,    setFilterGrade]    = useState('all')
  const [openGrades,     setOpenGrades]     = useState({ '1st':true, '2nd':true, '3rd':true, '4th':true, '5th':true })
  const [showModal,      setShowModal]      = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(null)
  const [assignModal,    setAssignModal]    = useState(null)
  const navigate = useNavigate()
  const [profileModal,   setProfileModal]   = useState(null) // student profile/course assignment
  const [teachers,       setTeachers]       = useState([])
  const [withdrawModal,  setWithdrawModal]  = useState(null)
  const [withdrawReason, setWithdrawReason] = useState('')

  useEffect(() => { loadStudents(); loadTeachers() }, [])

  async function loadTeachers() {
    const { data } = await supabase.from('profiles').select('id,full_name,subject,grade_assigned').eq('role','teacher').order('full_name')
    setTeachers(data||[])
  }

  async function loadStudents() {
    const { data } = await supabase.from('students').select('*').order('grade_level').order('full_name')
    setStudents(data || [])
    setLoading(false)
  }

  async function withdrawStudent(student) {
    await supabase.from('students').update({
      status: 'withdrawn',
      withdrawal_date: new Date().toISOString().split('T')[0],
      withdrawal_reason: withdrawReason || 'Withdrawn by admin',
      previous_status: student.status || 'active'
    }).eq('id', student.id)
    setWithdrawModal(null)
    setWithdrawReason('')
    loadStudents()
  }

  async function reEnrollStudent(student) {
    await supabase.from('students').update({
      status: 'active',
      withdrawal_date: null,
      withdrawal_reason: null,
    }).eq('id', student.id)
    loadStudents()
  }

  async function deleteStudent(student) {
    await supabase.from('students').delete().eq('id', student.id)
    setConfirmDelete(null)
    loadStudents()
  }

  const filtered = students.filter(s => {
    const matchSearch = s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.country?.toLowerCase().includes(search.toLowerCase())
    const matchGrade  = filterGrade === 'all' || s.grade_level === filterGrade
    return matchSearch && matchGrade
  })

  const byGrade = GRADE_LEVELS.reduce((acc, g) => {
    acc[g] = filtered.filter(s => s.grade_level === g)
    return acc
  }, {})

  function toggleGrade(g) {
    setOpenGrades(p => ({ ...p, [g]: !p[g] }))
  }

  const totalByGrade = g => students.filter(s => s.grade_level === g).length

  return (
    <div>
      <div className="page-header fade-up">
        <h2>Students by Grade Level</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Enroll Student</button>
      </div>

      <div className="filter-row fade-up-2">
        <div className={`filter-chip ${filterGrade==='all'?'active':''}`} onClick={() => setFilterGrade('all')}>
          All ({students.length})
        </div>
        {GRADE_LEVELS.map(g => (
          <div key={g} className={`filter-chip ${filterGrade===g?'active':''}`} onClick={() => setFilterGrade(g)}>
            {g} ({totalByGrade(g)})
          </div>
        ))}
        <input className="input" style={{ marginLeft:'auto', width:190 }} placeholder="🔍 Search student…" value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ height:200 }}><div className="spinner"/></div>
      ) : (
        <div className="fade-up-3">
          {GRADE_LEVELS.map(g => {
            const gStudents = byGrade[g]
            if (filterGrade !== 'all' && filterGrade !== g) return null
            if (!gStudents.length && search) return null
            const avgAtt = gStudents.length ? Math.round(gStudents.reduce((a,s) => a+(s.attendance_rate||94),0)/gStudents.length)+'%' : '—'

            return (
              <div key={g} className="grade-section">
                <div className="grade-section-header" onClick={() => toggleGrade(g)}>
                  <div className="gs-color" style={{ background: GRADE_COLORS[g] }}/>
                  <div className="gs-title">{g} Grade</div>
                  <div className="gs-stats">
                    <div className="gs-stat"><div className="gsn">{gStudents.length}</div><div className="gsl">Students</div></div>
                    <div className="gs-stat"><div className="gsn">B+</div><div className="gsl">Avg GPA</div></div>
                    <div className="gs-stat"><div className="gsn">{avgAtt}</div><div className="gsl">Attend.</div></div>
                  </div>
                  <div className={`gs-toggle ${openGrades[g]?'open':''}`}>▼</div>
                </div>

                <div className={`grade-body ${openGrades[g]?'open':''}`}>
                  {!gStudents.length ? (
                    <div className="empty-state" style={{ padding:'20px' }}>
                      <div className="es-icon">👥</div>
                      <div className="es-text">No students enrolled in {g} grade yet.</div>
                    </div>
                  ) : (
                    <div className="students-grid">
                      {gStudents.map((s, i) => (
                        <div key={s.id} className="student-card" style={{ borderLeftColor: GRADE_COLORS[g], cursor:'pointer' }}
                          onClick={() => navigate(`/admin/students/${s.id}`)}>
                          <div className={`student-card-av ${AV_COLORS[i%8]}`}>
                            {s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}
                          </div>
                          <div className="student-card-name">{s.full_name}</div>
                          <div className="student-card-meta">{s.country} · ID: {s.student_id||'—'}</div>
                          <div className="student-card-stats">
                            <div className="sc-pill"><div className="sc-pill-num">{s.gpa||'B+'}</div><div className="sc-pill-lbl">GPA</div></div>
                            <div className="sc-pill"><div className="sc-pill-num">{s.attendance_rate||94}%</div><div className="sc-pill-lbl">Attend.</div></div>
                            <div className="sc-pill"><div className="sc-pill-num">{s.course_count||5}</div><div className="sc-pill-lbl">Courses</div></div>
                          </div>
                          {['1st','2nd','3rd','4th','5th'].includes(g) && (
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/admin/students/${s.id}`) }}
                              style={{marginTop:8,width:'100%',background:'#e6fff9',border:'1px solid #b0eedd',borderRadius:8,padding:'5px 0',fontSize:11,color:'#0a5a3a',cursor:'pointer',fontWeight:700}}
                            >👩‍🏫 {s.teacher_id ? 'Change Teacher' : 'Assign Teacher'}</button>
                          )}
                          {!['1st','2nd','3rd','4th','5th'].includes(g) && (
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/admin/students/${s.id}`) }}
                              style={{marginTop:8,width:'100%',background:'#e6f4ff',border:'1px solid #b0d4ff',borderRadius:8,padding:'5px 0',fontSize:11,color:'#0050b0',cursor:'pointer',fontWeight:700}}
                            >📚 Manage Courses</button>
                          )}
                          {s.status === 'withdrawn'
                            ? <button onClick={e=>{ e.stopPropagation(); reEnrollStudent(s) }}
                                style={{marginTop:8,width:'100%',background:'#e6fff4',border:'1px solid #b0eedd',borderRadius:8,padding:'5px 0',fontSize:11,color:'#00804a',cursor:'pointer',fontWeight:700}}>
                                ↩ Re-enroll Student</button>
                            : <button onClick={e=>{ e.stopPropagation(); setWithdrawModal(s); setWithdrawReason('') }}
                                style={{marginTop:8,width:'100%',background:'#fff9e6',border:'1px solid #ffe599',borderRadius:8,padding:'5px 0',fontSize:11,color:'#b07800',cursor:'pointer',fontWeight:700}}>
                                📤 Withdraw Student</button>
                          }
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmDelete(s) }}
                            style={{marginTop:4,width:'100%',background:'#fff0f0',border:'1px solid #ffcccc',borderRadius:8,padding:'5px 0',fontSize:11,color:'#cc3333',cursor:'pointer',fontWeight:700}}
                          >🗑 Delete Permanently</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <EnrollModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadStudents() }}
        />
      )}

      {profileModal && (
        <StudentProfileModal
          student={profileModal}
          teachers={teachers}
          onClose={() => setProfileModal(null)}
          onSaved={() => { loadStudents() }}
        />
      )}

      {assignModal && (
        <AssignTeacherModal
          student={assignModal}
          teachers={teachers}
          onClose={() => setAssignModal(null)}
          onSaved={() => { setAssignModal(null); loadStudents() }}
        />
      )}

      {withdrawModal && (
        <div className="modal-overlay" onClick={()=>{ setWithdrawModal(null); setWithdrawReason('') }}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
            <div className="modal-header">
              <div className="modal-title">📤 Withdraw Student</div>
              <button className="modal-close" onClick={()=>{ setWithdrawModal(null); setWithdrawReason('') }}>✕</button>
            </div>
            <p style={{fontSize:13,color:'var(--text)',marginBottom:12}}>
              Withdrawing <strong>{withdrawModal.full_name}</strong> will mark them as inactive and remove them from active class rosters. Their records are preserved and they can be re-enrolled at any time.
            </p>
            <div className="form-group">
              <label className="input-label">Reason for Withdrawal</label>
              <select className="input" value={withdrawReason} onChange={e=>setWithdrawReason(e.target.value)}>
                <option value="">— Select reason —</option>
                <option>Transferred to another school</option>
                <option>Family relocation</option>
                <option>Academic dismissal</option>
                <option>Financial reasons</option>
                <option>Health / medical</option>
                <option>Graduated early</option>
                <option>Parent request</option>
                <option>Other</option>
              </select>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
              <button className="btn btn-outline" onClick={()=>{ setWithdrawModal(null); setWithdrawReason('') }}>Cancel</button>
              <button className="btn" style={{background:'#b07800',color:'white'}} onClick={()=>withdrawStudent(withdrawModal)} disabled={!withdrawReason}>Withdraw Student</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:380}}>
            <div className="modal-header">
              <div className="modal-title">🗑 Permanently Delete</div>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <div style={{textAlign:'center',padding:'16px 0 8px'}}>
              <div style={{fontSize:44,marginBottom:10}}>⚠️</div>
              <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:15,marginBottom:8}}>Delete {confirmDelete.full_name}?</div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:6}}>This permanently deletes the student and <strong>all their records</strong> including grades, attendance, and submissions.</div>
              <div style={{fontSize:12,color:'#cc3333',fontWeight:700,marginBottom:20}}>This cannot be undone. Consider using Withdraw instead.</div>
              <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="btn" style={{background:'#cc3333',color:'white'}} onClick={() => deleteStudent(confirmDelete)}>Yes, Delete Permanently</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EnrollModal({ onClose, onSaved }) {
  const [form, setForm]       = useState({ full_name:'', email:'', grade_level:'1st', country:'', guardian_name:'', guardian_email:'', school_message:'' })
  const [saving,   setSaving] = useState(false)
  const [error,    setError]  = useState('')
  const [invited, setInvited] = useState(null)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error: dbError } = await supabase.from('students').insert([{
      full_name:      form.full_name,
      email:          form.email,
      grade_level:    form.grade_level,
      country:        form.country,
      guardian_name:  form.guardian_name,
      guardian_email: form.guardian_email,
      status:         'active',
      student_id:     'BLE-' + Date.now().toString().slice(-6)
    }])

    if (dbError) { setError(dbError.message); setSaving(false); return }

    if (form.guardian_email) {
      try {
        const res  = await fetch('/.netlify/functions/invite-parent', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            student_name:   form.full_name,
            student_grade:  form.grade_level,
            guardian_name:  form.guardian_name,
            guardian_email: form.guardian_email,
            school_message: form.school_message || ''
          })
        })
        const data = await res.json()
        if (data.success) {
          setInvited({ email: form.guardian_email, password: data.temp_password, email_sent: data.email_sent, email_error: data.email_error })
          setSaving(false)
          return
        }
      } catch (err) {
        setError('Student enrolled but invite failed: ' + err.message)
        setSaving(false)
        setTimeout(onSaved, 2000)
        return
      }
    }

    setSaving(false)
    onSaved()
  }

  if (invited) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:420}}>
          <div className="modal-header">
            <div className="modal-title">✅ Student Enrolled & Invite Sent</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div style={{textAlign:'center',padding:'20px 0 10px'}}>
            <div style={{fontSize:52,marginBottom:10}}>📧</div>
            <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:16,marginBottom:6}}>Parent Portal Access Created</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:20}}>
              {invited.email_sent ? 'An invite email was sent to the parent.' : 'Share these credentials with the parent to access their portal.'}
            </div>
            {invited.email_error && (
              <div style={{background:'#fff0f0',border:'1px solid #ffcccc',borderRadius:8,padding:'8px 12px',fontSize:11,color:'#cc3333',marginBottom:10}}>
                Email error: {invited.email_error}
              </div>
            )}
          </div>
          <div style={{background:'#e6fff9',border:'1.5px solid #b0eedd',borderRadius:12,padding:'14px 18px',marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13}}>
              <span style={{color:'#555'}}>Email</span>
              <span style={{fontWeight:700,color:'#12103a'}}>{invited.email}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13}}>
              <span style={{color:'#555'}}>Temp Password</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontWeight:800,fontFamily:'monospace',fontSize:15,color:'#0f5a45',letterSpacing:1}}>{invited.password}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(invited.password)}
                  style={{background:'#00c9b1',color:'white',border:'none',borderRadius:6,padding:'3px 8px',fontSize:10,cursor:'pointer',fontWeight:700}}
                >Copy</button>
              </div>
            </div>
          </div>
          <div style={{background:'#fff9e6',border:'1px solid #ffe599',borderRadius:10,padding:'10px 14px',fontSize:11,color:'#b07800',marginBottom:20}}>
            ⚠️ Share this password securely. The parent should change it after first login.
          </div>
          <button className="btn btn-primary" style={{width:'100%'}} onClick={onSaved}>Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Enroll New Student</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="grid-2">
            <div className="form-group">
              <label className="input-label">Full Name</label>
              <input className="input" required value={form.full_name} onChange={e => setForm(p=>({...p,full_name:e.target.value}))} placeholder="Student full name"/>
            </div>
            <div className="form-group">
              <label className="input-label">Grade Level</label>
              <select className="select" value={form.grade_level} onChange={e => setForm(p=>({...p,grade_level:e.target.value}))}>
                {GRADE_LEVELS.map(g => <option key={g} value={g}>{g} Grade</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Country</label>
              <input className="input" value={form.country} onChange={e => setForm(p=>({...p,country:e.target.value}))} placeholder="e.g. 🇺🇸 United States"/>
            </div>
            <div className="form-group">
              <label className="input-label">Student Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="student@email.com"/>
            </div>
            <div className="form-group">
              <label className="input-label">Guardian Name</label>
              <input className="input" value={form.guardian_name} onChange={e => setForm(p=>({...p,guardian_name:e.target.value}))} placeholder="Parent/guardian name"/>
            </div>
            <div className="form-group">
              <label className="input-label">Guardian Email</label>
              <input className="input" type="email" value={form.guardian_email} onChange={e => setForm(p=>({...p,guardian_email:e.target.value}))} placeholder="parent@email.com"/>
            </div>
          </div>
          <div className="form-group" style={{marginTop:4}}>
            <label className="input-label">Message from School <span style={{fontWeight:400,color:'var(--muted)'}}>(optional)</span></label>
            <textarea className="input" rows={2} value={form.school_message} onChange={e => setForm(p=>({...p,school_message:e.target.value}))} placeholder="Welcome to BLE Worldwide!" style={{resize:'vertical'}}/>
          </div>
          <div style={{background:'#e6fff9',border:'1px solid #b0eedd',borderRadius:10,padding:'9px 14px',fontSize:11,color:'#0a5a3a',marginTop:4,marginBottom:8}}>
            📧 A parent portal invite with login credentials will be sent automatically to the guardian email.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enrolling & Inviting…' : 'Enroll + Send Invite'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AssignTeacherModal({ student, teachers, onClose, onSaved }) {
  const [selected, setSelected] = useState(student.teacher_id || '')
  const [saving,   setSaving]   = useState(false)

  // Elementary teachers — those assigned to 4th or 5th grade, or with no grade restriction
  const eligible = teachers.filter(t =>
    !t.grade_assigned ||
    t.grade_assigned === student.grade_level ||
    t.grade_assigned === 'All Grades'
  )

  async function handleSave() {
    setSaving(true)
    await supabase.from('students').update({ teacher_id: selected || null }).eq('id', student.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:400}}>
        <div className="modal-header">
          <div className="modal-title">Assign Teacher — {student.full_name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:12}}>
          {student.grade_level} Grade · Assigning a homeroom teacher gives this teacher direct access to this student.
        </div>
        <div style={{maxHeight:300,overflowY:'auto',border:'1px solid var(--border)',borderRadius:10,marginBottom:14}}>
          <div
            onClick={() => setSelected('')}
            style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:selected===''?'#e6fff9':'white'}}
          >
            <div style={{width:18,height:18,borderRadius:'50%',border:'2px solid',borderColor:selected===''?'var(--teal)':'var(--border)',background:selected===''?'var(--teal)':'white',flexShrink:0}}/>
            <div style={{fontSize:13,color:'var(--muted)',fontStyle:'italic'}}>— No teacher assigned —</div>
          </div>
          {eligible.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t.id)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:selected===t.id?'#e6fff9':'white'}}
            >
              <div style={{width:18,height:18,borderRadius:'50%',border:'2px solid',borderColor:selected===t.id?'var(--teal)':'var(--border)',background:selected===t.id?'var(--teal)':'white',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {selected===t.id && <span style={{color:'white',fontSize:10,fontWeight:900}}>✓</span>}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700}}>{t.full_name}</div>
                <div style={{fontSize:10,color:'var(--muted)'}}>{t.subject||'—'}{t.grade_assigned?` · ${t.grade_assigned} Grade`:''}</div>
              </div>
            </div>
          ))}
          {eligible.length === 0 && (
            <div style={{padding:20,textAlign:'center',fontSize:12,color:'var(--muted)'}}>
              No teachers available. Add teachers in the Staff tab first.
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Assign Teacher'}</button>
        </div>
      </div>
    </div>
  )
}

// ── STUDENT PROFILE MODAL ──
export function StudentProfileModal({ student, teachers, onClose, onSaved }) {
  const [courses,     setCourses]     = useState([])   // all available courses for this grade
  const [enrolled,    setEnrolled]    = useState([])   // currently enrolled course IDs
  const [selected,    setSelected]    = useState(new Set()) // working selection
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [savedMsg,    setSavedMsg]    = useState('')
  const [assignTeach, setAssignTeach] = useState(student.teacher_id||'')
  const isElementary  = ['1st','2nd','3rd','4th','5th'].includes(student.grade_level)

  useEffect(() => { loadData() }, [student.id])

  async function loadData() {
    if (isElementary) { setLoading(false); return }
    // Load all active courses for this grade level
    const { data: allCourses } = await supabase
      .from('courses')
      .select('id,name,subject,grade_level,teacher:profiles!teacher_id(id,full_name)')
      .eq('grade_level', student.grade_level)
      .eq('is_active', true)
      .order('name')
    // Load current enrollments
    const { data: enr } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', student.id)
      .eq('status', 'active')
    const enrolledIds = (enr||[]).map(e => e.course_id)
    setCourses(allCourses||[])
    setEnrolled(enrolledIds)
    setSelected(new Set(enrolledIds))
    setLoading(false)
  }

  function toggle(courseId) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(courseId) ? next.delete(courseId) : next.add(courseId)
      return next
    })
  }

  async function saveCourses() {
    setSaving(true)
    // Remove all current enrollments then re-insert selected
    await supabase.from('enrollments').delete().eq('student_id', student.id)
    if (selected.size > 0) {
      await supabase.from('enrollments').insert(
        [...selected].map(course_id => ({ student_id: student.id, course_id, status: 'active' }))
      )
    }
    // Update course_count on student
    await supabase.from('students').update({ course_count: selected.size }).eq('id', student.id)
    setSaving(false)
    setSavedMsg(`✅ ${selected.size} course${selected.size!==1?'s':''} saved!`)
    setTimeout(() => setSavedMsg(''), 3000)
    onSaved()
  }

  async function saveTeacher() {
    setSaving(true)
    await supabase.from('students').update({ teacher_id: assignTeach||null }).eq('id', student.id)
    setSaving(false)
    setSavedMsg('✅ Teacher assigned!')
    setTimeout(() => setSavedMsg(''), 3000)
    onSaved()
  }

  const GRADE_COLORS = {
    '1st':'#06d6a0','2nd':'#00c9b1','3rd':'#3b9eff','4th':'#00c9b1','5th':'#3b9eff','6th':'#f72585','7th':'#ffc845',
    '8th':'#ff6058','9th':'#7b5ea7','10th':'#06d6a0','11th':'#ff8c42','12th':'#00b4d8'
  }
  const AV = ['av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:540,maxHeight:'90vh',display:'flex',flexDirection:'column'}}>
        <div className="modal-header">
          <div className="modal-title">👤 {student.full_name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Student info strip */}
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',marginBottom:14,borderBottom:'1px solid var(--border)'}}>
          <div className="avatar av-2" style={{width:44,height:44,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:15,flexShrink:0}}>
            {student.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,color:'var(--muted)'}}>{student.grade_level} Grade · {student.country||'—'} · ID: {student.student_id||'—'}</div>
            <div style={{fontSize:12,color:'var(--muted)'}}>{student.guardian_name ? `Guardian: ${student.guardian_name}` : ''}</div>
          </div>
          <span className="badge" style={{background:GRADE_COLORS[student.grade_level]||'var(--teal)',color:'white'}}>{student.grade_level}</span>
        </div>

        {loading ? <div style={{textAlign:'center',padding:30}}><div className="spinner"/></div>
        : isElementary ? (
          /* ── ELEMENTARY: assign teacher ── */
          <div>
            <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:14,marginBottom:10}}>👩‍🏫 Assign Homeroom Teacher</div>
            <div style={{maxHeight:300,overflowY:'auto',border:'1px solid var(--border)',borderRadius:10,marginBottom:14}}>
              <div onClick={()=>setAssignTeach('')} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:assignTeach===''?'#e6fff9':'white'}}>
                <div style={{width:18,height:18,borderRadius:'50%',border:'2px solid',borderColor:assignTeach===''?'var(--teal)':'var(--border)',background:assignTeach===''?'var(--teal)':'white',flexShrink:0}}/>
                <div style={{fontSize:13,color:'var(--muted)',fontStyle:'italic'}}>— No teacher assigned —</div>
              </div>
              {teachers.filter(t=>!t.grade_assigned||t.grade_assigned.split(',').map(s=>s.trim()).some(g=>g===student.grade_level||g==='All Grades')).map((t,i)=>(
                <div key={t.id} onClick={()=>setAssignTeach(t.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:assignTeach===t.id?'#e6fff9':'white'}}>
                  <div style={{width:18,height:18,borderRadius:'50%',border:'2px solid',borderColor:assignTeach===t.id?'var(--teal)':'var(--border)',background:assignTeach===t.id?'var(--teal)':'white',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {assignTeach===t.id&&<span style={{color:'white',fontSize:10,fontWeight:900}}>✓</span>}
                  </div>
                  <div className={`avatar avatar-sm ${AV[i%8]}`} style={{flexShrink:0}}>{t.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700}}>{t.full_name}</div>
                    <div style={{fontSize:10,color:'var(--muted)'}}>
                      {t.subject ? t.subject.split(',').map(s=>s.trim()).filter(Boolean).join(' · ') : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',alignItems:'center'}}>
              {savedMsg&&<span style={{fontSize:12,color:'var(--teal)',fontWeight:700}}>{savedMsg}</span>}
              <button className="btn btn-outline" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={saveTeacher} disabled={saving}>{saving?'Saving…':'Save Assignment'}</button>
            </div>
          </div>
        ) : (
          /* ── MIDDLE/HIGH SCHOOL: multi-course enrollment ── */
          <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:14}}>📚 Course Enrollment — {student.grade_level} Grade</div>
              <div style={{fontSize:11,color:'var(--muted)',background:'var(--bg)',padding:'3px 10px',borderRadius:20,fontWeight:700}}>
                {selected.size} selected
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="empty-state"><div className="es-icon">📚</div><div className="es-text">No courses seeded yet. Run migration 007 in Supabase SQL Editor.</div></div>
            ) : (() => {
              // Group courses by subject
              const bySubject = {}
              courses.forEach(c => {
                if (!bySubject[c.subject]) bySubject[c.subject] = []
                bySubject[c.subject].push(c)
              })
              const SUBJECT_ICONS = {
                'English':'📖', 'Mathematics':'➕', 'Science':'🔬', 'Social Studies':'🌍',
                'World Language':'🗣', 'Physical Education':'⚽', 'Fine Arts':'🎨',
                'Technology':'💻', 'Health':'❤️', 'Elective':'⭐'
              }
              return (
                <div style={{overflowY:'auto',flex:1,marginBottom:14}}>
                  {Object.entries(bySubject).map(([subject, subCourses]) => (
                    <div key={subject} style={{marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:800,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1,padding:'6px 4px',display:'flex',alignItems:'center',gap:6}}>
                        <span>{SUBJECT_ICONS[subject]||'📚'}</span> {subject}
                        <span style={{marginLeft:'auto',fontSize:10,color:'var(--teal)',fontWeight:700}}>
                          {subCourses.filter(c=>selected.has(c.id)).length}/{subCourses.length}
                        </span>
                      </div>
                      <div style={{border:'1px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
                        {subCourses.map((c,i) => {
                          const isChecked  = selected.has(c.id)
                          const wasEnrolled = enrolled.includes(c.id)
                          return (
                            <div key={c.id} onClick={()=>toggle(c.id)}
                              style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',cursor:'pointer',
                                borderBottom: i<subCourses.length-1?'1px solid var(--border)':'none',
                                background:isChecked?'#e6fff9':'white',transition:'background .1s'}}>
                              <div style={{width:20,height:20,borderRadius:5,border:'2px solid',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                                borderColor:isChecked?'var(--teal)':'var(--border)',background:isChecked?'var(--teal)':'white'}}>
                                {isChecked&&<span style={{color:'white',fontSize:11,fontWeight:900}}>✓</span>}
                              </div>
                              <div style={{flex:1}}>
                                <div style={{fontWeight:700,fontSize:13}}>{c.name}</div>
                                <div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>
                                  {c.teacher?.full_name
                                    ? <span>👩‍🏫 {c.teacher.full_name}</span>
                                    : <span style={{fontStyle:'italic'}}>No teacher assigned yet</span>}
                                  {wasEnrolled&&!isChecked&&<span style={{color:'var(--coral)',marginLeft:8,fontWeight:700}}>⚠ Will be removed</span>}
                                  {!wasEnrolled&&isChecked&&<span style={{color:'var(--teal)',marginLeft:8,fontWeight:700}}>+ New</span>}
                                </div>
                              </div>
                              {c.description && (
                                <div title={c.description} style={{fontSize:11,color:'var(--muted)',cursor:'help'}}>ℹ</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            <div style={{display:'flex',gap:8,justifyContent:'flex-end',alignItems:'center',paddingTop:8,borderTop:'1px solid var(--border)'}}>
              {savedMsg&&<span style={{fontSize:12,color:'var(--teal)',fontWeight:700}}>{savedMsg}</span>}
              <button className="btn btn-outline btn-sm" onClick={()=>setSelected(new Set())}>Clear All</button>
              <button className="btn btn-outline btn-sm" onClick={()=>setSelected(new Set(courses.map(c=>c.id)))}>Select All</button>
              <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCourses} disabled={saving||courses.length===0}>
                {saving?'Saving…':`Save ${selected.size} Course${selected.size!==1?'s':''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
