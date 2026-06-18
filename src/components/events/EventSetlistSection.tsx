// components/events/EventSetlistSection.tsx
// แสดง setlist บนหน้า event detail (user-facing)
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Music, ChevronDown, ChevronUp, Sparkles, Clock } from 'lucide-react'
import { Loader2 } from 'lucide-react'

interface Props {
  eventId: string
}

export default function EventSetlistSection({ eventId }: Props) {
  const [setlists, setSetlists] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const sb = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await sb
        .from('setlists')
        .select('*, artist:artists(id,name,image_url,slug), setlist_songs(*)')
        .eq('event_id', eventId)
        .order('created_at')
      const result = (data || []).map(sl => ({
        ...sl,
        songs: (sl.setlist_songs ?? []).sort((a: any, b: any) => a.order_num - b.order_num),
      }))
      setSetlists(result)
      if (result.length === 1) setExpanded(result[0].id)
      setLoading(false)
    }
    load()
  }, [eventId])

  if (loading) return null
  if (setlists.length === 0) return null

  function formatDuration(sec?: number) {
    if (!sec) return null
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }

  function totalDuration(songs: any[]) {
    const total = songs.reduce((sum, s) => sum + (s.duration_sec || 0), 0)
    if (!total) return null
    const m = Math.floor(total / 60)
    return `${m} นาที`
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Music size={16} style={{ color: 'var(--accent)' }} />
        <h2 className="text-[16px] font-medium text-primary">Setlist</h2>
      </div>

      <div className="flex flex-col gap-3">
        {setlists.map(sl => {
          const isOpen = expanded === sl.id
          const dur = totalDuration(sl.songs)

          return (
            <div key={sl.id} className="rounded-xl overflow-hidden"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

              {/* Header */}
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setExpanded(isOpen ? null : sl.id)}>

                {sl.artist?.image_url ? (
                  <img src={sl.artist.image_url} alt={sl.artist.name}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                    {sl.artist?.name.slice(0, 2)}
                  </div>
                )}

                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-medium text-primary">{sl.artist?.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted">{sl.songs.length} เพลง</span>
                    {dur && (
                      <span className="flex items-center gap-1 text-[11px] text-muted">
                        <Clock size={10} />{dur}
                      </span>
                    )}
                    {sl.is_prediction && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(124,58,237,.1)', color: '#7C3AED' }}>
                        <Sparkles size={9} /> AI ทำนาย {sl.prediction_conf ? `${(sl.prediction_conf * 100).toFixed(0)}%` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {isOpen ? <ChevronUp size={14} className="text-muted shrink-0" /> : <ChevronDown size={14} className="text-muted shrink-0" />}
              </button>

              {/* Songs */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {sl.notes && (
                    <p className="px-4 pt-3 text-[11px] text-muted italic">{sl.notes}</p>
                  )}
                  <div className="px-4 py-3 flex flex-col gap-1">
                    {sl.songs.map((song: any, i: number) => (
                      <div key={song.id} className="flex items-center gap-3 py-1.5"
                        style={{ borderBottom: i < sl.songs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span className="text-[12px] text-muted w-6 text-right shrink-0">{song.order_num}</span>
                        <span className="flex-1 text-[13px] text-primary">{song.song_title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {song.is_encore && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(245,158,11,.1)', color: '#D97706' }}>encore</span>
                          )}
                          {song.is_cover && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(99,102,241,.1)', color: '#6366F1' }}>cover</span>
                          )}
                          {song.note && (
                            <span className="text-[10px] text-muted">{song.note}</span>
                          )}
                          {formatDuration(song.duration_sec) && (
                            <span className="text-[11px] text-muted">{formatDuration(song.duration_sec)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {sl.is_prediction && (
                    <div className="px-4 pb-3">
                      <p className="text-[10px] text-muted text-center flex items-center justify-center gap-1">
                        <Sparkles size={9} /> Setlist นี้ทำนายโดย AI อาจไม่ตรงกับงานจริง
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
