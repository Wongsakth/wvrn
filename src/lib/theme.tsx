'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Theme, ThemeConfig } from '@/types'

export const THEMES: ThemeConfig[] = [
  { id: 'festival', name: 'Festival',  emoji: '🎪', dark: true  },
  { id: 'dark',     name: 'Dark',      emoji: '🖤', dark: true  },
  { id: 'pastel',   name: 'Pastel',    emoji: '🌸', dark: false },
  { id: 'vivid',    name: 'วัยรุ่น',   emoji: '⚡', dark: false },
  { id: 'earth',    name: 'Earth',     emoji: '🌿', dark: false },
  { id: 'rock',     name: 'Rock',      emoji: '🎸', dark: true  },
]

interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void; config: ThemeConfig }

const Ctx = createContext<ThemeCtx>({
  theme: 'festival',
  setTheme: () => {},
  config: THEMES[0],
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('festival')

  useEffect(() => {
    const saved = localStorage.getItem('wvrn-theme') as Theme
    if (saved && THEMES.find(t => t.id === saved)) setThemeState(saved)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('wvrn-theme', t)
  }

  const config = THEMES.find(t => t.id === theme) ?? THEMES[0]

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return <Ctx.Provider value={{ theme, setTheme, config }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
