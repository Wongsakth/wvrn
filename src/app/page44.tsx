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

  // Load follows
  useEffect(() => {
    if (!user) { setFollowedIds(new Set()); setFollowedArtistInfo(new Map()); return }
    sb.from('follows')
      .select('artist_id, artist:artists(id,name,name_en,image_url,genres)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const ids  = new Set((data || []).map((f: any) => f.artist_id))
        const info = new Map((data || []).map((f: any) => [f.artist_id, f.artist]))
        setFollowedIds(ids)
        setFollowedArtistInfo(info)
      })
  }, [user])

  // Load attendance
  useEffect(() => {
    if (!user) { setAttendance(new Map()); return }
    sb.from('event_attendance')
      .select('event_id, status')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const map = new Map((data || []).map((a: any) => [a.event_id, a.status as AttendStatus]))
        setAttendance(map)
      })
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
      {isLoggedIn && followedIds.size > 0 && (
        <section style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex items-center gap-2 mb-3">
              <Heart size={14} style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />
              <span className="text-[13px] font-medium text-primary">ศิลปินที่ติดตาม</span>
              <span className="text-[11px] text-muted">— งานที่กำลังจะมา</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {events
                .filter(ev => !isPastEvent(ev, today) && ev.artists?.some((a: any) => followedIds.has(a.id)))
                .sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                .slice(0, 3)
                .map(ev => <FollowingMiniCard key={ev.id} event={ev} followedIds={followedIds} />)
              }
            </div>
          </div>
        </section>
      )}

      {/* ── ALL EVENTS ── */}
      <section id="all-events" className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          {/* Tabs */}
          <div className="flex p-1 rounded-xl gap-1"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            {([
              { id: 'all',       icon: Music,     label: 'ทั้งหมด'  },
              { id: 'following', icon: Heart,      label: 'ติดตาม'   },
              { id: 'ai',        icon: Sparkles,   label: 'แนะนำ'   },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all',
                  tab === id ? 'text-[var(--surface-0)]' : 'text-muted hover:text-primary'
                )}
                style={{ background: tab === id ? 'var(--accent)' : 'transparent' }}>
                <Icon size={13} /> {label}
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
            <div className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <Search size={13} className="text-muted shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหางาน, ศิลปิน..."
                className="bg-transparent text-[13px] text-primary outline-none w-36 placeholder:text-muted" />
            </div>
            <div className="flex p-1 rounded-lg gap-0.5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              {([{id:'calendar',icon:Calendar},{id:'list',icon:List},{id:'grid',icon:LayoutGrid}] as const).map(({id,icon:Icon}) => (
                <button key={id} onClick={() => setView(id as ViewMode)}
                  className={cn('p-1.5 rounded-md transition-all',
                    view === id ? 'bg-[var(--accent)] text-[var(--surface-0)]' : 'text-muted hover:text-primary')}>
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {tab !== 'ai' && <FilterBar filters={filters} onChange={setFilters} totalCount={filtered.length} />}

        {loading && (
          <div className="flex items-center justify-center py-20 gap-2 text-muted">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-[13px]">กำลังโหลด...</span>
          </div>
        )}

        {/* ── AI Tab ── */}
        {!loading && tab === 'ai' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[14px] font-medium text-primary flex items-center gap-2">
                  <Sparkles size={15} style={{ color: 'var(--accent)' }} />
                  แนะนำสำหรับคุณ
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  จาก genre และศิลปินที่คุณชอบ
                </p>
              </div>
              <button onClick={generateAI} disabled={aiLoading}
                className="flex items-center gap-1.5 btn-ghost text-[12px] py-1.5 px-3">
                <RefreshCw size={13} className={aiLoading ? 'animate-spin' : ''} />
                สุ่มใหม่
              </button>
            </div>

            {aiLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted">
                <Sparkles size={18} className="animate-pulse" style={{ color: 'var(--accent)' }} />
                <span className="text-[13px]">กำลังคิด...</span>
              </div>
            ) : aiEvents.length === 0 ? (
              <div className="rounded-xl p-10 text-center"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <Sparkles size={32} className="mx-auto mb-3" style={{ color: 'var(--accent)', opacity: .4 }} />
                <p className="text-[14px] font-medium text-primary mb-1">ยังไม่มีคำแนะนำ</p>
                <p className="text-[12px] text-muted mb-4">ติดตามศิลปินหรือ check in งานก่อนเพื่อให้ระบบเรียนรู้ความชอบของคุณ</p>
                <button onClick={() => window.location.href = '/artists'} className="btn-accent text-[13px] py-2 px-4">
                  ค้นหาศิลปิน
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {aiEvents.map(ev => (
                  <EventRow key={ev.id} event={ev} {...eventRowProps} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── List/Grid/Calendar Tab ── */}
        {!loading && tab !== 'ai' && view === 'calendar' && (
          <CalendarView events={filtered} likedIds={likedIds} bookmarkIds={new Set()}
            onLike={toggleLike} onBookmark={() => {}} />
        )}

        {!loading && tab !== 'ai' && (view === 'list' || view === 'grid') && (
          <div className="flex flex-col gap-2">

            {/* Past events */}
            {pastEvents.length > 0 && (
              <div>
                <button onClick={() => setShowPast(v => !v)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl mb-2 transition-all"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <span className="text-[12px] text-muted flex-1 text-left">
                    งานที่ผ่านมาแล้ว ({pastEvents.length} งาน)
                  </span>
                  <span className="text-[11px] text-muted"
                    style={{ transform: showPast ? 'rotate(180deg)' : 'none', display:'inline-block', transition:'transform .3s' }}>▼</span>
                </button>
                <div style={{ overflow:'hidden', maxHeight: showPast ? `${pastEvents.length * 80}px` : '0px', transition:'max-height .4s ease' }}>
                  <div className="flex flex-col gap-2 pb-2">
                    {pastEvents.map(ev => <EventRow key={ev.id} event={ev} isPast {...eventRowProps} />)}
                  </div>
                </div>
                {upcomingEvents.length > 0 && (
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <span className="text-[11px] font-medium px-3 py-1 rounded-full"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>▼ งานที่กำลังจะมา</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  </div>
                )}
              </div>
            )}

            {/* Upcoming */}
            {upcomingEvents.length === 0 && pastEvents.length === 0 ? <EmptyState /> :
             upcomingEvents.length === 0 ? (
               <div className="rounded-xl p-8 text-center" style={{ background:'var(--surface-1)', border:'1px solid var(--border)' }}>
                 <p className="text-[13px] text-muted">
                   {tab === 'following' ? 'ศิลปินที่ติดตามยังไม่มีงานที่กำลังจะมา' : 'ไม่พบงานที่ตรงกัน'}
                 </p>
               </div>
             ) : upcomingEvents.map(ev => <EventRow key={ev.id} event={ev} {...eventRowProps} />)
            }
          </div>
        )}
      </section>
    </div>
  )
}

// ── Following Mini Card ────────────────────────────────────────────
function FollowingMiniCard({ event, followedIds }: any) {
  const start    = parseISO(event.start_date)
  const daysLeft = differenceInDays(start, new Date())
  const artist   = event.artists?.find((a: any) => followedIds.has(a.id))

  return (
    <div onClick={() => { window.location.href = `/events/${event.id}` }}
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
      {artist?.image_url
        ? <img src={artist.image_url} alt={artist.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
        : <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[11px] font-medium"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{artist?.name?.slice(0,2)}</div>
      }
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-primary truncate">{event.title}</p>
        <p className="text-[10px] text-muted">{event.venue?.name}</p>
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

// ── Event Row ──────────────────────────────────────────────────────
function EventRow({ event, likedIds, toggleLike, followedIds, attendance, toggleAttendance, isLoggedIn, isPast }: any) {
  const start    = parseISO(event.start_date)
  const end      = event.end_date ? parseISO(event.end_date) : null
  const isMulti  = event.is_multi_day && end
  const status   = statusLabel(event.status)
  const daysLeft = differenceInDays(start, new Date())
  const liked    = likedIds?.has(event.id)

  const isFollowedEvent = followedIds && event.artists?.some((a: any) => followedIds.has(a.id))
  const attendStatus: AttendStatus = attendance?.get(event.id) ?? null

  // Border urgency
  const borderLeft = isPast     ? '3px solid transparent'
    : daysLeft === 0            ? '4px solid var(--accent)'
    : daysLeft <= 3             ? '3px solid color-mix(in srgb, var(--accent) 70%, transparent)'
    : daysLeft <= 14            ? '2px solid color-mix(in srgb, var(--accent) 35%, transparent)'
    : '1px solid var(--border)'

  const AttendIcon  = attendStatus === 'attended' ? CheckCircle2 : CalendarCheck
  const attendLabel = attendStatus === 'attended' ? 'ไปมาแล้ว' : attendStatus === 'going' ? 'จะไป' : '+ จะไป'
  const attendStyle = {
    background: attendStatus === 'attended' ? 'rgba(29,158,117,.12)'
      : attendStatus === 'going'   ? 'var(--accent-muted)'
      : 'var(--surface-2)',
    color: attendStatus === 'attended' ? '#1D9E75'
      : attendStatus === 'going'   ? 'var(--accent)'
      : 'var(--text-muted)',
    border: `1px solid ${
      attendStatus === 'attended' ? 'rgba(29,158,117,.3)'
      : attendStatus === 'going'  ? 'var(--accent)'
      : 'var(--border)'}`,
  }

  return (
    <div
      onClick={isPast ? undefined : () => { window.location.href = `/events/${event.id}` }}
      style={{
        cursor: isPast ? 'default' : 'pointer',
        opacity: isPast ? 0.4 : 1,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderLeft,
        borderRadius: 12,
        display: 'flex',
        overflow: 'hidden',
        filter: isPast ? 'grayscale(60%)' : 'none',
        transition: 'opacity .2s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!isPast) e.currentTarget.style.opacity = '.9' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = isPast ? '0.4' : '1' }}
    >
      {/* Heart — followed artist */}
      {isFollowedEvent && !isPast && (
        <div style={{ position:'absolute', top:7, right:88, zIndex:1 }}>
          <Heart size={10} style={{ color:'var(--accent)', fill:'var(--accent)', opacity:.7 }} />
        </div>
      )}

      {/* Today badge */}
      {daysLeft === 0 && !isPast && (
        <div style={{ position:'absolute', top:0, left:0, background:'var(--accent)', color:'var(--surface-0)', fontSize:9, fontWeight:700, padding:'2px 7px', borderBottomRightRadius:6 }}>
          วันนี้!
        </div>
      )}

      {/* Date strip */}
      <div style={{
        width: isMulti ? 64 : 56, flexShrink: 0,
        background: !isPast && daysLeft <= 3 ? 'var(--accent-muted)' : 'var(--surface-2)',
        borderRight: '1px solid var(--border)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'8px 4px',
      }}>
        {isMulti ? (
          <>
            <span style={{ fontSize:11, color:'var(--accent)', fontWeight:500, textAlign:'center', lineHeight:1.3 }}>{format(start,'d MMM',{locale:th})}</span>
            <span style={{ fontSize:9, color:'var(--text-muted)' }}>–</span>
            <span style={{ fontSize:11, color:'var(--accent)', fontWeight:500, textAlign:'center', lineHeight:1.3 }}>{format(end!,'d MMM',{locale:th})}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize:22, fontWeight:500, color: isPast ? 'var(--text-muted)' : 'var(--accent)', lineHeight:1 }}>{format(start,'d')}</span>
            <span style={{ fontSize:9, color: isPast ? 'var(--text-muted)' : 'var(--accent)', opacity:.7, textTransform:'uppercase' }}>{format(start,'MMM',{locale:th})}</span>
          </>
        )}
      </div>

      {/* Body */}
      <div style={{ flex:1, minWidth:0, padding: daysLeft === 0 && !isPast ? '16px 12px 10px' : '10px 12px' }}>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:4 }}>
          {isPast && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20, background:'var(--surface-3)', color:'var(--text-muted)' }}>ผ่านไปแล้ว</span>}
          <span className={cn('tag', status.cls)}>{status.label}</span>
          {event.genres?.slice(0,2).map((g:string) => <span key={g} className={cn('tag', genreTagClass(g))}>{g}</span>)}
        </div>
        <div style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{event.title}</div>
        {event.artists?.length > 0 && (
          <div style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {event.artists.map((a:any) => a.name).join(' · ')}
          </div>
        )}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {event.venue && <span style={{ fontSize:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:2 }}><MapPin size={9}/>{event.venue.name}</span>}
          {event.start_time && <span style={{ fontSize:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:2 }}><Clock size={9}/>{event.start_time.slice(0,5)} น.</span>}
        </div>
      </div>

      {/* Right */}
      <div style={{ flexShrink:0, borderLeft:'1px solid var(--border)', padding:'8px 10px', display:'flex', flexDirection:'column', alignItems:'flex-end', justifyContent:'space-between', minWidth:86 }}>
        <span style={{ fontSize:12, fontWeight:500, color:event.is_free?'#5DCAA5':'var(--accent)' }}>{formatPrice(event)}</span>
        <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
          {/* Attend button */}
          {!isPast && isLoggedIn && (
            <button
              onClick={e => { e.stopPropagation(); toggleAttendance(event.id, attendStatus) }}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-medium transition-all"
              style={attendStyle}>
              <AttendIcon size={11} />
              {attendLabel}
            </button>
          )}
          {/* Like */}
          <button onClick={e => { e.stopPropagation(); toggleLike?.(event.id) }}
            style={{ width:26, height:26, borderRadius:8, border:'1px solid var(--border)', background:liked?'var(--accent-muted)':'var(--surface-2)', color:liked?'var(--accent)':'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Heart size={12} style={{ fill:liked?'var(--accent)':'none' }} />
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl p-10 text-center" style={{ background:'var(--surface-1)', border:'1px solid var(--border)' }}>
      <div className="text-3xl mb-3">🎵</div>
      <p className="text-[14px] font-medium text-primary">ไม่พบงานที่ตรงกัน</p>
      <p className="text-[12px] text-muted mt-1">ลองปรับตัวกรองใหม่</p>
    </div>
  )
}
