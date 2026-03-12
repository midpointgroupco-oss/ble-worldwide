import { useState } from 'react'

export async function callClaude(system, user, maxTokens) {
  const res = await fetch('/.netlify/functions/claude-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, user, maxTokens: maxTokens || 1000 }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'AI unavailable')
  return data.text || ''
}

export function AIPanel({ title, icon, placeholder, onGenerate, onInsert, generateLabel, insertLabel }) {
  const [input,   setInput]   = useState('')
  const [output,  setOutput]  = useState('')
  const [edited,  setEdited]  = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error,   setError]   = useState('')

  async function generate() {
    setLoading(true); setError(''); setOutput(''); setEditing(false)
    try {
      const result = await onGenerate(input)
      setOutput(result); setEdited(result)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{background:'linear-gradient(135deg,#0d0c2b,#1a1660)',borderRadius:14,padding:'16px 18px',marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        <span style={{fontSize:20}}>{icon}</span>
        <span style={{fontWeight:900,fontSize:13,color:'white'}}>{title}</span>
        <span style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:'rgba(0,201,177,.9)',background:'rgba(0,201,177,.12)',padding:'2px 8px',borderRadius:20}}>AI</span>
      </div>
      {placeholder && (
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder} rows={3}
          style={{width:'100%',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:8,padding:'10px 12px',color:'white',fontSize:12,resize:'vertical',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
      )}
      <button onClick={generate} disabled={loading}
        style={{width:'100%',marginTop:8,padding:'9px 0',borderRadius:8,border:'none',background:loading?'rgba(0,201,177,.3)':'linear-gradient(135deg,#00c9b1,#0097a7)',color:'white',fontWeight:800,fontSize:12,cursor:loading?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
        {loading ? <><span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid white',borderRadius:'50%',animation:'ai-spin 1s linear infinite'}}/> Generating...</> : (generateLabel || 'Generate')}
      </button>
      {error && <div style={{marginTop:8,padding:'8px 10px',background:'rgba(204,51,51,.25)',borderRadius:6,fontSize:11,color:'#ffaaaa'}}>{error}</div>}
      {output && (
        <div style={{marginTop:10}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
            <span style={{fontSize:10,fontWeight:700,color:'rgba(0,201,177,.8)',textTransform:'uppercase',letterSpacing:.5}}>Result</span>
            <button onClick={() => setEditing(e => !e)} style={{fontSize:10,color:'rgba(255,255,255,.5)',background:'rgba(255,255,255,.08)',border:'none',borderRadius:4,padding:'1px 7px',cursor:'pointer'}}>
              {editing ? 'Preview' : 'Edit'}
            </button>
          </div>
          {editing
            ? <textarea value={edited} onChange={e => setEdited(e.target.value)} rows={6}
                style={{width:'100%',background:'rgba(255,255,255,.07)',border:'1px solid rgba(0,201,177,.3)',borderRadius:8,padding:'10px 12px',color:'white',fontSize:12,resize:'vertical',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
            : <div style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'rgba(255,255,255,.9)',lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:200,overflowY:'auto'}}>{output}</div>
          }
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={() => onInsert && onInsert(editing ? edited : output)}
              style={{flex:1,padding:'8px 0',borderRadius:8,border:'none',background:'linear-gradient(135deg,#00c9b1,#0097a7)',color:'white',fontWeight:800,fontSize:12,cursor:'pointer'}}>
              {insertLabel || 'Use This'}
            </button>
            <button onClick={generate} style={{padding:'8px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.06)',color:'rgba(255,255,255,.7)',fontSize:11,cursor:'pointer',fontWeight:700}}>Retry</button>
            <button onClick={() => { setOutput(''); setEdited(''); setEditing(false) }}
              style={{padding:'8px 14px',borderRadius:8,border:'none',background:'transparent',color:'rgba(255,255,255,.4)',fontSize:11,cursor:'pointer'}}>X</button>
          </div>
        </div>
      )}
      <style>{`@keyframes ai-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
