'use client'
import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'
import { User, Heart, MapPin, Calendar, LogOut, Shield, ChevronRight, Music } from 'lucide-react'
import { useTheme, THEMES } from '@/lib/theme'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [stats, setStats] = useState({ artists: 0, venues: 0, going: 0, attended: 0 })
  const sb = createClient()

  useEffect(() => {
    if (!user) return
    Promise.all([
      sb.from('follows').select('id', { count: 'exact' }).eq('user_id', user.id),
      sb.from('venue_follows').select('id', { count: 'exact' }).eq('user_id', user.id).catch(() => ({ count: 0 })),
      sb.from('event_attendance').select('id,status').eq('user_id', user.id),
    ]).then(([ar, vr, at]) => {
      const att = (at as any).data || []
      setStats({
        artists:  ar.count ?? 0,
        venues:   (vr as any).count ?? 0,
        going:    att.filter((a: any) => a.status === 'going').length,
        attended: att.filter((a: any) => a.status === 'attended').length,
      })
    })
  }, [user])

  if (!user) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <User size={40} className="mx-auto mb-4 text-muted" />
        <p className="text-[15px] font-medium text-primary mb-4">Login เพื่อดูโปรไฟล์</p>
        <button onClick={() => window.location.href = '/login'} className="btn-accent py-2 px-6 text-[14px]">Login</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-screen-sm mx-auto px-4 py-6">

        {/* Profile card */}
        <div className="rounded-2xl p-6 mb-4 text-center"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt=""
              className="w-20 h-20 rounded-full mx-auto mb-3 object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-[28px] font-medium"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              {(user.email ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <p className="text-[18px] font-medium text-primary">
            {user.user_metadata?.full_name ?? user.email?.split('@')[0]}
          </p>
          <p className="text-[13px] text-muted mt-0.5">{user.email}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'ศิลปิน',   value: stats.artists,  icon: Music,    href: '/following'         },
            { label: 'สถานที่',  value: stats.venues,   icon: MapPin,   href: '/following?tab=venues' },
            { label: 'จะไป',    value: stats.going,    icon: Calendar, href: '/following?tab=going'  },
            { label: 'ไปแล้ว',  value: stats.attended, icon: Heart,    href: '/following?tab=going'  },
          ].map(s => (
            <button key={s.label} onClick={() => window.location.href = s.href}
              className="rounded-xl py-3 px-2 text-center transition-all"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p className="text-[20px] font-medium text-accent">{s.value}</p>
              <p className="text-[10px] text-muted mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Theme selector */}
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-[12px] font-medium text-muted uppercase tracking-wide">ธีม</p>
          </div>
          <div className="p-4 grid grid-cols-3 gap-2">
            {THEMES.map(t => (
              <button key={t.id} onClick={() => setTheme(t.id)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] transition-all"
                style={{
                  background: theme === t.id ? 'var(--accent-muted)' : 'var(--surface-2)',
                  border: `1px solid ${theme === t.id ? 'var(--accent)' : 'var(--border)'}`,
                  color: theme === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: theme === t.id ? 500 : 400,
                }}>
                <span>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Menu */}
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          {[
            { label: 'รายการที่ติดตาม', icon: Heart,    href: '/following' },
            { label: 'แจ้งงาน concert',  icon: Calendar, href: '/submit'    },
            { label: 'ข้อจำกัดความรับผิดชอบ', icon: Shield, href: '/disclaimer' },
          ].map((item, i) => (
            <button key={item.label}
              onClick={() => window.location.href = item.href}
              className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
              style={{ borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <item.icon size={16} className="text-muted shrink-0" />
              <span className="text-[14px] text-primary flex-1 text-left">{item.label}</span>
              <ChevronRight size={14} className="text-muted" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-medium transition-all"
          style={{ background: 'rgba(226,75,74,.08)', border: '1px solid rgba(226,75,74,.2)', color: '#E24B4A' }}>
          <LogOut size={16} /> ออกจากระบบ
        </button>
      </div>
    </div>
  )
}
