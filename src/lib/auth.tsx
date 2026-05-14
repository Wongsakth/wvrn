'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export type UserRole = 'super_admin' | 'admin' | 'editor' | 'artist_manager' | 'venue_manager' | 'user'

const CAN_SUBMIT: UserRole[] = ['super_admin', 'admin', 'editor', 'artist_manager', 'venue_manager']

interface AuthCtx {
  user:       User | null
  session:    Session | null
  loading:    boolean
  role:       UserRole
  canSubmit:  boolean
  isAdmin:    boolean
  signOut:    () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, loading: true,
  role: 'user', canSubmit: false, isAdmin: false,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [role,    setRole]    = useState<UserRole>('user')
  const sb = createClient()

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) loadRole(data.session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadRole(session.user.id)
      else { setRole('user'); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadRole(userId: string) {
    try {
      const { data } = await sb.from('profiles').select('role').eq('id', userId).single()
      setRole((data?.role as UserRole) ?? 'user')
    } catch { setRole('user') }
    finally { setLoading(false) }
  }

  async function signOut() {
    await sb.auth.signOut()
    setRole('user')
  }

  const canSubmit = CAN_SUBMIT.includes(role)
  const isAdmin   = ['super_admin', 'admin', 'editor'].includes(role)

  return (
    <Ctx.Provider value={{ user, session, loading, role, canSubmit, isAdmin, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
