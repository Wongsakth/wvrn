'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { cn } from '@/lib/utils'
import {
  Shield, Music, MapPin, CalendarDays,
  ClipboardList, ChevronRight, Menu, X,
  LayoutDashboard, Tag, FileUp, LayoutList, Building2, Users,
} from 'lucide-react'

const MENU = [
  {
    group: 'ภาพรวม',
    items: [
      { href: '/admin',         label: 'Dashboard',      icon: LayoutDashboard, badge: null },
      { href: '/admin/pending', label: 'รออนุมัติ',       icon: ClipboardList,   badge: 2   },
    ],
  },
  {
    group: 'จัดการข้อมูล',
    items: [
      { href: '/admin/events',     label: 'จัดการ Event',   icon: CalendarDays,  badge: null },
      { href: '/admin/artists',    label: 'จัดการศิลปิน',   icon: Music,         badge: null },
      { href: '/admin/labels',     label: 'ค่ายเพลง',       icon: Building2,     badge: null },
      { href: '/admin/venues',     label: 'จัดการสถานที่',  icon: MapPin,        badge: null },
      { href: '/admin/categories', label: 'Category',       icon: LayoutList,    badge: null },
      { href: '/admin/genres',     label: 'แนวเพลง',        icon: Tag,           badge: null },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/admin/users',       label: 'จัดการ Users',      icon: Users,   badge: null },
      { href: '/admin/permissions', label: 'Permission Matrix', icon: Shield,  badge: null },
    ],
  },
    items: [
      { href: '/admin/import-artists', label: 'Import ศิลปิน', icon: FileUp, badge: null },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        <div className="flex gap-6">

          {/* ── Sidebar — Desktop ── */}
          <aside className="hidden md:flex flex-col gap-1 w-52 shrink-0">

            {/* Admin badge */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-2"
              style={{ background: 'var(--accent-muted)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--accent)' }}
              >
                <Shield size={14} style={{ color: 'var(--surface-0)' }} />
              </div>
              <div>
                <div className="text-[12px] font-medium text-accent">Admin Panel</div>
                <div className="text-[10px] text-muted">WVRN Dashboard</div>
              </div>
            </div>

            {/* Menu groups */}
            {MENU.map(group => (
              <div key={group.group} className="mb-3">
                <div className="text-[9px] font-medium text-muted uppercase tracking-widest px-3 mb-1">
                  {group.group}
                </div>
                {group.items.map(item => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all mb-0.5',
                        active
                          ? 'font-medium'
                          : 'text-secondary hover:text-primary'
                      )}
                      style={active ? {
                        background: 'var(--accent-muted)',
                        color: 'var(--accent)',
                      } : {}}
                    >
                      <item.icon size={15} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}
                        >
                          {item.badge}
                        </span>
                      )}
                      {active && <ChevronRight size={12} style={{ color: 'var(--accent)' }} />}
                    </Link>
                  )
                })}
              </div>
            ))}
          </aside>

          {/* ── Mobile sidebar toggle ── */}
          <div className="md:hidden w-full mb-4">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] w-full"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
            >
              <Shield size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-primary font-medium flex-1 text-left">Admin Menu</span>
              {sidebarOpen ? <X size={15} className="text-muted" /> : <Menu size={15} className="text-muted" />}
            </button>

            {sidebarOpen && (
              <div
                className="mt-2 rounded-xl overflow-hidden animate-slide-up"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
              >
                {MENU.map(group => (
                  <div key={group.group}>
                    <div className="text-[9px] font-medium text-muted uppercase tracking-widest px-4 pt-3 pb-1">
                      {group.group}
                    </div>
                    {group.items.map(item => {
                      const active = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-[13px] transition-colors"
                          style={{
                            borderTop: '1px solid var(--border)',
                            background: active ? 'var(--accent-muted)' : undefined,
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          <item.icon size={15} />
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0">
            {children}
          </main>

        </div>
      </div>
    </div>
  )
}
