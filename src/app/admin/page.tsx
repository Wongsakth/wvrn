'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Loader2, CheckCircle2, Clock, Music, MapPin, Calendar, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats,   setStats]   = useState({ pending: 0, events: 0, artists: 0, venues: 0 })
  const [pending, setPending] = useState<any[]>([])
  const [recent,  setRecent]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const sb = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [pendRes, evRes, arRes, vRes, recentRes] = await Promise.all([
        sb.from('event_submissions').select('*').eq('status','pending').order('created_at', { ascending: true }),
        sb.from('events').select('id', { count: 'exact', head: true }),
        sb.from('artists').select('id', { count: 'exact', head: true }),
        sb.from('venues').select('id', { count: 'exact', head: true }),
        sb.from('events').select('id,title,start_date,province,venue:venues(name)').order('created_at', { ascending: false }).limit(5),
      ])
      setPending(pendRes.data || [])
      setRecent(recentRes.data || [])
      setStats({
        pending: (pendRes.data || []).length,
        events:  evRes.count  ?? 0,
        artists: arRes.count  ?? 0,
        venues:  vRes.count   ?? 0,
      })
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function approve(sub: any) {
    try {
      const { data: ev, error } = await sb.from('events').insert({
        title:            sub.title,
        description:      sub.description,
        start_date:       sub.event_date || sub.start_date,
        start_time:       sub.start_time,
        is_free:          !sub.ticket_price,
        ticket_price_min: sub.ticket_price ? Number(String(sub.ticket_price).replace(/,/g,'')) : null,
        ticket_url:       sub.ticket_url,
        event_type:       'concert',
        status:           'confirmed',
        province:         sub.province ?? 'กรุงเทพมหานคร',
      }).select().single()
      if (error) throw error

      if (sub.artist_name && ev) {
        const names = sub.artist_name.split(/[,\/x&+]/).map((s: string) => s.trim()).filter(Boolean)
        for (let i = 0; i < names.length; i++) {
          const { data: found } = await sb.from('artists')
            .select('id').or(`name.ilike.%${names[i]}%,name_en.ilike.%${names[i]}%`).limit(1).single()
          if (found) await sb.from('event_artists').insert({ event_id: ev.id, artist_id: found.id, sort_order: i+1, is_headliner: i===0 })
        }
      }

      await sb.from('event_submissions').update({ status: 'approved' }).eq('id', sub.id)
      toast.success(`อนุมัติ "${sub.title}" แล้ว`)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  async function reject(sub: any) {
    await sb.from('event_submissions').update({ status: 'rejected' }).eq('id', sub.id)
    toast.success(`ปฏิเสธแล้ว`)
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-muted" />
    </div>
  )

  return (
    <div className="flex flex-col gap-6">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'รออนุมัติ',     value: stats.pending,  accent: true,  href: '/admin/pending'  },
          { label: 'Event ทั้งหมด', value: stats.events,   accent: false, href: '/admin/events'   },
          { label: 'ศิลปิน',        value: stats.artists,  accent: false, href: '/admin/artists'  },
          { label: 'สถานที่',       value: stats.venues,   accent: false, href: '/admin/venues'   },
        ].map(s => (
          <div key={s.label} onClick={() => router.push(s.href)}
            className="rounded-xl p-4 cursor-pointer transition-all hover:opacity-80"
            style={{ background: 'var(--surface-1)', border: `1px solid ${s.accent && s.value > 0 ? 'var(--accent)' : 'var(--border)'}` }}>
            <div className="text-[24px] font-medium"
              style={{ color: s.accent && s.value > 0 ? 'var(--accent)' : 'var(--text-primary)' }}>
              {s.value}
            </div>
            <div className="text-[11px] text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending submissions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-medium text-primary flex items-center gap-2">
            รออนุมัติ
            {pending.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}>
                {pending.length}
              </span>
            )}
          </h2>
          {pending.length > 0 && (
            <button onClick={() => router.push('/admin/pending')}
              className="text-[12px] flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              ดูทั้งหมด <ChevronRight size={12} />
            </button>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="rounded-xl p-8 text-center"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <CheckCircle2 size={32} className="mx-auto mb-2" style={{ color: '#1D9E75' }} />
            <p className="text-[13px] text-muted">ไม่มีรายการรออนุมัติ</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.slice(0,3).map(sub => (
              <div key={sub.id} className="rounded-xl overflow-hidden"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <div className="px-4 py-2 flex items-center gap-2"
                  style={{ background: 'rgba(186,117,23,.08)', borderBottom: '1px solid var(--border)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-[11px] font-medium" style={{ color: '#EF9F27' }}>รอตรวจสอบ</span>
                  <span className="text-[11px] text-muted ml-auto">
                    {format(parseISO(sub.created_at), 'd MMM HH:mm', { locale: th })}
                    {sub.submitted_by && ` · ${sub.submitted_by.slice(0,8)}...`}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-[15px] font-medium text-primary mb-3">{sub.title}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[12px] text-muted mb-4">
                    {sub.artist_name && <span className="flex items-center gap-1.5"><Music size={11}/>{sub.artist_name}</span>}
                    {sub.venue_name  && <span className="flex items-center gap-1.5"><MapPin size={11}/>{sub.venue_name}</span>}
                    {(sub.event_date || sub.start_date) && (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={11}/>
                        {format(parseISO(sub.event_date || sub.start_date), 'd MMM yyyy', { locale: th })}
                      </span>
                    )}
                    {sub.province && <span className="flex items-center gap-1.5"><MapPin size={11}/>{sub.province}</span>}
                    {sub.ticket_price && <span>฿{sub.ticket_price}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approve(sub)}
                      className="flex-1 py-2 rounded-lg text-[13px] font-medium flex items-center justify-center gap-1.5 transition-all"
                      style={{ background: '#1D9E75', color: 'white' }}>
                      <CheckCircle2 size={14}/> อนุมัติ
                    </button>
                    <button onClick={() => reject(sub)}
                      className="flex-1 py-2 rounded-lg text-[13px] font-medium flex items-center justify-center gap-1.5 transition-all"
                      style={{ background: 'rgba(226,75,74,.1)', color: '#E24B4A', border: '1px solid rgba(226,75,74,.2)' }}>
                      ปฏิเสธ
                    </button>
                    <button onClick={() => router.push('/admin/pending')}
                      className="px-3 py-2 rounded-lg text-[13px] transition-all"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      รายละเอียด
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-medium text-primary">Event ล่าสุด</h2>
          <button onClick={() => router.push('/admin/events')}
            className="text-[12px] flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            ดูทั้งหมด <ChevronRight size={12} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {recent.length === 0 ? (
            <p className="text-[13px] text-muted py-4 text-center">ยังไม่มี Event</p>
          ) : recent.map(ev => (
            <div key={ev.id} onClick={() => router.push(`/events/${\1.slug || \1.id}`)}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div className="w-9 h-9 rounded-lg shrink-0 flex flex-col items-center justify-center"
                style={{ background: 'var(--accent-muted)' }}>
                <span className="text-[13px] font-medium leading-none" style={{ color: 'var(--accent)' }}>
                  {format(parseISO(ev.start_date), 'd')}
                </span>
                <span className="text-[8px] uppercase" style={{ color: 'var(--accent)', opacity:.7 }}>
                  {format(parseISO(ev.start_date), 'MMM', { locale: th })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-primary truncate">{ev.title}</p>
                <p className="text-[11px] text-muted truncate">{ev.venue?.name ?? ev.province}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
