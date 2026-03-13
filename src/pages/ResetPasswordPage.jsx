import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const BG = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg,#0e0c2e,#1e1b5e,#0d2a4a)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const CARD = {
  background: 'rgba(255,255,255,.07)',
  border: '1px solid rgba(255,255,255,.13)',
  borderRadius: '22px', padding: '42px 38px', width: '400px', textAlign: 'center',
}
const INPUT = {
  width: '100%', padding: '10px 14px', borderRadius: 11,
  border: '1.5px solid rgba(255,255,255,.15)',
  background: 'rgba(255,255,255,.08)', color: '#fff',
  fontSize: 13, fontFamily: 'DM Sans,sans-serif', outline: 'none',
  boxSizing: 'border-box',
}
const BTN = {
  width: '100%', padding: 13, borderRadius: 13, border: 'none',
  background: 'linear-gradient(135deg,#00c9b1,#3b9eff)', color: '#fff',
  fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 15, cursor: 'pointer',
}
const LABEL = {
  fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.45)',
  display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px',
}
const ERR = {
  background: 'rgba(255,96,88,.15)', border: '1px solid rgba(255,96,88,.3)',
  borderRadius: 10, padding: '10px 14px', color: '#ff9090',
  fontSize: 12, marginBottom: 16, textAlign: 'left',
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [validLink, setValidLink] = useState(true)

  useEffect(() => {
    // Supabase puts the session tokens in the URL hash on redirect
    const hash = window.location.hash
    if (!hash || (!hash.includes('access_token') && !hash.includes('type=recovery'))) {
      setValidLink(false)
    }
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateErr) { setError(updateErr.message); return }
    setDone(true)
    setTimeout(() => navigate('/login'), 3000)
  }

  if (!validLink) return (
    <div style={BG}>
      <div style={CARD}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>&#x1F310;</div>
        <h1 style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 22, color: '#fff', margin: '0 0 16px' }}>
          BLE Worldwide
        </h1>
        <div style={{ fontSize: 36, marginBottom: 12 }}>&#x26A0;</div>
        <p style={{ color: '#ff9090', fontSize: 13, marginBottom: 24 }}>
          This reset link is invalid or has expired.<br/>Please request a new one.
        </p>
        <button style={BTN} onClick={() => navigate('/login')}>Back to Login</button>
      </div>
    </div>
  )

  if (done) return (
    <div style={BG}>
      <div style={CARD}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>&#x1F310;</div>
        <h1 style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 22, color: '#fff', margin: '0 0 16px' }}>
          BLE Worldwide
        </h1>
        <div style={{ fontSize: 48, marginBottom: 12 }}>&#x2705;</div>
        <p style={{ color: '#00c9b1', fontWeight: 700, fontSize: 15, margin: '0 0 8px' }}>Password updated!</p>
        <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 12 }}>Redirecting you to login...</p>
      </div>
    </div>
  )

  return (
    <div style={BG}>
      <div style={CARD}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>&#x1F310;</div>
        <h1 style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 22, color: '#fff', margin: '0 0 4px' }}>
          BLE Worldwide
        </h1>
        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, margin: '0 0 24px' }}>Set a new password</p>

        {error && <div style={ERR}>{error}</div>}

        <form onSubmit={handleReset} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              required minLength={8} placeholder="At least 8 characters" style={INPUT} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={LABEL}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              required placeholder="Re-enter password" style={INPUT} />
          </div>
          <button type="submit" disabled={loading}
            style={{ ...BTN, opacity: loading ? .7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Saving...' : 'Set New Password \u2192'}
          </button>
        </form>
      </div>
    </div>
  )
}
