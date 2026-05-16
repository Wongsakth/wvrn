'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Ticket, MapPin, Calendar, Flame, Sparkles, Clock } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'

interface TickerItem {
  type:    'SOON' | 'NEW' | 'TRENDING' | 'TODAY'
  label:   string
  sub:     string
  date:    string
  eventId: string
  slug:    string
}

const TYPE_CONFIG = {
  SOON:     { label: 'COMING SOON', icon: Clock },
  NEW:      { label: 'NEW SHOW',    icon: Sparkles },
  TRENDING: { label: 'TRENDING',    icon: Flame },
  TODAY:    { label: 'TODAY',       icon: Calendar },
}

interface Props {
  followedArtistIds?: string[]
  followedVenueIds?:  string[]
  userProvince?:      string
}

export default function LiveTicker({ followedArtistIds = [], followedVenueIds = [], userProvince }: Props) {
  const [items,   setItems]   = useState<TickerItem[]>([])
  const [cur,     setCur]     = useState(0)
  const [phase,   setPhase]   = useState<'show'|'exit'|'enter'>('show')
  const [progress, setProgress] = useState(0)
  const timerRef  = useRef<NodeJS.Timeout | null>(null)
  const progRef   = useRef<NodeJS.Timeout | null>(null)
  const sb = createClient()

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const future = new Date()
      future.setDate(future.getDate() + 30)
      const futureStr = future.toISOString().slice(0, 10)

      const { data: events } = await sb
        .from('events')
        .select('id,title,slug,start_date,venue_id,event_artists(artist_id,artist:artists(name)),venue:venues(name,province)')
        .is('deleted_at', null)
        .gte('start_date', today)
        .lte('start_date', futureStr)
        .order('start_date', { ascending: true })
        .limit(50)

      if (!events) return

      const scored: (TickerItem & { score: number })[] = []

      events.forEach((ev: any) => {
        const artistIds = (ev.event_artists || []).map((ea: any) => ea.artist_id)
        const daysAway  = differenceInDays(parseISO(ev.start_date), new Date())
        const artists   = (ev.event_artists || []).map((ea: any) => ea.artist?.name).filter(Boolean).join(' · ')
        const dateStr   = format(parseISO(ev.start_date), 'd MMM', { locale: th })
        const venueName = ev.venue?.name ?? ''

        let score = 0
        let type: TickerItem['type'] = 'NEW'

        // Priority scoring
        const followedArtist = artistIds.some((id: string) => followedArtistIds.includes(id))
        const followedVenue  = followedVenueIds.includes(ev.venue_id)
        const sameProvince   = userProvince && ev.venue?.province === userProvince

        if (followedArtist) score += 100
        if (followedVenue)  score += 80
        if (sameProvince)   score += 40

        // Type
        if (daysAway === 0)       { type = 'TODAY';    score += 60 }
        else if (daysAway <= 7)   { type = 'SOON';     score += 30 }
        else if (followedArtist)  { type = 'TRENDING'; score += 20 }
        else                       { type = 'NEW' }

        // Add some randomness for variety
        score += Math.random() * 10

        scored.push({
          type,
          label:   ev.title,
          sub:     artists || venueName,
          date:    dateStr,
          eventId: ev.id,
          slug:    ev.slug || ev.id,
          score,
        })
      })

      // Sort by score, take top 8
      const top = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)

      setItems(top)
    }
    load()
  }, [followedArtistIds.join(','), followedVenueIds.join(',')])

  // Auto-rotate
  useEffect(() => {
    if (items.length < 2) return
    const DURATION = 4000

    function startProgress() {
      setProgress(0)
      let elapsed = 0
      progRef.current = setInterval(() => {
        elapsed += 50
        setProgress(Math.min((elapsed / DURATION) * 100, 100))
      }, 50)
    }

    function rotate() {
      setPhase('exit')
      setTimeout(() => {
        setCur(c => (c + 1) % items.length)
        setPhase('enter')
        setTimeout(() => setPhase('show'), 50)
      }, 400)
      if (progRef.current) clearInterval(progRef.current)
      startProgress()
    }

    startProgress()
    timerRef.current = setInterval(rotate, DURATION)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (progRef.current)  clearInterval(progRef.current)
    }
  }, [items.length])

  if (items.length === 0) return null

  const item   = items[cur]
  const config = TYPE_CONFIG[item.type]
  const Icon   = config.icon

  const slideStyle: React.CSSProperties = {
    transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease',
    transform:  phase === 'exit'  ? 'translateY(-8px)' :
                phase === 'enter' ? 'translateY(8px)'  : 'translateY(0)',
    opacity:    phase === 'show'  ? 1 : 0,
  }

  return (
    <div
      className="mb-4 rounded-xl overflow-hidden"
      style={{ background: 'var(--accent)', border: '1px solid var(--accent)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Icon */}
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <Icon size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0" style={slideStyle}>
          <div className="text-[9px] font-medium tracking-widest mb-0.5"
            style={{ color: 'rgba(255,255,255,0.6)' }}>
            {config.label}
          </div>
          <div className="text-[13px] font-medium truncate"
            style={{ color: '#fff' }}>
            {item.label}
          </div>
          {item.sub && (
            <div className="text-[10px] truncate"
              style={{ color: 'rgba(255,255,255,0.65)' }}>
              {item.sub}
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {item.date}
          </div>
          <button
            onClick={() => window.location.href = `/events/${item.slug}`}
            className="text-[9px] font-medium px-2.5 py-1 rounded-md"
            style={{ background: '#fff', color: 'var(--accent)' }}>
            Details
          </button>
        </div>

        {/* Dots */}
        <div className="flex flex-col gap-1 shrink-0 ml-1">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCur(i); setPhase('show') }}
              className="rounded-full transition-all"
              style={{
                width:      cur === i ? 4 : 3,
                height:     cur === i ? 12 : 4,
                background: cur === i ? '#fff' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.15)' }}>
        <div style={{
          height: '100%',
          background: 'rgba(255,255,255,0.7)',
          width: `${progress}%`,
          transition: 'width 0.05s linear',
          borderRadius: 1,
        }} />
      </div>
    </div>
  )
}
