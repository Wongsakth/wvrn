// @ts-nocheck
'use client'

// ── Region map ──────────────────────────────────────────────────────────────
export const REGIONS: Record<string, string[]> = {
  'ภาคกลาง': ['กรุงเทพมหานคร','นนทบุรี','ปทุมธานี','สมุทรปราการ','สมุทรสาคร','นครปฐม','สมุทรสงคราม','ราชบุรี','กาญจนบุรี','สุพรรณบุรี','พระนครศรีอยุธยา','อ่างทอง','สิงห์บุรี','ชัยนาท','ลพบุรี','สระบุรี','นครนายก','ปราจีนบุรี','ฉะเชิงเทรา','สระแก้ว'],
  'ภาคเหนือ': ['เชียงใหม่','เชียงราย','ลำปาง','ลำพูน','แม่ฮ่องสอน','พะเยา','น่าน','แพร่','อุตรดิตถ์','สุโขทัย','พิษณุโลก','พิจิตร','กำแพงเพชร','ตาก','เพชรบูรณ์'],
  'ภาคอีสาน': ['นครราชสีมา','ขอนแก่น','อุดรธานี','อุบลราชธานี','บึงกาฬ','หนองคาย','หนองบัวลำภู','เลย','สกลนคร','นครพนม','มุกดาหาร','กาฬสินธุ์','มหาสารคาม','ร้อยเอ็ด','ยโสธร','อำนาจเจริญ','ชัยภูมิ','บุรีรัมย์','สุรินทร์','ศรีสะเกษ'],
  'ภาคตะวันออก': ['ชลบุรี','ระยอง','จันทบุรี','ตราด'],
  'ภาคตะวันตก': ['เพชรบุรี','ประจวบคีรีขันธ์'],
  'ภาคใต้': ['สุราษฎร์ธานี','นครศรีธรรมราช','กระบี่','พังงา','ภูเก็ต','ตรัง','พัทลุง','สงขลา','สตูล','ปัตตานี','ยะลา','นราธิวาส','ชุมพร','ระนอง'],
}

export function getRegionProvinces(province: string): string[] {
  for (const [, provinces] of Object.entries(REGIONS)) {
    if (provinces.includes(province)) return provinces
  }
  return [province]
}

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
  province:  string
  signOut:   () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, loading: true,
  role: 'user', canSubmit: false, isAdmin: false, province: '',
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null)
  const [session,   setSession]   = useState<Session | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [role,      setRole]      = useState<UserRole>('user')
  const [canSubmit, setCanSubmit] = useState(false)
  const [isAdmin,   setIsAdmin]   = useState(false)
  const [province,  setProvince]  = useState('')
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
      const { data: { user: authUser } } = await sb.auth.getUser()
const { data: profile } = await sb.from('profiles').select('role,province,email,display_name').eq('id', userId).single()
// Sync email ถ้ายังไม่มี
if (!profile?.email && authUser?.email) {
  await sb.from('profiles').update({ email: authUser.email }).eq('id', userId)
}
      const r = (profile?.role as UserRole) ?? 'user'
      setRole(r)
      setProvince(profile?.province ?? '')

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
    setRole('user'); setCanSubmit(false); setIsAdmin(false); setProvince('')
  }

  return (
    <Ctx.Provider value={{ user, session, loading, role, canSubmit, isAdmin, province, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)

