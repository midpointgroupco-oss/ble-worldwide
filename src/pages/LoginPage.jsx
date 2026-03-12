import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error } = await signIn(email, password)
    setLoading(false)
    if (error) { setError(error.message); return }
    // App.jsx will redirect based on role
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#0e0c2e,#1e1b5e,#0d2a4a)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'rgba(255,255,255,.07)',
        border: '1px solid rgba(255,255,255,.13)',
        borderRadius: '22px',
        padding: '42px 38px',
        width: '400px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🌐</div>
        <h1 style={{ fontFamily:'Nunito,sans-serif', fontWeight:900, fontSize:26, color:'#fff', marginBottom:4 }}>
          BLE Worldwide
        </h1>
        <p style={{ color:'rgba(255,255,255,.45)', fontSize:13, marginBottom:30 }}>
          Global Homeschool Management Platform
        </p>

        {error && (
          <div style={{ background:'rgba(255,96,88,.15)', border:'1px solid rgba(255,96,88,.3)', borderRadius:10, padding:'10px 14px', color:'#ff9090', fontSize:12, marginBottom:16, textAlign:'left' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ textAlign:'left' }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.45)', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'.5px' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={{ width:'100%', padding:'10px 14px', borderRadius:11, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:'#fff', fontSize:13, fontFamily:'DM Sans,sans-serif', outline:'none' }}
            />
          </div>
          <div style={{ marginBottom:22 }}>
            <label style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.45)', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'.5px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width:'100%', padding:'10px 14px', borderRadius:11, border:'1.5px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:'#fff', fontSize:13, fontFamily:'DM Sans,sans-serif', outline:'none' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width:'100%', padding:13, borderRadius:13, border:'none', background:'linear-gradient(135deg,#00c9b1,#3b9eff)', color:'#fff', fontFamily:'Nunito,sans-serif', fontWeight:900, fontSize:15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p style={{ color:'rgba(255,255,255,.25)', fontSize:11, marginTop:20 }}>
          Your role is assigned by your administrator.
        </p>
      </div>
    </div>
  )
}
