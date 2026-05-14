'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck, Clock, Music, Calendar, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface Notif {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
  metadata: any
}

const TYPE_ICON: Record<string, any> = {
  pending_submission: Clock,
  approved:           CheckCheck,
  rejected:           X,
  system:             Info,
}

const TYPE_COLOR: Record<string, string> = {
  pending_submission: '#EF9F27',
  approved:           '#1D9E75',
  rejected:           '#E24B4A',
  system:             'var(--accent)',
}

export default function NotificationBell() {
  const [open,   setOpen]   = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [count,  setCount]  = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const sb = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!user) return
    load()

    // Realtime subscribe
    const ch = sb.channel('notif-' + user.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        setNotifs(prev => [payload.new as Notif, ...prev])
        setCount(c => c + 1)
      })
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [user])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function load() {
    const { data } = await sb.from('notifications')
      .select('*').eq('user_id', user!.id)
      .order('created_at', { ascending: false }).limit(20)
    setNotifs(data || [])
    setCount((data || []).filter(n => !n.is_read).length)
  }

  async function markAllRead() {
    await sb.from('notifications')
      .update({ is_read: true })
      .eq('user_id', user!.id).eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setCount(0)
  }

  async function clickNotif(n: Notif) {
    if (!n.is_read) {
      await sb.from('notifications').update({ is_read: true }).eq('id', n.id)
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      setCount(c => Math.max(0, c - 1))
    }
    if (n.link) { setOpen(false); router.push(n.link) }
  }

  function timeAgo(dt: string) {
    const d = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
    if (d < 60)   return 'เมื่อกี้'
    if (d < 3600) return `${Math.floor(d/60)} นาทีที่แล้ว`
    if (d < 86400)return `${Math.floor(d/3600)} ชม.ที่แล้ว`
    return `${Math.floor(d/86400)} วันที่แล้ว`
  }

  if (!user) return null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(v => !v) }}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
        style={{ background: open ? 'var(--accent-muted)' : 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <Bell size={16} style={{ color: open ? 'var(--accent)' : 'var(--text-muted)' }} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#E24B4A', color: 'white',
            fontSize: 9, fontWeight: 700, minWidth: 16, height: 16,
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}>{count > 9 ? '9+' : count}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 320, maxHeight: 440,
          background: 'var(--surface-1)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,.15)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 100,
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>การแจ้งเตือน</span>
            {count > 0 && (
              <button onClick={markAllRead}
                style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none' }}>
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                ไม่มีการแจ้งเตือน
              </div>
            ) : notifs.map(n => {
              const Icon  = TYPE_ICON[n.type] ?? Info
              const color = TYPE_COLOR[n.type] ?? 'var(--accent)'
              return (
                <div key={n.id}
                  onClick={() => clickNotif(n)}
                  style={{
                    padding: '12px 16px', cursor: n.link ? 'pointer' : 'default',
                    borderBottom: '1px solid var(--border)',
                    background: n.is_read ? 'transparent' : 'var(--accent-muted)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--accent-muted)')}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: color + '18',
                  }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 2px', lineHeight: 1.4 }}>{n.title}</p>
                    {n.body && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>}
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0', opacity: .6 }}>{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
