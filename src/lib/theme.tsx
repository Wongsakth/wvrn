'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { Theme, ThemeConfig } from '@/types'
import { createClient } from '@/lib/supabase'

export const THEMES: ThemeConfig[] = [
  { id: 'festival', name: 'Festival', label: 'Festival', emoji: '🎪', dark: true  },
  { id: 'dark',     name: 'Dark',     label: 'Dark',     emoji: '🖤', dark: true  },
  { id: 'pastel',   name: 'Pastel',   label: 'Pastel',   emoji: '🌸', dark: false },
  { id: 'vivid',    name: 'วัยรุ่น',  label: 'วัยรุ่น',  emoji: '⚡', dark: false },
  { id: 'earth',    name: 'Earth',    label: 'Earth',    emoji: '🌿', dark: false },
  { id: 'rock',     name: 'Rock',     label: 'Rock',     emoji: '🎸', dark: true  },
]

interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void; config: ThemeConfig }

const Ctx = createContext<ThemeCtx>({
  theme: 'festival',
  setTheme: () => {},
  config: THEMES[0],
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [theme, setThemeState] = useState<Theme>(() => {
    // อ่าน localStorage ทันทีตอน init — ไม่มี flash
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('wvrn-theme') as Theme
      if (local && THEMES.find(t => t.id === local)) return local
    }
    return 'festival'
  })
  const sb = createClient()

  // Sync จาก Supabase หลัง mount (ถ้า login)
  useEffect(() => {
    async function syncFromSupabase() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('profiles')
        .select('theme')
        .eq('id', user.id)
        .single()
      if (data?.theme && THEMES.find(t => t.id === data.theme)) {
        const saved = data.theme as Theme
        // อัปเดตเฉพาะเมื่อต่างจาก localStorage (กัน loop)
        if (saved !== localStorage.getItem('wvrn-theme')) {
          setThemeState(saved)
          localStorage.setItem('wvrn-theme', saved)
        }
      }
    }
    syncFromSupabase()
  }, [])

  async function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('wvrn-theme', t)

    // Save to Supabase ถ้า login
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      await sb.from('profiles').update({ theme: t }).eq('id', user.id)
    }
  }

  const config = THEMES.find(t => t.id === theme) ?? THEMES[0]

  // Re-apply เมื่อ theme เปลี่ยน หรือ navigate (pathname เปลี่ยน)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme, pathname])

  return <Ctx.Provider value={{ theme, setTheme, config }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
