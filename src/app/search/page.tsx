'use client'
import { useState, useEffect, useMemo } from 'react'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { Search, X, Music, MapPin, Calendar, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { cn, genreTagClass } from '@/lib/utils'

type ResultType = 'all' | 'events' | 'artists' | 'venues'

export default function SearchPage() {
  const [query,   setQuery]   = useState('')
  const [filter,  setFilter]  = useState<ResultType>('all')
  const [events,  setEvents]  = useState<any[]>([])
  const [artists, setArtists] = useState<any[]>([])
  const [venues,  setVenues]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const today = new Date().toISOString().slice(0, 10)
        const [evRes, arRes, vRes] = await Promise.all([
          sb.from('events').select('id,title,start_date,start_time,is_free,ticket_price_min,genres,venue:venues(name)')
            .gte('start_date', today).order('start_date', { ascending: true }),
          sb.from('artists').select('id,name,name_en,image_url,genres').order('name'),
          sb.from('venues').select('id,name,province,address').order('name'),
        ])
        setEvents(evRes.data || [])
        setArtists(arRes.data || [])
        setVenues(vRes.data || [])
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const q = query.toLowerCase().trim()

  const filteredEvents  = useMemo(() => !q ? events  : events.filter(e =>
    e.title?.toLowerCase().includes(q) || e.venue?.name?.toLowerCase().includes(q)
  ), [events, q])

  const filteredArtists = useMemo(() => !q ? artists : artists.filter(a =>
    a.name?.toLowerCase().includes(q) || (a.name_en ?? '').toLowerCase().includes(q)
  ), [artists, q])

  const filteredVenues  = useMemo(() => !q ? venues  : venues.filter(v =>
    v.name?.toLowerCase().includes(q) || (v.province ?? '').toLowerCase().includes(q)
  ), [venues, q])

  const totalResults = filteredEvents.length + filteredArtists.length + filteredVenues.length

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-6">

        {/* Search input */}
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Search size={18} className="text-muted shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ค้นหางาน ศิลปิน สถานที่..."
            autoFocus
            className="bg-transparent text-[16px] text-primary outline-none flex-1 placeholder:text-muted"
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X size={16} className="text-muted" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
          {([
            { id: 'all',     label: `ทั้งหมด (${totalResults})` },
            { id: 'events',  label: `งาน (${filteredEvents.length})` },
            { id: 'artists', label: `ศิลปิน (${filteredArtists.length})` },
            { id: 'venues',  label: `สถานที่ (${filteredVenues.length})` },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="px-3 py-1.5 rounded-full text-[12px] shrink-0 font-medium transition-all"
              style={{
                background: filter === f.id ? 'var(--accent)' : 'var(--surface-2)',
                color: filter === f.id ? 'var(--surface-0)' : 'var(--text-muted)',
                border: filter === f.id ? 'none' : '1px solid var(--border)',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Events */}
            {(filter === 'all' || filter === 'events') && filteredEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-[12px] font-medium text-muted uppercase tracking-wide">งาน</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {(filter === 'all' ? filteredEvents.slice(0,5) : filteredEvents).map(ev => (
                    <div key={ev.id}
                      onClick={() => window.location.href = `/events/${ev.slug || ev.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                      <div className="w-10 h-10 rounded-lg shrink-0 flex flex-col items-center justify-center"
                        style={{ background: 'var(--accent-muted)' }}>
                        <span className="text-[14px] font-medium leading-none" style={{ color: 'var(--accent)' }}>
                          {format(parseISO(ev.start_date), 'd')}
                        </span>
                        <span className="text-[8px] uppercase" style={{ color: 'var(--accent)', opacity: .7 }}>
                          {format(parseISO(ev.start_date), 'MMM', { locale: th })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-primary truncate">{ev.title}</p>
                        <p className="text-[10px] text-muted">{ev.venue?.name}</p>
                      </div>
                      <span className="text-[11px] font-medium shrink-0"
                        style={{ color: ev.is_free ? '#5DCAA5' : 'var(--accent)' }}>
                        {ev.is_free ? 'ฟรี' : ev.ticket_price_min ? `฿${ev.ticket_price_min.toLocaleString()}` : ''}
                      </span>
                    </div>
                  ))}
                  {filter === 'all' && filteredEvents.length > 5 && (
                    <button onClick={() => setFilter('events')} className="text-[12px] text-center py-2"
                      style={{ color: 'var(--accent)' }}>
                      ดูงานทั้งหมด {filteredEvents.length} รายการ →
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Artists */}
            {(filter === 'all' || filter === 'artists') && filteredArtists.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Music size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-[12px] font-medium text-muted uppercase tracking-wide">ศิลปิน</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(filter === 'all' ? filteredArtists.slice(0,6) : filteredArtists).map(artist => (
                    <div key={artist.id}
                      onClick={() => window.location.href = `/artists/${artist.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                      {artist.image_url
                        ? <img src={artist.image_url} alt={artist.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                        : <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[11px] font-medium"
                            style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{artist.name.slice(0,2)}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-primary truncate">{artist.name}</p>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {(artist.genres ?? []).slice(0,2).map((g: string) => (
                            <span key={g} className={cn('tag text-[9px]', genreTagClass(g))}>{g}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {filter === 'all' && filteredArtists.length > 6 && (
                  <button onClick={() => setFilter('artists')} className="text-[12px] text-center w-full py-2 mt-1"
                    style={{ color: 'var(--accent)' }}>
                    ดูศิลปินทั้งหมด {filteredArtists.length} คน →
                  </button>
                )}
              </section>
            )}

            {/* Venues */}
            {(filter === 'all' || filter === 'venues') && filteredVenues.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-[12px] font-medium text-muted uppercase tracking-wide">สถานที่</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {(filter === 'all' ? filteredVenues.slice(0,4) : filteredVenues).map(venue => (
                    <div key={venue.id}
                      onClick={() => window.location.href = `/venues`}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                      <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ background: 'var(--accent-muted)' }}>
                        <MapPin size={16} style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-primary truncate">{venue.name}</p>
                        <p className="text-[10px] text-muted">{venue.province}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty */}
            {q && totalResults === 0 && (
              <div className="text-center py-16">
                <Search size={36} className="mx-auto mb-3 text-muted" />
                <p className="text-[14px] font-medium text-primary">ไม่พบ "{query}"</p>
                <p className="text-[12px] text-muted mt-1">ลองค้นหาด้วยคำอื่น</p>
              </div>
            )}

            {/* No query */}
            {!q && (
              <div className="text-center py-10 text-muted">
                <Search size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-[13px]">พิมพ์ชื่องาน ศิลปิน หรือสถานที่</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
