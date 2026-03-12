import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [profile,     setProfile]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  // activeRole lets teacher+admin users switch portals without re-login
  const [activeRole,  setActiveRole]  = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setActiveRole(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    // Default activeRole to their primary role
    setActiveRole(data?.role || null)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setActiveRole(null)
  }

  // Can this user switch to admin view?
  const canSwitchToAdmin = profile?.role === 'teacher' && profile?.is_admin === true

  // Convenience flags
  const isSuperAdmin = profile?.role === 'super_admin'
  const isAdmin      = profile?.role === 'admin' || isSuperAdmin

  // Switch between teacher ↔ admin
  function switchRole(role) {
    if (role === 'admin' && !canSwitchToAdmin) return
    if (role === 'teacher' && profile?.role !== 'teacher') return
    setActiveRole(role)
  }

  const value = {
    user, profile, loading, signIn, signOut,
    role: activeRole || profile?.role,
    activeRole: activeRole || profile?.role,
    canSwitchToAdmin,
    switchRole,
    isSuperAdmin,
    isAdmin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
