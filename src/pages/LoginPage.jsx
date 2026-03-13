import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const CARD = {
  background: 'rgba(255,255,255,.07)',
  border: '1px solid rgba(255,255,255,.13)',
  borderRadius: '22px',
  padding: '42px 38px',
  width: '400px',
  textAlign: 'center',
}
const BG = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg,#0e0c2e,#1e1b5e,#0d2a4a)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
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
const OK = {
  background: 'rgba(0,201,177,.15)', border: '1px solid rgba(0,201,177,.3)',
  borderRadius: 10, padding: '10px 14px', color: '#00c9b1',
  fontSize: 12, marginBottom: 16, textAlign: 'left',
}

export default function LoginPage() {
  const { signIn } = useAuth()

  // screen: 'login' | 'otp' | 'forgot' | 'forgot-sent' | 'reset'
  const [screen,   setScreen]   = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [otp,      setOtp]      = useState('')
  const [error,    setError]    = useState('')
  const [info,     setInfo]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [resending, setResending] = useState(false)

  // ── Step 1: Sign in with email + password ──
  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)

    const { error: signInErr } = await signIn(email, password)
    if (signInErr) {
      setError(signInErr.message)
      setLoading(false)
      return
    }

    // Credentials OK — send OTP
    try {
      const res  = await fetch('/.netlify/functions/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'send', email }),
      })
      const data = await res.json()
      if (!data.success) {
        setError('Could not send verification code: ' + (data.error || 'Unknown error'))
        setLoading(false)
        return
      }
      setScreen('otp')
    } catch (e) {
      setError('Failed to send verification code: ' + e.message)
    }
    setLoading(false)
  }

  // ── Step 2: Verify OTP ──
  async function handleOtp(e) {
    e.preventDefault()
    setError(''); setLoading(true)

    try {
      const res  = await fetch('/.netlify/functions/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'verify', email, code: otp }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Invalid code')
        setLoading(false)
        return
      }
      // OTP verified — App.jsx will redirect based on role automatically
    } catch (e) {
      setError('Verification failed: ' + e.message)
    }
    setLoading(false)
  }

  // ── Resend OTP ──
  async function resendOtp() {
    setResending(true); setError(''); setOtp('')
    try {
      const res  = await fetch('/.netlify/functions/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'send', email }),
      })
      const data = await res.json()
      if (data.success) setInfo('A new code was sent to your email.')
      else setError('Could not resend: ' + (data.error || 'Unknown'))
    } catch (e) {
      setError('Resend failed: ' + e.message)
    }
    setResending(false)
  }

  // ── Forgot password: send reset link ──
  async function handleForgot(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    setLoading(false)
    if (resetErr) { setError(resetErr.message); return }
    setScreen('forgot-sent')
  }

  const Header = () => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 44, marginBottom: 6 }}>&#x1F310;</div>
      <h1 style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 24, color: '#fff', margin: '0 0 4px' }}>
        BLE Worldwide
      </h1>
      <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, margin: 0 }}>
        Global Homeschool Management Platform
      </p>
    </div>
  )

  // ── LOGIN SCREEN ──
  if (screen === 'login') return (
    <div style={BG}>
      <div style={CARD}>
        <Header />
        {error && <div style={ERR}>{error}</div>}
        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="your@email.com" style={INPUT} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={LABEL}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;" style={INPUT} />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <button type="button" onClick={() => { setScreen('forgot'); setError('') }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.45)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
              Forgot password?
            </button>
          </div>
          <button type="submit" disabled={loading} style={{ ...BTN, opacity: loading ? .7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Signing in...' : 'Sign In \u2192'}
          </button>
        </form>
        <p style={{ color: 'rgba(255,255,255,.2)', fontSize: 11, marginTop: 20 }}>
          Your role is assigned by your administrator.
        </p>
      </div>
    </div>
  )

  // ── OTP SCREEN ──
  if (screen === 'otp') return (
    <div style={BG}>
      <div style={CARD}>
        <Header />
        <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1F510;</div>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>
          Check your email
        </p>
        <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 12, margin: '0 0 24px' }}>
          We sent a 6-digit code to<br/>
          <span style={{ color: '#00c9b1', fontWeight: 700 }}>{email}</span>
        </p>
        {error && <div style={ERR}>{error}</div>}
        {info  && <div style={OK}>{info}</div>}
        <form onSubmit={handleOtp} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL}>Verification Code</label>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
              required
              placeholder="000000"
              maxLength={6}
              style={{ ...INPUT, fontSize: 28, fontWeight: 900, letterSpacing: 8, textAlign: 'center', fontFamily: 'monospace' }}
            />
          </div>
          <button type="submit" disabled={loading || otp.length < 6}
            style={{ ...BTN, opacity: (loading || otp.length < 6) ? .6 : 1, cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Verifying...' : 'Verify Code \u2192'}
          </button>
        </form>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={() => { setScreen('login'); setError(''); setOtp('') }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.35)', fontSize: 11, cursor: 'pointer' }}>
            &#x2190; Back to login
          </button>
          <button type="button" onClick={resendOtp} disabled={resending}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.45)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
            {resending ? 'Sending...' : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── FORGOT PASSWORD SCREEN ──
  if (screen === 'forgot') return (
    <div style={BG}>
      <div style={CARD}>
        <Header />
        <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1F511;</div>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>
          Reset your password
        </p>
        <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 12, margin: '0 0 24px' }}>
          Enter your email and we&#39;ll send you a reset link.
        </p>
        {error && <div style={ERR}>{error}</div>}
        <form onSubmit={handleForgot} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="your@email.com" style={INPUT} />
          </div>
          <button type="submit" disabled={loading}
            style={{ ...BTN, opacity: loading ? .7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Sending...' : 'Send Reset Link \u2192'}
          </button>
        </form>
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={() => { setScreen('login'); setError('') }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.35)', fontSize: 11, cursor: 'pointer' }}>
            &#x2190; Back to login
          </button>
        </div>
      </div>
    </div>
  )

  // ── FORGOT SENT SCREEN ──
  if (screen === 'forgot-sent') return (
    <div style={BG}>
      <div style={CARD}>
        <Header />
        <div style={{ fontSize: 48, marginBottom: 12 }}>&#x2705;</div>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 10px' }}>
          Check your email
        </p>
        <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
          A password reset link was sent to<br/>
          <span style={{ color: '#00c9b1', fontWeight: 700 }}>{email}</span><br/>
          Click the link in the email to set a new password.
        </p>
        <button type="button" onClick={() => { setScreen('login'); setError('') }} style={BTN}>
          Back to Login
        </button>
      </div>
    </div>
  )

  return null
}
