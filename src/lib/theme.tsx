'use client'
import { createContext, useContext, useEffect, useState } from 'react'
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
  const [theme, setThemeState] = useState<Theme>('festival')
  const sb = createClient()

  // Load theme: Supabase ก่อน → fallback localStorage
  useEffect(() => {
    async function loadTheme() {
      // 1. Load จาก localStorage ก่อน (ไวกว่า ไม่มี flash)
      const local = localStorage.getItem('wvrn-theme') as Theme
      if (local && THEMES.find(t => t.id === local)) {
        setThemeState(local)
      }

      // 2. ถ้า login อยู่ ดึงจาก Supabase ทับ
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data } = await sb.from('profiles')
          .select('theme')
          .eq('id', user.id)
          .single()
        if (data?.theme && THEMES.find(t => t.id === data.theme)) {
          setThemeState(data.theme as Theme)
          localStorage.setItem('wvrn-theme', data.theme)
        }
      }
    }
    loadTheme()
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return <Ctx.Provider value={{ theme, setTheme, config }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
