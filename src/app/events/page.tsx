'use client'
import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Search, X, Loader2, Music, MapPin, Clock,
  Heart, Users, Ticket, Star, CalendarPlus,
  SlidersHorizontal, Calendar, Zap,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { cn, formatPrice, googleCalendarUrl } from '@/lib/utils'
import toast from 'react-hot-toast'

const EVENT_TYPES = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'concert', label: 'คอนเสิร์ต' },
  { value: 'festival', label: 'เทศกาล' },
  { value: 'club', label: 'คลับ' },
  { value: 'acoustic', label: 'Acoustic' },
]

const DATE_PRESETS = [
  { value: '', label: 'ทุกวัน' },
  { value: 'today', label: 'วันนี้' },
  { value: 'week', label: 'สัปดาห์นี้' },
  { value: 'month', label: 'เดือนนี้' },
]

const SORT_OPTIONS = [
  { value: 'priority', label: 'แนะนำ' },
  { value: 'date_asc', label: 'วันที่ใกล้สุด' },
  { value: 'date_desc', label: 'วันที่ไกลสุด' },
  { value: 'popular', label: 'ยอดนิยม' },
]

export default function EventsPage() {
  const { user } = useAuth()
  const sb = createClient()

  const [events,          setEvents]          = useState<any[]>([])
  const [loading,         setLoading]         = useState(true)
  const [search,          setSearch]          = useState('')
  const [eventType,       setEventType]       = useState('')
  const [datePreset,      setDatePreset]      = useState('')
  const [isFree,          setIsFree]          = useState(false)
  const [sortBy,          setSortBy]          = useState('priority')
  const [showFilters,     setShowFilters]     = useState(false)
  const [followedIds,     setFollowedIds]     = useState<Set<string>>(new Set())
  const [followedVenues,  setFollowedVenues]  = useState<Set<string>>(new Set())
  const [interactions,    setInteractions]    = useState<Set<string>>(new Set())
  const [myInteractions,  setMyInteractions]  = useState<Record<string, string>>({})

  // ── Load events ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data } = await sb
          .from('events')
          .select(`
            id, title, slug, start_date, end_date, start_time,
            event_type, is_free, ticket_price_min, ticket_price_max,
            ticket_url, poster_url, province, status, featured_type,
            venue:venues(id, name, province, address),
            event_artists(artist:artists(id, name, name_en, image_url))
          `)
          .is('deleted_at', null)
          .gte('start_date', new Date().toISOString().slice(0, 10))
          .order('start_date', { ascending: true })

        setEvents((data || []).map((ev: any) => ({
          ...ev,
          artists: ev.event_artists?.map((ea: any) => ea.artist).filter(Boolean) ?? [],
        })))
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // ── Load user data ────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    Promise.all([
      sb.from('follows').select('artist_id').eq('user_id', user.id),
      sb.from('venue_follows').select('venue_id').eq('user_id', user.id),
      sb.from('event_interactions').select('event_id,type').eq('user_id', user.id),
    ]).then(([f, vf, ei]) => {
      setFollowedIds(new Set((f.data || []).map((r: any) => r.artist_id)))
      setFollowedVenues(new Set((vf.data || []).map((r: any) => r.venue_id)))
      const myMap: Record<string, string> = {}
      ;(ei.data || []).forEach((r: any) => { myMap[r.event_id] = r.type })
      setMyInteractions(myMap)
      setInteractions(new Set(Object.keys(myMap)))
    })
  }, [user])

  // ── Priority score ────────────────────────────────────────
  function score(ev: any): number {
    let s = 0
    if (ev.featured_type === 'partner') s += 1000
    if (ev.featured_type === 'wvrn_pick') s += 800
    if (interactions.has(ev.id)) s += 300
    if (ev.artists?.some((a: any) => followedIds.has(a.id))) s += 200
    if (ev.venue?.id && followedVenues.has(ev.venue.id)) s += 150
    const days = differenceInDays(parseISO(ev.start_date), new Date())
    if (days === 0) s += 100
    else if (days <= 7) s += 50
    else if (days <= 30) s += 20
    return s
  }

  // ── Filter + Sort ─────────────────────────────────────────
  const filtered = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7)
    const monthEnd = new Date(today); monthEnd.setMonth(today.getMonth() + 1)

    let list = events.filter(ev => {
      if (eventType && ev.event_type !== eventType) return false
      if (isFree && !ev.is_free) return false
      if (search) {
        const q = search.toLowerCase()
        const inTitle   = ev.title?.toLowerCase().includes(q)
        const inArtist  = ev.artists?.some((a: any) => a.name?.toLowerCase().includes(q) || a.name_en?.toLowerCase().includes(q))
        const inVenue   = ev.venue?.name?.toLowerCase().includes(q)
        const inProvince = ev.province?.toLowerCase().includes(q)
        if (!inTitle && !inArtist && !inVenue && !inProvince) return false
      }
      if (datePreset) {
        const d = parseISO(ev.start_date)
        if (datePreset === 'today' && d.toDateString() !== today.toDateString()) return false
        if (datePreset === 'week' && (d < today || d > weekEnd)) return false
        if (datePreset === 'month' && (d < today || d > monthEnd)) return false
      }
      return true
    })

    if (sortBy === 'priority') {
      list = [...list].sort((a, b) => score(b) - score(a))
    } else if (sortBy === 'date_asc') {
      list = [...list].sort((a, b) => a.start_date.localeCompare(b.start_date))
    } else if (sortBy === 'date_desc') {
      list = [...list].sort((a, b) => b.start_date.localeCompare(a.start_date))
    } else if (sortBy === 'popular') {
      list = [...list].sort((a, b) => (b.attendance_count ?? 0) - (a.attendance_count ?? 0))
    }

    return list
  }, [events, search, eventType, datePreset, isFree, sortBy, followedIds, followedVenues, interactions])

  const hasFilters = search || eventType || datePreset || isFree

  const partnerEvents  = filtered.filter(ev => ev.featured_type === 'partner')
  const pickEvents     = filtered.filter(ev => ev.featured_type === 'wvrn_pick')
  const regularEvents  = filtered.filter(ev => !['partner', 'wvrn_pick'].includes(ev.featured_type))

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />

      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[20px] font-medium text-primary flex items-center gap-2">
              <Music size={20} style={{ color: 'var(--accent)' }} />
              งานทั้งหมด
            </h1>
            <p className="text-[12px] text-muted mt-0.5">{filtered.length} งาน</p>
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] transition-all"
            style={{
              background: showFilters ? 'var(--accent-muted)' : 'var(--surface-1)',
              border: `1px solid ${showFilters ? 'var(--accent)' : 'var(--border)'}`,
              color: showFilters ? 'var(--accent)' : 'var(--text-secondary)',
            }}>
            <SlidersHorizontal size={14} />
            ตัวกรอง
            {hasFilters && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-3"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Search size={15} className="text-muted shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหางาน ศิลปิน สถานที่..."
            className="bg-transparent text-[14px] text-primary outline-none w-full placeholder:text-muted"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={14} className="text-muted" />
            </button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="rounded-xl p-4 mb-4 flex flex-col gap-4"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

            {/* Event type */}
            <div>
              <p className="text-[11px] text-muted mb-2 font-medium uppercase tracking-wide">ประเภทงาน</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setEventType(t.value)}
                    className="px-3 py-1.5 rounded-full text-[12px] transition-all"
                    style={{
                      background: eventType === t.value ? 'var(--accent)' : 'var(--surface-2)',
                      color: eventType === t.value ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${eventType === t.value ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date preset */}
            <div>
              <p className="text-[11px] text-muted mb-2 font-medium uppercase tracking-wide">ช่วงเวลา</p>
              <div className="flex flex-wrap gap-2">
                {DATE_PRESETS.map(d => (
                  <button key={d.value} onClick={() => setDatePreset(d.value)}
                    className="px-3 py-1.5 rounded-full text-[12px] transition-all"
                    style={{
                      background: datePreset === d.value ? 'var(--accent)' : 'var(--surface-2)',
                      color: datePreset === d.value ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${datePreset === d.value ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Free + Clear */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsFree(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] transition-all"
                style={{
                  background: isFree ? 'var(--accent)' : 'var(--surface-2)',
                  color: isFree ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${isFree ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                <Ticket size={12} /> เข้าฟรี
              </button>
              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setEventType(''); setDatePreset(''); setIsFree(false) }}
                  className="flex items-center gap-1.5 text-[12px] text-muted hover:text-primary transition-colors">
                  <X size={12} /> ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sort */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto scrollbar-none pb-1">
          {SORT_OPTIONS.map(s => (
            <button key={s.value} onClick={() => setSortBy(s.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-all shrink-0"
              style={{
                background: sortBy === s.value ? 'var(--accent-muted)' : 'var(--surface-1)',
                border: `1px solid ${sortBy === s.value ? 'var(--accent)' : 'var(--border)'}`,
                color: sortBy === s.value ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
              {s.value === 'priority' && <Zap size={11} />}
              {s.value === 'date_asc' && <Calendar size={11} />}
              {s.value === 'popular' && <Star size={11} />}
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-muted">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <Music size={36} className="mx-auto mb-3 text-muted" />
            <p className="text-[14px] font-medium text-primary mb-1">ไม่พบงาน</p>
            <p className="text-[12px] text-muted">ลองปรับตัวกรองใหม่</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">

            {/* Event Partner */}
            {partnerEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--accent)', color: 'white' }}>
                    ✦ Event Partner
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {partnerEvents.map(ev => (
                    <EventRow key={ev.id} ev={ev} myType={myInteractions[ev.id] ?? null}
                      isFollowed={interactions.has(ev.id)} featured="partner" />
                  ))}
                </div>
              </section>
            )}

            {/* WVRN Pick */}
            {pickEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    ★ WVRN Pick
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {pickEvents.map(ev => (
                    <EventRow key={ev.id} ev={ev} myType={myInteractions[ev.id] ?? null}
                      isFollowed={interactions.has(ev.id)} featured="wvrn_pick" />
                  ))}
                </div>
              </section>
            )}

            {/* Regular events */}
            {regularEvents.length > 0 && (
              <section>
                {(partnerEvents.length > 0 || pickEvents.length > 0) && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] text-muted font-medium uppercase tracking-wide">งานทั้งหมด</span>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {regularEvents.map(ev => (
                    <EventRow key={ev.id} ev={ev} myType={myInteractions[ev.id] ?? null}
                      isFollowed={interactions.has(ev.id)} />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

// ── EventCard — same style as home page ───────────────────
function EventRow({ ev, myType, isFollowed, featured }: {
  ev: any
  myType: string | null
  isFollowed: boolean
  featured?: string
}) {
  const start   = parseISO(ev.start_date)
  const days    = differenceInDays(start, new Date())
  const poster  = ev.poster_url
  const [goingCount,      setGoingCount]      = useState<number | null>(null)
  const [interestedCount, setInterestedCount] = useState<number | null>(null)
  const sb = createClient()

  useEffect(() => {
    sb.from('event_interactions').select('type').eq('event_id', ev.id)
      .then(({ data }) => {
        if (!data) return
        setGoingCount(data.filter((r: any) => r.type === 'going').length)
        setInterestedCount(data.filter((r: any) => r.type === 'interested').length)
      })
  }, [ev.id])

  return (
    <div
      onClick={() => { window.location.href = `/events/${ev.slug || ev.id}` }}
      className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.01]"
      style={{
        border: featured === 'partner'    ? '1.5px solid #EF9F27'
               : featured === 'wvrn_pick' ? '1.5px solid #7C3AED'
               : '1px solid var(--border)',
      }}>

      {/* Featured banner */}
      {featured === 'partner' && (
        <div style={{ background: '#EF9F27', padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#412402', letterSpacing: '.06em' }}>⭐ EVENT PARTNER</span>
          <span style={{ fontSize: 10, color: '#633806', marginLeft: 'auto' }}>WVRN Partner</span>
        </div>
      )}
      {featured === 'wvrn_pick' && (
        <div style={{ background: '#7C3AED', padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#EEEDFE', letterSpacing: '.06em' }}>⚡ WVRN PICKS</span>
          <span style={{ fontSize: 10, color: '#CECBF6', marginLeft: 'auto' }}>แนะนำโดย WVRN</span>
        </div>
      )}

      {/* Card body */}
      <div className="flex" style={{ background: 'var(--surface-1)', minHeight: 90 }}>

        {/* Poster / Date */}
        {poster ? (
          <div className="relative shrink-0" style={{ width: 90 }}>
            <img src={poster} alt={ev.title} className="w-full h-full object-cover" style={{ display: 'block', minHeight: 90 }} />
            <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,.7)', borderRadius: 8, padding: '3px 7px', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f472b6', lineHeight: 1 }}>{format(start, 'd')}</div>
              <div style={{ fontSize: 8, color: '#a1a1aa', textTransform: 'uppercase' }}>{format(start, 'MMM', { locale: th })}</div>
            </div>
          </div>
        ) : (
          <div className="shrink-0 flex flex-col items-center justify-center border-r border-[var(--border)]"
            style={{ width: 64, background: 'var(--surface-1)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: days === 0 ? '#E8003A' : 'var(--accent)', lineHeight: 1 }}>{format(start, 'd')}</div>
            <div style={{ fontSize: 9, color: days === 0 ? '#E8003A' : 'var(--accent)', textTransform: 'uppercase', opacity: .7 }}>{format(start, 'MMM', { locale: th })}</div>
            {days === 0 && <span style={{ fontSize: 8, background: '#E8003A', color: 'white', borderRadius: 20, padding: '2px 5px', marginTop: 3, fontWeight: 600 }}>TODAY</span>}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {isFollowed && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,83,126,.1)', color: 'var(--accent)' }}>ติดตาม</span>
            )}
            {myType === 'going' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(93,202,165,.12)', color: '#5DCAA5' }}>จะไป</span>
            )}
          </div>

          <h3 className="font-semibold text-[14px] leading-tight truncate text-primary mb-0.5">{ev.title}</h3>

          {ev.artists?.length > 0 && (
            <p className="text-[11px] text-muted truncate">
              {ev.artists.map((a: any) => a.name_en || a.name).join(' · ')}
            </p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[11px] text-muted">
            {ev.venue?.name && <span className="flex items-center gap-1"><MapPin size={11} />{ev.venue.name}</span>}
            {ev.start_time && <span className="flex items-center gap-1"><Clock size={11} />{ev.start_time.slice(0, 5)}</span>}
          </div>

          {/* Social proof */}
          {(goingCount! > 0 || interestedCount! > 0) && (
            <div className="flex items-center gap-2 mt-1.5">
              {interestedCount! > 0 && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}>
                  <Heart size={9} className="text-pink-400" />{interestedCount!.toLocaleString()} สนใจ
                </span>
              )}
              {goingCount! > 0 && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(232,0,58,0.1)', color: 'var(--accent)' }}>
                  <Users size={9} />{goingCount!.toLocaleString()} จะไป
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: price + buttons */}
        <div className="shrink-0 border-l border-[var(--border)] flex flex-col" style={{ width: 72 }}>
          <div className="px-2 pt-2.5 pb-1.5 text-[11px] font-semibold leading-tight text-center"
            style={{ color: featured === 'partner' ? '#EF9F27' : featured === 'wvrn_pick' ? '#A78BFA' : 'var(--accent)' }}>
            {ev.is_free ? 'ฟรี' : ev.ticket_price_min ? `฿${Number(ev.ticket_price_min).toLocaleString()}` : '—'}
          </div>

          {/* ซื้อบัตร */}
          {ev.ticket_url ? (
            <a href={ev.ticket_url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 border-t border-[var(--border)] transition-all"
              style={{ background: 'var(--accent)' }}>
              <Ticket size={13} style={{ color: 'white' }} />
              <span className="text-[8px] font-medium" style={{ color: 'white' }}>ซื้อบัตร</span>
            </a>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5 border-t border-[var(--border)]"
              style={{ background: 'var(--surface-2)', opacity: 0.4 }}>
              <Ticket size={13} className="text-muted" />
              <span className="text-[8px] text-muted">ซื้อบัตร</span>
            </div>
          )}

          {/* ปฏิทิน */}
          <button
            onClick={e => { e.stopPropagation(); window.open(googleCalendarUrl(ev), '_blank') }}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 border-t border-[var(--border)] transition-all hover:bg-[var(--surface-2)]">
            <CalendarPlus size={13} className="text-muted" />
            <span className="text-[8px] text-muted">ปฏิทิน</span>
          </button>
        </div>
      </div>
    </div>
  )
}
