import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const CAT_COLORS = { HR:'#7b5ea7', Policies:'#2D8CFF', Procedures:'#00897B', Safety:'#e74c3c', Academic:'#00c9b1', Technology:'#e67e22', Finance:'#00804a', 'Parent & Student':'#e91e8c', General:'#777', Other:'#bbb' }
const FILE_ICONS = { docx:'📝', pdf:'📄', xlsx:'📊', link:'🔗' }

const ROLE_VISIBILITY = {
  teacher: ['All Staff', 'Staff & Parents', 'Everyone'],
  parent:  ['Staff & Parents', 'Parent & Student', 'Everyone'],
  student: ['Everyone'],
}

export default function HandbooksViewer() {
  const { profile } = useAuth()
  const [books,     setBooks]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filterCat, setFilterCat] = useState('')
  const [search,    setSearch]    = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const allowed = ROLE_VISIBILITY[profile?.role] || ['Everyone']
    const { data } = await supabase.from('handbooks').select('*').in('visibility', allowed).order('category').order('created_at',{ascending:false})
    setBooks(data||[])
    setLoading(false)
  }

  const categories = [...new Set(books.map(b=>b.category).filter(Boolean))]

  const filtered = books.filter(b => {
    const matchCat  = !filterCat || b.category === filterCat
    const matchSearch = !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.description?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const grouped = {}
  filtered.forEach(b => {
    if (!grouped[b.category]) grouped[b.category] = []
    grouped[b.category].push(b)
  })

  return (
    <div>
      <div className="page-header fade-up">
        <div><h2>📚 Handbooks</h2><div style={{fontSize:13,color:'var(--muted)'}}>{books.length} document{books.length!==1?'s':''} available</div></div>
      </div>

      <div className="filter-row fade-up-2">
        <select className="input" style={{width:200}} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <input className="input" style={{marginLeft:'auto',width:220}} placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"/></div>
      : filtered.length===0 ? (
        <div className="card"><div className="empty-state"><div className="es-icon">📚</div><div className="es-text">No handbooks available yet.</div></div></div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => {
          const catColor = CAT_COLORS[cat] || '#777'
          return (
            <div key={cat} className="fade-up-3" style={{marginBottom:24}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <div style={{width:4,height:20,borderRadius:2,background:catColor}}/>
                <h3 style={{margin:0,fontSize:15,fontWeight:800,color:catColor}}>{cat}</h3>
                <span style={{fontSize:11,color:'var(--muted)',fontWeight:600}}>{items.length} document{items.length!==1?'s':''}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
                {items.map(book => {
                  const icon = FILE_ICONS[book.file_type] || '📄'
                  return (
                    <div key={book.id} className="card" style={{padding:0,overflow:'hidden',borderTop:`3px solid ${catColor}`}}>
                      <div style={{padding:'14px 16px'}}>
                        <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                          <div style={{fontSize:24,lineHeight:1}}>{icon}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{book.title}</div>
                            {book.version&&<div style={{fontSize:11,color:'var(--muted)'}}>v{book.version}{book.effective_date?' • Effective '+new Date(book.effective_date).toLocaleDateString():''}</div>}
                            {book.description&&<div style={{fontSize:11,color:'#555',marginTop:4,lineHeight:1.5}}>{book.description}</div>}
                          </div>
                        </div>
                        {book.requires_acknowledgment&&(
                          <div style={{marginTop:8,fontSize:11,fontWeight:700,color:'#e67e22',background:'#fff3e0',padding:'4px 10px',borderRadius:20,display:'inline-block'}}>
                            ✍️ Acknowledgment Required
                          </div>
                        )}
                      </div>
                      <div style={{padding:'10px 16px',borderTop:'1px solid var(--bg)'}}>
                        <a href={book.file_url} target="_blank" rel="noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{display:'block',textAlign:'center',textDecoration:'none',width:'100%'}}>
                          {book.file_type==='link' ? '🔗 Open Link' : book.file_type==='pdf' ? '📄 View PDF' : book.file_type==='docx' ? '📝 Open Document' : '📊 Open Spreadsheet'}
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
