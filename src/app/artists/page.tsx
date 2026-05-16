'use client'
import { useState, useEffect, useMemo } from 'react'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Search, Heart, X, Loader2, Music, ChevronRight } from 'lucide-react'
import { cn, genreTagClass } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import toast from 'react-hot-toast'
import type { Artist } from '@/types'


export default function ArtistsPage() {
  const [artists,     setArtists]     = useState<Artist[]>([])
  const [events,      setEvents]      = useState<any[]>([])
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [showFollowed,setShowFollowed]= useState(false)
  const [genreList,   setGenreList]   = useState<{id:string;label_th:string;label_en:string;category:string}[]>([])
  const [showAllGenres, setShowAllGenres] = useState(false)

  const { user } = useAuth()
  const sb = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)

      try {
        const [arRes, evRes, genreRes] = await Promise.all([
          sb.from('artists').select('id, name, name_en, slug, bio, image_url, genres, facebook_url, instagram_url, tiktok_url, website_url, label_url, created_at').is('deleted_at', null).order('name'),

          sb.from('events')
            .select(`
              id,
              title,
              slug,
              start_date,
              start_time,
              is_free,
              ticket_price_min,
              venue:venues(name),
              event_artists(artist_id)
            `)
            .is('deleted_at', null)
            .gte('start_date', new Date().toISOString().slice(0, 10))
            .order('start_date', { ascending: true }),
          sb.from('genres').select('id,label_th,label_en,category').order('category').order('label_en'),
        ])

        setArtists(arRes.data || [])
        setEvents(evRes.data || [])
        setGenreList(genreRes.data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    async function loadFollows() {
      if (!user) {
        setFollowedIds(new Set())
        return
      }

      try {
        const { data, error } = await sb
          .from('follows')
          .select('artist_id')
          .eq('user_id', user.id)

        if (error) throw error

        setFollowedIds(
          new Set((data || []).map((f: any) => f.artist_id))
        )
      } catch (e) {
        console.error(e)
      }
    }

    loadFollows()
  }, [user])

  async function toggleFollow(
    artistId: string,
    artistName: string
  ) {
    if (!user) {
      toast.error('กรุณา Login ก่อนครับ')
      window.location.href = '/login'
      return
    }

    const isFollowed = followedIds.has(artistId)

    setFollowedIds(prev => {
      const n = new Set(prev)

      if (isFollowed) {
        n.delete(artistId)
      } else {
        n.add(artistId)
      }

      return n
    })

    try {
      if (isFollowed) {
        const { error } = await sb
          .from('follows')
          .delete()
          .eq('user_id', user.id)
          .eq('artist_id', artistId)

        if (error) throw error

        toast.success(`เลิกติดตาม ${artistName}`)
      } else {
        const { error } = await sb
          .from('follows')
          .insert({
            user_id: user.id,
            artist_id: artistId,
          })

        if (error) throw error

        toast.success(`ติดตาม ${artistName} แล้ว! 🎵`)
      }
    } catch (e) {
      console.error(e)

      setFollowedIds(prev => {
        const n = new Set(prev)

        if (isFollowed) {
          n.add(artistId)
        } else {
          n.delete(artistId)
        }

        return n
      })

      toast.error('เกิดข้อผิดพลาด')
    }
  }

  function getUpcomingEvents(artistId: string) {
    return events
      .filter(ev =>
        ev.event_artists?.some(
          (ea: any) => ea.artist_id === artistId
        )
      )
      .slice(0, 2)
  }

  const filtered = useMemo(() => {
    return artists.filter(a => {
      if (showFollowed && !followedIds.has(a.id)) {
        return false
      }

      if (
        genreFilter &&
        !(a.genres ?? []).includes(genreFilter as any)
      ) {
        return false
      }

      if (search) {
        const q = search.toLowerCase()

        const matched =
          a.name.toLowerCase().includes(q) ||
          (a.name_en ?? '').toLowerCase().includes(q)

        if (!matched) {
          return false
        }
      }

      return true
    })
  }, [
    artists,
    search,
    genreFilter,
    showFollowed,
    followedIds,
  ])

  return (
    <div
      className="min-h-screen pb-24 md:pb-8"
      style={{ background: 'var(--surface-0)' }}
    >
      <Navbar />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <div className="mb-6">
          <h1 className="text-[22px] font-medium text-primary mb-1">
            ศิลปินทั้งหมด
          </h1>

          <p className="text-[13px] text-muted">
            {artists.length} ศิลปิน · {followedIds.size} ที่ติดตาม
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">

          <div
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 flex-1"
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)'
            }}
          >
            <Search
              size={15}
              className="text-muted shrink-0"
            />

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อศิลปิน..."
              className="bg-transparent text-[14px] text-primary outline-none w-full placeholder:text-muted"
            />

            {search && (
              <button onClick={() => setSearch('')}>
                <X
                  size={14}
                  className="text-muted"
                />
              </button>
            )}
          </div>

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
                background: showFollowed
                  ? 'var(--accent-muted)'
                  : 'var(--surface-1)',
                border: `1px solid ${
                  showFollowed
                    ? 'var(--accent)'
                    : 'var(--border)'
                }`,
                color: showFollowed
                  ? 'var(--accent)'
                  : undefined,
              }}
            >
              <Heart
                size={14}
                style={{
                  fill: showFollowed
                    ? 'var(--accent)'
                    : 'none',
                }}
              />

              ที่ติดตาม ({followedIds.size})
            </button>
          )}
        </div>

        {/* Genre pills — sorted by count, show top 8 */}
        {(() => {
          const genreCounts = genreList.map(g => ({
            ...g,
            count: artists.filter(a => (a.genres ?? []).includes(g.id as any)).length,
          })).filter(g => g.count > 0).sort((a, b) => b.count - a.count)

          const visible = showAllGenres ? genreCounts : genreCounts.slice(0, 8)
          const hidden  = genreCounts.length - 8

          return (
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                onClick={() => setGenreFilter('')}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[12px] shrink-0 transition-all border',
                  !genreFilter
                    ? 'font-medium border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]'
                    : 'border-[var(--border)] text-secondary'
                )}
              >
                ทั้งหมด
              </button>

              {visible.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGenreFilter(genreFilter === g.id ? '' : g.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] shrink-0 transition-all border whitespace-nowrap',
                    genreFilter === g.id
                      ? 'font-medium border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]'
                      : 'border-[var(--border)] text-secondary'
                  )}
                >
                  {g.label_th}
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    genreFilter === g.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface-2)] text-muted'
                  )}>{g.count}</span>
                </button>
              ))}

              {!showAllGenres && hidden > 0 && (
                <button
                  onClick={() => setShowAllGenres(true)}
                  className="px-3 py-1.5 rounded-full text-[12px] shrink-0 transition-all border border-dashed border-[var(--border)] text-muted hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  + อีก {hidden} แนว
                </button>
              )}
              {showAllGenres && (
                <button
                  onClick={() => setShowAllGenres(false)}
                  className="px-3 py-1.5 rounded-full text-[12px] shrink-0 transition-all border border-dashed border-[var(--border)] text-muted"
                >
                  ย่อลง
                </button>
              )}
            </div>
          )
        })()}

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-muted">
            <Loader2
              size={22}
              className="animate-spin"
            />

            <span className="text-[13px]">
              กำลังโหลด...
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)'
            }}
          >
            <Music
              size={36}
              className="mx-auto mb-3 text-muted"
            />

            <p className="text-[14px] font-medium text-primary mb-1">
              {showFollowed
                ? 'ยังไม่ได้ติดตามศิลปินคนไหน'
                : 'ไม่พบศิลปินที่ค้นหา'}
            </p>

            <p className="text-[12px] text-muted">
              {showFollowed
                ? 'กด Follow ที่ศิลปินที่ชอบเพื่อติดตาม'
                : 'ลองค้นหาใหม่อีกครั้ง'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(artist => {
              const isFollowed =
                followedIds.has(artist.id)

              const upcomingEvs =
                getUpcomingEvents(artist.id)

              const hasEvents =
                upcomingEvs.length > 0

              return (
                <div
                  key={artist.id}
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div className="p-4">

                    <div className="flex items-center gap-3 mb-3">

                      {artist.image_url ? (
                        <img
                          src={artist.image_url}
                          alt={artist.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0"
                          onClick={() => {
                            window.location.href = `/artists/${artist.slug || artist.id}`
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-[15px] font-medium cursor-pointer"
                          style={{
                            background: 'var(--accent-muted)',
                            color: 'var(--accent)'
                          }}
                          onClick={() => {
                            window.location.href = `/artists/${artist.slug || artist.id}`
                          }}
                        >
                          {(artist.name_en || artist.name).slice(0, 2)}
                        </div>
                      )}

                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          window.location.href = `/artists/${artist.slug || artist.id}`
                        }}
                      >
                        <p className="text-[14px] font-medium text-primary leading-tight truncate">
                          {artist.name_en || artist.name}
                        </p>

                        {artist.name_en &&
                          artist.name !== artist.name_en && (
                            <p className="text-[11px] text-muted truncate">
                              {artist.name}
                            </p>
                          )}

                        <div className="flex gap-1 mt-1 flex-wrap">
                          {(artist.genres ?? [])
                            .slice(0, 2)
                            .map(g => (
                              <span
                                key={g}
                                className={cn(
                                  'tag text-[9px]',
                                  genreTagClass(g)
                                )}
                              >
                                {g}
                              </span>
                            ))}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          toggleFollow(
                            artist.id,
                            artist.name
                          )
                        }
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: isFollowed
                            ? 'var(--accent)'
                            : 'var(--surface-2)',
                          border: isFollowed
                            ? 'none'
                            : '1px solid var(--border)',
                        }}
                      >
                        <Heart
                          size={16}
                          style={{
                            color: isFollowed
                              ? 'white'
                              : 'var(--text-muted)',
                            fill: isFollowed
                              ? 'white'
                              : 'none',
                          }}
                        />
                      </button>
                    </div>

                    {hasEvents ? (
                      <div className="flex flex-col gap-1.5">
                        {upcomingEvs.map((ev: any) => (
                          <div
                            key={ev.id}
                            onClick={() => {
                              window.location.href = `/events/${ev.slug || ev.id}`
                            }}
                            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors"
                            style={{
                              background: 'var(--surface-2)'
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0"
                              style={{
                                background: 'var(--accent-muted)'
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: 'var(--accent)',
                                  lineHeight: 1,
                                }}
                              >
                                {format(
                                  parseISO(ev.start_date),
                                  'd'
                                )}
                              </span>

                              <span
                                style={{
                                  fontSize: 8,
                                  color: 'var(--accent)',
                                  opacity: .7,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {format(
                                  parseISO(ev.start_date),
                                  'MMM',
                                  { locale: th }
                                )}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-primary truncate">
                                {ev.title}
                              </p>

                              <p className="text-[10px] text-muted truncate">
                                {ev.venue?.name}
                                {ev.start_time &&
                                  ` · ${ev.start_time.slice(0,5)}`}
                              </p>
                            </div>

                            <ChevronRight
                              size={12}
                              className="text-muted shrink-0"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="py-2 px-3 rounded-lg text-center"
                        style={{
                          background: 'var(--surface-2)'
                        }}
                      >
                        <p className="text-[10px] text-muted">
                          ยังไม่มีงานที่กำลังจะมา
                        </p>
                      </div>
                    )}

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
