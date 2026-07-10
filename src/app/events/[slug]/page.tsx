'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  MapPin, Clock, Heart, Bookmark, CalendarPlus, Share2, Camera, X, Upload, AlertCircle as AlertIcon,
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
import BackButton from '@/components/ui/BackButton'
import { track } from '@/lib/analytics'


// ─── RelatedEventsBanner ─────────────────────────────────
function RelatedEventsBanner({ event }: { event: any }) {
  const [related,   setRelated]   = useState<any[]>([])
  const [cur,       setCur]       = useState(0)
  const [animating, setAnimating] = useState(false)
  const sb = createClient()

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await sb
        .from('events')
        .select('id,title,slug,start_date,poster_url,province,category_id,venue_id,is_free,ticket_price_min,venue:venues(name),event_artists(artist:artists(id,name))')
        .neq('id', event.id)
        .gte('start_date', today)
        .is('deleted_at', null)
        .limit(100)

      if (!data) return

      const artistIds = new Set((event.artists || []).map((a: any) => a.id))

      // score algorithm
      const scored = data.map((ev: any) => {
        let score = 0
        const evArtistIds = (ev.event_artists || []).map((ea: any) => ea.artist?.id).filter(Boolean)

        // 1. ศิลปินเหมือนกัน +3 ต่อคน
        evArtistIds.forEach((id: string) => { if (artistIds.has(id)) score += 3 })
        // 2. category เหมือนกัน +2
        if (event.category_id && ev.category_id === event.category_id) score += 2
        // 3. venue เดียวกัน +2
        if (event.venue_id && ev.venue_id === event.venue_id) score += 2
        // 4. province เดียวกัน +1
        if (event.province && ev.province === event.province) score += 1
        // 5. เดือนเดียวกัน +1
        if (event.start_date?.slice(0,7) === ev.start_date?.slice(0,7)) score += 1

        return { ...ev, _score: score }
      })

      const top = scored
        .filter((ev: any) => ev._score > 0)
        .sort((a: any, b: any) => b._score - a._score || new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        .slice(0, 6)

      setRelated(top)
    }
    if (event?.id) load()
  }, [event?.id])

  useEffect(() => {
    if (related.length <= 1) return
    const t = setInterval(() => {
      setAnimating(true)
      setTimeout(() => { setCur(c => (c + 1) % related.length); setAnimating(false) }, 350)
    }, 4500)
    return () => clearInterval(t)
  }, [related.length])

  if (related.length === 0) return null

  const ev = related[cur]
  const start = parseISO(ev.start_date)

  return (
    <div className="mb-4 rounded-2xl overflow-hidden cursor-pointer"
      style={{ border: '1.5px solid var(--accent)', boxShadow: '0 2px 16px rgba(212,83,126,.12)' }}
      onClick={() => { window.location.href = `/events/${ev.slug || ev.id}` }}>

      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between"
        style={{ background: 'linear-gradient(90deg, var(--accent) 0%, #9B3B6A 100%)' }}>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,.9)' }}>
          🎵 งานที่เกี่ยวข้อง
        </span>
        {related.length > 1 && (
          <div className="flex items-center gap-1.5">
            {related.map((_, i) => (
              <button key={i}
                onClick={e => { e.stopPropagation(); setAnimating(true); setTimeout(() => { setCur(i); setAnimating(false) }, 350) }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === cur ? 18 : 5, height: 5,
                  background: i === cur ? '#fff' : 'rgba(255,255,255,.4)',
                }} />
            ))}
          </div>
        )}
      </div>

      {/* Slide content */}
      <div style={{
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateX(-12px)' : 'translateX(0)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        display: 'flex', alignItems: 'stretch',
        background: 'var(--surface-1)', minHeight: 100,
      }}>
        {/* Poster */}
        <div style={{ width: 110, flexShrink: 0, overflow: 'hidden' }}>
          {ev.poster_url
            ? <img src={ev.poster_url} alt={ev.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Music size={28} style={{ color: 'var(--accent)', opacity: .4 }} />
              </div>
          }
        </div>
        {/* Info */}
        <div style={{ flex: 1, padding: '14px 14px', minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {ev.title}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <CalendarRange size={11} />
              {format(start, 'd MMM yyyy', { locale: th })}
            </span>
            {ev.venue?.name && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={11} /> {ev.venue.name}
              </span>
            )}
          </div>
          <span className="inline-block px-2.5 py-1 rounded-lg text-[12px] font-semibold"
            style={{
              background: ev.is_free ? 'rgba(93,202,165,.15)' : 'var(--accent-muted)',
              color: ev.is_free ? '#5DCAA5' : 'var(--accent)',
            }}>
            {ev.is_free ? '🎟 ฟรี' : ev.ticket_price_min ? `฿${Number(ev.ticket_price_min).toLocaleString()}` : 'TBA'}
          </span>
        </div>
        {/* Date block */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '0 18px', background: 'var(--accent-muted)', borderLeft: '1px solid var(--border)' }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{format(start, 'd')}</span>
          <span style={{ fontSize: 11, color: 'var(--accent)', opacity: .8, textTransform: 'uppercase', fontWeight: 600 }}>{format(start, 'MMM', { locale: th })}</span>
        </div>
      </div>
    </div>
  )
}

