import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

export default function GlobalSearch({ role }) {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const inputRef   = useRef(null)
  const timer      = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(query.trim()), 300)
    return () => clearTimeout(timer.current)
  }, [query])

  async function doSearch(q) {
    setLoading(true); setOpen(true)
    const like = `%${q}%`
    const searches = []

    if (['admin','super_admin'].includes(role)) {
      searches.push(
        supabase.from('students').select('id,full_name,grade_level,student_id').ilike('full_name', like).limit(5)
          .then(({data})=>(data||[]).map(s=>({ type:'Student', label:s.full_name, sub:`${s.grade_level} Grade · ID: ${s.student_id||'—'}`, link:'/admin/students', icon:'🧑‍🎓' }))),
        supabase.from('profiles').select('id,full_name,role').ilike('full_name', like).in('role',['teacher','parent']).limit(4)
          .then(({data})=>(data||[]).map(s=>({ type: s.role==='teacher'?'Teacher':'Parent', label:s.full_name, sub:s.role, link:'/admin/staff', icon:s.role==='teacher'?'👩‍🏫':'👨‍👩‍👧' }))),
        supabase.from('courses').select('id,name,subject,grade_level').ilike('name', like).limit(4)
          .then(({data})=>(data||[]).map(c=>({ type:'Course', label:c.name, sub:`${c.subject} · ${c.grade_level} Grade`, link:'/admin/courses', icon:'📚' }))),
        supabase.from('announcements').select('id,title,body').ilike('title', like).limit(3)
          .then(({data})=>(data||[]).map(a=>({ type:'Announcement', label:a.title, sub:a.body?.slice(0,60), link:'/admin/announcements', icon:'📣' }))),
      )
    }
    if (role==='teacher') {
      searches.push(
        supabase.from('students').select('id,full_name,grade_level').eq('teacher_id',profile?.id).ilike('full_name', like).limit(5)
          .then(({data})=>(data||[]).map(s=>({ type:'Student', label:s.full_name, sub:`${s.grade_level} Grade`, link:'/teacher/grades', icon:'🧑‍🎓' }))),
        supabase.from('courses').select('id,name,subject').eq('teacher_id',profile?.id).ilike('name', like).limit(4)
          .then(({data})=>(data||[]).map(c=>({ type:'Course', label:c.name, sub:c.subject, link:'/teacher/classes', icon:'📚' }))),
      )
    }

    const batches = await Promise.all(searches)
    const all = batches.flat().slice(0, 8)
    setResults(all)
    setLoading(false)
  }

  function handleSelect(item) {
    navigate(item.link)
    setQuery(''); setOpen(false)
  }

  return (
    <div style={{position:'relative',flex:1,maxWidth:280}}>
      <div style={{display:'flex',alignItems:'center',background:'var(--bg)',borderRadius:11,padding:'7px 13px',gap:7,border:'1.5px solid var(--border)'}}>
        <span>🔍</span>
        <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
          onFocus={()=>query&&setOpen(true)}
          placeholder="Search students, courses…"
          style={{border:'none',background:'transparent',outline:'none',fontSize:13,width:'100%',fontFamily:'DM Sans'}}
        />
        {query && <button onClick={()=>{setQuery('');setOpen(false)}} style={{border:'none',background:'none',cursor:'pointer',color:'var(--muted)',fontSize:14,padding:0}}>✕</button>}
      </div>

      {open && (
        <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,background:'white',borderRadius:12,boxShadow:'0 8px 32px rgba(18,16,58,.18)',zIndex:500,overflow:'hidden',minWidth:300}}>
          {loading ? (
            <div style={{padding:16,textAlign:'center',fontSize:12,color:'var(--muted)'}}>Searching…</div>
          ) : results.length===0 ? (
            <div style={{padding:16,textAlign:'center',fontSize:12,color:'var(--muted)'}}>No results for "{query}"</div>
          ) : (
            results.map((r,i) => (
              <div key={i} onClick={()=>handleSelect(r)}
                style={{display:'flex',gap:10,padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--bg)',alignItems:'center'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}
              >
                <div style={{fontSize:18,flexShrink:0}}>{r.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.label}</div>
                  {r.sub&&<div style={{fontSize:11,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.sub}</div>}
                </div>
                <span style={{fontSize:10,background:'var(--bg)',padding:'2px 7px',borderRadius:8,fontWeight:700,color:'var(--muted)',flexShrink:0}}>{r.type}</span>
              </div>
            ))
          )}
        </div>
      )}
      {open && <div style={{position:'fixed',inset:0,zIndex:499}} onClick={()=>setOpen(false)}/>}
    </div>
  )
}
