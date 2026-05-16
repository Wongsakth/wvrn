'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import NotificationBell from '@/components/layout/NotificationBell'
import { useAuth } from '@/lib/auth'
import { Home, Search, Heart, User, LogOut, Plus, Settings } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, signOut, canSubmit } = useAuth()
  const [showUser, setShowUser] = useState(false)

  const isAdmin = pathname.startsWith('/admin')
  if (isAdmin) return null

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const BOTTOM_TABS = [
    { href: '/',       label: 'หน้าหลัก', icon: Home   },
    { href: '/search', label: 'ค้นหา',    icon: Search },
    ...(canSubmit ? [{ href: '/submit', label: 'แจ้งงาน', icon: Plus, isSubmit: true }] : []),
    ...(user
      ? [
          { href: '/following', label: 'ติดตาม',  icon: Heart },
          { href: '/profile',   label: 'โปรไฟล์', icon: User  },
        ]
      : [
          { href: '/login', label: 'Login / สมัคร', icon: User },
        ]
    ),
  ]

  return (
    <>
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 w-full h-[52px] flex items-center px-4 gap-3"
        style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}>

        {/* Logo + Tagline */}
        <Link href="/" className="flex flex-col items-center sm:flex-row sm:items-center gap-0 sm:gap-2 mr-auto">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="WVRN" className="w-7 h-7 rounded-md object-cover" />
            <span className="text-[17px] font-medium tracking-[4px]" style={{ color: 'var(--accent)' }}>WVRN</span>
          </div>
          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full mt-0.5 sm:mt-0"
            style={{
              background:    'rgba(232,0,58,0.1)',
              color:         'var(--accent)',
              border:        '1px solid rgba(232,0,58,0.2)',
              letterSpacing: '1px',
            }}>
            NEVER MISS A SHOW
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { href: '/',          label: 'หน้าหลัก', icon: Home   },
            { href: '/search',    label: 'ค้นหา',    icon: Search },
            ...(user ? [{ href: '/following', label: 'ติดตาม', icon: Heart }] : []),
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-all',
                isActive(href) ? 'font-medium' : 'text-muted hover:text-primary')}
              style={{ background: isActive(href) ? 'var(--accent-muted)' : 'transparent', color: isActive(href) ? 'var(--accent)' : undefined }}>
              <Icon size={14} />{label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          {canSubmit && (
            <Link href="/submit"
              className="hidden sm:flex items-center gap-1.5 text-[12px] py-1.5 px-3 rounded-lg font-medium"
              style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}>
              <Plus size={13} /> แจ้งงาน
            </Link>
          )}

          {user && <NotificationBell />}

          {user ? (
            <div className="relative">
              <button onClick={() => setShowUser(v => !v)}
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border-2"
                style={{ borderColor: 'var(--accent)', background: 'var(--accent-muted)' }}>
                {user.user_metadata?.avatar_url
                  ? <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                      {(user.email ?? 'U')[0].toUpperCase()}
                    </span>
                }
              </button>
              {showUser && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden shadow-lg z-50"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p className="text-[12px] font-medium text-primary truncate">{user.user_metadata?.full_name ?? user.email}</p>
                    <p className="text-[11px] text-muted truncate">{user.email}</p>
                  </div>
                  <Link href="/profile" onClick={() => setShowUser(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-secondary hover:bg-[var(--surface-2)] transition-colors">
                    <Settings size={14} /> ตั้งค่า
                  </Link>
                  <button onClick={() => { setShowUser(false); signOut() }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-secondary hover:bg-[var(--surface-2)] transition-colors">
                    <LogOut size={14} /> ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login"
              className="flex items-center gap-1.5 text-[12px] py-1.5 px-3 rounded-lg font-medium"
              style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}>
              <User size={13} /> Login / สมัคร
            </Link>
          )}
        </div>
      </header>

      {/* ── Bottom Tab Bar (Mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center"
        style={{ background: 'var(--surface-1)', borderTop: '1px solid var(--border)', height: 60, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {BOTTOM_TABS.map(({ href, label, icon: Icon, ...rest }) => {
          const active   = isActive(href)
          const isSubmit = (rest as any).isSubmit === true
          const isLogin  = href === '/login'
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all">
              {isSubmit ? (
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5"
                  style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
                  <Icon size={20} style={{ color: 'white', strokeWidth: 2.5 }} />
                </div>
              ) : isLogin ? (
                <>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--accent-muted)' }}>
                    <Icon size={17} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span className="text-[9px] font-medium" style={{ color: 'var(--accent)' }}>Login</span>
                </>
              ) : (
                <>
                  <Icon size={22} style={{ color: active ? 'var(--accent)' : 'var(--text-muted)', strokeWidth: active ? 2.2 : 1.8 }} />
                  <span className="text-[10px]" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)', fontWeight: active ? 500 : 400 }}>
                    {label}
                  </span>
                </>
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
