'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { format, parseISO, isToday, isPast, isFuture } from 'date-fns'
import { th } from 'date-fns/locale'
import { Music, Clock, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LineupEntry {
  id:           string
  lineup_date:  string
  start_time:   string | null
  artist_name:  string
  artist_id:    string | null
  is_headliner: boolean
  stage:        string | null
  artist?:      { name: string; image_url: string | null; genres: string[] }
}

interface Props {
  eventId:   string
  startDate: string
  endDate?:  string | null
  compact?:  boolean
}

export default function EventLineupTimeline({ eventId, startDate, endDate, compact }: Props) {
  const [lineup,    setLineup]    = useState<LineupEntry[]>([])
  const [loading,   setLoading]   = useState(true)
  const [expanded,  setExpanded]  = useState(!compact)
  const sb = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await sb
        .from('event_lineup')
        .select('*, artist:artists(name,image_url,genres)')
        .eq('event_id', eventId)
        .order('lineup_date')
        .order('sort_order')
      setLineup(data || [])
      setLoading(false)
    }
    load()
  }, [eventId])

  if (loading) return (
    <div className="flex items-center gap-2 py-4 text-muted text-[12px]">
      <Music size={14} className="animate-pulse" />
      โหลด lineup...
    </div>
  )

  if (lineup.length === 0) return null

  // Group by date
  const byDate = lineup.reduce<Record<string, LineupEntry[]>>((acc, entry) => {
    const key = entry.lineup_date
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})

  const dates = Object.keys(byDate).sort()

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>

      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
        style={{ background: 'var(--surface-2)', borderBottom: expanded ? '1px solid var(--border)' : 'none' }}
      >
        <Music size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-[13px] font-medium text-primary flex-1 text-left">
          Lineup ทั้งหมด
        </span>
        <span className="text-[11px] text-muted">{lineup.length} ศิลปิน · {dates.length} วัน</span>
        {expanded
          ? <ChevronUp  size={14} className="text-muted shrink-0" />
          : <ChevronDown size={14} className="text-muted shrink-0" />
        }
      </button>

      {expanded && (
        <div style={{ background: 'var(--surface-1)' }}>
          {dates.map((date, di) => {
            const entries = byDate[date]
            const d = parseISO(date)
            const isNow = isToday(d)
            const past  = isPast(d) && !isNow
            const future = isFuture(d) && !isNow

            return (
              <div
                key={date}
                style={{ borderBottom: di < dates.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                {/* Date row */}
                <div
                  className="flex items-center gap-3 px-4 py-2"
                  style={{
                    background: isNow ? 'var(--accent-muted)' : 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {/* Day number */}
                  <div
                    className="w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0"
                    style={{
                      background: isNow ? 'var(--accent)' : past ? 'var(--surface-3)' : 'var(--surface-1)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span className="text-[13px] font-medium leading-none"
                      style={{ color: isNow ? 'var(--surface-0)' : past ? 'var(--text-muted)' : 'var(--accent)' }}>
                      {format(d, 'd')}
                    </span>
                    <span className="text-[8px] uppercase"
                      style={{ color: isNow ? 'rgba(255,255,255,.7)' : 'var(--text-muted)' }}>
                      {format(d, 'MMM', { locale: th })}
                    </span>
                  </div>

                  <div className="flex-1">
                    <span className="text-[12px] font-medium"
                      style={{ color: isNow ? 'var(--accent)' : past ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {format(d, 'EEEE', { locale: th })}
                      {isNow && ' — วันนี้!'}
                    </span>
                  </div>

                  {/* Status badge */}
                  {past && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full text-muted"
                      style={{ background: 'var(--surface-3)' }}>
                      ผ่านไปแล้ว
                    </span>
                  )}
                  {isNow && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}>
                      🟢 วันนี้
                    </span>
                  )}
                </div>

                {/* Artists for this date */}
                {entries.map((entry, ei) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
                    style={{
                      borderBottom: ei < entries.length - 1 ? '1px solid var(--border)' : 'none',
                      opacity: past ? .6 : 1,
                    }}
                  >
                    {/* Artist avatar */}
                    {entry.artist?.image_url ? (
                      <img src={entry.artist.image_url} alt={entry.artist_name}
                        className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-medium"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                        {entry.artist_name.slice(0, 2)}
                      </div>
                    )}

                    {/* Name + genres */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {entry.is_headliner && (
                          <Star size={10} style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />
                        )}
                        <span className="text-[13px] font-medium text-primary truncate">
                          {entry.artist_name}
                        </span>
                      </div>
                      {entry.artist?.genres?.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {entry.artist.genres.slice(0, 2).map(g => (
                            <span key={g} className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase"
                              style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Time */}
                    {entry.start_time && (
                      <span className="flex items-center gap-1 text-[11px] text-muted shrink-0">
                        <Clock size={10} />
                        {entry.start_time.slice(0, 5)} น.
                      </span>
                    )}

                    {/* Stage */}
                    {entry.stage && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full text-muted shrink-0"
                        style={{ background: 'var(--surface-3)' }}>
                        {entry.stage}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
