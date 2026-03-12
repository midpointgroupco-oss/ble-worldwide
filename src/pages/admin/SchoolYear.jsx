import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminSchoolYear() {
  const [years,     setYears]     = useState([])
  const [terms,     setTerms]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [yearModal, setYearModal] = useState(false)
  const [termModal, setTermModal] = useState(null)  // school_year_id
  const [editYear,  setEditYear]  = useState(null)
  const [editTerm,  setEditTerm]  = useState(null)
  const [openYear,  setOpenYear]  = useState(null)

  // Ref always tracks the latest openYear so async callbacks never use stale closures
  const openYearRef = useRef(null)
  useEffect(() => { openYearRef.current = openYear }, [openYear])

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: ys }, { data: ts }] = await Promise.all([
      supabase.from('school_years').select('*').order('start_date', { ascending: false }),
      supabase.from('terms').select('*').order('start_date'),
    ])
    setYears(ys || [])
    setTerms(ts || [])
    // Auto-open: keep whatever is open; fall back to current year; fall back to first year
    setOpenYear(prev => {
      if (prev) return prev
      const current = (ys || []).find(y => y.is_current)
      return current?.id || ys?.[0]?.id || null
    })
    setLoading(false)
  }

  // Reload while preserving open year via ref
  function reload() {
    const keep = openYearRef.current
    load().then(() => {
      if (keep) setOpenYear(keep)
    })
  }

  async function setCurrentYear(id) {
    await supabase.from('school_years').update({ is_current: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('school_years').update({ is_current: true }).eq('id', id)
    reload()
  }

  async function setCurrentTerm(id, yearId) {
    await supabase.from('terms').update({ is_current: false }).eq('school_year_id', yearId)
    await supabase.from('terms').update({ is_current: true }).eq('id', id)
    reload()
  }

  async function deleteYear(id) {
    if (!confirm('Delete this school year and all its terms?')) return
    await supabase.from('school_years').delete().eq('id', id)
    reload()
  }

  async function deleteTerm(id) {
    if (!confirm('Delete this term?')) return
    await supabase.from('terms').delete().eq('id', id)
    reload()
  }

  function handleYearSaved() {
    setYearModal(false)
    setEditYear(null)
    reload()
  }

  function handleTermSaved() {
    setTermModal(null)
    setEditTerm(null)
    reload()
  }

  return (
    <div>
      <div className="page-header fade-up">
        <h2>📅 School Years & Terms</h2>
        <button className="btn btn-primary" onClick={() => { setEditYear(null); setYearModal(true) }}>
          + New School Year
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : years.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">📅</div>
          <div className="es-text">No school years yet. Create one to get started.</div>
        </div>
      ) : (
        years.map(y => {
          const yTerms = terms.filter(t => t.school_year_id === y.id)
          const isOpen = openYear === y.id
          return (
            <div key={y.id} className="card fade-up" style={{
              marginBottom: 12,
              border: y.is_current ? '2px solid var(--teal)' : '1px solid var(--border)'
            }}>
              {/* Year header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => setOpenYear(isOpen ? null : y.id)}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{y.name}</div>
                    {y.is_current && <span className="badge badge-green">✅ Current</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {y.start_date} → {y.end_date} · {yTerms.length} term{yTerms.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  {!y.is_current && (
                    <button className="btn btn-sm btn-outline" onClick={() => setCurrentYear(y.id)}>
                      Set Current
                    </button>
                  )}
                  <button className="btn btn-sm btn-outline" onClick={() => { setEditYear(y); setYearModal(true) }}>✏️</button>
                  <button className="btn btn-sm" style={{ background: '#fff0f0', color: '#cc3333', border: '1px solid #ffcccc' }}
                    onClick={() => deleteYear(y.id)}>🗑</button>
                </div>
                <span style={{ fontSize: 18, color: 'var(--muted)', padding: '0 4px' }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* Terms panel */}
              {isOpen && (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Terms / Quarters</div>
                    <button className="btn btn-sm btn-outline"
                      onClick={() => { setEditTerm(null); setTermModal(y.id) }}>
                      + Add Term
                    </button>
                  </div>

                  {yTerms.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', padding: '10px 0' }}>
                      No terms yet for this school year.
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr><th>Term</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {yTerms.map(t => (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 700 }}>{t.name}</td>
                            <td>{t.start_date}</td>
                            <td>{t.end_date}</td>
                            <td>
                              {t.is_current
                                ? <span className="badge badge-green">Current</span>
                                : <span className="badge">—</span>}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 5 }}>
                                {!t.is_current && (
                                  <button className="btn btn-sm btn-outline" style={{ fontSize: 10 }}
                                    onClick={() => setCurrentTerm(t.id, y.id)}>
                                    Set Current
                                  </button>
                                )}
                                <button className="btn btn-sm btn-outline"
                                  onClick={() => { setEditTerm(t); setTermModal(y.id) }}>✏️</button>
                                <button className="btn btn-sm"
                                  style={{ background: '#fff0f0', color: '#cc3333', border: '1px solid #ffcccc', fontSize: 11 }}
                                  onClick={() => deleteTerm(t.id)}>🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {yearModal && (
        <YearModal
          item={editYear}
          onClose={() => { setYearModal(false); setEditYear(null) }}
          onSaved={handleYearSaved}
        />
      )}
      {termModal && (
        <TermModal
          item={editTerm}
          schoolYearId={termModal}
          onClose={() => { setTermModal(null); setEditTerm(null) }}
          onSaved={handleTermSaved}
        />
      )}
    </div>
  )
}

function YearModal({ item, onClose, onSaved }) {
  const [name,   setName]   = useState(item?.name || '')
  const [start,  setStart]  = useState(item?.start_date || '')
  const [end,    setEnd]    = useState(item?.end_date || '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function save() {
    if (!name.trim() || !start || !end) { setError('All fields are required.'); return }
    setSaving(true)
    setError('')
    const payload = { name: name.trim(), start_date: start, end_date: end }
    const { error: dbErr } = item
      ? await supabase.from('school_years').update(payload).eq('id', item.id)
      : await supabase.from('school_years').insert([payload])
    if (dbErr) { setError(dbErr.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title">{item ? '✏️ Edit' : '+ New'} School Year</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div style={{ color: '#cc3333', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <div className="form-group">
          <label className="input-label">Name (e.g. 2025-2026)</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="2025-2026" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="input-label">Start Date</label>
            <input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="input-label">End Date</label>
            <input className="input" type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim() || !start || !end}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TermModal({ item, schoolYearId, onClose, onSaved }) {
  const [name,   setName]   = useState(item?.name || '')
  const [start,  setStart]  = useState(item?.start_date || '')
  const [end,    setEnd]    = useState(item?.end_date || '')
  const [saving, setSaving] = useState(false)
  const [currentYear, setCurrentYear] = useState(null)
  const [currentTerm, setCurrentTerm] = useState(null)
  const [error,  setError]  = useState('')

  async function save() {
    if (!name.trim() || !start || !end) { setError('All fields are required.'); return }
    setSaving(true)
    setError('')
    const payload = { name: name.trim(), start_date: start, end_date: end, school_year_id: schoolYearId }
    const { error: dbErr } = item
      ? await supabase.from('terms').update(payload).eq('id', item.id)
      : await supabase.from('terms').insert([payload])
    if (dbErr) { setError(dbErr.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title">{item ? '✏️ Edit' : '+ Add'} Term</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div style={{ color: '#cc3333', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <div className="form-group">
          <label className="input-label">Term Name (e.g. Q1, Semester 1)</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Q1" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="input-label">Start Date</label>
            <input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="input-label">End Date</label>
            <input className="input" type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim() || !start || !end}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
