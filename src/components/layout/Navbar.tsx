'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useTheme, THEMES } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import {
  Calendar, List, MapPin, Heart, Plus,
  Search, Bell, User, Palette, X, Menu, LogOut, Music,
} from 'lucide-react'

const NAV_LINKS = [
  { href: '/',        label: 'ปฏิทิน',  icon: Calendar },
  { href: '/artists', label: 'ศิลปิน',  icon: Music    },
  { href: '/venues',  label: 'สถานที่', icon: MapPin   },
  { href: '/following',label: 'ติดตาม', icon: Heart    },
]

export default function Navbar() {
  const pathname  = usePathname()
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [showThemes, setShowThemes] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showUser,   setShowUser]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ── Desktop + Tablet Navbar ── */}
      <header className="
        sticky top-0 z-50 w-full h-[52px]
        surface-1 border-b border-theme
        backdrop-blur-sm
        flex items-center px-4 gap-0
      ">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6 shrink-0">
          <div className="w-7 h-7 rounded-md surface-2 border border-theme flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <path d="M3,20 L7,9 L12,17 L16,5 L20,21 L25,13 L29,20"
                stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[17px] font-medium tracking-[4px] text-accent hidden sm:block">
            WVRN
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center h-full">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 h-full text-[13px] border-b-2 transition-colors',
                pathname === href
                  ? 'text-accent border-accent'
                  : 'text-secondary border-transparent hover:text-primary'
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1">

          {/* Search */}
          {showSearch ? (
            <div className="flex items-center gap-2 surface-2 border border-theme rounded-full px-3 py-1.5 w-48 animate-fade-in">
              <Search size={13} className="text-muted shrink-0" />
              <input
                autoFocus
                placeholder="ค้นหา..."
                className="bg-transparent text-[13px] text-primary outline-none w-full placeholder:text-muted"
                onBlur={() => setShowSearch(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="icon-btn"
              aria-label="Search"
            >
              <Search size={17} />
            </button>
          )}

          {/* Theme picker */}
          <div className="relative">
            <button
              onClick={() => setShowThemes(v => !v)}
              className="icon-btn"
              aria-label="เปลี่ยน Theme"
            >
              <Palette size={17} />
            </button>
            {showThemes && (
              <div className="
                absolute right-0 top-full mt-2
                surface-1 border border-theme rounded-xl p-2
                flex gap-1.5 shadow-lg animate-slide-up z-50
              ">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id); setShowThemes(false) }}
                    title={t.name}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-[10px]',
                      theme === t.id
                        ? 'surface-3 text-accent ring-1 ring-[var(--accent)]'
                        : 'hover:surface-2 text-muted'
                    )}
                  >
                    <span className="text-base">{t.emoji}</span>
                    <span className="whitespace-nowrap">{t.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => setShowThemes(false)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full surface-3 border border-theme flex items-center justify-center"
                >
                  <X size={9} className="text-muted" />
                </button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <button className="icon-btn relative" aria-label="การแจ้งเตือน">
            <Bell size={17} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          </button>

          {/* Submit event */}
          <Link
            href="/submit"
            className="hidden sm:flex items-center gap-1.5 btn-accent text-[12px] py-1.5 px-3 ml-1"
          >
            <Plus size={14} />
            แจ้งงาน
          </Link>

          {/* Profile / Login */}
          <div className="relative">
            {user ? (
              <>
                <button
                  onClick={() => setShowUser(v => !v)}
                  className="w-7 h-7 rounded-full overflow-hidden border-2 flex items-center justify-center"
                  style={{ borderColor: 'var(--accent)', background: 'var(--accent-muted)' }}
                >
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                      {(user.email ?? 'U')[0].toUpperCase()}
                    </span>
                  )}
                </button>
                {showUser && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden shadow-lg z-50 animate-slide-up"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-[12px] font-medium text-primary truncate">
                        {user.user_metadata?.full_name ?? user.email}
                      </p>
                      <p className="text-[11px] text-muted truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setShowUser(false); signOut() }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-secondary hover:bg-[var(--surface-2)] transition-colors">
                      <LogOut size={14} /> ออกจากระบบ
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link href="/login"
                className="btn-accent text-[12px] py-1.5 px-3 flex items-center gap-1.5">
                <User size={13} /> Login
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden icon-btn ml-1"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="เมนู"
          >
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </header>

      {/* ── Mobile Dropdown Menu ── */}
      {mobileOpen && (
        <div className="md:hidden surface-1 border-b border-theme animate-slide-up z-40">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-[14px] border-b border-theme transition-colors',
                pathname === href ? 'text-accent surface-3' : 'text-secondary hover:surface-2'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          <Link
            href="/submit"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-[14px] text-accent"
          >
            <Plus size={16} />
            แจ้งงาน
          </Link>
        </div>
      )}

      {/* ── Mobile Bottom Nav ── */}
      <nav className="
        md:hidden fixed bottom-0 left-0 right-0 z-50
        surface-1 border-t border-theme
        flex items-center
        pb-safe
      ">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors',
              pathname === href ? 'text-accent' : 'text-muted'
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
        <Link
          href="/submit"
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] text-muted"
        >
          <Plus size={20} />
          แจ้งงาน
        </Link>
      </nav>

      <style jsx global>{`
        .icon-btn {
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          background: transparent;
          border: none;
          transition: background .15s, color .15s;
        }
        .icon-btn:hover {
          background: var(--surface-2);
          color: var(--text-primary);
        }
        .text-secondary  { color: var(--text-secondary); }
        .text-primary    { color: var(--text-primary); }
        .text-muted      { color: var(--text-muted); }
        .text-accent     { color: var(--accent); }
        .surface-1 { background: var(--surface-1); }
        .surface-2 { background: var(--surface-2); }
        .surface-3 { background: var(--surface-3); }
        .border-theme { border-color: var(--border); }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 8px); }
      `}</style>
    </>
  )
}
