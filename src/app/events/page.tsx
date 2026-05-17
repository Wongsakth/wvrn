'use client'
import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Search, X, Loader2, Music, MapPin, Clock,
  ChevronRight, Heart, Users, Ticket, Star,
  SlidersHorizontal, Calendar, Zap, Filter,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { cn, formatPrice, googleCalendarUrl } from '@/lib/utils'
import { format as formatDate } from 'date-fns'
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

// ── EventRow Component ─────────────────────────────────────
function EventRow({ ev, myType, isFollowed, featured }: {
  ev: any
  myType: string | null
  isFollowed: boolean
  featured?: string
}) {
  const days = differenceInDays(parseISO(ev.start_date), new Date())

  return (
    <div
      onClick={() => { window.location.href = `/events/${ev.slug || ev.id}` }}
      className="rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{
        background: 'var(--surface-1)',
        border: `1px solid ${featured === 'partner' ? 'var(--accent)' : isFollowed ? 'var(--accent)' : 'var(--border)'}`,
        borderLeft: featured === 'partner' ? '4px solid var(--accent)' : isFollowed ? '3px solid var(--accent)' : '1px solid var(--border)',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor =
        featured === 'partner' ? 'var(--accent)' : isFollowed ? 'var(--accent)' : 'var(--border)')}>

      <div className="flex">
        {/* Date block */}
        <div className="flex flex-col items-center justify-center px-4 py-4 shrink-0"
          style={{
            background: days === 0 ? 'rgba(232,0,58,.08)' : 'var(--accent-muted)',
            borderRight: '1px solid var(--border)',
            minWidth: 60,
          }}>
          <span className="text-[22px] font-medium leading-none"
            style={{ color: days === 0 ? '#E8003A' : 'var(--accent)' }}>
            {format(parseISO(ev.start_date), 'd')}
          </span>
          <span className="text-[9px] uppercase mt-0.5"
            style={{ color: days === 0 ? '#E8003A' : 'var(--accent)', opacity: .7 }}>
            {format(parseISO(ev.start_date), 'MMM', { locale: th })}
          </span>
          {days === 0 && (
            <span className="text-[8px] font-medium mt-1 px-1.5 py-0.5 rounded-full"
              style={{ background: '#E8003A', color: 'white' }}>TODAY</span>
          )}
          {days === 1 && (
            <span className="text-[8px] font-medium mt-1" style={{ color: 'var(--accent)' }}>พรุ่งนี้</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 px-4 py-3 min-w-0">
          <p className="text-[14px] font-medium text-primary mb-1 line-clamp-1">{ev.title}</p>

          {ev.artists?.length > 0 && (
            <p className="text-[11px] text-muted mb-1.5 line-clamp-1">
              {ev.artists.map((a: any) => a.name).join(' · ')}
            </p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {ev.venue?.name && (
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <MapPin size={10} />
                <span className="truncate max-w-[140px]">{ev.venue.name}</span>
              </span>
            )}
            {ev.start_time && (
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <Clock size={10} />{ev.start_time.slice(0, 5)} น.
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {isFollowed && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5"
                style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                <Heart size={8} style={{ fill: 'var(--accent)' }} /> สนใจ
              </span>
            )}
            {myType === 'going' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(93,202,165,.12)', color: '#5DCAA5' }}>
                จะไป
              </span>
            )}
          </div>
        </div>

        {/* Price + arrow */}
        <div className="flex flex-col items-end justify-between px-4 py-3 shrink-0"
          style={{ borderLeft: '1px solid var(--border)' }}>
          <span className="text-[11px] font-medium"
            style={{ color: ev.is_free ? '#5DCAA5' : 'var(--accent)' }}>
            {ev.is_free ? 'ฟรี' : ev.ticket_price_min
              ? `฿${Number(ev.ticket_price_min).toLocaleString()}`
              : ''}
          </span>
          <ChevronRight size={14} className="text-muted" />
        </div>
      </div>
    </div>
  )
}
