'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  Heart, Instagram, Facebook, Globe, Building2,
  MapPin, Clock, ChevronLeft, ChevronRight,
  Loader2, Music, ExternalLink,
} from 'lucide-react'
import { cn, genreTagClass, formatPrice } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import toast from 'react-hot-toast'

function TikTokIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.27 8.27 0 004.83 1.55V6.86a4.85 4.85 0 01-1.06-.17z"/>
    </svg>
  )
}

export default function ArtistProfilePage() {
  const { slug }  = useParams<{ slug: string }>()
  const router    = useRouter()
  const { user }  = useAuth()
  const sb        = createClient()

  const [artist,   setArtist]   = useState<any>(null)
  const [artistId, setArtistId] = useState<string | null>(null)
  const [label,    setLabel]    = useState<any>(null)
  const [events,   setEvents]   = useState<any[]>([])
  const [followed, setFollowed] = useState(false)
  const [loading,  setLoading]  = useState(true)

  // Load artist + events
  useEffect(() => {
    if (!slug) return
    async function load() {
      setLoading(true)
      try {
        const decoded = decodeURIComponent(slug as string)
        const isUuid  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)

        const { data: artistData, error } = isUuid
          ? await sb.from('artists').select('*, label:labels(id,name,website_url,facebook_url)').eq('id', decoded).single()
          : await sb.from('artists').select('*, label:labels(id,name,website_url,facebook_url)').eq('slug', decoded).single()

        if (error || !artistData) {
          setArtist(null)
          setLoading(false)
          return
        }

        setArtist(artistData)
        setArtistId(artistData.id)
        if (artistData.label) setLabel(artistData.label)

        const today = new Date().toISOString().slice(0, 10)
        const { data: evData } = await sb
          .from('events')
          .select('*, venue:venues(name, province), event_artists!inner(artist_id)')
          .eq('event_artists.artist_id', artistData.id)
          .gte('start_date', today)
          .order('start_date', { ascending: true })

        setEvents((evData || []).map((ev: any) => ({ ...ev, artists: [] })))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])  // ← FIX: dependency เป็น slug ไม่ใช่ id

  // Check follow — รอให้ artistId มีค่าก่อน
  useEffect(() => {
    if (!user || !artistId) { setFollowed(false); return }
    sb.from('follows')
      .select('artist_id')
      .eq('user_id', user.id)
      .eq('artist_id', artistId)
      .maybeSingle()
      .then(({ data }) => setFollowed(!!data))
  }, [user, artistId])  // ← FIX: ใช้ artistId แทน id

  async function toggleFollow() {
    if (!user) { toast.error('กรุณา Login ก่อนครับ'); window.location.href = '/login'; return }
    if (!artistId) return
    const prev = followed
    setFollowed(!prev)
    try {
      if (prev) {
        await sb.from('follows').delete().eq('user_id', user.id).eq('artist_id', artistId)
        toast.success(`เลิกติดตาม ${artist?.name}`)
      } else {
        await sb.from('follows').insert({ user_id: user.id, artist_id: artistId })
        toast.success(`ติดตาม ${artist?.name} แล้ว! 🎵`)
      }
    } catch {
      setFollowed(prev)
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  if (loading) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    </div>
  )

  if (!artist) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-[15px] font-medium text-primary mb-2">ไม่พบศิลปินนี้</p>
        <button onClick={() => router.back()} className="text-[13px] text-accent hover:underline">← กลับ</button>
      </div>
    </div>
  )

  // label url: ถ้ามี label object ให้ใช้ website_url หรือ facebook_url จาก label
  const labelUrl   = label?.website_url || label?.facebook_url || artist.label_url
  const labelName  = label?.name || 'ค่ายเพลง'

  const socials = [
    { url: artist.instagram_url, icon: <Instagram size={16} />, label: 'Instagram', color: '#E1306C' },
    { url: artist.facebook_url,  icon: <Facebook  size={16} />, label: 'Facebook',  color: '#1877F2' },
    { url: artist.tiktok_url,    icon: <TikTokIcon size={16} />, label: 'TikTok',   color: '#010101' },
    { url: artist.website_url,   icon: <Globe      size={16} />, label: 'Website',  color: 'var(--accent)' },
    { url: labelUrl,             icon: <Building2  size={16} />, label: labelName,  color: 'var(--text-muted)' },
  ].filter(s => s.url)

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />

      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Back */}
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] text-muted hover:text-primary transition-colors mb-5">
          <ChevronLeft size={16} /> กลับ
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Artist info ── */}
          <div className="lg:col-span-1 flex flex-col gap-4">

            {/* Profile card */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

              {/* Cover / Avatar */}
              <div className="h-24 flex items-end justify-center pb-0 relative"
                style={{ background: 'linear-gradient(135deg, var(--accent-muted), var(--surface-2))' }}>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                  {artist.image_url ? (
                    <img src={artist.image_url} alt={artist.name}
                      className="w-20 h-20 rounded-2xl object-cover border-4"
                      style={{ borderColor: 'var(--surface-1)' }} />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-[24px] font-medium border-4"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)', borderColor: 'var(--surface-1)' }}>
                      {artist.name.slice(0, 2)}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-12 pb-4 px-4 text-center">
                <h1 className="text-[20px] font-medium text-primary mb-0.5">{artist.name}</h1>
                {artist.name_en && (
                  <p className="text-[13px] text-muted mb-3">{artist.name_en}</p>
                )}

                {/* Genres */}
                <div className="flex gap-2 justify-center flex-wrap mb-4">
                  {(artist.genres ?? []).map((g: string) => (
                    <span key={g} className={cn('tag', genreTagClass(g))}>{g}</span>
                  ))}
                </div>

                {/* Follow button */}
                <button onClick={toggleFollow}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium transition-all"
                  style={{
                    background: followed ? 'var(--accent-muted)' : 'var(--accent)',
                    color:      followed ? 'var(--accent)' : 'var(--surface-0)',
                    border:     followed ? '1px solid var(--accent)' : 'none',
                  }}>
                  <Heart size={15} style={{ fill: followed ? 'var(--accent)' : 'white' }} />
                  {followed ? 'ติดตามอยู่' : 'ติดตาม'}
                </button>
              </div>
            </div>

            {/* Bio */}
            {artist.bio && (
              <div className="rounded-xl p-4"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <h3 className="text-[11px] font-medium text-muted uppercase tracking-wide mb-2">เกี่ยวกับ</h3>
                <p className="text-[13px] text-secondary leading-relaxed">{artist.bio}</p>
              </div>
            )}

            {/* Social links */}
            {socials.length > 0 && (
              <div className="rounded-xl p-4"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <h3 className="text-[11px] font-medium text-muted uppercase tracking-wide mb-3">Social Media</h3>
                <div className="flex flex-col gap-2">
                  {socials.map(s => (
                    <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-[var(--surface-2)]">
                      <span style={{ color: s.color }}>{s.icon}</span>
                      <span className="text-[13px] text-secondary flex-1">{s.label}</span>
                      <ExternalLink size={12} className="text-muted" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Events ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Music size={16} style={{ color: 'var(--accent)' }} />
              <h2 className="text-[16px] font-medium text-primary">งานที่กำลังจะมา</h2>
              <span className="text-[12px] text-muted">{events.length} งาน</span>
            </div>

            {events.length === 0 ? (
              <div className="rounded-xl p-10 text-center"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <Music size={32} className="mx-auto mb-3 text-muted" />
                <p className="text-[14px] font-medium text-primary">ยังไม่มีงานที่กำลังจะมา</p>
                <p className="text-[12px] text-muted mt-1">ติดตามเพื่อรับแจ้งเตือนเมื่อมีงานใหม่</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {events.map(ev => (
                  <div key={ev.id}
                    onClick={() => { window.location.href = `/events/${ev.slug || ev.id}` }}
                    className="rounded-xl overflow-hidden cursor-pointer transition-all"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <div className="flex">
                      {/* Date */}
                      <div className="flex flex-col items-center justify-center px-4 py-4 shrink-0"
                        style={{ background: 'var(--accent-muted)', borderRight: '1px solid var(--border)', minWidth: 60 }}>
                        <span className="text-[20px] font-medium leading-none" style={{ color: 'var(--accent)' }}>
                          {format(parseISO(ev.start_date), 'd')}
                        </span>
                        <span className="text-[9px] uppercase mt-0.5" style={{ color: 'var(--accent)', opacity: .7 }}>
                          {format(parseISO(ev.start_date), 'MMM', { locale: th })}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 px-4 py-3">
                        <p className="text-[14px] font-medium text-primary mb-1 line-clamp-1">{ev.title}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {ev.venue && (
                            <span className="flex items-center gap-1 text-[11px] text-muted">
                              <MapPin size={10} />{ev.venue.name}
                            </span>
                          )}
                          {ev.start_time && (
                            <span className="flex items-center gap-1 text-[11px] text-muted">
                              <Clock size={10} />{ev.start_time.slice(0, 5)} น.
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Price + arrow */}
                      <div className="flex flex-col items-end justify-between px-4 py-3 shrink-0"
                        style={{ borderLeft: '1px solid var(--border)' }}>
                        <span className="text-[12px] font-medium"
                          style={{ color: ev.is_free ? '#5DCAA5' : 'var(--accent)' }}>
                          {formatPrice(ev)}
                        </span>
                        <ChevronRight size={14} className="text-muted" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
