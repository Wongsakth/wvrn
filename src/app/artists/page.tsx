'use client'
import { useState, useEffect, useMemo } from 'react'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Search, Heart, X, Loader2, Music, MapPin, Clock, ChevronRight, Filter } from 'lucide-react'
import { cn, genreTagClass } from '@/lib/utils'
import { format, parseISO, isPast } from 'date-fns'
import { th } from 'date-fns/locale'
import toast from 'react-hot-toast'
import type { Artist } from '@/types'

const GENRES = ['pop','rock','indie','hiphop','jazz','electronic','folk','rnb']

export default function ArtistsPage() {
  const [artists,      setArtists]      = useState<Artist[]>([])
  const [events,       setEvents]       = useState<any[]>([])
  const [followedIds,  setFollowedIds]  = useState<Set<string>>(new Set())
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [genreFilter,  setGenreFilter]  = useState('')
  const [showFollowed, setShowFollowed] = useState(false)
  const { user, loading: authLoading }  = useAuth()
  const sb = createClient()

  // ─── Load artists + events + follows ───────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [arRes, evRes] = await Promise.all([
          sb.from('artists').select('*').order('name'),
          sb.from('events')
            .select('id, title, start_date, start_time, is_free, ticket_price_min, venue:venues(name), event_artists(artist_id)')
            .gte('start_date', new Date().toISOString().slice(0,10))
            .order('start_date', { ascending: true }),
        ])
        setArtists(arRes.data || [])
        setEvents(evRes.data || [])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // ─── Load followed artists ──────────────────────────────────
  useEffect(() => {
    if (!user) { setFollowedIds(new Set()); return }
    sb.from('follows').select('artist_id').eq('user_id', user.id)
      .then(({ data }) => {
        setFollowedIds(new Set((data || []).map((f: any) => f.artist_id)))
      })
  }, [user])

  // ─── Toggle follow ──────────────────────────────────────────
  async function toggleFollow(artistId: string, artistName: string) {
    if (!user) { toast.error('กรุณา Login ก่อนครับ'); window.location.href = '/login'; return }
    const isFollowed = followedIds.has(artistId)
    // Optimistic update
    setFollowedIds(prev => {
      const n = new Set(prev)
      isFollowed ? n.delete(artistId) : n.add(artistId)
      return n
    })
    try {
      if (isFollowed) {
        await sb.from('follows').delete().eq('user_id', user.id).eq('artist_id', artistId)
        toast.success(`เลิกติดตาม ${artistName}`)
      } else {
        await sb.from('follows').insert({ user_id: user.id, artist_id: artistId })
        toast.success(`ติดตาม ${artistName} แล้ว! 🎵`)
      }
    } catch (e: any) {
      // Revert on error
      setFollowedIds(prev => {
        const n = new Set(prev)
        isFollowed ? n.add(artistId) : n.delete(artistId)
        return n
      })
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  // ─── Get upcoming events for artist ───────────────────────
  function getUpcomingEvents(artistId: string) {
    return events
      .filter(ev => ev.event_artists?.some((ea: any) => ea.artist_id === artistId))
      .slice(0, 2)
  }

  // ─── Filter ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return artists.filter(a => {
      if (showFollowed && !followedIds.has(a.id)) return false
      if (genreFilter && !(a.genres ?? []).includes(genreFilter as any)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!a.name.toLowerCase().includes(q) && !(a.name_en ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [artists, search, genreFilter, showFollowed, followedIds])

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-medium text-primary mb-1">ศิลปินทั้งหมด</h1>
          <p className="text-[13px] text-muted">
            {artists.length} ศิลปิน · {followedIds.size} ที่ติดตาม
          </p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 flex-1"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <Search size={15} className="text-muted shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อศิลปิน..."
              className="bg-transparent text-[14px] text-primary outline-none w-full placeholder:text-muted"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={14} className="text-muted" />
              </button>
            )}
          </div>

          {/* Followed toggle */}
          {user && (
            <button
              onClick={() => setShowFollowed(v => !v)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] transition-all shrink-0',
                showFollowed
                  ? 'font-medium'
                  : 'text-secondary'
              )}
              style={{
                background: showFollowed ? 'var(--accent-muted)' : 'var(--surface-1)',
                border: `1px solid ${showFollowed ? 'var(--accent)' : 'var(--border)'}`,
                color: showFollowed ? 'var(--accent)' : undefined,
              }}>
              <Heart size={14} style={{ fill: showFollowed ? 'var(--accent)' : 'none' }} />
              ที่ติดตาม ({followedIds.size})
            </button>
          )}
        </div>

        {/* Genre filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          <button
            onClick={() => setGenreFilter('')}
            className={cn(
              'px-3 py-1.5 rounded-full text-[12px] shrink-0 transition-all border',
              !genreFilter
                ? 'font-medium border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]'
                : 'border-[var(--border)] text-secondary'
            )}>
            ทั้งหมด
          </button>
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => setGenreFilter(genreFilter === g ? '' : g)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[12px] shrink-0 transition-all border capitalize',
                genreFilter === g
                  ? 'font-medium border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]'
                  : 'border-[var(--border)] text-secondary'
              )}>
              {g}
            </button>
          ))}
        </div>

        {/* Artists grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-muted">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-[13px]">กำลังโหลด...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <Music size={36} className="mx-auto mb-3 text-muted" />
            <p className="text-[14px] font-medium text-primary mb-1">
              {showFollowed ? 'ยังไม่ได้ติดตามศิลปินคนไหน' : 'ไม่พบศิลปินที่ค้นหา'}
            </p>
            <p className="text-[12px] text-muted">
              {showFollowed ? 'กด Follow ที่ศิลปินที่ชอบเพื่อติดตาม' : 'ลองค้นหาใหม่อีกครั้ง'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(artist => {
              const isFollowed    = followedIds.has(artist.id)
              const upcomingEvs   = getUpcomingEvents(artist.id)
              const hasEvents     = upcomingEvs.length > 0

              return (
                <div
                  key={artist.id}
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
                >
                  {/* Artist info */}
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {/* Avatar */}
                      {artist.image_url ? (
                        <img
                          src={artist.image_url}
                          alt={artist.name}
                          className="w-14 h-14 rounded-2xl object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-[16px] font-medium"
                          style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                          {artist.name.slice(0, 2)}
                        </div>
                      )}

                      {/* Name + Follow */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-primary leading-tight truncate">
                          {artist.name}
                        </p>
                        {artist.name_en && (
                          <p className="text-[11px] text-muted truncate">{artist.name_en}</p>
                        )}
                        {/* Genres */}
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {(artist.genres ?? []).slice(0, 2).map(g => (
                            <span key={g} className={cn('tag text-[9px]', genreTagClass(g))}>{g}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Upcoming events */}
                    {hasEvents ? (
                      <div className="flex flex-col gap-1.5 mb-3">
                        {upcomingEvs.map(ev => (
                          <div
                            key={ev.id}
                            onClick={() => { window.location.href = `/events/${ev.id}` }}
                            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors"
                            style={{ background: 'var(--surface-2)' }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0"
                              style={{ background: 'var(--accent-muted)' }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>
                                {format(parseISO(ev.start_date), 'd')}
                              </span>
                              <span style={{ fontSize: 8, color: 'var(--accent)', opacity: .7, textTransform: 'uppercase' }}>
                                {format(parseISO(ev.start_date), 'MMM', { locale: th })}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-primary truncate">{ev.title}</p>
                              <p className="text-[10px] text-muted truncate">
                                {ev.venue?.name}
                                {ev.start_time && ` · ${ev.start_time.slice(0,5)}`}
                              </p>
                            </div>
                            <ChevronRight size={12} className="text-muted shrink-0" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mb-3 py-2 px-3 rounded-lg text-center"
                        style={{ background: 'var(--surface-2)' }}>
                        <p className="text-[10px] text-muted">ยังไม่มีงานที่กำลังจะมา</p>
                      </div>
                    )}

                    {/* Follow button */}
                    <button
                      onClick={() => toggleFollow(artist.id, artist.name)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-medium transition-all"
                      style={{
                        background:  isFollowed ? 'var(--accent-muted)' : 'var(--accent)',
                        color:       isFollowed ? 'var(--accent)' : 'var(--surface-0)',
                        border:      isFollowed ? '1px solid var(--accent)' : 'none',
                      }}
                    >
                      <Heart
                        size={14}
                        style={{ fill: isFollowed ? 'var(--accent)' : 'white' }}
                      />
                      {isFollowed ? 'ติดตามอยู่' : 'ติดตาม'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
