'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import AdminGuard from '@/components/AdminGuard'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import {
  Shield, Music, MapPin, CalendarDays,
  ClipboardList, ChevronRight, Menu, X,
  LayoutDashboard, Tag, FileUp, LayoutList, Building2, Users, Image as ImageIcon, Flag, BarChart2,
} from 'lucide-react'

const MENU = [
  {
    group: 'ภาพรวม',
    items: [
      { href: '/admin',            label: 'Dashboard',      icon: LayoutDashboard, badge: null },
      { href: '/admin/pending',    label: 'รออนุมัติ',     icon: ClipboardList,   badge: null },
      { href: '/admin/analytics',  label: 'Analytics',      icon: BarChart2,       badge: null },
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
      { href: '/admin/audit-logs',    label: 'Audit Logs',        icon: ClipboardList, badge: null },
      { href: '/admin/reported-photos', label: 'รูปที่ถูก Report',  icon: Flag,          badge: 'reported' },
    ],
  },
  {
    group: 'นำเข้าข้อมูล',
    items: [
      { href: '/admin/import-artists', label: 'Import ศิลปิน',   icon: FileUp,  badge: null },
      { href: '/admin/import-poster',  label: 'Import โปสเตอร์', icon: ImageIcon, badge: null },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [pendingCount,  setPendingCount]  = useState<number>(0)
  const [reportedCount, setReportedCount] = useState<number>(0)
  const sb = createClient()

  useEffect(() => {
    sb.from('event_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0))
    sb.from('event_photos')
      .select('id', { count: 'exact', head: true })
      .gt('report_count', 0)
      .eq('is_hidden', false)
      .then(({ count }) => setReportedCount(count ?? 0))
  }, [])

  return (
    <AdminGuard>
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 md:pb-8">

        {/* ── Mobile menu toggle (outside flex row) ── */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] w-full"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <Shield size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-primary font-medium flex-1 text-left">Admin Menu</span>
            {sidebarOpen ? <X size={15} className="text-muted" /> : <Menu size={15} className="text-muted" />}
          </button>

          {sidebarOpen && (
            <div className="mt-2 rounded-xl overflow-hidden"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
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
                        }}>
                        <item.icon size={15} />
                        <span className="flex-1">{item.label}</span>
                        {item.href === '/admin/pending' && pendingCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}>
                            {pendingCount}
                          </span>
                        )}
                        {item.href === '/admin/reported-photos' && reportedCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: '#E24B4A', color: 'white' }}>
                            {reportedCount}
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

        {/* ── Desktop: Sidebar + Content side by side ── */}
        <div className="flex gap-6">

          {/* Sidebar — Desktop only */}
          <aside className="hidden md:flex flex-col gap-1 w-52 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-2"
              style={{ background: 'var(--accent-muted)', border: '1px solid var(--border)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--accent)' }}>
                <Shield size={14} style={{ color: 'var(--surface-0)' }} />
              </div>
              <div>
                <div className="text-[12px] font-medium text-accent">Admin Panel</div>
                <div className="text-[10px] text-muted">WVRN Dashboard</div>
              </div>
            </div>

            {MENU.map(group => (
              <div key={group.group} className="mb-3">
                <div className="text-[9px] font-medium text-muted uppercase tracking-widest px-3 mb-1">
                  {group.group}
                </div>
                {group.items.map(item => {
                  const active = pathname === item.href
                  return (
                    <Link key={item.href} href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all mb-0.5',
                        active ? 'font-medium' : 'text-secondary hover:text-primary'
                      )}
                      style={active ? { background: 'var(--accent-muted)', color: 'var(--accent)' } : {}}>
                      <item.icon size={15} />
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/admin/pending' && pendingCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}>
                          {pendingCount}
                        </span>
                      )}
                      {item.href === '/admin/reported-photos' && reportedCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: '#E24B4A', color: 'white' }}>
                          {reportedCount}
                        </span>
                      )}
                      {active && <ChevronRight size={12} style={{ color: 'var(--accent)' }} />}
                    </Link>
                  )
                })}
              </div>
            ))}
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0 w-full">
            {children}
          </main>

        </div>
      </div>
    </div>
    </AdminGuard>
  )
}
