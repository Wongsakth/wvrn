'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Heart, MapPin, Calendar, ChevronRight, Loader2, Music, X } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'
import { cn, genreTagClass } from '@/lib/utils'
import toast from 'react-hot-toast'

type TabType = 'artists' | 'venues' | 'going'

export default function FollowingPage() {
  const [tab,     setTab]     = useState<TabType>('artists')
  const [artists, setArtists] = useState<any[]>([])
  const [venues,  setVenues]  = useState<any[]>([])
  const [going,   setGoing]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const sb = createClient()

  useEffect(() => {
    if (!user) { setLoading(false); return }
    load()
  }, [user])

  async function load() {
    setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const [arRes, vRes, goRes] = await Promise.all([
        sb.from('follows').select('artist:artists(id,name,name_en,image_url,genres)').eq('user_id', user!.id),
        sb.from('venue_follows').select('venue:venues(id,name,province)').eq('user_id', user!.id),
        sb.from('event_attendance')
          .select('status, event:events(id,title,start_date,start_time,venue:venues(name))')
          .eq('user_id', user!.id),
      ])
      setArtists((arRes.data || []).map((f: any) => f.artist).filter(Boolean))
      setVenues(((vRes as any).data || []).map((f: any) => f.venue).filter(Boolean))
      setGoing(((goRes as any).data || []).filter((f: any) => f.event && f.event.start_date >= today)
        .map((f: any) => ({ ...f.event, attend_status: f.status }))
        .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function unfollowArtist(id: string) {
    await sb.from('follows').delete().eq('user_id', user!.id).eq('artist_id', id)
    setArtists(prev => prev.filter((a: any) => a.id !== id))
    toast.success('เลิกติดตามแล้ว')
  }

  async function unfollowVenue(id: string) {
    await sb.from('venue_follows').delete().eq('user_id', user!.id).eq('venue_id', id)
    setVenues(prev => prev.filter((v: any) => v.id !== id))
    toast.success('เลิกติดตามแล้ว')
  }

  if (!user) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Heart size={40} className="mx-auto mb-4 text-muted" />
        <p className="text-[15px] font-medium text-primary mb-4">Login เพื่อดูรายการที่ติดตาม</p>
        <button onClick={() => window.location.href = '/login'} className="btn-accent py-2 px-6 text-[14px]">Login</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-6">

        <h1 className="text-[22px] font-medium text-primary mb-5 flex items-center gap-2">
          <Heart size={20} style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />
          ติดตาม
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-5"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          {([
            { id: 'artists', label: `ศิลปิน (${artists.length})`,  icon: Music    },
            { id: 'venues',  label: `สถานที่ (${venues.length})`,   icon: MapPin   },
            { id: 'going',   label: `จะไป (${going.length})`,       icon: Calendar },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: tab === id ? 'var(--accent)' : 'transparent',
                color: tab === id ? 'var(--surface-0)' : 'var(--text-muted)',
              }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-muted" />
          </div>
        ) : (
          <>
            {/* Artists */}
            {tab === 'artists' && (artists.length === 0
              ? <Empty icon={<Music size={32} />} text="ยังไม่ได้ติดตามศิลปินคนไหน" href="/artists" btnLabel="ค้นหาศิลปิน" />
              : <div className="flex flex-col gap-2">
                  {artists.map((artist: any) => (
                    <div key={artist.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                      {artist.image_url
                        ? <img src={artist.image_url} alt={artist.name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                        : <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-[12px] font-medium"
                            style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{artist.name.slice(0,2)}</div>
                      }
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => window.location.href = `/artists/${artist.id}`}>
                        <p className="text-[14px] font-medium text-primary truncate">{artist.name}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {(artist.genres ?? []).slice(0,3).map((g: string) => (
                            <span key={g} className={cn('tag text-[9px]', genreTagClass(g))}>{g}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => unfollowArtist(artist.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-red-400"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <X size={14} />
                      </button>
                      <button onClick={() => window.location.href = `/artists/${artist.id}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
            )}

            {/* Venues */}
            {tab === 'venues' && (venues.length === 0
              ? <Empty icon={<MapPin size={32} />} text="ยังไม่ได้ติดตามสถานที่ไหน" href="/venues" btnLabel="ดูสถานที่" />
              : <div className="flex flex-col gap-2">
                  {venues.map((venue: any) => (
                    <div key={venue.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                      <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
                        style={{ background: 'var(--accent-muted)' }}>
                        <MapPin size={20} style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-primary truncate">{venue.name}</p>
                        <p className="text-[11px] text-muted">{venue.province}</p>
                      </div>
                      <button onClick={() => unfollowVenue(venue.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-red-400"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
            )}

            {/* Going */}
            {tab === 'going' && (going.length === 0
              ? <Empty icon={<Calendar size={32} />} text="ยังไม่มีงานที่วางแผนจะไป" href="/" btnLabel="ดูงานทั้งหมด" />
              : <div className="flex flex-col gap-2">
                  {going.map((ev: any) => {
                    const start = parseISO(ev.start_date)
                    const days  = differenceInDays(start, new Date())
                    const done  = ev.attend_status === 'attended'
                    return (
                      <div key={ev.id}
                        onClick={() => window.location.href = `/events/${\1.slug || \1.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                        style={{
                          background: done ? 'rgba(29,158,117,.06)' : 'var(--surface-1)',
                          border: `1px solid ${done ? 'rgba(29,158,117,.2)' : 'var(--border)'}`,
                        }}>
                        <div className="w-11 h-11 rounded-xl shrink-0 flex flex-col items-center justify-center"
                          style={{ background: done ? 'rgba(29,158,117,.1)' : 'var(--accent-muted)' }}>
                          <span className="text-[16px] font-medium leading-none"
                            style={{ color: done ? '#1D9E75' : 'var(--accent)' }}>{format(start, 'd')}</span>
                          <span className="text-[8px] uppercase"
                            style={{ color: done ? '#1D9E75' : 'var(--accent)', opacity: .7 }}>
                            {format(start, 'MMM', { locale: th })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-primary truncate">{ev.title}</p>
                          <p className="text-[11px] text-muted">{ev.venue?.name}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
                          style={{
                            background: done ? 'rgba(29,158,117,.1)' : days === 0 ? 'rgba(232,0,58,.1)' : 'var(--accent-muted)',
                            color: done ? '#1D9E75' : days === 0 ? '#E8003A' : 'var(--accent)',
                          }}>
                          {done ? 'ไปแล้ว' : days === 0 ? 'วันนี้!' : `อีก ${days} วัน`}
                        </span>
                      </div>
                    )
                  })}
                </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Empty({ icon, text, href, btnLabel }: any) {
  return (
    <div className="rounded-2xl p-12 text-center"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="text-muted mb-3 flex justify-center">{icon}</div>
      <p className="text-[14px] font-medium text-primary mb-4">{text}</p>
      <button onClick={() => window.location.href = href} className="btn-accent text-[13px] py-2 px-5">
        {btnLabel}
      </button>
    </div>
  )
}