function VenueCard({ venue }: { venue: any }) {
  const [expanded, setExpanded] = useState(false)
  const catColor = venue.category?.color || 'var(--accent)'
  const slug = venue.slug || venue.id

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

      {/* Venue image */}
      {venue.image_url && (
        <div className="overflow-hidden" style={{ height: 100 }}>
          <img src={venue.image_url} alt={venue.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Main row */}
      <div className="p-4">
        <div className="flex flex-col gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <MapPin size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span className="text-[14px] font-medium text-primary">{venue.name}</span>
              {venue.category && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: catColor + '20', color: catColor }}>
                  {venue.category.name_th}
                </span>
              )}
            </div>
            <span className="text-[12px] text-muted">{venue.province}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
            {venue.maps_url && (
              <a href={venue.maps_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg"
                style={{ border: '1px solid var(--border)', color: '#378ADD', textDecoration: 'none' }}>
                <MapPin size={11} /> Maps
              </a>
            )}
            <a href={`/venues/${slug}`}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
              ดูสถานที่ <ExternalLink size={11} />
            </a>
            {(venue.address || venue.capacity) && (
              <button onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer' }}>
                รายละเอียด <span style={{ display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable detail */}
        {expanded && (venue.address || venue.capacity) && (
          <div className="mt-3 pt-3 flex gap-6 flex-wrap"
            style={{ borderTop: '1px solid var(--border)' }}>
            {venue.address && (
              <div>
                <p className="text-[10px] text-muted mb-0.5">ที่อยู่</p>
                <p className="text-[12px] text-primary">{venue.address}</p>
              </div>
            )}
            {venue.capacity && (
              <div>
                <p className="text-[10px] text-muted mb-0.5">ความจุ</p>
                <p className="text-[12px] font-medium text-primary">{venue.capacity.toLocaleString()} คน</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

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
  const [photos,       setPhotos]       = useState<any[]>([])
  const [showUpload,   setShowUpload]   = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [lightbox,     setLightbox]     = useState<string | null>(null)
  const sb = createClient()

  async function loadPhotos(eventId: string) {
    const { data } = await sb.from('event_photos')
      .select('*, profile:profiles(display_name, avatar_url)')
      .eq('event_id', eventId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
    setPhotos(data || [])
  }

  async function resizeImage(file: File): Promise<Blob> {
    return new Promise((res, rej) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1200
        let w = img.width, h = img.height
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX }
        else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob(b => b ? res(b) : rej(new Error('resize failed')), 'image/jpeg', 0.78)
      }
      img.onerror = rej
      img.src = URL.createObjectURL(file)
    })
  }

  async function uploadPhotos(files: FileList) {
    if (!user || !event) return
    const today = new Date().toISOString().slice(0,10)
    if (event.start_date > today) { toast.error('งานยังไม่เกิดขึ้น ยังไม่สามารถโพสต์รูปได้'); return }
    const [{ data: existing }, { count: totalCount }] = await Promise.all([
  sb.from('event_photos').select('id').eq('event_id', event.id).eq('user_id', user.id),
  sb.from('event_photos').select('id', { count: 'exact', head: true }).eq('event_id', event.id),
])
if ((totalCount ?? 0) >= 100) { toast.error('งานนี้มีรูปครบ 100 รูปแล้ว'); return }
if ((existing?.length ?? 0) + files.length > 3) { toast.error('โพสต์ได้สูงสุด 3 รูป/งาน'); return }
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const resized = await resizeImage(file)
        const path = `${user.id}/${event.id}/${Date.now()}.jpg`
        const { error: upErr } = await sb.storage.from('event-photos').upload(path, resized, { contentType: 'image/jpeg', upsert: false })
        if (upErr) throw upErr
        const { data: urlData } = sb.storage.from('event-photos').getPublicUrl(path)
        await sb.from('event_photos').insert({ event_id: event.id, user_id: user.id, url: urlData.publicUrl, consent: true })
      }
      toast.success('อัพโหลดรูปสำเร็จ!')
      setShowUpload(false)
      loadPhotos(event.id)
    } catch (e: any) { toast.error('อัพโหลดไม่ได้: ' + e.message) }
    finally { setUploading(false) }
  }

async function reportPhoto(photoId: string) {
  if (!user) { toast.error('กรุณา Login ก่อน'); return }
  await Promise.all([
    sb.from('event_photo_reports').upsert({ photo_id: photoId, user_id: user.id }, { onConflict: 'photo_id,user_id' }),
    sb.rpc('increment_photo_report', { photo_id: photoId }),
  ])
  toast.success('รายงานแล้ว ทีมงานจะตรวจสอบโดยเร็ว')
}

  async function deletePhoto(photoId: string, url: string) {
    await sb.from('event_photos').delete().eq('id', photoId)
    const path = url.split('/event-photos/')[1]
    if (path) await sb.storage.from('event-photos').remove([decodeURIComponent(path)])
    setPhotos(prev => prev.filter(p => p.id !== photoId))
    toast.success('ลบรูปแล้ว')
  }


  useEffect(() => {
    if (!id || id === 'undefined') { setLoading(false); return }
    async function load() {
      const decoded = decodeURIComponent(id)
      const isUuid  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)

      const select = `*, venue:venues(*, category:venue_categories(id,name,name_th,color)), event_artists(sort_order, is_headliner, start_time, artist:artists(*))`

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
      loadPhotos(data.id)

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

  // Build ISO 8601 datetime with Thai timezone offset
  const startDateTime = event.start_time
    ? `${event.start_date}T${event.start_time}+07:00`
    : `${event.start_date}T00:00:00+07:00`
  const endDateTime = event.end_date
    ? event.end_time
      ? `${event.end_date}T${event.end_time}+07:00`
      : `${event.end_date}T23:59:00+07:00`
    : null

  const eventUrl = `https://www.wvrn.app/events/${event.slug || event.id}`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    "name": event.title,
    "startDate": startDateTime,
    ...(endDateTime ? { "endDate": endDateTime } : {}),
    "eventStatus": event.status === 'cancelled'
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": event.venue?.name ?? event.province,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": event.venue?.address ?? '',
        "addressLocality": event.venue?.province ?? event.province ?? '',
        "addressCountry": "TH",
      },
      ...(event.venue?.maps_url ? { "hasMap": event.venue.maps_url } : {}),
    },
    "offers": event.is_free
      ? {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "THB",
          "availability": "https://schema.org/InStock",
          "url": eventUrl,
        }
      : {
          "@type": "Offer",
          ...(event.ticket_price_min != null ? { "price": String(event.ticket_price_min) } : {}),
          "priceCurrency": "THB",
          "url": event.ticket_url ?? eventUrl,
          "availability": "https://schema.org/InStock",
        },
    "performer": (event.artists ?? []).map((a: any) => ({
      "@type": "MusicGroup",
      "name": a.name_en || a.name,
      ...(a.image_url ? { "image": a.image_url } : {}),
    })),
    ...(event.poster_url ? { "image": event.poster_url } : {}),
    "description": event.description ?? `${event.title} — คอนเสิร์ตและงานดนตรีสด`,
    "url": eventUrl,
    "organizer": { "@type": "Organization", "name": "WVRN", "url": "https://www.wvrn.app" },
    "inLanguage": "th",
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />

      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-6">

        {/* Back */}
<BackButton />

        {/* Related Events Banner */}
        {event && <RelatedEventsBanner event={event} />}

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

            {/* Buy ticket / Register CTA */}
            {event.ticket_url && (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track({ event_type: 'ticket_click', entity_id: event.id, entity_name: event.title, value: event.ticket_url || '' })}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-[15px] font-medium transition-all"
                style={{ background: 'var(--accent)', color: 'white' }}>
                <Ticket size={18} />
                {event.is_free ? 'ลงทะเบียน (ฟรี)' : (
                  <>
                    ซื้อบัตร
                    {event.ticket_price_min && (
                      <span className="text-[12px] opacity-80 ml-1">
                        ฿{Number(event.ticket_price_min).toLocaleString()}
                        {event.ticket_price_max && event.ticket_price_max !== event.ticket_price_min
                          ? ` – ฿${Number(event.ticket_price_max).toLocaleString()}`
                          : ''}
                      </span>
                    )}
                  </>
                )}
              </a>
            )}

            {/* Venue map card — Style C */}
            {event.venue && (
              <VenueCard venue={event.venue} />
            )}

            {/* ── Photos section ── */}
            {(() => {
              const today = new Date().toISOString().slice(0,10)
              const isPast = event.start_date <= today
              if (!isPast && photos.length === 0) return null
              return (
                <div className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  <div className="px-4 py-3 flex items-center justify-between"
                    style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    <div className="flex items-center gap-2">
                      <Camera size={14} style={{ color: 'var(--accent)' }} />
                      <span className="text-[12px] font-medium text-primary">รูปจากคนที่ไปงาน</span>
                      {photos.length > 0 && <span className="text-[11px] text-muted">{photos.length} รูป</span>}
                    </div>
                    {isPast && user && (
                      <button onClick={() => setShowUpload(v => !v)}
                        className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: 'var(--accent)', color: 'white' }}>
                        <Camera size={12} /> โพสต์รูป
                      </button>
                    )}
                  </div>

                  {/* Upload form */}
                  {showUpload && (
                    <div className="p-4" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(var(--accent-rgb),.03)' }}>
                      {/* Terms */}
                      <div className="rounded-lg p-3 mb-3 text-[11px] leading-relaxed"
                        style={{ background: 'rgba(239,159,39,.08)', border: '1px solid rgba(239,159,39,.2)', color: '#854F0B' }}>
                        <p className="font-medium mb-1">ข้อกำหนดการโพสต์รูป</p>
                        <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                          <li>ต้องเป็นรูปจากงานนี้เท่านั้น</li>
                          <li>ห้ามรูปโป้เปลือย ลามกอนาจาร หรือขัดต่อศีลธรรมอันดี</li>
                          <li>ห้ามรูปที่มีเนื้อหาเกลียดชัง ความรุนแรง หรือผิดกฎหมาย</li>
                          <li>คุณรับรองว่ามีสิทธิ์โพสต์รูปนี้ และผู้ที่ปรากฏในรูปยินยอม</li>
                          <li>Admin มีสิทธิ์เด็ดขาดในการซ่อนหรือลบรูปที่ไม่เหมาะสม</li>
                        </ul>
                      </div>
                      <label className="flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer py-6"
                        style={{ border: '2px dashed var(--border)', background: 'var(--surface-2)' }}>
                        {uploading
                          ? <><Upload size={20} className="text-muted animate-bounce" /><span className="text-[12px] text-muted">กำลังอัพโหลด...</span></>
                          : <><Camera size={20} className="text-muted" /><span className="text-[12px] text-muted">เลือกรูป (สูงสุด 3 รูป) · ระบบ resize อัตโนมัติ</span></>}
                        <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
                          onChange={e => e.target.files && uploadPhotos(e.target.files)} />
                      </label>
                    </div>
                  )}

                  {/* Photo grid */}
                  {photos.length > 0 ? (
                    <div className="p-3 grid grid-cols-3 gap-2">
                      {photos.map(p => (
                        <div key={p.id} className="relative group rounded-lg overflow-hidden"
                          style={{ aspectRatio: '1', background: 'var(--surface-2)' }}>
                          <img src={p.url} alt="" className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setLightbox(p.url)} />
                          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {user?.id === p.user_id && (
                              <button onClick={() => deletePhoto(p.id, p.url)}
                                className="w-6 h-6 rounded flex items-center justify-center"
                                style={{ background: 'rgba(226,75,74,.9)' }}>
                                <X size={11} style={{ color: 'white' }} />
                              </button>
                            )}
                            {user && user.id !== p.user_id && (
                              <button onClick={() => reportPhoto(p.id)}
                                className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-medium"
                                style={{ background: 'rgba(0,0,0,.7)', color: 'white' }}>
                                !
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isPast ? (
                    <div className="py-8 text-center text-muted">
                      <Camera size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-[12px]">ยังไม่มีรูปจากงานนี้</p>
                      {user && <p className="text-[11px] mt-1 opacity-70">เป็นคนแรกที่แชร์รูป!</p>}
                    </div>
                  ) : null}
                </div>
              )
            })()}

            {/* Lightbox */}
            {lightbox && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,.9)' }}
                onClick={() => setLightbox(null)}>
                <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
                <button className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,.15)' }}>
                  <X size={18} style={{ color: 'white' }} />
                </button>
              </div>
            )}

            {/* Disclaimer */}
            <div className="rounded-xl p-3 flex items-start gap-2"
              style={{ background: 'rgba(186,117,23,.06)', border: '1px solid rgba(186,117,23,.15)' }}>
              <AlertCircle size={13} style={{ color: '#EF9F27', flexShrink: 0, marginTop: 1 }} />
              <div className="flex-1">
                <p className="text-[11px] leading-relaxed" style={{ color: '#EF9F27', opacity: .9 }}>
                  ข้อมูลบนแพลตฟอร์มนี้เพื่อประชาสัมพันธ์เท่านั้น กรุณาตรวจสอบรายละเอียดและราคาบัตรจากผู้จัดงานโดยตรง{' '}
                  <a href="/disclaimer" className="underline">อ่านเพิ่มเติม</a>
                </p>
                <a
                  href={`/report?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}&category=event_info`}
                  className="inline-flex items-center gap-1 mt-1.5 text-[10px] underline"
                  style={{ color: '#EF9F27', opacity: .7 }}
                >
                  <AlertCircle size={10} /> แจ้งข้อมูลผิดพลาด
                </a>
              </div>
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
