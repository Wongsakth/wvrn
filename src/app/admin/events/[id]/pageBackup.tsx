'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  MapPin, Clock, Heart, Bookmark, CalendarPlus, Share2,
  ExternalLink, Ticket, ChevronLeft, Users, CalendarRange,
  Instagram, Facebook, Globe, Music, Loader2,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import EventLineupTimeline from '@/components/events/EventLineupTimeline'
import TicketSaleWidget from '@/components/events/TicketSaleWidget'
import { createClient } from '@/lib/supabase'
import { cn, formatPrice, statusLabel, genreTagClass, googleCalendarUrl } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function EventDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [event,   setEvent]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [liked,   setLiked]   = useState(false)
  const [saved,   setSaved]   = useState(false)
  const sb = createClient()

  useEffect(() => {
    if (!id || id === 'undefined') { setLoading(false); return }
    async function load() {
      const { data, error } = await sb
        .from('events')
        .select(`
          *,
          venue:venues(*),
          event_artists(
            sort_order,
            is_headliner,
            start_time,
            artist:artists(*)
          )
        `)
        .eq('id', id)
        .single()
      if (error || !data) { setLoading(false); return }

      // เรียงศิลปินตาม sort_order แล้วแนบ start_time ไปด้วย
      const sortedArtists = [...(data.event_artists ?? [])]
        .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
        .map(ea => ({ ...ea.artist, artist_time: ea.start_time, is_headliner: ea.is_headliner }))

      setEvent({ ...data, artists: sortedArtists })
      setLoading(false)
    }
    load()
  }, [id])

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
                <div className="w-full aspect-video overflow-hidden">
                  <img src={event.poster_url} alt={event.title}
                    className="w-full h-full object-cover" />
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
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLiked(v => !v)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                style={{
                  background: liked ? 'var(--accent-muted)' : 'var(--surface-1)',
                  border: `1px solid ${liked ? 'var(--accent)' : 'var(--border)'}`,
                  color: liked ? 'var(--accent)' : 'var(--text-secondary)',
                }}>
                <Heart size={15} style={{ fill: liked ? 'var(--accent)' : 'none' }} />
                {liked ? 'ถูกใจแล้ว' : 'ถูกใจ'}
              </button>
              <button
                onClick={() => setSaved(v => !v)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                style={{
                  background: saved ? 'var(--accent-muted)' : 'var(--surface-1)',
                  border: `1px solid ${saved ? 'var(--accent)' : 'var(--border)'}`,
                  color: saved ? 'var(--accent)' : 'var(--text-secondary)',
                }}>
                <Bookmark size={15} style={{ fill: saved ? 'var(--accent)' : 'none' }} />
                {saved ? 'บันทึกแล้ว' : 'บันทึก'}
              </button>
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

            {/* Venue map card */}
            {event.venue && (
              <div className="rounded-xl overflow-hidden"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <div className="px-4 py-3 flex items-center gap-2"
                  style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  <MapPin size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-[12px] font-medium text-primary">สถานที่</span>
                </div>
                <div className="p-4">
                  <p className="text-[14px] font-medium text-primary mb-1">{event.venue.name}</p>
                  {event.venue.address && (
                    <p className="text-[12px] text-muted mb-3">{event.venue.address}</p>
                  )}
                  {event.venue.maps_url && (
                    <a href={event.venue.maps_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] btn-ghost w-full">
                      <ExternalLink size={13} /> เปิดใน Google Maps
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Contact */}
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
      onClick={() => { window.location.href = `/artists/${artist.id}` }}
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
    </div>
  )
}
