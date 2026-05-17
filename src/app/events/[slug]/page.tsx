'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  MapPin, Clock, Heart, Bookmark, CalendarPlus, Share2,
  ExternalLink, Ticket, ChevronLeft, Users, CalendarRange,
  Instagram, Facebook, Globe, Music, Loader2, AlertCircle,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import EventLineupTimeline from '@/components/events/EventLineupTimeline'
import TicketSaleWidget from '@/components/events/TicketSaleWidget'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { cn, formatPrice, statusLabel, genreTagClass, googleCalendarUrl } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const id = slug  // slug อาจเป็น uuid หรือ slug จริง
  const router   = useRouter()
  const [event,      setEvent]      = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [liked,      setLiked]      = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [myType,     setMyType]     = useState<'interested'|'going'|null>(null)
  const [interested, setInterested] = useState(0)
  const [going,      setGoing]      = useState(0)
  const { user } = useAuth()
  const sb = createClient()

  useEffect(() => {
    if (!id || id === 'undefined') { setLoading(false); return }
    async function load() {
      const decoded = decodeURIComponent(id)
      const isUuid  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)

      const select = `*, venue:venues(*), event_artists(sort_order, is_headliner, start_time, artist:artists(*))`

      let data: any = null

      if (isUuid) {
        const res = await sb.from('events').select(select).eq('id', decoded).single()
        data = res.data
      } else {
        // ลอง slug ตรงๆ ก่อน
        const res1 = await sb.from('events').select(select).eq('slug', decoded).single()
        data = res1.data
        // ถ้าไม่เจอ ลอง ilike (case-insensitive)
        if (!data) {
          const res2 = await sb.from('events').select(select).ilike('slug', decoded).single()
          data = res2.data
        }
      }

      if (!data) { setLoading(false); return }
      if (!data) { setLoading(false); return }

      // เรียงศิลปินตาม sort_order แล้วแนบ start_time ไปด้วย
      const sortedArtists = [...(data.event_artists ?? [])]
        .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
        .map(ea => ({ ...ea.artist, artist_time: ea.start_time, is_headliner: ea.is_headliner }))

      setEvent({ ...data, artists: sortedArtists })

      // Load social proof counts
      const { data: counts } = await sb
        .from('event_interactions')
        .select('type')
        .eq('event_id', data.id)
      setInterested((counts || []).filter((r: any) => r.type === 'interested').length)
      setGoing((counts || []).filter((r: any) => r.type === 'going').length)

      setLoading(false)
    }
    load()
  }, [id])

  // Load my interaction
  useEffect(() => {
    if (!user || !event) return
    sb.from('event_interactions')
      .select('type')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setMyType(data?.type ?? null))
  }, [user, event?.id])

  async function toggleInteraction(type: 'interested' | 'going') {
    if (!user) { toast.error('กรุณา Login ก่อนครับ'); window.location.href = '/login'; return }
    const prev = myType
    const isSame = prev === type

    // optimistic update
    if (prev === 'interested') setInterested(v => v - 1)
    if (prev === 'going')      setGoing(v => v - 1)
    if (!isSame && type === 'interested') setInterested(v => v + 1)
    if (!isSame && type === 'going')      setGoing(v => v + 1)
    setMyType(isSame ? null : type)

    try {
      if (isSame) {
        await sb.from('event_interactions').delete()
          .eq('event_id', event.id).eq('user_id', user.id)
      } else {
        await sb.from('event_interactions').upsert({
          event_id: event.id, user_id: user.id, type,
        }, { onConflict: 'event_id,user_id' })
      }
    } catch {
      // rollback
      setMyType(prev)
      if (prev === 'interested') setInterested(v => v + 1)
      if (prev === 'going')      setGoing(v => v + 1)
      if (!isSame && type === 'interested') setInterested(v => v - 1)
      if (!isSame && type === 'going')      setGoing(v => v - 1)
      toast.error('เกิดข้อผิดพลาด')
    }
  }


  // Build OG image URL
  const ogImageUrl = event ? (() => {
    const base   = process.env.NEXT_PUBLIC_SITE_URL || 'https://wvrn.vercel.app'
    const params = new URLSearchParams({
      title:    event.title,
      artists:  event.artists?.slice(0,3).map((a: any) => a.name_en || a.name).join(' · ') ?? '',
      date:     event.start_date ? new Date(event.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
      venue:    event.venue?.name ?? '',
      province: event.province ?? '',
      ...(event.poster_url ? { poster: event.poster_url } : {}),
    })
    return `${base}/api/og?${params}`
  })() : ''

  // inject OG meta tags
  useEffect(() => {
    if (!event || !ogImageUrl) return
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://wvrn.vercel.app'
    const url  = `${base}/events/${event.slug || event.id}`
    const desc = [
      event.artists?.map((a: any) => a.name_en || a.name).join(', '),
      event.venue?.name,
      event.start_date ? new Date(event.start_date).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '',
    ].filter(Boolean).join(' · ')

    const setMeta = (prop: string, val: string, attr = 'property') => {
      let el = document.querySelector(`meta[${attr}="${prop}"]`) as HTMLMetaElement
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el) }
      el.content = val
    }

    document.title = `${event.title} | WVRN`
    setMeta('og:title',       event.title)
    setMeta('og:description', desc)
    setMeta('og:image',       ogImageUrl)
    setMeta('og:url',         url)
    setMeta('og:type',        'website')
    setMeta('og:site_name',   'WVRN')
    setMeta('twitter:card',   'summary_large_image', 'name')
    setMeta('twitter:title',  event.title, 'name')
    setMeta('twitter:image',  ogImageUrl, 'name')
  }, [event, ogImageUrl])

    if (loading) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    </div>
  )

  if (!event) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-[15px] font-medium text-primary mb-2">ไม่พบ Event นี้</p>
        <Link href="/" className="text-[13px] text-accent hover:underline">← กลับหน้าหลัก</Link>
      </div>
    </div>
  )

  const startDate = parseISO(event.start_date)
  const endDate   = event.end_date ? parseISO(event.end_date) : null
  const isMulti   = event.is_multi_day && endDate
  const dayCount  = isMulti ? differenceInDays(endDate!, startDate) + 1 : 1
  const price     = formatPrice(event)
  const status    = statusLabel(event.status)

  function handleShare() {
    const url = window.location.href
    if (navigator.share) navigator.share({ title: event.title, url })
    else { navigator.clipboard.writeText(url); toast.success('คัดลอก link แล้ว') }
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />

      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-6">

        {/* Back */}
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] text-muted hover:text-primary transition-colors mb-5">
          <ChevronLeft size={16} /> กลับ
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left / Main ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Poster / Header card */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

              {/* Poster image */}
              {event.poster_url && (
                <div className="w-full overflow-hidden rounded-t-2xl"
                  style={{ maxHeight: 480, background: 'var(--surface-2)' }}>
                  <img src={event.poster_url} alt={event.title}
                    className="w-full object-contain"
                    style={{ maxHeight: 480, display: 'block', margin: '0 auto' }} />
                </div>
              )}

              {/* No poster: colored header */}
              {!event.poster_url && (
                <div className="w-full h-32 flex items-center justify-center"
                  style={{ background: 'var(--accent-muted)' }}>
                  <Music size={40} style={{ color: 'var(--accent)', opacity: .4 }} />
                </div>
              )}

              <div className="p-5">
                {/* Social Proof */}
                {(interested > 0 || going > 0) && (
                  <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    {interested > 0 && (
                      <span className="flex items-center gap-1.5 text-[12px] text-secondary">
                        <Heart size={11} style={{ color: 'var(--accent)' }} />
                        <span className="font-medium text-primary">{interested.toLocaleString()}</span> สนใจ
                      </span>
                    )}
                    {interested > 0 && going > 0 && (
                      <span className="text-muted text-[12px]">·</span>
                    )}
                    {going > 0 && (
                      <span className="flex items-center gap-1.5 text-[12px] text-secondary">
                        <Users size={11} style={{ color: 'var(--accent)' }} />
                        <span className="font-medium" style={{ color: 'var(--accent)' }}>{going.toLocaleString()}</span> จะไป
                      </span>
                    )}
                  </div>
                )}

                {/* Tags */}
                <div className="flex gap-2 flex-wrap mb-3">
                  <span className={cn('tag', status.cls)}>{status.label}</span>
                  {isMulti && (
                    <span className="tag" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                      Multi-day Festival
                    </span>
                  )}
                  {event.genres?.map((g: string) => (
                    <span key={g} className={cn('tag', genreTagClass(g))}>{g}</span>
                  ))}
                </div>

                {/* Title */}
                <h1 className="text-[22px] font-medium text-primary leading-tight mb-3">
                  {event.title}
                </h1>

                {/* Date */}
                <div className="flex items-center gap-2 mb-2">
                  {isMulti
                    ? <CalendarRange size={15} style={{ color: 'var(--accent)' }} />
                    : <CalendarPlus  size={15} style={{ color: 'var(--accent)' }} />
                  }
                  <span className="text-[14px] font-medium text-primary">
                    {isMulti
                      ? `${format(startDate, 'd MMM', { locale: th })} – ${format(endDate!, 'd MMMM yyyy', { locale: th })} (${dayCount} วัน)`
                      : format(startDate, 'd MMMM yyyy', { locale: th })
                    }
                  </span>
                </div>

                {/* Time */}
                {event.start_time && !isMulti && (
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={15} className="text-muted" />
                    <span className="text-[14px] text-secondary">
                      {event.start_time.slice(0,5)} น.
                      {event.end_time && ` – ${event.end_time.slice(0,5)} น.`}
                    </span>
                  </div>
                )}
                {isMulti && (
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={15} className="text-muted" />
                    <span className="text-[14px] text-secondary">ทุกคืน เริ่ม 19:00 น.</span>
                  </div>
                )}

                {/* Venue */}
                {event.venue && (
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={15} className="text-muted" />
                    <span className="text-[14px] text-secondary">
                      {event.venue.name}
                      {event.venue.address && ` · ${event.venue.address}`}
                    </span>
                    {event.venue.maps_url && (
                      <a href={event.venue.maps_url} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] flex items-center gap-0.5 ml-auto"
                        style={{ color: 'var(--accent)' }}>
                        <MapPin size={10} /> Maps <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )}

                {/* Lineup count for multi-day */}
                {isMulti && event.lineup_count > 0 && (
                  <div className="flex items-center gap-2 mt-3 p-3 rounded-xl"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <Users size={15} style={{ color: 'var(--accent)' }} />
                    <span className="text-[13px] font-medium text-primary">
                      {event.lineup_count} ศิลปิน
                    </span>
                    <span className="text-[12px] text-muted">ตลอด {dayCount} วัน</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="rounded-xl p-4"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide mb-2">รายละเอียด</h2>
                <p className="text-[14px] text-secondary leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* Artists (single event) */}
            {!isMulti && event.artists?.length > 0 && (
              <div className="rounded-xl p-4"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide mb-3">ศิลปิน</h2>
                <div className="flex flex-col gap-2">
                  {event.artists.map((artist: any) => (
                    <ArtistRow key={artist.id} artist={artist} />
                  ))}
                </div>
              </div>
            )}

            {/* Lineup Timeline (multi-day) */}
            {isMulti && (
              <EventLineupTimeline
                eventId={event.id}
                startDate={event.start_date}
                endDate={event.end_date}
              />
            )}
          </div>

          {/* ── Right / Sidebar ── */}
          <div className="flex flex-col gap-4">

            {/* Action buttons */}
            {/* Social proof buttons */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => toggleInteraction('interested')}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                  style={{
                    background: myType === 'interested' ? 'var(--accent-muted)' : 'var(--surface-1)',
                    border: `1px solid ${myType === 'interested' ? 'var(--accent)' : 'var(--border)'}`,
                    color: myType === 'interested' ? 'var(--accent)' : 'var(--text-secondary)',
                  }}>
                  <Heart size={15} style={{ fill: myType === 'interested' ? 'var(--accent)' : 'none' }} />
                  สนใจ{interested > 0 ? ` · ${interested.toLocaleString()}` : ''}
                </button>
                <button
                  onClick={() => toggleInteraction('going')}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                  style={{
                    background: myType === 'going' ? 'var(--accent-muted)' : 'var(--surface-1)',
                    border: `1px solid ${myType === 'going' ? 'var(--accent)' : 'var(--border)'}`,
                    color: myType === 'going' ? 'var(--accent)' : 'var(--text-secondary)',
                  }}>
                  <Users size={15} />
                  จะไป{going > 0 ? ` · ${going.toLocaleString()}` : ''}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.open(googleCalendarUrl(event), '_blank')}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] transition-all btn-ghost">
                  <CalendarPlus size={15} /> ปฏิทิน
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] transition-all btn-ghost">
                  <Share2 size={15} /> แชร์
                </button>
              </div>
            </div>

            {/* Ticket widget */}
            <TicketSaleWidget event={{
              ticket_sale_start:    event.ticket_sale_start,
              ticket_sale_end:      event.ticket_sale_end,
              ticket_announce_date: event.ticket_announce_date,
              ticket_url:           event.ticket_url,
              ticket_price_min:     event.ticket_price_min,
              ticket_price_max:     event.ticket_price_max,
              is_free:              event.is_free,
              title:                event.title,
              start_date:           event.start_date,
            }} />

            {/* Buy ticket CTA — แสดงตลอดถ้ามี ticket_url */}
            {event.ticket_url && !event.is_free && (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-[15px] font-medium transition-all"
                style={{ background: 'var(--accent)', color: 'white' }}>
                <Ticket size={18} />
                ซื้อบัตร
                {event.ticket_price_min && (
                  <span className="text-[12px] opacity-80 ml-1">
                    ฿{Number(event.ticket_price_min).toLocaleString()}
                    {event.ticket_price_max && event.ticket_price_max !== event.ticket_price_min
                      ? ` – ฿${Number(event.ticket_price_max).toLocaleString()}`
                      : ''}
                  </span>
                )}
              </a>
            )}

            {/* Venue map card — Style C */}
            {event.venue && (
              <div className="rounded-xl overflow-hidden"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <div className="px-4 py-3 flex items-center gap-2"
                  style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  <MapPin size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-[12px] font-medium text-primary">สถานที่</span>
                </div>
                <div className="p-4">
                  {/* Venue image — Style C */}
                  {event.venue.image_url && (
                    <div className="relative rounded-xl overflow-hidden mb-3"
                      style={{ height: 110 }}>
                      <img
                        src={event.venue.image_url}
                        alt={event.venue.name}
                        className="w-full h-full object-cover"
                      />
                      {event.venue.maps_url && (
                        <a
                          href={event.venue.maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]"
                          style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                          <ExternalLink size={11} /> Maps
                        </a>
                      )}
                    </div>
                  )}

                  {/* Venue name + address */}
                  <div className="flex items-start gap-2">
                    <MapPin size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-primary leading-snug">{event.venue.name}</p>
                      {event.venue.address && (
                        <p className="text-[12px] text-muted mt-0.5">{event.venue.address}</p>
                      )}
                    </div>
                  </div>

                  {/* Maps button — แสดงเฉพาะถ้าไม่มีรูป (มีรูปจะใช้ overlay แทน) */}
                  {!event.venue.image_url && event.venue.maps_url && (
                    <a href={event.venue.maps_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] btn-ghost w-full mt-3">
                      <ExternalLink size={13} /> เปิดใน Google Maps
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="rounded-xl p-3 flex items-start gap-2"
              style={{ background: 'rgba(186,117,23,.06)', border: '1px solid rgba(186,117,23,.15)' }}>
              <AlertCircle size={13} style={{ color: '#EF9F27', flexShrink: 0, marginTop: 1 }} />
              <p className="text-[11px] leading-relaxed" style={{ color: '#EF9F27', opacity: .9 }}>
                ข้อมูลบนแพลตฟอร์มนี้เพื่อประชาสัมพันธ์เท่านั้น กรุณาตรวจสอบรายละเอียดและราคาบัตรจากผู้จัดงานโดยตรง{' '}
                <a href="/disclaimer" className="underline">อ่านเพิ่มเติม</a>
              </p>
            </div>

            {(event.contact_phone || event.contact_line) && (
              <div className="rounded-xl p-4"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <h2 className="text-[12px] font-medium text-muted uppercase tracking-wide mb-2">ติดต่อ</h2>
                {event.contact_phone && (
                  <p className="text-[13px] text-secondary">📞 {event.contact_phone}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ArtistRow({ artist }: { artist: any }) {
  return (
    <div
      onClick={() => { window.location.href = `/artists/${artist.slug || artist.id}` }}
      suppressHydrationWarning
      className="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-[var(--surface-2)] cursor-pointer">
      {/* Avatar */}
      {artist.image_url ? (
        <img src={artist.image_url} alt={artist.name}
          className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium"
          style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
          {artist.name.slice(0, 2)}
        </div>
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-[13px] font-medium text-primary">{artist.name}</p>
          {artist.is_headliner && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}>
              HEADLINER
            </span>
          )}
        </div>
        {artist.name_en && <p className="text-[11px] text-muted">{artist.name_en}</p>}
      </div>

      {/* Social links */}
      <div className="flex items-center gap-1 shrink-0">
        {artist.instagram_url && (
          <a href={artist.instagram_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="icon-btn w-7 h-7"><Instagram size={13} /></a>
        )}
        {artist.facebook_url && (
          <a href={artist.facebook_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="icon-btn w-7 h-7"><Facebook size={13} /></a>
        )}
        {artist.website_url && (
          <a href={artist.website_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="icon-btn w-7 h-7"><Globe size={13} /></a>
        )}
      </div>

      {/* Time */}
      {artist.artist_time && (
        <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <Clock size={10} className="text-muted" />
          <span className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
            {artist.artist_time.slice(0, 5)} น.
          </span>
        </div>
      )}
    </div>
  )
}
