import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const CARD_COLORS = ['#12103a','#0e3060','#00804a','#7b5ea7','#cc3333','#b07800','#0050b0','#d4490b']

export default function AdminIDCards() {
  const [students,   setStudents]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [grade,      setGrade]      = useState('')
  const [cardColor,  setCardColor]  = useState('#12103a')
  const [selected,   setSelected]   = useState([])
  const [schoolName, setSchoolName] = useState('BLE Worldwide')
  const [schoolYear, setSchoolYear] = useState(new Date().getFullYear() + '-' + (new Date().getFullYear()+1))

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('students').select('id,full_name,grade_level,date_of_birth,photo_url,student_id').eq('status','active').order('full_name')
    setStudents(data||[])
    setLoading(false)
  }

  const GRADES = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th']
  const filtered = students.filter(s => {
    if (grade && s.grade_level !== grade) return false
    if (search && !s.full_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function toggleSelect(id) {
    setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])
  }

  function selectAll() { setSelected(filtered.map(s=>s.id)) }
  function clearAll()  { setSelected([]) }

  const printStudents = selected.length ? students.filter(s=>selected.includes(s.id)) : filtered

  function IDCard({ student, color }) {
    const initials = student.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'??'
    return (
      <div style={{width:240,height:152,borderRadius:14,background:color,padding:'14px 16px',position:'relative',overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,.25)',flexShrink:0}}>
        {/* Background accent */}
        <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,.08)'}}/>
        <div style={{position:'absolute',bottom:-30,left:-10,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,.05)'}}/>
        {/* Header */}
        <div style={{fontSize:9,fontWeight:900,color:'rgba(255,255,255,.9)',textTransform:'uppercase',letterSpacing:.8,marginBottom:8}}>{schoolName}</div>
        {/* Content */}
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          {student.photo_url
            ? <img src={student.photo_url} style={{width:50,height:50,borderRadius:10,objectFit:'cover',border:'2px solid rgba(255,255,255,.4)',flexShrink:0}}/>
            : <div style={{width:50,height:50,borderRadius:10,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:16,color:'white',flexShrink:0}}>{initials}</div>
          }
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:900,fontSize:12,color:'white',lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{student.full_name}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>{student.grade_level} Grade</div>
            {student.date_of_birth&&<div style={{fontSize:9,color:'rgba(255,255,255,.5)',marginTop:1}}>DOB: {student.date_of_birth}</div>}
          </div>
        </div>
        {/* Footer */}
        <div style={{position:'absolute',bottom:10,left:16,right:16,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
          <div style={{fontSize:9,color:'rgba(255,255,255,.5)'}}>{schoolYear}</div>
          <div style={{fontFamily:'monospace',fontSize:9,fontWeight:700,color:'rgba(255,255,255,.7)',background:'rgba(0,0,0,.2)',padding:'2px 6px',borderRadius:4}}>
            {student.student_id||student.id?.slice(0,8).toUpperCase()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header fade-up">
        <div><h2>🪪 Student ID Cards</h2><div style={{fontSize:13,color:'var(--muted)'}}>{students.length} students</div></div>
        <button className="btn btn-primary" onClick={()=>window.print()}>🖨️ Print {selected.length?`${selected.length} Selected`:'All'}</button>
      </div>

      {/* Controls */}
      <div className="card fade-up-2" style={{marginBottom:16}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" style={{maxWidth:200}} placeholder="🔍 Search student…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <select className="input" style={{maxWidth:140}} value={grade} onChange={e=>setGrade(e.target.value)}>
            <option value="">All Grades</option>
            {GRADES.map(g=><option key={g} value={g}>{g}</option>)}
          </select>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <span style={{fontSize:12,fontWeight:700,color:'var(--muted)'}}>Color:</span>
            {CARD_COLORS.map(c=>(
              <div key={c} onClick={()=>setCardColor(c)} style={{width:22,height:22,borderRadius:6,background:c,cursor:'pointer',border:cardColor===c?'3px solid var(--teal)':'2px solid transparent',transition:'all .12s'}}/>
            ))}
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',marginLeft:'auto'}}>
            <input className="input" style={{maxWidth:160}} placeholder="School name" value={schoolName} onChange={e=>setSchoolName(e.target.value)}/>
            <input className="input" style={{maxWidth:110}} placeholder="Year" value={schoolYear} onChange={e=>setSchoolYear(e.target.value)}/>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:12,alignItems:'center'}}>
          <button className="btn btn-outline btn-sm" onClick={selectAll}>Select All ({filtered.length})</button>
          {selected.length>0&&<button className="btn btn-outline btn-sm" onClick={clearAll}>Clear ({selected.length})</button>}
          <span style={{fontSize:12,color:'var(--muted)',marginLeft:'auto'}}>{selected.length?`${selected.length} selected — will print these`:`Showing ${filtered.length} · all will print`}</span>
        </div>
      </div>

      {/* Card grid — screen preview */}
      {loading ? <div style={{textAlign:'center',padding:40}}><div className="spinner"/></div>
      : filtered.length===0 ? <div className="empty-state" style={{padding:40}}><div className="es-icon">🪪</div><div className="es-text">No students found</div></div>
      : (
        <div id="id-card-grid" style={{display:'flex',flexWrap:'wrap',gap:16,padding:'4px 0'}}>
          {filtered.map(s=>(
            <div key={s.id} style={{cursor:'pointer',opacity:selected.length&&!selected.includes(s.id)?.5:1,transition:'opacity .15s'}} onClick={()=>toggleSelect(s.id)}>
              <IDCard student={s} color={cardColor}/>
              {selected.includes(s.id)&&<div style={{textAlign:'center',marginTop:4,fontSize:11,color:'var(--teal)',fontWeight:700}}>✅ Selected</div>}
            </div>
          ))}
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#root) { display: none; }
          .sidebar, .topbar, .page-header, .card:not(#id-card-print), button, select, input, .stat-card { display: none !important; }
          #id-card-grid { display: flex !important; flex-wrap: wrap; gap: 12px; padding: 0; }
        }
      `}</style>
    </div>
  )
}
