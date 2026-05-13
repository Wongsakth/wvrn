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
} from 'lucide-react'

import Navbar from '@/components/layout/Navbar'
import CalendarView from '@/components/calendar/CalendarView'
import FilterBar from '@/components/events/FilterBar'

import {
  cn,
  formatPrice,
  statusLabel,
  genreTagClass,
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

type TabMode = 'all' | 'following' | 'ai'
type AttendStatus = 'going' | 'attended' | null

export default function HomePage() {
  const sb = createClient()
  const { user, loading: authLoading } = useAuth()

  const isLoggedIn = !authLoading && !!user

  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [followedVenueIds, setFollowedVenueIds] = useState<Set<string>>(new Set())

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
    setLikedIds(prev => {
      const next = new Set(prev)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

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
          .select('venue_id')
          .eq('user_id', user.id)

        if (error) throw error

        setFollowedVenueIds(
          new Set(
            (data || []).map((f: any) => f.venue_id)
          )
        )
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
      tab === 'ai' &&
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
        if (
          filters.province &&
          ev.province !== filters.province
        ) {
          return false
        }

        if (
          filters.genre &&
          !ev.genres?.includes(filters.genre)
        ) {
          return false
        }

        if (
          filters.eventType &&
          ev.event_type !== filters.eventType
        ) {
          return false
        }

        if (
          filters.isFree &&
          !ev.is_free
        ) {
          return false
        }

        if (search) {
          const q = search.toLowerCase()

          const matched =
            ev.title?.toLowerCase().includes(q) ||
            ev.artists?.some((a: any) =>
              a.name?.toLowerCase().includes(q)
            ) ||
            ev.venue?.name
              ?.toLowerCase()
              .includes(q)

          if (!matched) return false
        }

        return true
      })

      .sort(
        (a, b) =>
          new Date(a.start_date).getTime() -
          new Date(b.start_date).getTime()
      )
  }, [
    events,
    filters,
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

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="max-w-screen-xl mx-auto px-4 py-6">

        {/* HERO */}

        <div className="mb-6">
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 mb-3">
            🎵 Never Miss a Show
          </span>

          <h1 className="text-4xl font-bold">
            WVRN
          </h1>

          <p className="text-zinc-400 mt-1">
            ติดตามศิลปินที่ชอบ ไม่พลาดทุก Concert ในไทย
          </p>
        </div>

        {/* TOOLBAR */}

        <div className="flex flex-wrap gap-3 items-center justify-between mb-5">

          {/* Tabs */}

          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            {[
              {
                id: 'all',
                label: 'ทั้งหมด',
                icon: Music,
              },
              {
                id: 'following',
                label: 'ติดตาม',
                icon: Heart,
              },
              {
                id: 'ai',
                label: 'AI แนะนำ',
                icon: Sparkles,
              },
            ].map(item => {
              const Icon = item.icon

              return (
                <button
                  key={item.id}
                  onClick={() =>
                    setTab(item.id as TabMode)
                  }
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                    tab === item.id
                      ? 'bg-pink-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Search */}

          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
            <Search size={14} />
            <input
              value={search}
              onChange={e =>
                setSearch(e.target.value)
              }
              placeholder="ค้นหางาน..."
              className="bg-transparent outline-none text-sm"
            />
          </div>
        </div>

        {/* FILTER */}

        {tab !== 'ai' && (
          <FilterBar
            filters={filters}
            onChange={setFilters}
            totalCount={filtered.length}
          />
        )}

        {/* LOADING */}

        {loading && (
          <div className="py-24 flex items-center justify-center gap-2 text-zinc-400">
            <Loader2
              size={18}
              className="animate-spin"
            />
            กำลังโหลด...
          </div>
        )}

        {/* AI */}

        {!loading && tab === 'ai' && (
          <div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">
                  AI Recommended
                </h2>

                <p className="text-sm text-zinc-400">
                  จากแนวเพลงและศิลปินที่คุณติดตาม
                </p>
              </div>

              <button
                onClick={generateAI}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800"
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

        {/* LIST */}

        {!loading &&
          tab !== 'ai' &&
          view === 'list' && (
            <div className="space-y-3">

              {upcomingEvents.map(ev => (
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

              {pastEvents.length > 0 && (
                <>
                  <button
                    onClick={() =>
                      setShowPast(v => !v)
                    }
                    className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-400"
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

      </main>
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

  const attendStatus =
    attendance.get(event.id) || null

  const isFollowed =
    event.artists?.some((a: any) =>
      followedIds.has(a.id)
    )

  return (
    <div
      onClick={() => {
        if (!isPast) {
          window.location.href = `/events/${event.id}`
        }
      }}
      className={cn(
        'rounded-2xl border overflow-hidden flex',
        isPast
          ? 'opacity-40 border-zinc-800'
          : 'border-zinc-800 hover:border-zinc-700 cursor-pointer'
      )}
    >

      {/* DATE */}

      <div className="w-16 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center justify-center py-4">
        <div className="text-2xl font-bold text-pink-500">
          {format(start, 'd')}
        </div>

        <div className="text-xs uppercase text-zinc-500">
          {format(start, 'MMM')}
        </div>
      </div>

      {/* BODY */}

      <div className="flex-1 p-4 min-w-0">

        <div className="flex flex-wrap gap-2 mb-2">

          {isFollowed && (
            <span className="text-xs px-2 py-1 rounded-full bg-pink-500/10 text-pink-400">
              ติดตาม
            </span>
          )}

          {event.genres?.slice(0, 2).map((g: string) => (
            <span
              key={g}
              className={cn(
                'text-xs px-2 py-1 rounded-full',
                genreTagClass(g)
              )}
            >
              {g}
            </span>
          ))}
        </div>

        <h3 className="font-semibold text-lg truncate">
          {event.title}
        </h3>

        {event.artists?.length > 0 && (
          <p className="text-sm text-zinc-400 mt-1 truncate">
            {event.artists
              .map((a: any) => a.name)
              .join(' · ')}
          </p>
        )}

        <div className="flex flex-wrap gap-4 mt-3 text-sm text-zinc-500">

          {event.venue && (
            <div className="flex items-center gap-1">
              <MapPin size={13} />
              {event.venue.name}
            </div>
          )}

          {event.start_time && (
            <div className="flex items-center gap-1">
              <Clock size={13} />
              {event.start_time.slice(0, 5)}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}

      <div className="w-28 border-l border-zinc-800 p-3 flex flex-col items-end justify-between">

        <div className="text-pink-400 font-semibold">
          {formatPrice(event)}
        </div>

        <div className="flex flex-col gap-2 items-end">

          {!isPast && isLoggedIn && (
            <button
              onClick={e => {
                e.stopPropagation()

                toggleAttendance(
                  event.id,
                  attendStatus
                )
              }}
              className="text-xs px-3 py-1 rounded-lg border border-zinc-700 bg-zinc-900"
            >
              {attendStatus === 'going'
                ? 'จะไป'
                : attendStatus === 'attended'
                ? 'ไปแล้ว'
                : '+ จะไป'}
            </button>
          )}

          <button
            onClick={e => {
              e.stopPropagation()
              toggleLike(event.id)
            }}
            className="w-9 h-9 rounded-xl border border-zinc-700 bg-zinc-900 flex items-center justify-center"
          >
            <Heart
              size={14}
              className={
                liked
                  ? 'fill-pink-500 text-pink-500'
                  : 'text-zinc-400'
              }
            />
          </button>
        </div>
      </div>
    </div>
  )
}