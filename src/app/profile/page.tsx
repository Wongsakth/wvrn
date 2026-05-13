'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar, List, LayoutGrid, Search, Loader2, MapPin, Clock,
  ChevronRight, Heart, Bell, Music, Sparkles, RefreshCw,
  CheckCircle2, CalendarCheck } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import CalendarView from '@/components/calendar/CalendarView'
import FilterBar from '@/components/events/FilterBar'
import { cn, formatPrice, statusLabel, genreTagClass } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { format, parseISO, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'
import type { EventFilters, ViewMode } from '@/types'

type TabMode = 'all' | 'following' | 'ai'
type AttendStatus = 'going' | 'attended' | null

export default function HomePage() {
  const [events,           setEvents]           = useState<any[]>([])
  const [followedIds,      setFollowedIds]      = useState<Set<string>>(new Set())
  const [followedVenueIds, setFollowedVenueIds] = useState<Set<string>>(new Set())
  const [followedArtistInfo, setFollowedArtistInfo] = useState<Map<string,any>>(new Map())
  const [attendance,       setAttendance]       = useState<Map<string, AttendStatus>>(new Map())
  const [filters,          setFilters]          = useState<EventFilters>({})
  const [view,             setView]             = useState<ViewMode>('list')
  const [tab,              setTab]              = useState<TabMode>('all')
  const [search,           setSearch]           = useState('')
  const [likedIds,         setLikedIds]         = useState<Set<string>>(new Set())
  const [loading,          setLoading]          = useState(true)
  const [showPast,         setShowPast]         = useState(false)
  const [aiEvents,         setAiEvents]         = useState<any[]>([])
  const [aiLoading,        setAiLoading]        = useState(false)
  const { user, loading: authLoading } = useAuth()
  const isLoggedIn = !authLoading && !!user
  const sb = createClient()

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  // Load events
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await sb
          .from('events')
          .select('*, venue:venues(id,name,province,address,maps_url), event_artists(artist:artists(id,name,name_en,genres,image_url))')
          .order('start_date', { ascending: true })
        if (error) throw error
        setEvents((data || []).map((ev: any) => ({
          ...ev,
          artists: ev.event_artists?.map((ea: any) => ea.artist).filter(Boolean) ?? [],
        })))
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Load follows (artists + venues)
  useEffect(() => {
    if (!user) {
      setFollowedIds(new Set())
      setFollowedArtistInfo(new Map())
      setFollowedVenueIds(new Set())
      return
    }

    async function loadFollows() {
      try {
        // Load followed artists
        const { data: artistsData, error: artistsError } = await sb
          .from('follows')
          .select('artist_id, artist:artists(id,name,name_en,image_url,genres)')
          .eq('user_id', user.id)
        
        if (artistsError) throw artistsError
        
        setFollowedIds(new Set((artistsData || []).map((f: any) => f.artist_id)))
        setFollowedArtistInfo(new Map((artistsData || []).map((f: any) => [f.artist_id, f.artist])))

        // Load followed venues
        const { data: venuesData, error: venuesError } = await sb
          .from('venue_follows')
          .select('venue_id')
          .eq('user_id', user.id)
          
        if (venuesError) throw venuesError
        
        setFollowedVenueIds(new Set((venuesData || []).map((f: any) => f.venue_id)))
      } catch (e) {
        console.error('Error loading follows:', e)
      }
    }

    loadFollows()
  }, [user])

  // Load attendance
  useEffect(() => {
    if (!user) { setAttendance(new Map()); return }

    async function loadAttendance() {
      try {
        const { data, error } = await sb
          .from('event_attendance')
          .select('event_id, status')
          .eq('user_id', user.id)
        
        if (error) throw error
        
        const map = new Map((data || []).map((a: any) => [a.event_id, a.status as AttendStatus]))
        setAttendance(map)
      } catch (e) {
        console.error('Error loading attendance:', e)
      }
    }

    loadAttendance()
  }, [user])

  // Toggle attendance status
  async function toggleAttendance(eventId: string, currentStatus: AttendStatus) {
    if (!user) { window.location.href = '/login'; return }
    const next: AttendStatus =
      currentStatus === null      ? 'going'    :
      currentStatus === 'going'   ? 'attended' : null

    // Optimistic update
    setAttendance(prev => {
      const n = new Map(prev)
      if (next === null) n.delete(eventId)
      else n.set(eventId, next)
      return n
    })

    try {
      if (next === null) {
        await sb.from('event_attendance').delete().eq('user_id', user.id).eq('event_id', eventId)
      } else if (currentStatus === null) {
        await sb.from('event_attendance').insert({ user_id: user.id, event_id: eventId, status: next })
      } else {
        await sb.from('event_attendance').update({ status: next }).eq('user_id', user.id).eq('event_id', eventId)
      }
    } catch (e) {
      // revert
      setAttendance(prev => {
        const n = new Map(prev)
        if (currentStatus === null) n.delete(eventId)
        else n.set(eventId, currentStatus)
        return n
      })
    }
  }

  // AI recommend — based on followed artists' genres
  const generateAI = useCallback(() => {
    setAiLoading(true)
    setTimeout(() => {
      const followedGenres = new Set<string>()
      followedArtistInfo.forEach(artist => {
        (artist?.genres ?? []).forEach((g: string) => followedGenres.add(g))
      })

      const attended = new Set(
        [...attendance.entries()].filter(([,v]) => v === 'attended').map(([k]) => k)
      )

      // Score events
      const scored = events
        .filter(ev => !isPastEvent(ev, today))
        .filter(ev => !followedIds.has(ev.id))
        .map(ev => {
          let score = Math.random() * 30 // base random
          // Boost ถ้า genre ตรง
          const evGenres: string[] = ev.genres ?? []
          evGenres.forEach(g => { if (followedGenres.has(g)) score += 25 })
          // Boost ถ้าศิลปินซ้ายเคย attend
          ev.artists?.forEach((a: any) => {
            events.forEach(e => {
              if (attendance.get(e.id) === 'attended' && e.artists?.some((x: any) => x.id === a.id)) score += 15
            })
          })
          return { ev, score }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(x => x.ev)

      setAiEvents(scored)
      setAiLoading(false)
    }, 600)
  }, [events, followedArtistInfo, followedIds, attendance, today])

  useEffect(() => {
    if (tab === 'ai' && aiEvents.length === 0 && !aiLoading) generateAI()
  }, [tab])

  function isPastEvent(ev: any, t: Date) {
    return new Date(ev.end_date || ev.start_date) < t
  }

  const filtered = useMemo(() => {
    let base = events
    if (tab === 'following') {
      base = base.filter(ev => ev.artists?.some((a: any) => followedIds.has(a.id)))
    }
    return base
      .filter(ev => {
        if (filters.province  && ev.province !== filters.province)    return false
        if (filters.genre     && !ev.genres?.includes(filters.genre)) return false
        if (filters.eventType && ev.event_type !== filters.eventType) return false
        if (filters.isFree    && !ev.is_free)                         return false
        if (search) {
          const q = search.toLowerCase()
          if (!ev.title?.toLowerCase().includes(q) &&
              !ev.artists?.some((a: any) => a.name?.toLowerCase().includes(q)) &&
              !ev.venue?.name?.toLowerCase().includes(q)) return false
        }
        return true
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  }, [events, filters, search, tab, followedIds])

  function toggleLike(id: string) {
    setLikedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const pastEvents     = filtered.filter(ev => isPastEvent(ev, today))
  const upcomingEvents = filtered.filter(ev => !isPastEvent(ev, today))

  const eventRowProps = { likedIds, toggleLike, followedIds, attendance, toggleAttendance, isLoggedIn }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{ background: 'linear-gradient(160deg, var(--surface-1) 0%, var(--surface-0) 100%)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <span className="inline-block text-[11px] font-medium px-3 py-1 rounded-full uppercase tracking-wider mb-2"
                style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                🎵 Never Miss a Show
              </span>
              <h1 className="text-[28px] sm:text-[36px] font-medium leading-tight text-primary">
                WVRN
              </h1>
              <p className="text-[14px] text-secondary mt-1">
                ติดตามศิลปินที่ชอบ ไม่พลาดทุก Concert ในไทย
              </p>
            </div>
            <div className="flex gap-4">
              {[
                { num: events.length || '—', label: 'งานทั้งหมด' },
                { num: '180+', label: 'ศิลปิน' },
              ].map(s => (
                <div key={s.label} className="text-right">
                  <div className="text-[20px] font-medium text-accent">{s.num}</div>
                  <div className="text-[11px] text-muted">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOLLOWING SECTION ── */}
      {isLoggedIn && followedArtistInfo.size > 0 && (
        <section style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Heart size={14} style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />
                <span className="text-[13px] font-medium text-primary">ศิลปินที่ติดตาม</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full text-muted"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {followedArtistInfo.size} คน
                </span>
              </div>
              <button onClick={() => window.location.href = '/artists'}
                className="text-[12px] flex items-center gap-1"
                style={{ color: 'var(--accent)' }}>
                จัดการ <ChevronRight size={12} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {Array.from(followedArtistInfo.entries()).map(([artistId, artist]) => {
                const nextEvent = events
                  .filter(ev => !isPastEvent(ev, today) && ev.artists?.some((a: any) => a.id === artistId))
                  .sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0]
                const daysLeft = nextEvent ? differenceInDays(new Date(nextEvent.start_date), new Date()) : null
                const isToday  = daysLeft === 0
                const isSoon   = daysLeft !== null && daysLeft <= 7

                return (
                  <div key={artistId}
                    className="rounded-xl overflow-hidden"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

                    {/* Artist row */}
                    <div
                      onClick={() => { window.location.href = `/artists/${artistId}` }}
                      className="flex items-center gap-3 p-3 cursor-pointer transition-all"
                      style={{ borderBottom: nextEvent ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {artist?.image_url
                        ? <img src={artist.image_url} alt={artist.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0" />
                        : <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[11px] font-medium"
                            style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                            {artist?.name?.slice(0,2)}
                          </div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-primary truncate">{artist?.name}</p>
                        {artist?.name_en && <p className="text-[10px] text-muted truncate">{artist.name_en}</p>}
                      </div>
                      <Heart size={11} style={{ color: 'var(--accent)', fill: 'var(--accent)', flexShrink: 0 }} />
                    </div>

                    {/* Next event */}
                    {nextEvent ? (
                      <div
                        onClick={() => { window.location.href = `/events/${nextEvent.id}` }}
                        className="p-3 cursor-pointer transition-all"
                        style={{
                          background: isToday ? 'rgba(232,0,58,.06)' : 'var(--surface-2)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium"
                            style={{ color: isToday ? '#E8003A' : isSoon ? '#EF9F27' : 'var(--accent)' }}>
                            {isToday ? 'วันนี้!' : daysLeft === 1 ? 'พรุ่งนี้' : `อีก ${daysLeft} วัน`}
                          </span>
                          {nextEvent.start_time && (
                            <span className="text-[10px] text-muted">{nextEvent.start_time.slice(0,5)} น.</span>
                          )}
                        </div>
                        <p className="text-[12px] font-medium text-primary truncate mb-0.5">{nextEvent.title}</p>
                        <p className="text-[10px] text-muted truncate">{nextEvent.venue?.name}</p>
                      </div>
                    ) : (
                      <div className="px-3 py-2.5 text-center"
                        style={{ background: 'var(--surface-2)', borderTop: '1px dashed var(--border)' }}>
                        <p className="text-[11px] text-muted">ยังไม่มีงานที่กำลังจะมา</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── VENUE FOLLOWING SECTION ── */}
      {isLoggedIn && followedVenueIds.size > 0 && (
        <section style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-[13px] font-medium text-primary">สถานที่ที่ติดตาม</span>
                <span className="text-[11px] text-muted">— งานเร็วๆ นี้</span>
              </div>
              <button onClick={() => window.location.href = '/venues'}
                className="text-[11px] flex items-center gap-1"
                style={{ color: 'var(--accent)' }}>
                ดูทั้งหมด <ChevronRight size={11} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {events
                .filter(ev => !isPastEvent(ev, today) && followedVenueIds.has(ev.venue_id))
                .sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                .slice(0, 6)
                .map(ev => <VenueMiniCard key={ev.id} event={ev} />)
              }
              {events.filter(ev => !isPastEvent(ev, today) && followedVenueIds.has(ev.venue_id)).length === 0 && (
                <div className="col-span-full py-4 text-center text-[12px] text-muted rounded-xl"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  ยังไม่มีงานจากสถานที่ที่ติดตาม
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── ALL EVENTS ── */}
      <section id="all-events" className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          {/* Tabs */}
          <div className="flex p-1 rounded-xl gap-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            {([
              { id: 'all',       icon: Music,    label: 'ทั้งหมด' },
              { id: 'following', icon: Heart,    label: 'ติดตาม' },
              { id: 'ai',        icon: Sparkles, label: 'แนะนำ' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all',
                  tab === id ? 'text-[var(--surface-0)]' : 'text-muted hover:text-primary'
                )}
                style={{ background: tab === id ? 'var(--accent)' : 'transparent' }}>
                <Icon size={13} />
                {label}
                {id === 'following' && followedIds.size > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-0.5"
                    style={{ background: tab === 'following' ? 'rgba(255,255,255,.2)' : 'var(--accent-muted)', color: tab === 'following' ? 'white' : 'var(--accent)' }}>
                    {followedIds.size}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <Search size={13} className="text-muted shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหางาน, ศิลปิน..."
                className="bg-transparent text-[13px] text-primary outline-none w-36 placeholder:text-muted" />
            </div>
            <div className="flex p-1 rounded-lg gap-0.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              {([{id:'calendar',icon:Calendar},{id:'list',icon:List},{id:'grid',icon:LayoutGrid}] as const).map(v => (
                <button key={v.id} onClick={() => setView(v.id as any)}
                  className="p-1.5 rounded"
                  style={{ background: view === v.id ? 'var(--surface-3)' : 'transparent', color: view === v.id ? 'var(--accent)' : 'var(--muted)' }}>
                  <v.icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <FilterBar onFilterChange={setFilters} />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw size={24} className="text-accent animate-spin" />
            <p className="text-[13px] text-muted">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <div className="space-y-10 mt-6">
            {tab === 'ai' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[16px] font-medium text-primary flex items-center gap-2">
                      <Sparkles size={16} className="text-accent" /> สำหรับคุณโดยเฉพาะ
                    </h3>
                    <p className="text-[12px] text-muted">วิเคราะห์จากศิลปินที่คุณติดตามและแนวเพลงที่ชอบ</p>
                  </div>
                  <button onClick={generateAI} disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border hover:bg-surface-2 transition-all">
                    {aiLoading ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />} รีเฟรช
                  </button>
                </div>

                {!isLoggedIn ? (
                  <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-surface-1">
                    <Music size={32} className="mx-auto text-muted opacity-30 mb-3" />
                    <p className="text-[14px] text-primary font-medium">เข้าสู่ระบบเพื่อรับการแนะนำ</p>
                    <p className="text-[12px] text-muted mt-1">เราจะแนะนำงานตามสไตล์ศิลปินที่คุณติดตาม</p>
                    <button onClick={() => window.location.href='/login'}
                      className="mt-4 px-6 py-2 rounded-xl bg-accent text-white text-[13px] font-medium">
                      Login / Sign up
                    </button>
                  </div>
                ) : aiLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="aspect-[4/5] rounded-2xl bg-surface-2 animate-pulse" />)}
                  </div>
                ) : aiEvents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {aiEvents.map(ev => (
                      <div key={ev.id} className="group cursor-pointer" onClick={() => window.location.href=`/events/${ev.id}`}>
                        <div className="aspect-[4/5] rounded-2xl overflow-hidden relative mb-3" style={{ background: 'var(--surface-2)' }}>
                          {ev.image_url ? (
                            <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-20"><Music size={40} /></div>
                          )}
                          <div className="absolute top-3 left-3 flex flex-col gap-1">
                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md bg-black/40 text-white uppercase">
                              {format(parseISO(ev.start_date), 'MMM d')}
                            </span>
                          </div>
                        </div>
                        <h4 className="text-[14px] font-medium text-primary truncate">{ev.title}</h4>
                        <p className="text-[11px] text-muted truncate flex items-center gap-1 mt-0.5"><MapPin size={10} /> {ev.venue?.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center rounded-2xl border border-dashed border-border">
                    <p className="text-[13px] text-muted">กดติดตามศิลปินเพิ่มเพื่อให้ AI แนะนำงานที่ใช่สำหรับคุณ</p>
                  </div>
                )}
              </div>
            ) : view === 'calendar' ? (
              <CalendarView events={upcomingEvents} />
            ) : view === 'list' ? (
              <div className="space-y-8">
                {/* UPCOMING */}
                <div className="space-y-4">
                  <h3 className="text-[13px] font-medium text-muted uppercase tracking-wider flex items-center gap-2">
                    <Clock size={14} /> Upcoming Events
                  </h3>
                  {upcomingEvents.length > 0 ? (
                    <div className="space-y-1">
                      {upcomingEvents.map(ev => <EventRow key={ev.id} event={ev} {...eventRowProps} />)}
                    </div>
                  ) : <EmptyState />}
                </div>

                {/* PAST */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-medium text-muted uppercase tracking-wider">Past Events</h3>
                    <button onClick={() => setShowPast(!showPast)} className="text-[11px] text-accent font-medium">
                      {showPast ? 'ซ่อนงานที่จบแล้ว' : 'แสดงงานที่จบแล้ว'}
                    </button>
                  </div>
                  {showPast && (
                    <div className="space-y-1 opacity-60">
                      {pastEvents.map(ev => <EventRow key={ev.id} event={ev} {...eventRowProps} />)}
                      {pastEvents.length === 0 && <p className="text-[12px] text-muted py-4 text-center">ไม่มีข้อมูลงานที่จบไปแล้ว</p>}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {upcomingEvents.map(ev => <EventCard key={ev.id} event={ev} {...eventRowProps} />)}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

// ── COMPONENTS ──

function VenueMiniCard({ event }: { event: any }) {
  const start = parseISO(event.start_date)
  const daysLeft = differenceInDays(start, new Date())

  return (
    <div
      onClick={() => { window.location.href = `/events/${event.id}` }}
      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border border-transparent hover:border-border"
      style={{ background: 'var(--surface-1)' }}>

      <div className="w-10 h-10 rounded-lg shrink-0 flex flex-col items-center justify-center border"
        style={{ background: daysLeft === 0 ? 'rgba(232,0,58,.1)' : 'var(--surface-1)', borderColor: daysLeft === 0 ? 'rgba(232,0,58,.2)' : 'var(--border)' }}>
        <span className="text-[12px] font-bold" style={{ color: daysLeft === 0 ? '#E8003A' : 'var(--accent)', lineHeight: 1 }}>{format(start,'d')}</span>
        <span className="text-[8px] font-medium uppercase opacity-60" style={{ color: daysLeft === 0 ? '#E8003A' : 'var(--accent)' }}>{format(start,'MMM',{locale:th})}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-primary truncate leading-tight">{event.title}</p>
        <p className="text-[10px] text-muted truncate mt-0.5">{event.venue?.name}</p>
      </div>

      {daysLeft === 0 && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E8003A] text-white shrink-0">TODAY</span>
      )}
    </div>
  )
}

function EventRow({ event, likedIds, toggleLike, followedIds, attendance, toggleAttendance, isLoggedIn }: any) {
  const start = parseISO(event.start_date)
  const daysLeft = differenceInDays(start, new Date())
  const attendStatus = attendance.get(event.id) || null

  return (
    <div className={cn(
      "group flex items-center gap-4 p-3 sm:px-4 rounded-xl transition-all cursor-pointer border border-transparent hover:border-border",
      daysLeft === 0 ? "bg-surface-1 border-border/50" : "hover:bg-surface-1"
    )}
    onClick={() => window.location.href = `/events/${event.id}`}>

      {/* Date box */}
      <div className="flex flex-col items-center justify-center w-10 sm:w-11 h-10 sm:h-11 rounded-xl shrink-0 border"
        style={{ background: daysLeft === 0 ? 'rgba(232,0,58,.08)' : daysLeft <= 3 ? 'rgba(186,117,23,.05)' : 'var(--surface-2)', borderColor: daysLeft === 0 ? 'rgba(232,0,58,.2)' : 'var(--border)' }}>
        <span className="text-[14px] sm:text-[16px] font-bold leading-none"
          style={{ color: daysLeft === 0 ? '#E8003A' : 'var(--accent)' }}>
          {format(start, 'd')}
        </span>
        <span className="text-[9px] sm:text-[10px] font-medium uppercase opacity-70"
          style={{ color: daysLeft === 0 ? '#E8003A' : 'var(--accent)' }}>
          {format(start, 'MMM', { locale: th })}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[13px] sm:text-[14px] font-medium text-primary truncate">{event.title}</p>
          {event.is_free && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 shrink-0">FREE</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin size={10} className="text-muted shrink-0" />
            <p className="text-[11px] text-muted truncate">{event.venue?.name}</p>
          </div>
          {event.start_time && (
            <div className="flex items-center gap-1 shrink-0">
              <Clock size={10} className="text-muted" />
              <p className="text-[11px] text-muted">{event.start_time.slice(0,5)} น.</p>
            </div>
          )}
        </div>
      </div>

      {/* Artists & Price */}
      <div className="hidden md:flex flex-col items-end gap-1 w-32 shrink-0">
        <div className="flex -space-x-1.5 overflow-hidden">
          {event.artists?.slice(0,3).map((a: any) => (
            <div key={a.id} className="w-5 h-5 rounded-full border-2 border-surface-0 bg-surface-2 flex items-center justify-center overflow-hidden shrink-0">
              {a.image_url ? <img src={a.image_url} className="w-full h-full object-cover" /> : <Music size={8} className="text-muted" />}
            </div>
          ))}
          {event.artists?.length > 3 && <div className="text-[8px] text-muted pl-2">+{event.artists.length - 3}</div>}
        </div>
        <p className="text-[11px] font-medium text-accent">{formatPrice(event)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {isLoggedIn && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleAttendance(event.id, attendStatus) }}
            className="flex flex-col items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{ background: attendStatus ? 'var(--accent-muted)' : 'var(--surface-2)' }}>
            {attendStatus === 'going' ? <CheckCircle2 size={15} style={{ color: 'var(--accent)' }} /> :
             attendStatus === 'attended' ? <CalendarCheck size={15} style={{ color: 'var(--accent)' }} /> :
             <RefreshCw size={14} className="text-muted opacity-40" />}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(event.id) }}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
          style={{ background: likedIds.has(event.id) ? 'rgba(232,0,58,.08)' : 'var(--surface-2)' }}>
          <Heart size={15} style={{
            color: likedIds.has(event.id) ? '#E8003A' : 'var(--muted)',
            fill: likedIds.has(event.id) ? '#E8003A' : 'none'
          }} />
        </button>
      </div>
    </div>
  )
}

function EventCard({ event, likedIds, toggleLike, followedIds, attendance, toggleAttendance, isLoggedIn }: any) {
  const start = parseISO(event.start_date)
  const daysLeft = differenceInDays(start, new Date())
  const attendStatus = attendance.get(event.id) || null

  return (
    <div className="group rounded-2xl overflow-hidden cursor-pointer transition-all border border-border bg-surface-1 hover:border-accent/30"
      onClick={() => window.location.href = `/events/${event.id}`}>
      {/* Image area */}
      <div className="aspect-[16/10] bg-surface-2 relative overflow-hidden">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-10"><Music size={40} /></div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md bg-black/40 text-white uppercase">
            {format(start, 'MMM d')}
          </span>
          {event.is_free && (
            <span className="px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md bg-green-500/80 text-white">FREE</span>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); toggleLike(event.id) }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-md bg-black/40 flex items-center justify-center transition-all hover:bg-black/60">
          <Heart size={14} style={{ color: likedIds.has(event.id) ? '#E8003A' : 'white', fill: likedIds.has(event.id) ? '#E8003A' : 'none' }} />
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h4 className="text-[14px] font-semibold text-primary leading-tight line-clamp-2">{event.title}</h4>
          <span className="text-[12px] font-medium text-accent shrink-0">{formatPrice(event)}</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-muted">
            <MapPin size={12} className="shrink-0" />
            <span className="text-[11px] truncate">{event.venue?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted">
              <Clock size={12} className="shrink-0" />
              <span className="text-[11px]">{event.start_time?.slice(0,5)} น.</span>
            </div>
            <div className="flex -space-x-1.5">
              {event.artists?.slice(0,3).map((a: any) => (
                <div key={a.id} className="w-5 h-5 rounded-full border-2 border-surface-1 bg-surface-2 overflow-hidden">
                  {a.image_url ? <img src={a.image_url} className="w-full h-full object-cover" /> : <Music size={8} className="m-auto mt-1" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {isLoggedIn && (
          <button onClick={(e) => { e.stopPropagation(); toggleAttendance(event.id, attendStatus) }}
            className={cn(
              "w-full mt-4 py-2 rounded-xl text-[12px] font-medium flex items-center justify-center gap-2 transition-all",
              attendStatus === 'going' ? "bg-accent text-white" :
              attendStatus === 'attended' ? "bg-green-500 text-white" :
              "bg-surface-2 text-primary hover:bg-surface-3"
            )}>
            {attendStatus === 'going' ? <CheckCircle2 size={14} /> :
             attendStatus === 'attended' ? <CalendarCheck size={14} /> : <Calendar size={14} />}
            {attendStatus === 'going' ? 'กำลังจะไป' : attendStatus === 'attended' ? 'ไปมาแล้ว' : 'สนใจเข้าร่วม'}
          </button>
        )}
      </div>
    </div>
  )
}

function VenueMiniCard_Old({ event }: { event: any }) {
  const start = parseISO(event.start_date)
  const daysLeft = differenceInDays(start, new Date())

  return (
    <div
      onClick={() => { window.location.href = `/events/${event.id}` }}
      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border border-border bg-surface-1 hover:border-accent/30">

      <div className="w-10 h-10 rounded-lg shrink-0 flex flex-col items-center justify-center"
        style={{ background: daysLeft === 0 ? 'var(--accent-muted)' : 'var(--surface-1)' }}>
        <span style={{ fontSize:14, fontWeight:600, color:'var(--accent)', lineHeight:1 }}>{format(start,'d')}</span>
        <span style={{ fontSize:8, color:'var(--accent)', opacity:.7, textTransform:'uppercase' }}>{format(start,'MMM',{locale:th})}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-primary truncate">{event.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <MapPin size={9} className="text-muted shrink-0" />
          <p className="text-[10px] text-muted truncate">{event.venue?.name}</p>
        </div>
      </div>

      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
        style={{
          background: daysLeft === 0 ? 'rgba(232,0,58,.1)' : daysLeft <= 3 ? 'rgba(186,117,23,.1)' : 'var(--accent-muted)',
          color:      daysLeft === 0 ? '#E8003A' : daysLeft <= 3 ? '#EF9F27' : 'var(--accent)',
        }}>
        {daysLeft === 0 ? 'วันนี้!' : daysLeft === 1 ? 'พรุ่งนี้' : `${daysLeft}วัน`}
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="py-20 text-center">
      <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
        <Search size={24} className="text-muted" />
      </div>
      <p className="text-[14px] font-medium text-primary">ไม่พบกิจกรรมที่ค้นหา</p>
      <p className="text-[12px] text-muted mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองอื่นๆ</p>
    </div>
  )
}
