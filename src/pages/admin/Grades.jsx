import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const AV = ['av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8']

function letterGradeFromPct(pct) {
  if (pct >= 93) return 'A'
  if (pct >= 90) return 'A-'
  if (pct >= 87) return 'B+'
  if (pct >= 83) return 'B'
  if (pct >= 80) return 'B-'
  if (pct >= 77) return 'C+'
  if (pct >= 73) return 'C'
  if (pct >= 70) return 'C-'
  if (pct >= 67) return 'D+'
  if (pct >= 60) return 'D'
  return 'F'
}

function gradeColor(letter) {
  if (!letter || letter === '—') return 'var(--muted)'
  if (letter.startsWith('A')) return '#00804a'
  if (letter.startsWith('B')) return '#1a5fa8'
  if (letter.startsWith('C')) return '#b07800'
  return '#cc3333'
}

export default function AdminGrades() {
  const [courses,      setCourses]      = useState([])
  const [activeCourse, setActiveCourse] = useState(null)
  const [students,     setStudents]     = useState([])
  const [assignments,  setAssignments]  = useState([])
  const [submissions,  setSubmissions]  = useState([])
  const [search,       setSearch]       = useState('')
  const [gradeFilter,  setGradeFilter]  = useState('all')
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(null) // assignment_id being saved

  // Load all active courses on mount
  useEffect(() => {
    supabase.from('courses')
      .select('id,name,subject,grade_level,teacher_id,teacher:profiles!teacher_id(full_name)')
      .eq('is_active', true)
      .order('grade_level').order('name')
      .then(({ data }) => {
        setCourses(data || [])
        if (data?.length) loadCourse(data[0])
        else setLoading(false)
      })
  }, [])

  const loadCourse = useCallback(async (course) => {
    setLoading(true)
    setActiveCourse(course)
    setSearch('')

    const [{ data: enr }, { data: ass }] = await Promise.all([
      supabase.from('enrollments')
        .select('student:students(id,full_name,grade_level,country)')
        .eq('course_id', course.id)
        .eq('status', 'active'),
      supabase.from('assignments')
        .select('*')
        .eq('course_id', course.id)
        .order('due_date'),
    ])

    const studs = (enr || []).map(e => e.student).filter(Boolean)
    setStudents(studs)
    setAssignments(ass || [])

    if (ass?.length && studs.length) {
      const { data: subs } = await supabase.from('submissions')
        .select('*')
        .in('assignment_id', ass.map(a => a.id))
        .in('student_id', studs.map(s => s.id))
      setSubmissions(subs || [])
    } else {
      setSubmissions([])
    }

    setLoading(false)
  }, [])

  function getSub(studentId, assignmentId) {
    return submissions.find(s => s.student_id === studentId && s.assignment_id === assignmentId)
  }
  function getPoints(studentId, assignmentId) {
    return getSub(studentId, assignmentId)?.points ?? ''
  }
  function getGrade(studentId, assignmentId) {
    return getSub(studentId, assignmentId)?.grade ?? '—'
  }

  async function updateGrade(studentId, assignmentId, scoreInput) {
    if (scoreInput === '' || scoreInput === null) return
    setSaving(`${studentId}-${assignmentId}`)
    const assignment = assignments.find(a => a.id === assignmentId)
    const maxPts  = assignment?.max_points || 100
    const points  = Number(scoreInput)
    const pct     = (points / maxPts) * 100
    const letter  = letterGradeFromPct(pct)
    const now     = new Date().toISOString()
    const existing = getSub(studentId, assignmentId)
    const payload = { grade: letter, points, status: 'graded', graded_at: now }

    if (existing) {
      await supabase.from('submissions').update(payload).eq('id', existing.id)
      setSubmissions(prev => prev.map(s => s.id === existing.id ? { ...s, ...payload } : s))
    } else {
      const { data } = await supabase.from('submissions').insert([{
        student_id: studentId, assignment_id: assignmentId, ...payload, submitted_at: now
      }]).select().single()
      if (data) setSubmissions(prev => [...prev, data])
    }

    // Fire grade alert to parent
    try {
      const student = students.find(s => s.id === studentId)
      const { data: stData } = await supabase
        .from('students').select('full_name,guardian_email').eq('id', studentId).single()
      if (stData?.guardian_email) {
        await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: stData.guardian_email,
            template: 'grade_alert',
            data: {
              parentName: 'Parent/Guardian',
              studentName: stData.full_name,
              assignmentTitle: assignment?.title || 'Assignment',
              courseName: activeCourse?.name || 'Course',
              grade: letter,
              points,
              maxPoints: maxPts,
              feedback: '',
            }
          })
        })
      }
    } catch(_) {}

    setSaving(null)
  }

  // Export CSV
  function exportCSV() {
    if (!activeCourse || !students.length) return
    const headers = ['Student', 'Grade Level', ...assignments.map(a => `${a.title} (/${a.max_points})`), 'Average', 'Overall Grade']
    const rows = filteredStudents.map(s => {
      const pts = assignments.map(a => getPoints(s.id, a.id)).filter(p => p !== '')
      const avg = pts.length ? Math.round(pts.reduce((a, b) => a + Number(b), 0) / pts.length) : ''
      const maxAvg = pts.length ? assignments.slice(0, pts.length).reduce((a, b) => a + (b.max_points || 100), 0) / pts.length : 1
      const pct = avg !== '' ? Math.round((avg / maxAvg) * 100) : ''
      const letter = pct !== '' ? letterGradeFromPct(pct) : ''
      return [
        s.full_name, s.grade_level,
        ...assignments.map(a => getPoints(s.id, a.id)),
        avg !== '' ? `${avg}pts` : '',
        letter,
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `${activeCourse.name.replace(/\s+/g,'-')}-gradebook.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchSearch = !search || s.full_name.toLowerCase().includes(search.toLowerCase())
    const matchGrade  = gradeFilter === 'all' || s.grade_level === gradeFilter
    return matchSearch && matchGrade
  })

  // Unique grade levels in this course's students
  const gradeLevels = [...new Set(students.map(s => s.grade_level).filter(Boolean))]

  // Class averages per assignment
  function getAssignmentAvg(assignmentId) {
    const pts = students.map(s => getPoints(s.id, assignmentId)).filter(p => p !== '')
    return pts.length ? Math.round(pts.reduce((a, b) => a + Number(b), 0) / pts.length) : null
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header fade-up">
        <h2>📊 Grade Book</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={exportCSV} disabled={!activeCourse || !students.length}>
            ⬇️ Export CSV
          </button>
        </div>
      </div>

      {/* Course selector */}
      {courses.length > 0 && (
        <div className="filter-row fade-up-2" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
          {courses.map(c => (
            <div key={c.id}
              className={`filter-chip ${activeCourse?.id === c.id ? 'active' : ''}`}
              onClick={() => loadCourse(c)}
            >
              {c.name}
              <span style={{ opacity: .6, fontSize: 10, marginLeft: 4 }}>· {c.grade_level}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search + grade filter */}
      {activeCourse && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="input" style={{ width: 220 }} placeholder="🔍 Search students…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <div className="filter-row" style={{ margin: 0, flex: 1 }}>
            <div className={`filter-chip ${gradeFilter === 'all' ? 'active' : ''}`} onClick={() => setGradeFilter('all')}>All Grades</div>
            {gradeLevels.map(g => (
              <div key={g} className={`filter-chip ${gradeFilter === g ? 'active' : ''}`} onClick={() => setGradeFilter(g)}>{g}</div>
            ))}
          </div>
          {activeCourse && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              {activeCourse.teacher?.full_name && `👩‍🏫 ${activeCourse.teacher.full_name} · `}
              {filteredStudents.length} students · {assignments.length} assignments
            </div>
          )}
        </div>
      )}

      {/* Gradebook table */}
      {loading ? (
        <div className="loading-screen" style={{ height: 200 }}><div className="spinner" /></div>
      ) : courses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📚</div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>No Active Courses</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Add courses in the Courses section first.</div>
        </div>
      ) : !activeCourse ? null : (
        <div className="card fade-up-3" style={{ padding: 0, overflowX: 'auto' }}>
          {/* Course info bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg)' }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{activeCourse.name}</div>
            <span className="badge badge-blue">{activeCourse.subject}</span>
            <span className="badge badge-green">{activeCourse.grade_level} Grade</span>
            {assignments.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>No assignments yet — add them from the teacher portal or assign a teacher.</span>
            )}
          </div>

          {filteredStudents.length === 0 ? (
            <div className="empty-state">
              <div className="es-icon">👥</div>
              <div className="es-text">{students.length === 0 ? 'No students enrolled in this course.' : 'No students match your search.'}</div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="empty-state">
              <div className="es-icon">📝</div>
              <div className="es-text">No assignments have been created for this course yet.</div>
            </div>
          ) : (
            <table className="data-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>Student</th>
                  <th style={{ minWidth: 60 }}>Level</th>
                  {assignments.map(a => (
                    <th key={a.id} style={{ fontSize: 10, minWidth: 80, textAlign: 'center' }}>
                      <div style={{ fontWeight: 700 }}>{a.title}</div>
                      <div style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 9 }}>
                        /{a.max_points}pts · {a.due_date || '—'}
                      </div>
                    </th>
                  ))}
                  <th style={{ minWidth: 80, textAlign: 'center' }}>Average</th>
                  <th style={{ minWidth: 70, textAlign: 'center' }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, i) => {
                  const pts = assignments.map(a => getPoints(s.id, a.id)).filter(p => p !== '')
                  const maxPtsArr = assignments.filter((_, j) => getPoints(s.id, assignments[j]?.id) !== '')
                  const totalMax = maxPtsArr.reduce((a, b) => a + (b.max_points || 100), 0)
                  const totalPts = pts.reduce((a, b) => a + Number(b), 0)
                  const avgPct   = pts.length && totalMax ? Math.round((totalPts / totalMax) * 100) : null
                  const overallLetter = avgPct !== null ? letterGradeFromPct(avgPct) : '—'

                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className={`avatar avatar-sm ${AV[i % 8]}`}>
                            {s.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{s.full_name}</div>
                            {s.country && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{s.country}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{s.grade_level}</td>
                      {assignments.map(a => {
                        const key = `${s.id}-${a.id}`
                        const isSaving = saving === key
                        const points = getPoints(s.id, a.id)
                        const letter = getGrade(s.id, a.id)
                        return (
                          <td key={a.id} style={{ textAlign: 'center', padding: '6px 8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <input
                                style={{
                                  width: 54, textAlign: 'center', border: '1px solid var(--border)',
                                  borderRadius: 6, padding: '3px 6px', fontSize: 13, fontWeight: 700,
                                  background: isSaving ? '#f0fdf9' : 'white',
                                  outline: 'none',
                                }}
                                defaultValue={points}
                                key={`${s.id}-${a.id}-${points}`} // re-render when data loads
                                onBlur={e => {
                                  if (e.target.value !== '' && e.target.value !== String(points)) {
                                    updateGrade(s.id, a.id, e.target.value)
                                  }
                                }}
                                onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                                placeholder="—"
                                type="number"
                                min={0}
                                max={a.max_points}
                              />
                              {letter !== '—' && (
                                <span style={{ fontSize: 9, fontWeight: 800, color: gradeColor(letter) }}>{letter}</span>
                              )}
                              {isSaving && <span style={{ fontSize: 8, color: 'var(--teal)' }}>saving…</span>}
                            </div>
                          </td>
                        )
                      })}
                      <td style={{ textAlign: 'center' }}>
                        {avgPct !== null
                          ? <div>
                              <div style={{ fontWeight: 800, fontSize: 13 }}>{avgPct}%</div>
                              <div style={{ fontSize: 9, color: 'var(--muted)' }}>{totalPts}/{totalMax} pts</div>
                            </div>
                          : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                        }
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: 14, fontWeight: 900,
                          color: gradeColor(overallLetter)
                        }}>{overallLetter}</span>
                      </td>
                    </tr>
                  )
                })}

                {/* Class average row */}
                <tr style={{ background: 'var(--bg)', borderTop: '2px solid var(--border)' }}>
                  <td colSpan={2} style={{ fontWeight: 800, fontSize: 12, color: 'var(--muted)', padding: '8px 12px' }}>
                    CLASS AVERAGE
                  </td>
                  {assignments.map(a => {
                    const avg = getAssignmentAvg(a.id)
                    const maxPts = a.max_points || 100
                    const pct = avg !== null ? Math.round((avg / maxPts) * 100) : null
                    const letter = pct !== null ? letterGradeFromPct(pct) : null
                    return (
                      <td key={a.id} style={{ textAlign: 'center', padding: '8px' }}>
                        {avg !== null
                          ? <div>
                              <div style={{ fontWeight: 800, fontSize: 12 }}>{avg}</div>
                              <div style={{ fontSize: 9, color: gradeColor(letter) }}>{letter}</div>
                            </div>
                          : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>
                        }
                      </td>
                    )
                  })}
                  <td colSpan={2} style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
                    {(() => {
                      const allPcts = filteredStudents.map(s => {
                        const pts = assignments.map(a => getPoints(s.id, a.id)).filter(p => p !== '')
                        const maxPtsArr2 = assignments.filter((a, j) => getPoints(s.id, assignments[j]?.id) !== '')
                        const totalMax2 = maxPtsArr2.reduce((a, b) => a + (b.max_points || 100), 0)
                        const totalPts2 = pts.reduce((a, b) => a + Number(b), 0)
                        return pts.length && totalMax2 ? Math.round((totalPts2 / totalMax2) * 100) : null
                      }).filter(p => p !== null)
                      if (!allPcts.length) return '—'
                      const avg = Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length)
                      return <span style={{ fontWeight: 800, color: gradeColor(letterGradeFromPct(avg)) }}>{avg}% · {letterGradeFromPct(avg)}</span>
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
