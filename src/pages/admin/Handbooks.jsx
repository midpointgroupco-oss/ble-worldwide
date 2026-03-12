import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const CATEGORIES = ['HR', 'Policies', 'Procedures', 'Safety', 'Academic', 'Technology', 'Finance', 'Parent & Student', 'General', 'Other']
const VISIBILITY  = ['All Staff', 'Admin Only', 'Staff & Parents', 'Everyone']
const CAT_COLORS  = { HR:'#7b5ea7', Policies:'#2D8CFF', Procedures:'#00897B', Safety:'#e74c3c', Academic:'#00c9b1', Technology:'#e67e22', Finance:'#00804a', 'Parent & Student':'#e91e8c', General:'#777', Other:'#bbb' }
const FILE_ICONS  = { docx:'📝', pdf:'📄', xlsx:'📊', link:'🔗' }

export default function AdminHandbooks() {
  const { profile } = useAuth()
  const [books,      setBooks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editItem,   setEditItem]   = useState(null)
  const [filterCat,  setFilterCat]  = useState('')
  const [filterVis,  setFilterVis]  = useState('')
  const [search,     setSearch]     = useState('')
  const [toast,      setToast]      = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [form, setForm] = useState({
    title:'', category:'HR', description:'', visibility:'All Staff',
    file:null, file_type:'', external_link:'', version:'', effective_date:'', requires_acknowledgment:false,
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data } = await supabase.from('handbooks').select('*, uploader:profiles!uploaded_by(full_name)').order('created_at',{ascending:false})
    setBooks(data||[])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3500) }

  function detectType(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext==='pdf')  return 'pdf'
    if (ext==='docx') return 'docx'
    if (ext==='xlsx' || ext==='xls') return 'xlsx'
    return 'other'
  }

  function openNew() {
    setEditItem(null)
    setForm({ title:'', category:'HR', description:'', visibility:'All Staff', file:null, file_type:'', external_link:'', version:'', effective_date:'', requires_acknowledgment:false })
    setShowModal(true)
  }

  function openEdit(b) {
    setEditItem(b)
    setForm({ ...b, file:null, effective_date:b.effective_date?.slice(0,10)||'' })
    setShowModal(true)
  }

  async function saveHandbook() {
    if (!form.title.trim()) return
    if (!editItem && !form.file && !form.external_link.trim()) { showToast('Please upload a file or add a link'); return }
    setSaving(true)
    try {
      let file_url = editItem?.file_url || ''
      let file_name = editItem?.file_name || ''
      let file_size = editItem?.file_size || 0
      let storage_path = editItem?.storage_path || ''
      let file_type = editItem?.file_type || ''

      if (form.external_link.trim()) {
        file_url  = form.external_link.trim()
        file_type = 'link'
        file_name = ''
      } else if (form.file) {
        const ft   = detectType(form.file)
        const ext  = form.file.name.split('.').pop()
        const path = `handbooks/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('handbooks').upload(path, form.file)
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('handbooks').getPublicUrl(path)
        file_url      = publicUrl
        file_name     = form.file.name
        file_size     = form.file.size
        storage_path  = path
        file_type     = ft
      }

      const payload = {
        title:                  form.title.trim(),
        category:               form.category,
        description:            form.description.trim(),
        visibility:             form.visibility,
        version:                form.version.trim(),
        effective_date:         form.effective_date || null,
        requires_acknowledgment: form.requires_acknowledgment,
        file_url, file_name, file_size, storage_path, file_type,
        uploaded_by: profile.id,
      }

      if (editItem) await supabase.from('handbooks').update(payload).eq('id', editItem.id)
      else          await supabase.from('handbooks').insert([payload])

      setShowModal(false); loadAll()
      showToast(editItem ? 'Handbook updated' : 'Handbook uploaded')
    } catch(e) {
      showToast('Error: ' + e.message)
    }
    setSaving(false)
  }

  async function deleteBook(book) {
    if (!confirm('Delete this handbook?')) return
    if (book.storage_path) await supabase.storage.from('handbooks').remove([book.storage_path])
    await supabase.from('handbooks').delete().eq('id', book.id)
    loadAll(); showToast('Deleted')
  }

  function formatSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024*1024) return (bytes/1024).toFixed(0) + ' KB'
    return (bytes/(1024*1024)).toFixed(1) + ' MB'
  }

  const filtered = books.filter(b => {
    const matchCat  = !filterCat || b.category === filterCat
    const matchVis  = !filterVis || b.visibility === filterVis
    const matchSearch = !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.description?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchVis && matchSearch
  })

  // Group by category
  const grouped = {}
  filtered.forEach(b => {
    if (!grouped[b.category]) grouped[b.category] = []
    grouped[b.category].push(b)
  })

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}

      <div className="page-header fade-up">
        <div><h2>📚 Handbooks</h2><div style={{fontSize:13,color:'var(--muted)'}}>{books.length} documents</div></div>
        <button className="btn btn-primary" onClick={openNew}>+ Upload Handbook</button>
      </div>

      {/* Stats */}
      <div className="grid-4 fade-up-2" style={{marginBottom:16}}>
        {[
          { label:'Total',      value:books.length,                                     icon:'📚', cls:'sc-teal'   },
          { label:'Categories', value:new Set(books.map(b=>b.category)).size,           icon:'🗂', cls:'sc-violet' },
          { label:'Required Ack', value:books.filter(b=>b.requires_acknowledgment).length, icon:'✍️', cls:'sc-coral' },
          { label:'Links',      value:books.filter(b=>b.file_type==='link').length,     icon:'🔗', cls:'sc-gold'   },
        ].map(s=>(
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-row fade-up-3">
        <select className="input" style={{width:180}} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" style={{width:180}} value={filterVis} onChange={e=>setFilterVis(e.target.value)}>
          <option value="">All Visibility</option>
          {VISIBILITY.map(v=><option key={v} value={v}>{v}</option>)}
        </select>
        <input className="input" style={{marginLeft:'auto',width:220}} placeholder="🔍 Search handbooks…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Grouped content */}
      {loading ? <div className="loading-screen"><div className="spinner"/></div>
      : filtered.length===0 ? (
        <div className="card"><div className="empty-state"><div className="es-icon">📚</div><div className="es-text">No handbooks found. Upload your first one!</div></div></div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => {
          const catColor = CAT_COLORS[cat] || '#777'
          return (
            <div key={cat} className="fade-up-4" style={{marginBottom:24}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <div style={{width:4,height:20,borderRadius:2,background:catColor}}/>
                <h3 style={{margin:0,fontSize:15,fontWeight:800,color:catColor}}>{cat}</h3>
                <span style={{fontSize:11,color:'var(--muted)',fontWeight:600}}>{items.length} document{items.length!==1?'s':''}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
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
                            {book.description&&<div style={{fontSize:11,color:'#555',marginTop:4,lineHeight:1.5}}>{book.description.slice(0,100)}{book.description.length>100?'…':''}</div>}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                          <span style={{fontSize:10,fontWeight:700,background:catColor+'18',color:catColor,padding:'2px 8px',borderRadius:20}}>{book.visibility}</span>
                          {book.requires_acknowledgment&&<span style={{fontSize:10,fontWeight:700,background:'#fff3e0',color:'#e67e22',padding:'2px 8px',borderRadius:20}}>Requires Signature</span>}
                          {book.file_name&&<span style={{fontSize:10,color:'var(--muted)',padding:'2px 8px'}}>{formatSize(book.file_size)}</span>}
                        </div>
                      </div>
                      <div style={{padding:'10px 16px',borderTop:'1px solid var(--bg)',display:'flex',gap:8}}>
                        <a href={book.file_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{flex:1,textAlign:'center',textDecoration:'none'}}>
                          {book.file_type==='link'?'Open Link':'View File'}
                        </a>
                        <button className="btn btn-outline btn-sm" onClick={()=>openEdit(book)}>Edit</button>
                        <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc'}} onClick={()=>deleteBook(book)}>Del</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {/* Upload/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
            <div className="modal-header">
              <div className="modal-title">{editItem?'Edit Handbook':'Upload Handbook'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="input-label">Title *</label>
              <input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Employee Handbook 2025"/>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="input-label">Category</label>
                <select className="input" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Visible To</label>
                <select className="input" value={form.visibility} onChange={e=>setForm(p=>({...p,visibility:e.target.value}))}>
                  {VISIBILITY.map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Version</label>
                <input className="input" value={form.version} onChange={e=>setForm(p=>({...p,version:e.target.value}))} placeholder="e.g. 2.1"/>
              </div>
              <div className="form-group">
                <label className="input-label">Effective Date</label>
                <input className="input" type="date" value={form.effective_date} onChange={e=>setForm(p=>({...p,effective_date:e.target.value}))}/>
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={{resize:'vertical'}} placeholder="Brief description of this document…"/>
            </div>

            <div style={{background:'var(--bg)',borderRadius:10,padding:'14px 16px',marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Document Source</div>
              <div className="form-group" style={{marginBottom:10}}>
                <label className="input-label">Upload File (Word, PDF, Excel)</label>
                <input className="input" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={e=>setForm(p=>({...p,file:e.target.files[0],external_link:''}))} style={{padding:'8px 12px'}}/>
              </div>
              <div style={{textAlign:'center',fontSize:12,color:'var(--muted)',margin:'6px 0'}}>— or —</div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="input-label">Google Sheets / External Link</label>
                <input className="input" value={form.external_link} onChange={e=>setForm(p=>({...p,external_link:e.target.value,file:null}))} placeholder="https://docs.google.com/…"/>
              </div>
              {editItem?.file_url&&!form.file&&!form.external_link&&(
                <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Current: <a href={editItem.file_url} target="_blank" rel="noreferrer" style={{color:'var(--teal)'}}>view existing file</a></div>
              )}
            </div>

            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,padding:'10px 14px',background:'var(--bg)',borderRadius:10}}>
              <input type="checkbox" id="ack" checked={form.requires_acknowledgment} onChange={e=>setForm(p=>({...p,requires_acknowledgment:e.target.checked}))}/>
              <label htmlFor="ack" style={{fontSize:13,fontWeight:600}}>Requires staff acknowledgment / signature</label>
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveHandbook} disabled={saving||!form.title.trim()}>
                {saving?'Uploading…':editItem?'Save Changes':'Upload Handbook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
