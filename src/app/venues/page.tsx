'use client'
import { useState, useEffect, useMemo } from 'react'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  Search, X, Loader2, MapPin, Clock,
  Heart, ChevronRight, ExternalLink, Music,
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'
import { cn, formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Venue {
  id:        string
  name:      string
  address:   string | null
  province:  string | null
  maps_url:  string | null
}

const PROVINCES = ['กรุงเทพมหานคร','นนทบุรี','ปทุมธานี','เชียงใหม่','ภูเก็ต','เพชรบูรณ์']

export default function VenuesPage() {
  const [venues,      setVenues]      = useState<Venue[]>([])
  const [events,      setEvents]      = useState<any[]>([])
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [province,    setProvince]    = useState('')
  const [showFollowed,setShowFollowed]= useState(false)
  const { user } = useAuth()
  const sb = createClient()

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  // Load venues + upcoming events
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [vRes, eRes] = await Promise.all([
          sb.from('venues').select('*').order('province').order('name'),
          sb.from('events')
            .select('id,title,start_date,start_time,end_date,is_free,ticket_price_min,genres,venue_id,event_artists(artist:artists(id,name))')
            .gte('start_date', new Date().toISOString().slice(0,10))
            .order('start_date', { ascending: true }),
        ])
        setVenues(vRes.data || [])
        setEvents((eRes.data || []).map((ev: any) => ({
          ...ev,
          artists: ev.event_artists?.map((ea: any) => ea.artist).filter(Boolean) ?? [],
        })))
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Load followed venues
  useEffect(() => {
    if (!user) { setFollowedIds(new Set()); return }
    sb.from('venue_follows').select('venue_id').eq('user_id', user.id)
      .then(({ data }) => setFollowedIds(new Set((data || []).map((f: any) => f.venue_id))))
  }, [user])

  async function toggleFollow(venueId: string, venueName: string) {
    if (!user) { toast.error('กรุณา Login ก่อนครับ'); window.location.href = '/login'; return }
    const isFollowed = followedIds.has(venueId)
    setFollowedIds(prev => {
      const n = new Set(prev)
      isFollowed ? n.delete(venueId) : n.add(venueId)
      return n
    })
    try {
      if (isFollowed) {
        await sb.from('venue_follows').delete().eq('user_id', user.id).eq('venue_id', venueId)
        toast.success(`เลิกติดตาม ${venueName}`)
      } else {
        await sb.from('venue_follows').insert({ user_id: user.id, venue_id: venueId })
        toast.success(`ติดตาม ${venueName} แล้ว 📍`)
      }
    } catch (e: any) {
      // revert
      setFollowedIds(prev => {
        const n = new Set(prev)
        isFollowed ? n.add(venueId) : n.delete(venueId)
        return n
      })
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  function getUpcomingEvents(venueId: string) {
    return events.filter(ev => ev.venue_id === venueId).slice(0, 3)
  }

  const filtered = useMemo(() => venues.filter(v => {
    if (showFollowed && !followedIds.has(v.id)) return false
    if (province && v.province !== province) return false
    if (search) {
      const q = search.toLowerCase()
      if (!v.name.toLowerCase().includes(q) && !(v.address ?? '').toLowerCase().includes(q)) return false
    }
    return true
  }), [venues, search, province, showFollowed, followedIds])

  // Group by province
  const grouped = useMemo(() => {
    const map = new Map<string, Venue[]>()
    filtered.forEach(v => {
      const p = v.province ?? 'อื่นๆ'
      if (!map.has(p)) map.set(p, [])
      map.get(p)!.push(v)
    })
    return map
  }, [filtered])

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-medium text-primary mb-1 flex items-center gap-2">
            <MapPin size={20} style={{ color: 'var(--accent)' }} />
            สถานที่จัดงาน
          </h1>
          <p className="text-[13px] text-muted">
            {venues.length} สถานที่ · {followedIds.size} ที่ติดตาม
          </p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 flex-1"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <Search size={15} className="text-muted shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาสถานที่..."
              className="bg-transparent text-[14px] text-primary outline-none w-full placeholder:text-muted" />
            {search && <button onClick={() => setSearch('')}><X size={14} className="text-muted" /></button>}
          </div>

          {user && (
            <button onClick={() => setShowFollowed(v => !v)}
              className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] transition-all shrink-0')}
              style={{
                background: showFollowed ? 'var(--accent-muted)' : 'var(--surface-1)',
                border: `1px solid ${showFollowed ? 'var(--accent)' : 'var(--border)'}`,
                color: showFollowed ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
              <Heart size={14} style={{ fill: showFollowed ? 'var(--accent)' : 'none' }} />
              ที่ติดตาม ({followedIds.size})
            </button>
          )}
        </div>

        {/* Province filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          <button onClick={() => setProvince('')}
            className={cn('px-3 py-1.5 rounded-full text-[12px] shrink-0 transition-all border',
              !province ? 'font-medium border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]' : 'border-[var(--border)] text-secondary')}>
            ทั้งหมด
          </button>
          {PROVINCES.map(p => (
            <button key={p} onClick={() => setProvince(province === p ? '' : p)}
              className={cn('px-3 py-1.5 rounded-full text-[12px] shrink-0 transition-all border',
                province === p ? 'font-medium border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]' : 'border-[var(--border)] text-secondary')}>
              {p}
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
            <MapPin size={36} className="mx-auto mb-3 text-muted" />
            <p className="text-[14px] font-medium text-primary mb-1">ไม่พบสถานที่</p>
            <p className="text-[12px] text-muted">ลองค้นหาใหม่อีกครั้ง</p>
          </div>
        ) : (
          /* Group by province */
          Array.from(grouped.entries()).map(([prov, venues]) => (
            <div key={prov} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={13} style={{ color: 'var(--accent)' }} />
                <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide">{prov}</h2>
                <span className="text-[11px] text-muted">({venues.length})</span>
              </div>

              <div className="flex flex-col gap-3">
                {venues.map(venue => {
                  const isFollowed   = followedIds.has(venue.id)
                  const upcomingEvs  = getUpcomingEvents(venue.id)

                  return (
                    <div key={venue.id}
                      className="rounded-2xl overflow-hidden transition-all"
                      style={{
                        background: 'var(--surface-1)',
                        border: `1px solid ${isFollowed ? 'var(--accent)' : 'var(--border)'}`,
                        borderLeft: isFollowed ? '4px solid var(--accent)' : '1px solid var(--border)',
                      }}>

                      {/* Venue header */}
                      <div className="flex items-start gap-3 p-4"
                        style={{ borderBottom: upcomingEvs.length > 0 ? '1px solid var(--border)' : 'none' }}>

                        {/* Icon */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: isFollowed ? 'var(--accent-muted)' : 'var(--surface-2)' }}>
                          <MapPin size={18} style={{ color: isFollowed ? 'var(--accent)' : 'var(--text-muted)' }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-[15px] font-medium text-primary leading-tight">{venue.name}</h3>
                            <div className="flex items-center gap-2 shrink-0">
                              {venue.maps_url && (
                                <a href={venue.maps_url} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-all"
                                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                  <ExternalLink size={11} /> Maps
                                </a>
                              )}
                              <button onClick={() => toggleFollow(venue.id, venue.name)}
                                className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl font-medium transition-all"
                                style={{
                                  background:  isFollowed ? 'var(--accent-muted)' : 'var(--accent)',
                                  color:       isFollowed ? 'var(--accent)' : 'var(--surface-0)',
                                  border:      isFollowed ? '1px solid var(--accent)' : 'none',
                                }}>
                                <Heart size={12} style={{ fill: isFollowed ? 'var(--accent)' : 'white' }} />
                                {isFollowed ? 'ติดตามอยู่' : 'ติดตาม'}
                              </button>
                            </div>
                          </div>
                          {venue.address && (
                            <p className="text-[12px] text-muted leading-relaxed">{venue.address}</p>
                          )}
                          {/* Upcoming count badge */}
                          {upcomingEvs.length > 0 && (
                            <span className="inline-flex items-center gap-1 mt-2 text-[10px] px-2 py-0.5 rounded-full"
                              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                              <Music size={9} /> {upcomingEvs.length} งานที่กำลังจะมา
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Upcoming events */}
                      {upcomingEvs.length > 0 && (
                        <div className="px-4 py-3 flex flex-col gap-2"
                          style={{ background: 'var(--surface-2)' }}>
                          {upcomingEvs.map(ev => {
                            const start    = parseISO(ev.start_date)
                            const daysLeft = differenceInDays(start, new Date())
                            return (
                              <div key={ev.id}
                                onClick={() => { window.location.href = `/events/${ev.id}` }}
                                className="flex items-center gap-3 cursor-pointer rounded-xl p-2.5 transition-all"
                                style={{ background: 'var(--surface-1)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-1)')}>

                                {/* Date */}
                                <div className="w-9 h-9 rounded-lg shrink-0 flex flex-col items-center justify-center"
                                  style={{ background: daysLeft <= 3 ? 'var(--accent-muted)' : 'var(--surface-2)' }}>
                                  <span style={{ fontSize:13, fontWeight:600, color:'var(--accent)', lineHeight:1 }}>
                                    {format(start,'d')}
                                  </span>
                                  <span style={{ fontSize:8, color:'var(--accent)', opacity:.7, textTransform:'uppercase' }}>
                                    {format(start,'MMM',{locale:th})}
                                  </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-medium text-primary truncate">{ev.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {ev.artists?.slice(0,2).map((a: any) => (
                                      <span key={a.id} className="text-[10px] text-muted">{a.name}</span>
                                    ))}
                                    {ev.start_time && (
                                      <span className="flex items-center gap-0.5 text-[10px] text-muted ml-auto shrink-0">
                                        <Clock size={9}/>{ev.start_time.slice(0,5)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className="text-[11px] font-medium"
                                    style={{ color: ev.is_free ? '#5DCAA5' : 'var(--accent)' }}>
                                    {ev.is_free ? 'ฟรี' : ev.ticket_price_min ? `฿${ev.ticket_price_min.toLocaleString()}` : ''}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                    style={{
                                      background: daysLeft === 0 ? 'rgba(232,0,58,.1)' : daysLeft <= 3 ? 'rgba(186,117,23,.1)' : 'var(--surface-2)',
                                      color:      daysLeft === 0 ? '#E8003A' : daysLeft <= 3 ? '#EF9F27' : 'var(--text-muted)',
                                    }}>
                                    {daysLeft === 0 ? 'วันนี้!' : daysLeft === 1 ? 'พรุ่งนี้' : `${daysLeft}วัน`}
                                  </span>
                                </div>
                              </div>
                            )
                          })}

                          {/* See all */}
                          <button
                            onClick={() => window.location.href = `/venues/${venue.id}`}
                            className="flex items-center justify-center gap-1 text-[11px] pt-1 transition-colors hover:text-primary"
                            style={{ color: 'var(--accent)' }}>
                            ดูงานทั้งหมดของสถานที่นี้ <ChevronRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
