'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export type UserRole = 'super_admin' | 'admin' | 'editor' | 'artist_manager' | 'venue_manager' | 'user'

interface AuthCtx {
  user:      User | null
  session:   Session | null
  loading:   boolean
  role:      UserRole
  canSubmit: boolean   // จาก permission_matrix
  isAdmin:   boolean   // จาก permission_matrix
  signOut:   () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, loading: true,
  role: 'user', canSubmit: false, isAdmin: false,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null)
  const [session,   setSession]   = useState<Session | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [role,      setRole]      = useState<UserRole>('user')
  const [canSubmit, setCanSubmit] = useState(false)
  const [isAdmin,   setIsAdmin]   = useState(false)
  const sb = createClient()

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) loadRole(data.session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadRole(session.user.id)
      else { setRole('user'); setCanSubmit(false); setIsAdmin(false); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadRole(userId: string) {
    try {
      const { data: profile } = await sb.from('profiles').select('role').eq('id', userId).single()
      const r = (profile?.role as UserRole) ?? 'user'
      setRole(r)

      // อ่าน permission_matrix จริงจาก DB
      const { data: perms } = await sb.from('permission_matrix').select('permission,' + r)
      const map: Record<string, boolean> = {}
      for (const p of (perms || [])) {
        map[p.permission] = p[r] === true
      }
      setCanSubmit(map['submit_event'] ?? false)
      setIsAdmin(map['approve_submission'] ?? false)
    } catch {
      setRole('user'); setCanSubmit(false); setIsAdmin(false)
    } finally { setLoading(false) }
  }

  async function signOut() {
    await sb.auth.signOut()
    setRole('user'); setCanSubmit(false); setIsAdmin(false)
  }

  return (
    <Ctx.Provider value={{ user, session, loading, role, canSubmit, isAdmin, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
