'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  List,
  LayoutGrid,
  Search,
  Loader2,
  MapPin,
  Clock,
  ChevronRight,
  Heart,
  Music,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  CalendarCheck,
  Ticket,
  Users,
  CalendarPlus,
} from 'lucide-react'

import Navbar from '@/components/layout/Navbar'
import CalendarView from '@/components/calendar/CalendarView'
import FilterBar from '@/components/events/FilterBar'
import LiveTicker from '@/components/LiveTicker'

import {
  cn,
  formatPrice,
  statusLabel,
  genreTagClass,
  googleCalendarUrl,
} from '@/lib/utils'

import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

import {
  format,
  parseISO,
  differenceInDays,
} from 'date-fns'

import { th } from 'date-fns/locale'

import type {
  EventFilters,
  ViewMode,
} from '@/types'

type TabMode = 'all' | 'artists' | 'venues' | 'following'
type AttendStatus = 'going' | 'attended' | null

export default function HomePage() {
  const sb = createClient()
  const { user, loading: authLoading } = useAuth()

  const isLoggedIn = !authLoading && !!user

  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [followedVenueIds,  setFollowedVenueIds]  = useState<Set<string>>(new Set())
  const [followedVenueInfo, setFollowedVenueInfo] = useState<Map<string,any>>(new Map())
  const [userProvince, setUserProvince] = useState<string>('')

  const [followedArtistInfo, setFollowedArtistInfo] =
    useState<Map<string, any>>(new Map())

  const [attendance, setAttendance] =
    useState<Map<string, AttendStatus>>(new Map())

  const [filters, setFilters] = useState<EventFilters>({})
  const [view, setView] = useState<ViewMode>('list')
  const [tab, setTab] = useState<TabMode>('all')
  const [search, setSearch] = useState('')

  const [likedIds, setLikedIds] =
    useState<Set<string>>(new Set())

  const [showPast, setShowPast] = useState(false)

  const [aiEvents, setAiEvents] = useState<any[]>([])
  const [aiLoading, setAiLoading] = useState(false)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // =========================================================
  // HELPERS
  // =========================================================

  function isPastEvent(ev: any, t: Date) {
    return new Date(ev.end_date || ev.start_date) < t
  }

  function toggleLike(id: string) {
    if (!isLoggedIn) { window.location.href = '/login'; return }
    setLikedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // =========================================================
  // LOAD EVENTS
  // =========================================================

  useEffect(() => {
    async function loadEvents() {
      setLoading(true)

      try {
        const { data, error } = await sb
          .from('events')
          .select(`
            *,
            venue:venues(
              id,
              name,
              province,
              address,
              maps_url
            ),
            event_artists(
              artist:artists(
                id,
                name,
                name_en,
                genres,
                image_url
              )
            )
          `)
          .is('deleted_at', null)
          .order('start_date', { ascending: true })

        if (error) throw error

        const normalized =
          (data || []).map((ev: any) => ({
            ...ev,
            artists:
              ev.event_artists
                ?.map((ea: any) => ea.artist)
                .filter(Boolean) || [],
          }))

        setEvents(normalized)
      } catch (err) {
        console.error('loadEvents error', err)
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  // =========================================================
  // LOAD FOLLOWS
  // =========================================================

  useEffect(() => {
    async function loadFollows() {
      if (!user) {
        setFollowedIds(new Set())
        setFollowedVenueIds(new Set())
        setFollowedArtistInfo(new Map())
        return
      }

      try {
        const { data, error } = await sb
          .from('follows')
          .select(`
            artist_id,
            artist:artists(
              id,
              name,
              name_en,
              slug,
              image_url,
              genres
            )
          `)
          .eq('user_id', user.id)

        if (error) throw error

        setFollowedIds(
          new Set(
            (data || []).map((f: any) => f.artist_id)
          )
        )

        setFollowedArtistInfo(
          new Map(
            (data || []).map((f: any) => [
              f.artist_id,
              f.artist,
            ])
          )
        )
      } catch (err) {
        console.error('load artist follows error', err)
      }

      try {
        const { data, error } = await sb
          .from('venue_follows')
          .select('venue_id, venue:venues(id,name,slug,province)')
          .eq('user_id', user.id)

        if (error) throw error

        setFollowedVenueIds(new Set((data || []).map((f: any) => f.venue_id)))

        const venueInfoMap = new Map<string,any>()
        ;(data || []).forEach((f: any) => {
          if (f.venue) venueInfoMap.set(f.venue_id, f.venue)
        })
        setFollowedVenueInfo(venueInfoMap)
      } catch (err) {
        console.error('load venue follows error', err)
      }
    }

    loadFollows()
  }, [user])

  // =========================================================
  // LOAD ATTENDANCE
  // =========================================================

  useEffect(() => {
    async function loadAttendance() {
      if (!user) {
        setAttendance(new Map())
        return
      }

      try {
        const { data, error } = await sb
          .from('event_attendance')
          .select('event_id, status')
          .eq('user_id', user.id)

        if (error) throw error

        const map = new Map(
          (data || []).map((a: any) => [
            a.event_id,
            a.status as AttendStatus,
          ])
        )

        setAttendance(map)
      } catch (err) {
        console.error('load attendance error', err)
      }
    }

    loadAttendance()
  }, [user])

  // =========================================================
  // TOGGLE ATTENDANCE
  // =========================================================

  async function toggleAttendance(
    eventId: string,
    currentStatus: AttendStatus
  ) {
    if (!user) {
      window.location.href = '/login'
      return
    }

    const next: AttendStatus =
      currentStatus === null
        ? 'going'
        : currentStatus === 'going'
        ? 'attended'
        : null

    // optimistic update
    setAttendance(prev => {
      const n = new Map(prev)

      if (next === null) {
        n.delete(eventId)
      } else {
        n.set(eventId, next)
      }

      return n
    })

    try {
      if (next === null) {
        const { error } = await sb
          .from('event_attendance')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId)

        if (error) throw error
      } else if (currentStatus === null) {
        const { error } = await sb
          .from('event_attendance')
          .insert({
            user_id: user.id,
            event_id: eventId,
            status: next,
          })

        if (error) throw error
      } else {
        const { error } = await sb
          .from('event_attendance')
          .update({
            status: next,
          })
          .eq('user_id', user.id)
          .eq('event_id', eventId)

        if (error) throw error
      }
    } catch (err) {
      console.error('toggle attendance error', err)

      // revert
      setAttendance(prev => {
        const n = new Map(prev)

        if (currentStatus === null) {
          n.delete(eventId)
        } else {
          n.set(eventId, currentStatus)
        }

        return n
      })
    }
  }

  // =========================================================
  // AI RECOMMEND
  // =========================================================

  const generateAI = useCallback(() => {
    setAiLoading(true)

    setTimeout(() => {
      const followedGenres = new Set<string>()

      followedArtistInfo.forEach(artist => {
        ;(artist?.genres || []).forEach((g: string) => {
          followedGenres.add(g)
        })
      })

      const scored = events
        .filter(ev => !isPastEvent(ev, today))

        // FIXED BUG
        .filter(
          ev =>
            !ev.artists?.some((a: any) =>
              followedIds.has(a.id)
            )
        )

        .map(ev => {
          let score = Math.random() * 30

          const evGenres: string[] = ev.genres || []

          evGenres.forEach(g => {
            if (followedGenres.has(g)) {
              score += 25
            }
          })

          ev.artists?.forEach((a: any) => {
            events.forEach(e => {
              if (
                attendance.get(e.id) === 'attended' &&
                e.artists?.some(
                  (x: any) => x.id === a.id
                )
              ) {
                score += 15
              }
            })
          })

          return {
            ev,
            score,
          }
        })

        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(x => x.ev)

      setAiEvents(scored)
      setAiLoading(false)
    }, 500)
  }, [
    events,
    followedArtistInfo,
    followedIds,
    attendance,
    today,
  ])

  useEffect(() => {
    if (
      tab === 'venues' &&
      aiEvents.length === 0 &&
      !aiLoading
    ) {
      generateAI()
    }
  }, [tab])

  // =========================================================
  // FILTERED EVENTS
  // =========================================================

  const filtered = useMemo(() => {
    let base = events

    if (tab === 'following') {
      base = base.filter(ev =>
        ev.artists?.some((a: any) =>
          followedIds.has(a.id)
        )
      )
    }

    return base
      .filter(ev => {
        // ── Province / Near Me ──
        if (filters.nearMe && filters.province && ev.province !== filters.province) return false
        if (!filters.nearMe && filters.province && ev.province !== filters.province) return false

        // ── Date preset / range ──
        if (filters.dateFrom) {
          if (ev.start_date < filters.dateFrom) return false
        }
        if (filters.dateTo) {
          if (ev.start_date > filters.dateTo) return false
        }

        // ── Genre ──
        if (filters.genre && !ev.genres?.includes(filters.genre)) return false

        // ── Event type ──
        if (filters.categoryId && ev.category_id !== filters.categoryId) return false
        if (filters.regionProvinces?.length && !filters.regionProvinces.includes(ev.province)) return false
        else if (!filters.regionProvinces && filters.province && ev.province !== filters.province) return false

        // ── Free ──
        if (filters.isFree && !ev.is_free) return false

        // ── Search ──
        if (search) {
          const q = search.toLowerCase()
          const matched =
            ev.title?.toLowerCase().includes(q) ||
            ev.artists?.some((a: any) => a.name?.toLowerCase().includes(q)) ||
            ev.venue?.name?.toLowerCase().includes(q)
          if (!matched) return false
        }

        return true
      })

      .sort((a, b) => {
        // Featured ขึ้นก่อน: partner > wvrn_picks > normal
        const featuredScore = (ev: any) =>
          ev.featured_type === 'partner' ? 2 :
          ev.featured_type === 'wvrn_picks' ? 1 : 0
        const diff = featuredScore(b) - featuredScore(a)
        if (diff !== 0) return diff
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      })
  }, [
    events,
    filters,
    filters.dateFrom,
    filters.dateTo,
    filters.datePreset,
    filters.nearMe,
    filters.province,
    filters.isFree,
    filters.categoryId,
    search,
    tab,
    followedIds,
  ])

  const pastEvents = filtered.filter(ev =>
    isPastEvent(ev, today)
  )

  const upcomingEvents = filtered.filter(
    ev => !isPastEvent(ev, today)
  )

  // Guest: แสดงเฉพาะ featured + 30 วัน ส่วนที่เหลือ blur
  const today30 = new Date(today)
  today30.setDate(today30.getDate() + 30)
  const guestVisible = !isLoggedIn
    ? upcomingEvents.filter(ev =>
        ev.featured_type === 'partner' ||
        ev.featured_type === 'wvrn_picks' ||
        new Date(ev.start_date) <= today30
      )
    : upcomingEvents
  const guestHidden = !isLoggedIn
    ? upcomingEvents.filter(ev =>
        ev.featured_type !== 'partner' &&
        ev.featured_type !== 'wvrn_picks' &&
        new Date(ev.start_date) > today30
      )
    : []

  const eventsToShow = isLoggedIn ? upcomingEvents : guestVisible

  return (
    <div className="min-h-screen text-primary" style={{ background: 'var(--surface-0)' }}>
      <Navbar />

      <main className="max-w-screen-xl mx-auto px-4 py-4">

        {/* TOOLBAR - Tabs + Search */}
        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <div className="flex bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-1">
            {[
              { id: 'all',       label: 'Shows',     icon: Music       },
              { id: 'artists',   label: 'Artists',   icon: Heart       },
              { id: 'venues',    label: 'Venues',    icon: MapPin      },
              { id: 'following', label: 'Following', icon: CalendarCheck },
            ].map(item => {
              const Icon = item.icon
              const needLogin = (item.id === 'following') && !isLoggedIn
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (needLogin) { window.location.href = '/login'; return }
                    setTab(item.id as TabMode)
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                    tab === item.id
                      ? 'font-medium'
                      : needLogin ? 'text-muted cursor-pointer' : 'text-muted hover:text-primary'
                  )}
                  style={tab === item.id ? { background: 'var(--accent)', color: 'var(--surface-0)' } : {}}
                >
                  <Icon size={14} />
                  {item.label}
                  {needLogin && <span className="text-[9px] opacity-60">🔒</span>}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-3 py-2">
            <Search size={14} className="text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหางาน..."
              className="bg-transparent outline-none text-sm w-40"
            />
          </div>
        </div>

        {/* 2-COLUMN LAYOUT */}
        <div className="flex gap-5 items-start">

        {/* ── LEFT: Main content ── */}
        <div className="flex-1 min-w-0">

        {/* ── ศิลปินที่ติดตาม - ย้ายไป sidebar แล้ว ── */}
        {false && isLoggedIn && followedArtistInfo.size > 0 && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-[var(--border)]">
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-1)] border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Heart size={14} className="fill-pink-500 text-pink-500" />
                <span className="text-[13px] font-medium">ศิลปินที่ติดตาม</span>
                <span className="text-[11px] text-muted bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                  {followedArtistInfo.size} คน
                </span>
              </div>
              <button onClick={() => window.location.href = '/artists'}
                className="text-[11px] text-pink-400 flex items-center gap-1">
                จัดการ <ChevronRight size={11} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--surface-2)]">
              {Array.from(followedArtistInfo.entries()).map(([artistId, artist]) => {
                const nextEvent = events
                  .filter(ev => !isPastEvent(ev, today) && ev.artists?.some((a: any) => a.id === artistId))
                  .sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0]
                const daysLeft = nextEvent ? differenceInDays(new Date(nextEvent.start_date), new Date()) : null
                const isToday  = daysLeft === 0
                return (
                  <div key={artistId} className="bg-[var(--surface-1)] p-3">
                    <div className="flex items-center gap-3 mb-2 cursor-pointer"
                      onClick={() => window.location.href = `/artists/${artistId}`}>
                      {artist?.image_url
                        ? <img src={artist.image_url} alt={artist.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                        : <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[11px] font-medium bg-[var(--surface-2)] text-pink-400">
                            {(artist?.name_en || artist?.name)?.slice(0,2)}
                          </div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{artist?.name_en || artist?.name}</p>
                        {artist?.name_en && artist?.name !== artist?.name_en && (
                          <p className="text-[10px] text-muted truncate">{artist?.name}</p>
                        )}
                      </div>
                      <Heart size={10} className="fill-pink-500 text-pink-500 shrink-0" />
                    </div>
                    {nextEvent ? (
                      <div onClick={() => window.location.href = `/events/${nextEvent.slug || nextEvent.id}`}
                        className="p-2 rounded-lg cursor-pointer"
                        style={{ background: isToday ? 'rgba(236,72,153,.08)' : 'rgba(255,255,255,.04)' }}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-medium"
                            style={{ color: isToday ? '#EC4899' : daysLeft! <= 7 ? '#F59E0B' : '#A78BFA' }}>
                            {isToday ? 'วันนี้!' : daysLeft === 1 ? 'พรุ่งนี้' : `อีก ${daysLeft} วัน`}
                          </span>
                          {nextEvent.start_time && (
                            <span className="text-[9px] text-muted">{nextEvent.start_time.slice(0,5)}</span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium truncate text-primary">{nextEvent.title}</p>
                        <p className="text-[10px] text-muted truncate">{nextEvent.venue?.name}</p>
                      </div>
                    ) : (
                      <div className="px-2 py-1.5 rounded-lg text-center bg-[var(--surface-2)]">
                        <p className="text-[10px] text-muted">ยังไม่มีงานที่กำลังจะมา</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── สถานที่ที่ติดตาม - ย้ายไป sidebar แล้ว ── */}
        {false && isLoggedIn && followedVenueIds.size > 0 && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-[var(--border)]">
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-1)] border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-pink-400" />
                <span className="text-[13px] font-medium">สถานที่ที่ติดตาม</span>
                <span className="text-[11px] text-muted">— งานเร็วๆ นี้</span>
              </div>
              <button onClick={() => window.location.href = '/venues'}
                className="text-[11px] text-pink-400 flex items-center gap-1">
                ดูทั้งหมด <ChevronRight size={11} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
              {events
                .filter(ev => !isPastEvent(ev, today) && followedVenueIds.has(ev.venue_id))
                .sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                .slice(0, 6)
                .map(ev => {
                  const start = parseISO(ev.start_date)
                  const days  = differenceInDays(start, new Date())
                  return (
                    <div key={ev.id}
                      onClick={() => window.location.href = `/events/${ev.slug || ev.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer bg-[var(--surface-1)] border border-[var(--border)]">
                      <div className="w-9 h-9 rounded-lg shrink-0 flex flex-col items-center justify-center bg-[var(--surface-2)]">
                        <span className="text-[13px] font-medium text-pink-400 leading-none">{format(start,'d')}</span>
                        <span className="text-[8px] text-pink-400 opacity-70 uppercase">{format(start,'MMM',{locale:th})}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate">{ev.title}</p>
                        <div className="flex items-center gap-1">
                          <MapPin size={9} className="text-muted shrink-0" />
                          <p className="text-[10px] text-muted truncate">{ev.venue?.name}</p>
                        </div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-medium"
                        style={{
                          background: days === 0 ? 'rgba(239,68,68,.1)' : days <= 3 ? 'rgba(245,158,11,.1)' : 'rgba(167,139,250,.1)',
                          color:      days === 0 ? '#EF4444' : days <= 3 ? '#F59E0B' : '#A78BFA',
                        }}>
                        {days === 0 ? 'วันนี้!' : `${days}วัน`}
                      </span>
                    </div>
                  )
                })
              }
              {events.filter(ev => !isPastEvent(ev, today) && followedVenueIds.has(ev.venue_id)).length === 0 && (
                <div className="col-span-full py-4 text-center text-[12px] text-muted">
                  ยังไม่มีงานจากสถานที่ที่ติดตาม
                </div>
              )}
            </div>
          </div>
        )}



        {/* FILTER */}

        {tab !== 'venues' && (
          <>
            <LiveTicker
              followedArtistIds={Array.from(followedIds)}
              followedVenueIds={Array.from(followedVenueIds)}
              userProvince={userProvince}
            />
            <FilterBar
              filters={filters}
              onChange={setFilters}
              totalCount={filtered.length}
            />
          </>
        )}

        {/* LOADING */}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ARTISTS TAB */}
        {!loading && tab === 'artists' && (
          <ArtistsTab followedIds={followedIds} onFollowToggle={(id, name) => {
            if (!isLoggedIn) { window.location.href = '/login'; return }
            toggleFollow(id, name)
          }} />
        )}

        {/* VENUES TAB */}
        {!loading && tab === 'venues' && (
          <VenuesTab followedVenueIds={followedVenueIds} onFollowToggle={(id) => {
            if (!isLoggedIn) { window.location.href = '/login'; return }
            const sb = createClient()
            const prev = followedVenueIds.has(id)
            setFollowedVenueIds(s => { const n = new Set(s); prev ? n.delete(id) : n.add(id); return n })
            if (prev) {
              sb.from('venue_follows').delete().eq('user_id', user!.id).eq('venue_id', id)
            } else {
              sb.from('venue_follows').insert({ user_id: user!.id, venue_id: id })
            }
          }} />
        )}

        {/* AI */}

        {!loading && tab === 'venues' && (
          <div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">
                  AI Recommended
                </h2>

                <p className="text-sm text-muted">
                  จากแนวเพลงและศิลปินที่คุณติดตาม
                </p>
              </div>

              <button
                onClick={generateAI}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]"
              >
                <RefreshCw
                  size={14}
                  className={
                    aiLoading
                      ? 'animate-spin'
                      : ''
                  }
                />
                สุ่มใหม่
              </button>
            </div>

            {aiLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {aiEvents.map(ev => (
                  <EventRow
                    key={ev.id}
                    event={ev}
                    likedIds={likedIds}
                    toggleLike={toggleLike}
                    attendance={attendance}
                    toggleAttendance={
                      toggleAttendance
                    }
                    followedIds={followedIds}
                    isLoggedIn={isLoggedIn}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW TOGGLE */}
        {!loading && tab !== 'venues' && tab !== 'artists' && (
          <div className="flex items-center justify-end gap-1 mb-1">
            <button onClick={() => setView('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all"
              style={{
                background: view === 'list' ? 'var(--accent-muted)' : 'transparent',
                color: view === 'list' ? 'var(--accent)' : 'var(--text-muted)',
                border: `1px solid ${view === 'list' ? 'var(--accent)' : 'var(--border)'}`,
              }}>
              <List size={13} /> รายการ
            </button>
            <button onClick={() => setView('calendar')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all"
              style={{
                background: view === 'calendar' ? 'var(--accent-muted)' : 'transparent',
                color: view === 'calendar' ? 'var(--accent)' : 'var(--text-muted)',
                border: `1px solid ${view === 'calendar' ? 'var(--accent)' : 'var(--border)'}`,
              }}>
              <Calendar size={13} /> ปฏิทิน
            </button>
          </div>
        )}

        {/* CALENDAR VIEW */}
        {!loading && tab !== 'venues' && tab !== 'artists' && view === 'calendar' && (
          <CalendarView
            events={filtered as any}
            likedIds={likedIds}
            onLike={id => toggleLike(id, '')}
          />
        )}

        {/* LIST */}

        {!loading &&
          tab !== 'venues' &&
          tab !== 'artists' &&
          view === 'list' && (
            <div className="flex flex-col gap-2">

              {eventsToShow.map(ev => (
                <EventRow
                  key={ev.id}
                  event={ev}
                  likedIds={likedIds}
                  toggleLike={toggleLike}
                  attendance={attendance}
                  toggleAttendance={toggleAttendance}
                  followedIds={followedIds}
                  isLoggedIn={isLoggedIn}
                />
              ))}

              {/* Guest blur CTA */}
              {!isLoggedIn && guestHidden.length > 0 && (
                <div className="relative mt-2">
                  {/* Blur preview — 3 งานแรกที่ซ่อน */}
                  <div style={{ filter: 'blur(4px)', opacity: 0.4, pointerEvents: 'none' }}>
                    {guestHidden.slice(0, 3).map(ev => (
                      <EventRow
                        key={ev.id}
                        event={ev}
                        likedIds={new Set()}
                        toggleLike={() => {}}
                        attendance={new Map()}
                        toggleAttendance={() => {}}
                        followedIds={new Set()}
                        isLoggedIn={false}
                      />
                    ))}
                  </div>
                  {/* CTA overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl"
                    style={{ background: 'linear-gradient(to top, var(--surface-0) 60%, transparent)' }}>
                    <p className="text-[15px] font-medium text-primary">
                      ยังมีอีก {guestHidden.length} งาน
                    </p>
                    <p className="text-[12px] text-muted">Login เพื่อดูงานทั้งหมด</p>
                    <div className="flex gap-2">
                      <a href="/login"
                        className="px-5 py-2.5 rounded-xl text-[13px] font-medium"
                        style={{ background: 'var(--accent)', color: 'white' }}>
                        Login
                      </a>
                      <a href="/login"
                        className="px-5 py-2.5 rounded-xl text-[13px] font-medium"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        สมัครฟรี
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {pastEvents.length > 0 && (
                <>
                  <button
                    onClick={() =>
                      setShowPast(v => !v)
                    }
                    className="w-full py-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] text-sm text-muted"
                  >
                    {showPast
                      ? 'ซ่อนงานที่ผ่านมา'
                      : `ดูงานที่ผ่านมา (${pastEvents.length})`}
                  </button>

                  {showPast && (
                    <div className="space-y-3">
                      {pastEvents.map(ev => (
                        <EventRow
                          key={ev.id}
                          event={ev}
                          likedIds={likedIds}
                          toggleLike={toggleLike}
                          attendance={attendance}
                          toggleAttendance={
                            toggleAttendance
                          }
                          followedIds={
                            followedIds
                          }
                          isLoggedIn={
                            isLoggedIn
                          }
                          isPast
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
        {/* ── RIGHT: Sidebar ── */}
        <div className="w-64 shrink-0 hidden lg:flex flex-col gap-4 sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto pb-4">

          {/* Countdown - Next show from followed artists */}
          {isLoggedIn && (() => {
            const nextEv = events
              .filter(ev => !isPastEvent(ev, today) && ev.artists?.some((a: any) => followedIds.has(a.id)))
              .sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0]
            if (!nextEv) return null
            const daysLeft = differenceInDays(parseISO(nextEv.start_date), new Date())
            return (
              <div className="rounded-xl p-4 cursor-pointer"
                onClick={() => window.location.href = `/events/${nextEv.slug || nextEv.id}`}
                style={{ background: 'var(--accent)', border: '1px solid var(--accent)' }}>
                <p className="text-[9px] font-medium tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>NEXT FOR YOU</p>
                <p className="text-[13px] font-medium text-white mb-2 line-clamp-2">{nextEv.title}</p>
                <div className="flex gap-3">
                  {[
                    { val: daysLeft, label: 'days' },
                    { val: new Date().getHours() > 0 ? 23 - new Date().getHours() : 0, label: 'hrs' },
                    { val: 59 - new Date().getMinutes(), label: 'min' },
                  ].map(u => (
                    <div key={u.label} className="text-center">
                      <div className="text-[22px] font-medium text-white leading-none">{String(u.val).padStart(2,'0')}</div>
                      <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{u.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Artists you follow */}
          {isLoggedIn && followedArtistInfo.size > 0 && (
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between px-3 py-2.5 border-b"
                style={{ borderColor: 'var(--border)' }}>
                <span className="text-[10px] font-medium tracking-widest text-muted uppercase">Artists you follow</span>
                <button onClick={() => window.location.href = '/artists'}
                  className="text-[10px]" style={{ color: 'var(--accent)' }}>
                  View all
                </button>
              </div>
              <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
                {Array.from(followedArtistInfo.entries()).slice(0, 5).map(([artistId, artist]) => {
                  const nextEvent = events
                    .filter(ev => !isPastEvent(ev, today) && ev.artists?.some((a: any) => a.id === artistId))
                    .sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0]
                  const daysLeft = nextEvent ? differenceInDays(parseISO(nextEvent.start_date), new Date()) : null
                  return (
                    <div key={artistId}
                      onClick={() => window.location.href = `/artists/${artist?.slug || artistId}`}
                      className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-[var(--surface-2)] transition-colors">
                      {artist?.image_url
                        ? <img src={artist.image_url} alt={artist.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        : <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-medium"
                            style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                            {(artist?.name_en || artist?.name)?.slice(0,2)}
                          </div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate text-primary">{artist?.name_en || artist?.name}</p>
                        <p className="text-[10px] text-muted truncate">
                          {nextEvent ? (daysLeft === 0 ? 'Today!' : `in ${daysLeft} days`) : 'No upcoming shows'}
                        </p>
                      </div>
                      {daysLeft !== null && daysLeft <= 7 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-medium"
                          style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                          Soon
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Venues you follow */}
          {isLoggedIn && followedVenueIds.size > 0 && (
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between px-3 py-2.5 border-b"
                style={{ borderColor: 'var(--border)' }}>
                <span className="text-[10px] font-medium tracking-widest text-muted uppercase">Venues you follow</span>
                <button onClick={() => window.location.href = '/venues'}
                  className="text-[10px]" style={{ color: 'var(--accent)' }}>
                  View all
                </button>
              </div>
              <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
                {Array.from(followedVenueIds).slice(0, 4).map(venueId => {
                  const venueEvents = events.filter(ev => !isPastEvent(ev, today) && ev.venue_id === venueId)
                  const venueInfo = followedVenueInfo.get(venueId)
                  const venueName = venueInfo?.name ?? venueEvents[0]?.venue?.name ?? '—'
                  const venueSlug = venueInfo?.slug || venueId
                  return (
                    <div key={venueId}
                      onClick={() => window.location.href = `/venues/${venueSlug}`}
                      className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-[var(--surface-2)] transition-colors">
                      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ background: 'var(--surface-2)' }}>
                        <MapPin size={13} className="text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate text-primary">{venueName}</p>
                        <p className="text-[10px] text-muted">{venueEvents.length} upcoming shows</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
        </div>
      </main>
    </div>
  )
}


// =========================================================
// SKELETON LOADER
// =========================================================

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="flex" style={{ background: 'var(--surface-1)', minHeight: 90 }}>
        {/* Date placeholder */}
        <div className="shrink-0 flex flex-col items-center justify-center border-r border-[var(--border)] bg-[var(--surface-1)]" style={{ width: 64 }}>
          <div className="w-7 h-5 rounded mb-1" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div className="w-5 h-3 rounded" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        {/* Body placeholder */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex gap-1.5 mb-2">
            <div className="w-10 h-4 rounded-full" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div className="w-14 h-4 rounded-full" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
          <div className="w-3/4 h-4 rounded mb-2" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div className="w-1/2 h-3 rounded mb-2" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div className="w-2/3 h-3 rounded" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        {/* Right placeholder */}
        <div className="shrink-0 border-l border-[var(--border)] p-2.5 flex flex-col items-end justify-between" style={{ width: 80 }}>
          <div className="w-10 h-4 rounded" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

// =========================================================
// EVENT ROW
// =========================================================

function EventRow({
  event,
  likedIds,
  toggleLike,
  attendance,
  toggleAttendance,
  followedIds,
  isLoggedIn,
  isPast,
}: any) {

  const start = parseISO(event.start_date)
  const liked = likedIds.has(event.id)
  const attendStatus = attendance.get(event.id) || null
  const isFollowed = event.artists?.some((a: any) => followedIds.has(a.id))
  const featured = event.featured_type
  const poster   = event.poster_url

  // Social proof counts (lazy load)
  const [goingCount,      setGoingCount]      = useState<number | null>(null)
  const [interestedCount, setInterestedCount] = useState<number | null>(null)
  const sb2 = createClient()

  useEffect(() => {
    if (isPast) return
    sb2.from('event_interactions')
      .select('type')
      .eq('event_id', event.id)
      .then(({ data }) => {
        if (!data) return
        setGoingCount(data.filter((r: any) => r.type === 'going').length)
        setInterestedCount(data.filter((r: any) => r.type === 'interested').length)
      })
  }, [event.id])

  return (
    <div
      onClick={() => { if (!isPast) window.location.href = `/events/${event.slug || event.id}` }}
      className={cn('rounded-2xl overflow-hidden flex flex-col', isPast ? 'opacity-40' : 'cursor-pointer transition-all hover:scale-[1.01]')}
      style={{
        border: featured === 'partner'   ? '1.5px solid #EF9F27'
               : featured === 'wvrn_picks' ? '1.5px solid #7C3AED'
               : '1px solid var(--border)',
      }}>

      {/* ── PARTNER: Style C — hero poster full width ── */}
      {featured === 'partner' && (
        <>
          {/* Banner */}
          <div style={{ background: '#EF9F27', padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#412402', letterSpacing: '.06em' }}>⭐ EVENT PARTNER</span>
            <span style={{ fontSize: 10, color: '#633806', marginLeft: 'auto' }}>WVRN Partner</span>
          </div>

          {/* Hero poster */}
          <div style={{ position: 'relative', height: 130, background: 'var(--surface-2)', overflow: 'hidden' }}>
            {poster ? (
              <img src={poster} alt={event.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a0a2e, #3d1a5e)' }} />
            )}
            {/* Gradient overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.65) 0%, transparent 55%)' }} />
            {/* Title on image */}
            <div style={{ position: 'absolute', bottom: 10, left: 14, right: 14 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.3 }}>{event.title}</p>
              {event.artists?.length > 0 && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', margin: '2px 0 0' }}>
                  {event.artists.slice(0, 3).map((a: any) => a.name_en || a.name).join(' · ')}
                </p>
              )}
            </div>
            {/* Date badge */}
            <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.6)', borderRadius: 8, padding: '4px 8px', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#EF9F27', lineHeight: 1 }}>{format(start, 'd')}</div>
              <div style={{ fontSize: 8, color: '#EF9F27', textTransform: 'uppercase', opacity: .8 }}>{format(start, 'MMM')}</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: 'var(--surface-1)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '0.5px solid var(--border)' }}>
            <div>
              {event.venue?.name && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} /> {event.venue.name}
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, color: '#EF9F27' }}>
                {event.is_free ? 'ฟรี' : event.ticket_price_min ? `฿${Number(event.ticket_price_min).toLocaleString()}` : 'TBA'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {event.ticket_url && (
                <a href={event.ticket_url} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Ticket size={13} /> ซื้อบัตร
                </a>
              )}
              <button onClick={e => { e.stopPropagation(); window.open(googleCalendarUrl(event), '_blank') }}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                <CalendarPlus size={13} className="text-muted" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── WVRN PICKS banner ── */}
      {featured === 'wvrn_picks' && (
        <div style={{ background: '#7C3AED', padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#EEEDFE', letterSpacing: '.06em' }}>⚡ WVRN PICKS</span>
          <span style={{ fontSize: 10, color: '#CECBF6', marginLeft: 'auto' }}>แนะนำโดย WVRN</span>
        </div>
      )}

      {/* ── Normal card body (WVRN Picks + regular) ── */}
      {featured !== 'partner' && (
      <div className="flex" style={{ background: 'var(--surface-1)', minHeight: 90 }}>

        {/* POSTER / DATE */}
        {poster ? (
          <div className="relative shrink-0" style={{ width: 90 }}>
            <img src={poster} alt={event.title}
              className="w-full h-full object-cover"
              style={{ display: 'block', minHeight: 90 }} />
            {/* Date overlay */}
            <div style={{
              position: 'absolute', top: 6, left: 6,
              background: 'rgba(0,0,0,.7)', borderRadius: 8,
              padding: '3px 7px', textAlign: 'center', backdropFilter: 'blur(4px)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f472b6', lineHeight: 1 }}>
                {format(start, 'd')}
              </div>
              <div style={{ fontSize: 8, color: '#a1a1aa', textTransform: 'uppercase' }}>
                {format(start, 'MMM')}
              </div>
            </div>
          </div>
        ) : (
          <div className="shrink-0 flex flex-col items-center justify-center border-r border-[var(--border)] bg-[var(--surface-1)]"
            style={{ width: 64 }}>
            <div className="text-2xl font-bold text-pink-500">{format(start, 'd')}</div>
            <div className="text-xs uppercase text-muted">{format(start, 'MMM')}</div>
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {isFollowed && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400">ติดตาม</span>
            )}
            {event.genres?.slice(0, 2).map((g: string) => (
              <span key={g} className={cn('text-[10px] px-2 py-0.5 rounded-full', genreTagClass(g))}>{g}</span>
            ))}
          </div>

          <h3 className="font-semibold text-[14px] leading-tight truncate text-primary mb-0.5">
            {event.title}
          </h3>

          {event.artists?.length > 0 && (
            <p className="text-[11px] text-muted truncate">
              {event.artists.map((a: any) => a.name_en || a.name).join(' · ')}
            </p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[11px] text-muted">
            {event.venue && (
              <span className="flex items-center gap-1"><MapPin size={11} />{event.venue.name}</span>
            )}
            {event.start_time && (
              <span className="flex items-center gap-1"><Clock size={11} />{event.start_time.slice(0,5)}</span>
            )}
          </div>

          {/* Social proof */}
          {!isPast && (goingCount !== null || interestedCount !== null) && (goingCount! > 0 || interestedCount! > 0) && (
            <div className="flex items-center gap-2 mt-1.5">
              {interestedCount! > 0 && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}>
                  <Heart size={9} className="text-pink-400" />
                  {interestedCount!.toLocaleString()} สนใจ
                </span>
              )}
              {goingCount! > 0 && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(232,0,58,0.1)', color: 'var(--accent)' }}>
                  <Users size={9} />
                  {goingCount!.toLocaleString()} จะไป
                </span>
              )}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="shrink-0 border-l border-[var(--border)] flex flex-col" style={{ width: 72 }}>
          {/* ราคา */}
          <div className="px-2 pt-2.5 pb-1.5 text-[11px] font-semibold leading-tight text-center"
            style={{ color: featured === 'partner' ? '#EF9F27' : featured === 'wvrn_picks' ? '#A78BFA' : 'var(--accent)' }}>
            {formatPrice(event)}
          </div>

          {/* ซื้อบัตร */}
          {event.ticket_url && !isPast ? (
            <a href={event.ticket_url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all border-t border-[var(--border)]"
              style={{ background: 'var(--accent)' }}
              title="ซื้อบัตร">
              <Ticket size={13} style={{ color: 'white' }} />
              <span className="text-[8px] font-medium" style={{ color: 'white' }}>ซื้อบัตร</span>
            </a>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5 border-t border-[var(--border)] cursor-not-allowed"
              style={{ background: 'var(--surface-2)', opacity: 0.4 }}>
              <Ticket size={13} className="text-muted" />
              <span className="text-[8px] text-muted">ซื้อบัตร</span>
            </div>
          )}

          {/* ปฏิทิน */}
          {!isPast ? (
            <button
              onClick={e => { e.stopPropagation(); window.open(googleCalendarUrl(event), '_blank') }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 border-t border-[var(--border)] transition-all hover:bg-[var(--surface-2)]"
              title="เพิ่มในปฏิทิน">
              <CalendarPlus size={13} className="text-muted" />
              <span className="text-[8px] text-muted">ปฏิทิน</span>
            </button>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-0.5 border-t border-[var(--border)] cursor-not-allowed"
              style={{ opacity: 0.4 }}>
              <CalendarPlus size={13} className="text-muted" />
              <span className="text-[8px] text-muted">ปฏิทิน</span>
            </div>
          )}
        </div>

      </div>
      )}
    </div>
  )
}

// ── ArtistsTab ──────────────────────────────────────────────
function ArtistsTab({ followedIds, onFollowToggle }: { followedIds: Set<string>; onFollowToggle: (id: string, name: string) => void }) {
  const [artists, setArtists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const sb = createClient()

  useEffect(() => {
    sb.from('artists').select('id,name,name_en,slug,image_url,genres,follower_count')
      .order('follower_count', { ascending: false })
      .then(({ data }) => { setArtists(data || []); setLoading(false) })
  }, [])

  const filtered = artists.filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) ||
    (a.name_en ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center gap-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-3 py-2 mb-4">
        <Search size={14} className="text-muted shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาศิลปิน..." className="bg-transparent outline-none text-sm flex-1 text-secondary" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-full shrink-0" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="w-3/4 h-3.5 rounded" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div className="w-1/2 h-3 rounded" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
              <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map(artist => {
            const followed = followedIds.has(artist.id)
            return (
              <div key={artist.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                {artist.image_url
                  ? <img src={artist.image_url} alt={artist.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  : <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[12px] font-medium bg-[var(--surface-2)] text-pink-400">
                      {(artist.name_en || artist.name).slice(0,2)}
                    </div>
                }
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => window.location.href = `/artists/${artist.slug || artist.id}`}>
                  <p className="text-[13px] font-medium text-primary truncate">{artist.name_en || artist.name}</p>
                  {artist.name_en && artist.name !== artist.name_en && (
                    <p className="text-[10px] text-muted truncate">{artist.name}</p>
                  )}
                  {artist.follower_count > 0 && (
                    <p className="text-[10px] text-muted">{artist.follower_count} followers</p>
                  )}
                </div>
                <button onClick={() => onFollowToggle(artist.id, artist.name)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                  style={{ background: followed ? '#E8003A' : 'rgba(255,255,255,.06)', border: followed ? 'none' : '1px solid rgba(255,255,255,.1)' }}>
                  <Heart size={14} style={{ color: 'white', fill: followed ? 'white' : 'none' }} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── VenuesTab ──────────────────────────────────────────────
function VenuesTab({ followedVenueIds, onFollowToggle }: { followedVenueIds: Set<string>; onFollowToggle: (id: string) => void }) {
  const [venues,  setVenues]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const sb = createClient()

  useEffect(() => {
    sb.from('venues').select('id,name,slug,province,image_url,follower_count,event_count')
      .is('deleted_at', null)
      .order('follower_count', { ascending: false })
      .then(({ data }) => { setVenues(data || []); setLoading(false) })
  }, [])

  const followed = venues.filter(v => followedVenueIds.has(v.id))
  const others   = venues.filter(v => !followedVenueIds.has(v.id))
  const filtered = (arr: any[]) => !search ? arr : arr.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.province?.toLowerCase().includes(search.toLowerCase())
  )

  const VenueCard = ({ venue }: { venue: any }) => {
    const isFollowed = followedVenueIds.has(venue.id)
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
        {venue.image_url
          ? <img src={venue.image_url} alt={venue.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
          : <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center bg-[var(--surface-2)]">
              <MapPin size={16} style={{ color: 'var(--accent)' }} />
            </div>
        }
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => window.location.href = `/venues/${venue.slug || venue.id}`}>
          <p className="text-[13px] font-medium text-primary truncate">{venue.name}</p>
          {venue.province && <p className="text-[11px] text-muted truncate">{venue.province}</p>}
        </div>
        <button onClick={() => onFollowToggle(venue.id)}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
          style={{ background: isFollowed ? '#E8003A' : 'rgba(255,255,255,.06)', border: isFollowed ? 'none' : '1px solid rgba(255,255,255,.1)' }}>
          <Heart size={14} style={{ color: 'white', fill: isFollowed ? 'white' : 'none' }} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-3 py-2 mb-4">
        <Search size={14} className="text-muted shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาสถานที่..." className="bg-transparent outline-none text-sm flex-1 text-secondary" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: 'var(--surface-2)' }} />
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="w-3/4 h-3.5 rounded" style={{ background: 'var(--surface-2)' }} />
                <div className="w-1/2 h-3 rounded" style={{ background: 'var(--surface-2)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ติดตามอยู่ */}
          {followed.length > 0 && filtered(followed).length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted uppercase tracking-widest mb-2">ติดตามอยู่</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filtered(followed).map(v => <VenueCard key={v.id} venue={v} />)}
              </div>
            </div>
          )}
          {/* สถานที่ทั้งหมด */}
          <div>
            {followed.length > 0 && <p className="text-[10px] font-medium text-muted uppercase tracking-widest mb-2">สถานที่ทั้งหมด</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filtered(others).map(v => <VenueCard key={v.id} venue={v} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
