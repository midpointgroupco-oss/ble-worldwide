import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const DOC_TYPES = ['IEP','504 Plan','Custody Agreement','Medical Record','Birth Certificate','Transcript','Immunization Record','Enrollment Form','Withdrawal Form','Discipline Record','Other']
const TYPE_COLORS = { 'IEP':'#7b5ea7', '504 Plan':'#2D8CFF', 'Custody Agreement':'#e67e22', 'Medical Record':'#e74c3c', 'Birth Certificate':'#27ae60', 'Transcript':'#00897B', 'Immunization Record':'#e91e8c', 'Enrollment Form':'#00c9b1', 'Withdrawal Form':'#cc3333', 'Discipline Record':'#f72585', 'Other':'#777' }

export default function AdminDocuments() {
  const { profile } = useAuth()
  const [docs,       setDocs]       = useState([])
  const [students,   setStudents]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [filterStudent, setFilterStudent] = useState('')
  const [filterType,    setFilterType]    = useState('')
  const [search,        setSearch]        = useState('')
  const [form,       setForm]       = useState({ student_id:'', doc_type:'IEP', title:'', notes:'', file:null })
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: d }, { data: s }] = await Promise.all([
      supabase.from('student_documents').select('*, student:students(id,full_name,grade_level), uploader:profiles!uploaded_by(full_name,role)').order('created_at', { ascending: false }),
      supabase.from('students').select('id,full_name,grade_level').eq('status','active').order('full_name'),
    ])
    setDocs(d||[])
    setStudents(s||[])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  function openModal() {
    setForm({ student_id:'', doc_type:'IEP', title:'', notes:'', file:null })
    setShowModal(true)
  }

  async function handleUpload() {
    if (!form.student_id || !form.title.trim() || !form.file) return
    setSaving(true)
    try {
      const ext  = form.file.name.split('.').pop()
      const path = `student-docs/${form.student_id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, form.file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      await supabase.from('student_documents').insert([{
        student_id:   form.student_id,
        doc_type:     form.doc_type,
        title:        form.title.trim(),
        notes:        form.notes.trim(),
        file_url:     publicUrl,
        file_name:    form.file.name,
        file_size:    form.file.size,
        uploaded_by:  profile.id,
        storage_path: path,
      }])
      setShowModal(false)
      loadAll()
      showToast('Document uploaded')
    } catch(e) {
      showToast('Upload failed: ' + e.message)
    }
    setSaving(false)
  }

  async function deleteDoc(doc) {
    try {
      if (doc.storage_path) await supabase.storage.from('documents').remove([doc.storage_path])
      await supabase.from('student_documents').delete().eq('id', doc.id)
      loadAll()
      showToast('Document deleted')
    } catch(e) {
      showToast('Delete failed: ' + e.message)
    }
    setDeleteConfirm(null)
  }

  function formatSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'
    return (bytes/(1024*1024)).toFixed(1) + ' MB'
  }

  const filtered = docs.filter(d => {
    const matchStudent = !filterStudent || d.student_id === filterStudent
    const matchType    = !filterType    || d.doc_type === filterType
    const matchSearch  = !search || d.title?.toLowerCase().includes(search.toLowerCase()) || d.student?.full_name?.toLowerCase().includes(search.toLowerCase())
    return matchStudent && matchType && matchSearch
  })

  const counts = {}
  DOC_TYPES.forEach(t => { counts[t] = docs.filter(d=>d.doc_type===t).length })

  return (
    <div>
      {toast&&<div style={{position:'fixed',top:20,right:24,zIndex:999,padding:'10px 18px',borderRadius:10,fontWeight:700,fontSize:13,background:'var(--teal)',color:'white',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>{toast}</div>}

      <div className="page-header fade-up">
        <div><h2>📁 Student Documents</h2><div style={{fontSize:13,color:'var(--muted)'}}>{docs.length} documents stored</div></div>
        <button className="btn btn-primary" onClick={openModal}>+ Upload Document</button>
      </div>

      {/* Stats */}
      <div className="grid-4 fade-up-2" style={{marginBottom:16}}>
        {[
          { label:'Total Docs',   value:docs.length,                                         icon:'📁', cls:'sc-teal'   },
          { label:'Students',     value:new Set(docs.map(d=>d.student_id)).size,              icon:'👥', cls:'sc-violet' },
          { label:'IEPs',         value:counts['IEP']||0,                                    icon:'📋', cls:'sc-coral'  },
          { label:'Medical',      value:counts['Medical Record']||0,                          icon:'🏥', cls:'sc-gold'   },
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
        <select className="input" style={{width:200}} value={filterStudent} onChange={e=>setFilterStudent(e.target.value)}>
          <option value="">All Students</option>
          {students.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <select className="input" style={{width:180}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {DOC_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <input className="input" style={{marginLeft:'auto',width:220}} placeholder="🔍 Search documents…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Document list */}
      <div className="card fade-up-4" style={{padding:0,overflow:'hidden'}}>
        {loading ? <div className="loading-screen" style={{height:200}}><div className="spinner"/></div>
        : filtered.length===0 ? (
          <div className="empty-state">
            <div className="es-icon">📁</div>
            <div className="es-text">No documents found.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Student</th>
                <th>Type</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th>Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => {
                const color = TYPE_COLORS[doc.doc_type] || '#777'
                return (
                  <tr key={doc.id}>
                    <td>
                      <div style={{fontWeight:600,fontSize:13}}>{doc.title}</div>
                      {doc.notes&&<div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{doc.notes}</div>}
                      <div style={{fontSize:11,color:'var(--muted)'}}>{doc.file_name}</div>
                    </td>
                    <td>
                      <div style={{fontWeight:600,fontSize:12}}>{doc.student?.full_name||'—'}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{doc.student?.grade_level||''}</div>
                    </td>
                    <td>
                      <span style={{background:color+'20',color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>
                        {doc.doc_type}
                      </span>
                    </td>
                    <td style={{fontSize:11}}>
                      <div>{doc.uploader?.full_name||'—'}</div>
                      <div style={{color:'var(--muted)',textTransform:'capitalize'}}>{doc.uploader?.role||''}</div>
                    </td>
                    <td style={{fontSize:11}}>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td style={{fontSize:11,color:'var(--muted)'}}>{formatSize(doc.file_size)}</td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">View</a>
                        <button className="btn btn-sm" style={{background:'#fff0f0',color:'#cc3333',border:'1px solid #ffcccc'}} onClick={()=>setDeleteConfirm(doc)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
            <div className="modal-header">
              <div className="modal-title">📁 Upload Student Document</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="input-label">Student *</label>
                <select className="input" value={form.student_id} onChange={e=>setForm(p=>({...p,student_id:e.target.value}))}>
                  <option value="">Select student</option>
                  {students.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.grade_level})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Document Type *</label>
                <select className="input" value={form.doc_type} onChange={e=>setForm(p=>({...p,doc_type:e.target.value}))}>
                  {DOC_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="input-label">Title *</label>
              <input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. IEP 2024-2025"/>
            </div>
            <div className="form-group">
              <label className="input-label">File *</label>
              <input className="input" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e=>setForm(p=>({...p,file:e.target.files[0]}))} style={{padding:'8px 12px'}}/>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>PDF, Word, or image files. Max 10MB.</div>
            </div>
            <div className="form-group">
              <label className="input-label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={{resize:'vertical'}} placeholder="Any notes about this document…"/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={saving||!form.student_id||!form.title.trim()||!form.file}>
                {saving?'Uploading…':'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={()=>setDeleteConfirm(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:400}}>
            <div className="modal-header">
              <div className="modal-title">Delete Document?</div>
              <button className="modal-close" onClick={()=>setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{fontSize:13,marginBottom:16}}>This will permanently delete <strong>{deleteConfirm.title}</strong> for {deleteConfirm.student?.full_name}. This cannot be undone.</p>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-outline" onClick={()=>setDeleteConfirm(null)}>Cancel</button>
              <button className="btn" style={{background:'#cc3333',color:'white'}} onClick={()=>deleteDoc(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
