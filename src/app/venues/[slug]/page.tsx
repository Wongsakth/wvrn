'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  MapPin, Clock, ChevronLeft, ChevronRight,
  Loader2, Music, ExternalLink, Heart,
  Users, Calendar, Ticket,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function VenueDetailPage() {
  const { slug }  = useParams<{ slug: string }>()
  const router    = useRouter()
  const { user }  = useAuth()
  const sb        = createClient()

  const [venue,    setVenue]    = useState<any>(null)
  const [events,   setEvents]   = useState<any[]>([])
  const [pastEvents, setPastEvents] = useState<any[]>([])
  const [followed, setFollowed] = useState(false)
  const [followers, setFollowers] = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    if (!slug) return
    async function load() {
      setLoading(true)
      try {
        const decoded = decodeURIComponent(slug as string)
        const isUuid  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)

        const { data: venueData, error } = isUuid
          ? await sb.from('venues').select('*').eq('id', decoded).single()
          : await sb.from('venues').select('*').eq('slug', decoded).single()

        if (error || !venueData) { setVenue(null); setLoading(false); return }

        setVenue(venueData)

        const today = new Date().toISOString().slice(0, 10)

        // Load upcoming + past events
        const [upRes, pastRes, followRes] = await Promise.all([
          sb.from('events')
            .select('id,title,slug,start_date,start_time,is_free,ticket_price_min,ticket_price_max,ticket_url,poster_url,status,event_artists(artist:artists(id,name,slug,image_url))')
            .eq('venue_id', venueData.id)
            .is('deleted_at', null)
            .gte('start_date', today)
            .order('start_date', { ascending: true }),
          sb.from('events')
            .select('id,title,slug,start_date,start_time,is_free,ticket_price_min,ticket_price_max,poster_url,status,event_artists(artist:artists(id,name,slug,image_url))')
            .eq('venue_id', venueData.id)
            .is('deleted_at', null)
            .lt('start_date', today)
            .order('start_date', { ascending: false })
            .limit(20),
          sb.from('venue_follows').select('user_id', { count: 'exact' }).eq('venue_id', venueData.id),
        ])

        setEvents((upRes.data || []).map((ev: any) => ({
          ...ev,
          artists: ev.event_artists?.map((ea: any) => ea.artist).filter(Boolean) ?? [],
        })))
        setPastEvents((pastRes.data || []).map((ev: any) => ({
          ...ev,
          artists: ev.event_artists?.map((ea: any) => ea.artist).filter(Boolean) ?? [],
        })))
        setFollowers(followRes.count ?? 0)

      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [slug])

  // Check follow
  useEffect(() => {
    if (!user || !venue) { setFollowed(false); return }
    sb.from('venue_follows')
      .select('venue_id')
      .eq('user_id', user.id)
      .eq('venue_id', venue.id)
      .maybeSingle()
      .then(({ data }) => setFollowed(!!data))
  }, [user, venue?.id])

  async function toggleFollow() {
    if (!user) { toast.error('กรุณา Login ก่อนครับ'); window.location.href = '/login'; return }
    const prev = followed
    setFollowed(!prev)
    setFollowers(v => prev ? v - 1 : v + 1)
    try {
      if (prev) {
        await sb.from('venue_follows').delete().eq('user_id', user.id).eq('venue_id', venue.id)
        toast.success(`เลิกติดตาม ${venue.name}`)
      } else {
        await sb.from('venue_follows').insert({ user_id: user.id, venue_id: venue.id })
        toast.success(`ติดตาม ${venue.name} แล้ว 📍`)
      }
    } catch {
      setFollowed(prev)
      setFollowers(v => prev ? v + 1 : v - 1)
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  if (loading) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    </div>
  )

  if (!venue) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-[15px] font-medium text-primary mb-2">ไม่พบสถานที่นี้</p>
        <button onClick={() => router.back()} className="text-[13px] text-accent hover:underline">← กลับ</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />

      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Back */}
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] text-muted hover:text-primary transition-colors mb-5">
          <ChevronLeft size={16} /> กลับ
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Venue Info ── */}
          <div className="lg:col-span-1 flex flex-col gap-4">

            {/* Venue card */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

              {/* Cover */}
              <div className="h-32 flex items-center justify-center relative"
                style={{ background: 'linear-gradient(135deg, var(--accent-muted), var(--surface-2))' }}>
                {venue.image_url ? (
                  <img src={venue.image_url} alt={venue.name}
                    className="w-full h-full object-cover" />
                ) : (
                  <MapPin size={40} style={{ color: 'var(--accent)', opacity: 0.4 }} />
                )}
              </div>

              <div className="p-4">
                <h1 className="text-[20px] font-medium text-primary mb-1">{venue.name}</h1>

                {/* Province */}
                {venue.province && (
                  <div className="flex items-center gap-1.5 text-[13px] text-muted mb-3">
                    <MapPin size={13} />
                    {venue.province}
                    {venue.address && <span className="truncate">· {venue.address}</span>}
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-3 mb-4">
                  {venue.capacity && (
                    <div className="flex items-center gap-1.5 text-[12px] text-muted">
                      <Users size={12} />
                      {venue.capacity.toLocaleString()} คน
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[12px] text-muted">
                    <Heart size={12} />
                    {followers.toLocaleString()} ติดตาม
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-muted">
                    <Calendar size={12} />
                    {events.length} งาน
                  </div>
                </div>

                {/* Follow button */}
                <button onClick={toggleFollow}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium transition-all mb-3"
                  style={{
                    background: followed ? 'var(--accent-muted)' : 'var(--accent)',
                    color:      followed ? 'var(--accent)' : 'var(--surface-0)',
                    border:     followed ? '1px solid var(--accent)' : 'none',
                  }}>
                  <Heart size={15} style={{ fill: followed ? 'var(--accent)' : 'white' }} />
                  {followed ? 'ติดตามอยู่' : 'ติดตาม'}
                </button>

                {/* Maps link */}
                {venue.maps_url && (
                  <a href={venue.maps_url} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] transition-all"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    <ExternalLink size={13} />
                    เปิดใน Google Maps
                  </a>
                )}
              </div>
            </div>

          </div>

          {/* ── Right: Events ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Upcoming */}
            <div className="flex items-center gap-2 mb-1">
              <Music size={16} style={{ color: 'var(--accent)' }} />
              <h2 className="text-[16px] font-medium text-primary">งานที่กำลังจะมา</h2>
              <span className="text-[12px] text-muted">{events.length} งาน</span>
            </div>

            {events.length === 0 ? (
              <div className="rounded-xl p-10 text-center"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <Music size={32} className="mx-auto mb-3 text-muted" />
                <p className="text-[14px] font-medium text-primary">ยังไม่มีงานที่กำลังจะมา</p>
                <p className="text-[12px] text-muted mt-1">ติดตามเพื่อรับแจ้งเตือนเมื่อมีงานใหม่</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {events.map(ev => (
                  <EventRow key={ev.id} ev={ev} />
                ))}
              </div>
            )}

            {/* Past events */}
            {pastEvents.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowPast(v => !v)}
                  className="flex items-center gap-2 text-[13px] text-muted hover:text-primary transition-colors mb-3">
                  <ChevronRight size={14} className={showPast ? 'rotate-90 transition-transform' : 'transition-transform'} />
                  งานที่ผ่านมา ({pastEvents.length})
                </button>

                {showPast && (
                  <div className="flex flex-col gap-3">
                    {pastEvents.map(ev => (
                      <EventRow key={ev.id} ev={ev} isPast />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EventRow({ ev, isPast = false }: { ev: any; isPast?: boolean }) {
  return (
    <div
      onClick={() => { window.location.href = `/events/${ev.slug || ev.id}` }}
      className="rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        opacity: isPast ? 0.6 : 1,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
      <div className="flex">

        {/* Date */}
        <div className="flex flex-col items-center justify-center px-4 py-4 shrink-0"
          style={{ background: isPast ? 'var(--surface-2)' : 'var(--accent-muted)', borderRight: '1px solid var(--border)', minWidth: 60 }}>
          <span className="text-[20px] font-medium leading-none"
            style={{ color: isPast ? 'var(--text-muted)' : 'var(--accent)' }}>
            {format(parseISO(ev.start_date), 'd')}
          </span>
          <span className="text-[9px] uppercase mt-0.5"
            style={{ color: isPast ? 'var(--text-muted)' : 'var(--accent)', opacity: .7 }}>
            {format(parseISO(ev.start_date), 'MMM', { locale: th })}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 px-4 py-3 min-w-0">
          <p className="text-[14px] font-medium text-primary mb-1 line-clamp-1">{ev.title}</p>
          {ev.artists?.length > 0 && (
            <p className="text-[11px] text-muted mb-1 line-clamp-1">
              {ev.artists.map((a: any) => a.name).join(' · ')}
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {ev.start_time && (
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <Clock size={10} />{ev.start_time.slice(0, 5)} น.
              </span>
            )}
          </div>
        </div>

        {/* Price + arrow */}
        <div className="flex flex-col items-end justify-between px-4 py-3 shrink-0"
          style={{ borderLeft: '1px solid var(--border)' }}>
          <span className="text-[11px] font-medium"
            style={{ color: ev.is_free ? '#5DCAA5' : 'var(--accent)' }}>
            {formatPrice(ev)}
          </span>
          <ChevronRight size={14} className="text-muted" />
        </div>

      </div>
    </div>
  )
}
