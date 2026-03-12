import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const SUBJECTS = ['Mathematics','English Language Arts','Science','Social Studies','History','Geography','Foreign Language','Art','Music','Physical Education','Computer Science','Bible/Religion','Other']
const GRADE_LEVELS = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th']
const GRADE_COLORS = {
  '1st':'#06d6a0','2nd':'#00c9b1','3rd':'#3b9eff','4th':'#00c9b1','5th':'#3b9eff','6th':'#f72585','7th':'#ffc845',
  '8th':'#ff6058','9th':'#7b5ea7','10th':'#06d6a0','11th':'#ff8c42','12th':'#00b4d8'
}

export default function AdminCourses() {
  const [courses,   setCourses]   = useState([])
  const [teachers,  setTeachers]  = useState([])
  const [students,  setStudents]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editCourse,setEditCourse]= useState(null)
  const [enrollModal, setEnrollModal] = useState(null) // course to enroll students into

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: c }, { data: t }, { data: s }] = await Promise.all([
      supabase.from('courses').select('*, teacher:profiles!teacher_id(id,full_name,subject)').order('grade_level').order('subject'),
      supabase.from('profiles').select('id,full_name,subject,grade_assigned').eq('role','teacher').order('full_name'),
      supabase.from('students').select('id,full_name,grade_level').eq('status','active').order('full_name')
    ])
    setCourses(c||[])
    setTeachers(t||[])
    setStudents(s||[])
    setLoading(false)
  }

  async function deleteCourse(id) {
    await supabase.from('courses').delete().eq('id', id)
    loadAll()
  }

  return (
    <div>
      <div className="page-header fade-up">
        <h2>Courses & Assignments</h2>
        <button className="btn btn-primary" onClick={() => { setEditCourse(null); setShowModal(true) }}>+ New Course</button>
      </div>

      {loading ? (
        <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
      ) : courses.length === 0 ? (
        <div className="card fade-up-2" style={{textAlign:'center',padding:40}}>
          <div style={{fontSize:48,marginBottom:12}}>📚</div>
          <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:16,marginBottom:6}}>No Courses Yet</div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:20}}>Create your first course and assign a teacher to get started.</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create First Course</button>
        </div>
      ) : (
        <div className="fade-up-2">
          {GRADE_LEVELS.map(g => {
            const gCourses = courses.filter(c => c.grade_level === g)
            if (!gCourses.length) return null
            return (
              <div key={g} className="card" style={{marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:GRADE_COLORS[g]}}/>
                  <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:15}}>{g} Grade Courses</div>
                  <div style={{marginLeft:'auto',fontSize:11,color:'var(--muted)'}}>{gCourses.length} course{gCourses.length!==1?'s':''}</div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr><th>Course</th><th>Subject</th><th>Teacher</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {gCourses.map(c => (
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong></td>
                        <td><span className="badge badge-blue">{c.subject||'—'}</span></td>
                        <td>{c.teacher?.full_name || <span style={{color:'var(--muted)'}}>Unassigned</span>}</td>
                        <td><span className={`badge ${c.is_active?'badge-green':'badge-gray'}`}>{c.is_active?'Active':'Inactive'}</span></td>
                        <td>
                          <div style={{display:'flex',gap:6}}>
                            <button className="btn btn-sm btn-outline" onClick={() => setEnrollModal(c)}>👥 Enroll</button>
                            <button className="btn btn-sm btn-outline" onClick={() => { setEditCourse(c); setShowModal(true) }}>Edit</button>
                            <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc'}} onClick={() => deleteCourse(c.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <CourseModal
          course={editCourse}
          teachers={teachers}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadAll() }}
        />
      )}

      {enrollModal && (
        <EnrollStudentsModal
          course={enrollModal}
          students={students}
          onClose={() => setEnrollModal(null)}
          onSaved={() => { setEnrollModal(null); loadAll() }}
        />
      )}
    </div>
  )
}

