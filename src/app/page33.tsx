'use client'
import { useState, useEffect, useMemo } from 'react'
import { Calendar, List, LayoutGrid, Search, Loader2, MapPin, Clock,
  ChevronRight, Heart, Bell, Zap, Music, Star } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import CalendarView from '@/components/calendar/CalendarView'
import FilterBar from '@/components/events/FilterBar'
import { cn, formatPrice, statusLabel, genreTagClass } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { format, parseISO, differenceInDays, isPast } from 'date-fns'
import { th } from 'date-fns/locale'
import type { EventFilters, ViewMode } from '@/types'

const GENRES_LIST = ['pop','rock','indie','hiphop','jazz','electronic','folk','rnb']

export default function HomePage() {
  const [events,      setEvents]      = useState<any[]>([])
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [filters,     setFilters]     = useState<EventFilters>({})
  const [view,        setView]        = useState<ViewMode>('list')
  const [search,      setSearch]      = useState('')
  const [likedIds,    setLikedIds]    = useState<Set<string>>(new Set())
  const [loading,     setLoading]     = useState(true)
  const [showPast,    setShowPast]    = useState(false)
  const { user, loading: authLoading } = useAuth()
  const isLoggedIn = !authLoading && !!user
  const sb = createClient()

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

  const [followedArtistInfo, setFollowedArtistInfo] = useState<Map<string, any>>(new Map())

  // Load followed artist IDs + artist details
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

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  const filtered = useMemo(() => {
    return events
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
  }, [events, filters, search])

  // ศิลปินที่ติดตาม พร้อม upcoming events
  const followedArtistEvents = useMemo(() => {
    if (!followedIds.size) return []

    const result: { artist: any; events: any[] }[] = []

    followedIds.forEach(artistId => {
      // ได้ artist info จาก follows query โดยตรง
      const artist = followedArtistInfo.get(artistId) ?? { id: artistId, name: '...', genres: [] }

      // หา upcoming events ของศิลปินนี้ (รวมวันนี้ด้วย)
      const today = new Date(); today.setHours(0,0,0,0)
      const artistEvents = events
        .filter(ev =>
          ev.artists?.some((a: any) => a.id === artistId) &&
          new Date(ev.start_date) >= today
        )
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        .slice(0, 2)

      result.push({ artist, events: artistEvents })
    })

    return result
  }, [events, followedIds, followedArtistInfo])

  const upcomingEvents = useMemo(() => events
    .filter(ev => !isPast(parseISO(ev.start_date)))
    .slice(0, 3)
  , [events])

  function toggleLike(id: string) {
    setLikedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{ background: 'linear-gradient(160deg, var(--surface-1) 0%, var(--surface-0) 100%)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <span className="inline-block text-[11px] font-medium px-3 py-1 rounded-full uppercase tracking-wider mb-3"
                style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                🎵 Never Miss a Show
              </span>
              <h1 className="text-[32px] sm:text-[42px] font-medium leading-tight text-primary mb-3">
                ทุก Concert<br/>
                <span style={{ color: 'var(--accent)' }}>ที่คุณรัก</span><br/>
                อยู่ที่นี่
              </h1>
              <p className="text-[15px] text-secondary leading-relaxed mb-6 max-w-md">
                ติดตามศิลปินที่ชอบ รู้ก่อนใครเมื่อมีงานใหม่ ไม่พลาดทุก concert ทุก festival ในไทย
              </p>
              <div className="flex gap-6 mb-6">
                {[
                  { num: events.length || '—', label: 'งานทั้งหมด' },
                  { num: '180+', label: 'ศิลปิน' },
                  { num: '4+', label: 'จังหวัด' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="text-[22px] font-medium text-accent">{s.num}</div>
                    <div className="text-[11px] text-muted">{s.label}</div>
                  </div>
                ))}
              </div>
              {!isLoggedIn && (
                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => window.location.href = '/login'}
                    className="btn-accent flex items-center gap-2 py-2.5 px-5 text-[14px]">
                    <Zap size={15} /> เริ่มติดตามศิลปิน
                  </button>
                  <button onClick={() => document.getElementById('all-events')?.scrollIntoView({ behavior: 'smooth' })}
                    className="btn-ghost flex items-center gap-2 py-2.5 px-5 text-[14px]">
                    ดูงานทั้งหมด <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
            {!loading && upcomingEvents.length > 0 && (
              <div className="md:w-72 shrink-0 flex flex-col gap-2">
                <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">งานที่กำลังจะมาถึง</p>
                {upcomingEvents.map(ev => <UpcomingCard key={ev.id} event={ev} />)}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FOLLOWING ── */}
      <section style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Heart size={16} style={{ color: 'var(--accent)' }} />
              <h2 className="text-[16px] font-medium text-primary">ศิลปินที่ติดตาม</h2>
              {!isLoggedIn && (
                <span className="text-[10px] px-2 py-0.5 rounded-full text-muted"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>ตัวอย่าง</span>
              )}
            </div>
            <button onClick={() => window.location.href = '/following'}
              className="text-[12px] flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              จัดการ <ChevronRight size={12} />
            </button>
          </div>

          {loading || authLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-muted" />
            </div>
          ) : followedArtistEvents.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {followedArtistEvents.map(({ artist, events: artistEvs }) => (
                  <FollowingArtistCard key={artist.id} artist={artist} events={artistEvs} />
                ))}
              </div>
              {!isLoggedIn && (
                <div className="rounded-xl p-4 flex items-center gap-4"
                  style={{ background: 'var(--accent-muted)', border: '1px solid var(--border)' }}>
                  <Star size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-primary">Login เพื่อติดตามศิลปินที่คุณชอบ</p>
                    <p className="text-[11px] text-muted">รับแจ้งเตือนอัตโนมัติเมื่อมีงานใหม่</p>
                  </div>
                  <button onClick={() => window.location.href = '/login'}
                    className="btn-accent text-[12px] py-1.5 px-4 shrink-0">Login</button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'var(--accent-muted)' }}>
                <Bell size={22} style={{ color: 'var(--accent)' }} />
              </div>
              {isLoggedIn ? (
                <>
                  <p className="text-[14px] font-medium text-primary mb-1">ยังไม่ได้ติดตามศิลปินคนไหน</p>
                  <p className="text-[12px] text-muted mb-4">ค้นหาศิลปินที่ชอบแล้วกด Follow เพื่อรับแจ้งเตือนงานใหม่</p>
                  <button onClick={() => window.location.href = '/artists'}
                    className="btn-accent text-[13px] py-2 px-5">ค้นหาศิลปิน</button>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-medium text-primary mb-1">ยังไม่ได้ติดตามศิลปินคนไหน</p>
                  <p className="text-[12px] text-muted mb-4">Login แล้วติดตามศิลปินที่ชอบ จะได้รับแจ้งเตือนทันทีเมื่อมีงานใหม่</p>
                  <button onClick={() => window.location.href = '/login'}
                    className="btn-accent text-[13px] py-2 px-5">Login เพื่อติดตาม</button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── ALL EVENTS ── */}
      <section id="all-events" className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-[16px] font-medium text-primary flex items-center gap-2">
            <Music size={16} style={{ color: 'var(--accent)' }} />
            งานทั้งหมด
            <span className="text-[12px] text-muted font-normal">{filtered.length} งาน</span>
          </h2>
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

        <FilterBar filters={filters} onChange={setFilters} totalCount={filtered.length} />

        {loading && (
          <div className="flex items-center justify-center py-20 gap-2 text-muted">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-[13px]">กำลังโหลด...</span>
          </div>
        )}

        {!loading && view === 'calendar' && (
          <CalendarView events={filtered} likedIds={likedIds} bookmarkIds={new Set()}
            onLike={toggleLike} onBookmark={() => {}} />
        )}

        {!loading && (view === 'list' || view === 'grid') && (() => {
          const pastEvents     = filtered.filter(ev => new Date(ev.end_date || ev.start_date) < today)
          const upcomingEvents = filtered.filter(ev => new Date(ev.end_date || ev.start_date) >= today)

          return (
            <div className="flex flex-col gap-2">
              {/* Past events — ซ่อนไว้ กดเปิดได้ */}
              {pastEvents.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowPast(v => !v)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-xl mb-2 transition-all"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className="text-[12px] text-muted flex-1 text-left">
                      งานที่ผ่านมาแล้ว ({pastEvents.length} งาน)
                    </span>
                    <span className="text-[11px] text-muted transition-transform duration-300"
                      style={{ transform: showPast ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                      ▼
                    </span>
                  </button>

                  {/* Slide container */}
                  <div style={{
                    overflow: 'hidden',
                    maxHeight: showPast ? `${pastEvents.length * 80}px` : '0px',
                    transition: 'max-height 0.4s ease',
                  }}>
                    <div className="flex flex-col gap-2 pb-2">
                      {pastEvents.map(ev => (
                        <EventRow key={ev.id} event={ev} liked={likedIds.has(ev.id)} onLike={() => toggleLike(ev.id)} isPast followedIds={followedIds} />
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  {upcomingEvents.length > 0 && (
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                      <span className="text-[11px] font-medium px-3 py-1 rounded-full"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                        ▼ งานที่กำลังจะมา
                      </span>
                      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    </div>
                  )}
                </div>
              )}

              {/* Upcoming events */}
              {upcomingEvents.length === 0 && pastEvents.length === 0
                ? <EmptyState />
                : upcomingEvents.map(ev => (
                  <EventRow key={ev.id} event={ev} liked={likedIds.has(ev.id)} onLike={() => toggleLike(ev.id)} isPast={false} followedIds={followedIds} />
                ))
              }
              {upcomingEvents.length === 0 && pastEvents.length > 0 && (
                <EmptyState />
              )}
            </div>
          )
        })()}
      </section>
    </div>
  )
}

function UpcomingCard({ event }: { event: any }) {
  const start = parseISO(event.start_date)
  const daysLeft = differenceInDays(start, new Date())
  return (
    <div onClick={() => { window.location.href = `/events/${event.id}` }}
      style={{ cursor:'pointer', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:12,
        display:'flex', alignItems:'center', gap:12, padding:'10px 12px' }}
      onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--border-md)')}
      onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
      <div style={{ width:44, height:44, borderRadius:10, background:'var(--accent-muted)', flexShrink:0,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:16, fontWeight:500, color:'var(--accent)', lineHeight:1 }}>{format(start,'d')}</span>
        <span style={{ fontSize:8, color:'var(--accent)', opacity:.7, textTransform:'uppercase' }}>{format(start,'MMM',{locale:th})}</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:12, fontWeight:500, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{event.title}</p>
        <p style={{ fontSize:10, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{event.venue?.name ?? event.province}</p>
      </div>
      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:500, flexShrink:0,
        background: daysLeft<=7 ? 'rgba(232,0,58,.1)' : 'var(--accent-muted)',
        color:      daysLeft<=7 ? '#E8003A' : 'var(--accent)' }}>
        {daysLeft===0?'วันนี้!':daysLeft===1?'พรุ่งนี้':`${daysLeft}วัน`}
      </span>
    </div>
  )
}

function FollowingArtistCard({ artist, events }: { artist: any; events: any[] }) {
  return (
    <div
      onClick={() => { window.location.href = `/artists/${artist.id}` }}
      style={{ background:'var(--surface-1)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', cursor:'pointer' }}
      onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--border-md)')}
      onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
      {/* Artist header */}
      <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid var(--border)' }}>
        {artist.image_url
          ? <img src={artist.image_url} alt={artist.name} style={{ width:36,height:36,borderRadius:'50%',objectFit:'cover',flexShrink:0 }} />
          : <div style={{ width:36,height:36,borderRadius:'50%',background:'var(--accent-muted)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:500,flexShrink:0 }}>{artist.name?.slice(0,2)}</div>
        }
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{artist.name}</p>
          <div style={{ display:'flex', gap:4, marginTop:2 }}>
            {(artist.genres ?? []).slice(0,2).map((g:string) => (
              <span key={g} className={cn('tag text-[9px]', genreTagClass(g))}>{g}</span>
            ))}
          </div>
        </div>
        <Heart size={14} style={{ color:'var(--accent)', fill:'var(--accent)', flexShrink:0 }} />
      </div>

      {/* Events */}
      <div style={{ padding:'8px 14px 12px' }}>
        {events.length > 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {events.map(ev => (
              <div key={ev.id}
                onClick={e => { e.stopPropagation(); window.location.href = `/events/${ev.id}` }}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:8, cursor:'pointer', background:'var(--surface-2)' }}
                onMouseEnter={e=>(e.currentTarget.style.background='var(--surface-3)')}
                onMouseLeave={e=>(e.currentTarget.style.background='var(--surface-2)')}>
                <div style={{ width:30,height:30,borderRadius:8,background:'var(--accent-muted)',flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
                  <span style={{ fontSize:12,fontWeight:500,color:'var(--accent)',lineHeight:1 }}>{format(parseISO(ev.start_date),'d')}</span>
                  <span style={{ fontSize:8,color:'var(--accent)',opacity:.7,textTransform:'uppercase' }}>{format(parseISO(ev.start_date),'MMM',{locale:th})}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:11,fontWeight:500,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{ev.title}</p>
                  <p style={{ fontSize:10,color:'var(--text-muted)' }}>
                    {ev.venue?.name}{ev.start_time && ` · ${ev.start_time.slice(0,5)} น.`}
                  </p>
                </div>
                <ChevronRight size={11} style={{ color:'var(--text-muted)',flexShrink:0 }} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize:11,color:'var(--text-muted)',textAlign:'center',padding:'8px 0' }}>ยังไม่มีงานที่กำลังจะมา</p>
        )}
      </div>
    </div>
  )
}

function EventRow({ event, liked, onLike, isPast, followedIds }: any) {
  const start    = parseISO(event.start_date)
  const end      = event.end_date ? parseISO(event.end_date) : null
  const isMulti  = event.is_multi_day && end
  const status   = statusLabel(event.status)
  const daysLeft = differenceInDays(start, new Date())

  // ศิลปินที่ติดตามมีในงานนี้ไหม
  const isFollowed = followedIds && event.artists?.some((a: any) => followedIds.has(a.id))

  // Border color ตามความใกล้ของงาน
  const urgency = isPast
    ? { color: 'transparent', width: '3px' }
    : daysLeft === 0
    ? { color: 'var(--accent)',              width: '4px' }  // วันนี้ — เข้มสุด
    : daysLeft <= 3
    ? { color: 'var(--accent)',              width: '3px', opacity: .7 }  // 1-3 วัน
    : daysLeft <= 14
    ? { color: 'var(--accent)',              width: '2px', opacity: .4 }  // 4-14 วัน
    : { color: 'var(--border)',              width: '1px' }  // 15+ วัน

  return (
    <div
      onClick={isPast ? undefined : () => { window.location.href = `/events/${event.id}` }}
      style={{
        cursor:       isPast ? 'default' : 'pointer',
        opacity:      isPast ? 0.4 : 1,
        background:   'var(--surface-1)',
        border:       '1px solid var(--border)',
        borderLeft:   `${urgency.width} solid ${urgency.color}`,
        borderRadius: 12,
        display:      'flex',
        overflow:     'hidden',
        filter:       isPast ? 'grayscale(70%)' : 'none',
        transition:   'opacity .2s, border-color .2s',
        position:     'relative',
      }}
      onMouseEnter={e => { if (!isPast) e.currentTarget.style.borderColor = 'var(--border-md)' }}
      onMouseLeave={e => { if (!isPast) e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      {/* Heart badge — ศิลปินที่ติดตาม */}
      {isFollowed && !isPast && (
        <div style={{
          position: 'absolute', top: 6, right: 80,
          zIndex: 1,
        }}>
          <Heart size={11} style={{ color: 'var(--accent)', fill: 'var(--accent)', opacity: .8 }} />
        </div>
      )}

      {/* วันนี้ badge */}
      {daysLeft === 0 && !isPast && (
        <div style={{
          position: 'absolute', top: 0, left: 0,
          background: 'var(--accent)', color: 'var(--surface-0)',
          fontSize: 9, fontWeight: 700, padding: '2px 6px',
          borderBottomRightRadius: 6, letterSpacing: '.5px',
        }}>
          วันนี้!
        </div>
      )}

      {/* Date strip */}
      <div style={{
        width: isMulti ? 64 : 56, flexShrink: 0,
        background: isPast ? 'var(--surface-2)' : daysLeft <= 3 ? 'var(--accent-muted)' : 'var(--surface-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '8px 4px',
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
      <div style={{ flex:1, minWidth:0, padding: daysLeft === 0 ? '16px 12px 10px' : '10px 12px' }}>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:4 }}>
          {isPast && (
            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20, background:'var(--surface-3)', color:'var(--text-muted)' }}>ผ่านไปแล้ว</span>
          )}
          <span className={cn('tag', status.cls)}>{status.label}</span>
          {event.genres?.slice(0,2).map((g:string) => <span key={g} className={cn('tag', genreTagClass(g))}>{g}</span>)}
        </div>
        <div style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {event.title}
        </div>
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
      <div style={{ flexShrink:0, borderLeft:'1px solid var(--border)', padding:'10px 12px', display:'flex', flexDirection:'column', alignItems:'flex-end', justifyContent:'space-between', minWidth:80 }}>
        <span style={{ fontSize:12, fontWeight:500, color:event.is_free?'#5DCAA5':'var(--accent)' }}>{formatPrice(event)}</span>
        <button onClick={e=>{e.stopPropagation();onLike?.()}}
          style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--border)', background:liked?'var(--accent-muted)':'var(--surface-2)', color:liked?'var(--accent)':'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <Heart size={13} style={{ fill:liked?'var(--accent)':'none' }} />
        </button>
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