function CourseModal({ course, teachers, onClose, onSaved }) {
  const DAYS = ['Mon','Tue','Wed','Thu','Fri']
  const [form, setForm] = useState({
    name:                course?.name                || '',
    subject:             course?.subject             || 'Mathematics',
    grade_level:         course?.grade_level         || '7th',
    teacher_id:          course?.teacher_id          || '',
    description:         course?.description         || '',
    is_active:           course?.is_active           ?? true,
    default_start_time:  course?.default_start_time  || '08:00',
    default_end_time:    course?.default_end_time    || '09:00',
    meeting_days:        course?.meeting_days        ? course.meeting_days.split(',').map(d=>d.trim()) : ['Mon','Wed','Fri'],
    credits:             course?.credits             || 1,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      meeting_days: Array.isArray(form.meeting_days) ? form.meeting_days.join(',') : (form.meeting_days || ''),
    }
    if (course?.id) {
      const { error } = await supabase.from('courses').update(payload).eq('id', course.id)
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('courses').insert([payload])
      if (error) { setError(error.message); setSaving(false); return }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{course ? 'Edit Course' : 'New Course'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="grid-2">
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="input-label">Course Name</label>
              <input className="input" required value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Algebra I"/>
            </div>
            <div className="form-group">
              <label className="input-label">Subject</label>
              <select className="select" value={form.subject} onChange={e => setForm(p=>({...p,subject:e.target.value}))}>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Grade Level</label>
              <select className="select" value={form.grade_level} onChange={e => setForm(p=>({...p,grade_level:e.target.value}))}>
                {GRADE_LEVELS.map(g => <option key={g} value={g}>{g} Grade</option>)}
              </select>
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="input-label">Assign Teacher</label>
              <select className="select" value={form.teacher_id} onChange={e => setForm(p=>({...p,teacher_id:e.target.value}))}>
                <option value="">— Select Teacher —</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}{t.subject ? ` (${t.subject.split(',').map(s=>s.trim())[0]}${t.subject.includes(',')?'…':''})` : ''}</option>)}
              </select>
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="input-label">Description <span style={{fontWeight:400,color:'var(--muted)'}}>(optional)</span></label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} style={{resize:'vertical'}}/>
            </div>
          </div>
          {/* Meeting Schedule */}
          <div style={{background:'var(--bg)',borderRadius:10,padding:'12px 14px',marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:12,marginBottom:10,color:'var(--text)'}}>📅 Default Meeting Schedule</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="input-label">Start Time</label>
                <input className="input" type="time" value={form.default_start_time} onChange={e=>setForm(p=>({...p,default_start_time:e.target.value}))}/>
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="input-label">End Time</label>
                <input className="input" type="time" value={form.default_end_time} onChange={e=>setForm(p=>({...p,default_end_time:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="input-label">Meeting Days</label>
              <div style={{display:'flex',gap:6,marginTop:4}}>
                {DAYS.map(d => (
                  <button type="button" key={d} onClick={()=>setForm(p=>({...p,meeting_days:p.meeting_days.includes(d)?p.meeting_days.filter(x=>x!==d):[...p.meeting_days,d]}))}
                    style={{padding:'5px 10px',borderRadius:20,border:'2px solid',fontSize:11,fontWeight:700,cursor:'pointer',
                      borderColor:form.meeting_days.includes(d)?'var(--teal)':'var(--border)',
                      background:form.meeting_days.includes(d)?'var(--teal)':'white',
                      color:form.meeting_days.includes(d)?'white':'var(--muted)'}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : course ? 'Update Course' : 'Create Course'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EnrollStudentsModal({ course, students, onClose, onSaved }) {
  const [enrolled,  setEnrolled]  = useState([])
  const [selected,  setSelected]  = useState([])
  const [saving,    setSaving]    = useState(false)
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    supabase.from('enrollments').select('student_id').eq('course_id', course.id)
      .then(({ data }) => {
        const ids = (data||[]).map(e => e.student_id)
        setEnrolled(ids)
        setSelected(ids)
      })
  }, [course.id])

  const eligible = students.filter(s =>
    s.grade_level === course.grade_level &&
    s.full_name.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(id) {
    setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])
  }

  async function handleSave() {
    setSaving(true)
    // Remove deselected
    const toRemove = enrolled.filter(id => !selected.includes(id))
    // Add newly selected
    const toAdd    = selected.filter(id => !enrolled.includes(id))
    if (toRemove.length) {
      await supabase.from('enrollments').delete().eq('course_id', course.id).in('student_id', toRemove)
    }
    if (toAdd.length) {
      await supabase.from('enrollments').insert(toAdd.map(student_id => ({ course_id: course.id, student_id, status:'active' })))
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:460}}>
        <div className="modal-header">
          <div className="modal-title">Enroll Students — {course.name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:10}}>Showing {course.grade_level} grade students</div>
        <input className="input" placeholder="🔍 Search students…" value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:12}}/>
        <div style={{maxHeight:280,overflowY:'auto',border:'1px solid var(--border)',borderRadius:10}}>
          {eligible.length===0 ? (
            <div style={{padding:20,textAlign:'center',fontSize:12,color:'var(--muted)'}}>No {course.grade_level} grade students found.</div>
          ) : eligible.map(s => (
            <div key={s.id} onClick={() => toggle(s.id)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:selected.includes(s.id)?'#e6fff9':'white'}}>
              <div style={{width:18,height:18,borderRadius:4,border:'2px solid',borderColor:selected.includes(s.id)?'var(--teal)':'var(--border)',background:selected.includes(s.id)?'var(--teal)':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {selected.includes(s.id) && <span style={{color:'white',fontSize:11,fontWeight:900}}>✓</span>}
              </div>
              <div style={{fontSize:13,fontWeight:600}}>{s.full_name}</div>
              <div style={{fontSize:11,color:'var(--muted)',marginLeft:'auto'}}>{s.grade_level}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14}}>
          <div style={{fontSize:11,color:'var(--muted)'}}>{selected.length} student{selected.length!==1?'s':''} selected</div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save Enrollment'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
