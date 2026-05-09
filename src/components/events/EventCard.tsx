'use client'
import { useRouter } from 'next/navigation'
import { format, parseISO, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  MapPin, Clock, Heart, Bookmark,
  CalendarPlus, Share2, ExternalLink, Ticket,
  Users, CalendarRange, ChevronRight,
} from 'lucide-react'
import { cn, formatPrice, statusLabel, genreTagClass, googleCalendarUrl } from '@/lib/utils'
import type { Event } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  event:       Event & { is_multi_day?: boolean; lineup_count?: number }
  liked?:      boolean
  bookmarked?: boolean
  onLike?:     () => void
  onBookmark?: () => void
  compact?:    boolean
}

export default function EventCard({ event, liked, bookmarked, onLike, onBookmark, compact }: Props) {
  const router    = useRouter()
  const startDate = parseISO(event.start_date)
  const endDate   = event.end_date ? parseISO(event.end_date) : null
  const isMulti   = event.is_multi_day && endDate
  const dayCount  = isMulti ? differenceInDays(endDate!, startDate) + 1 : 1
  const price     = formatPrice(event)
  const status    = statusLabel(event.status)

  function goDetail() {
    window.location.href = `/events/${event.id}`
  }

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation()
    const url = `${window.location.origin}/events/${event.id}`
    if (navigator.share) navigator.share({ title: event.title, url })
    else { navigator.clipboard.writeText(url); toast.success('คัดลอก link แล้ว') }
  }

  return (
    <div
      className={cn('card-hover flex overflow-hidden', compact && 'text-sm')}
      onClick={goDetail}
      style={{ cursor: 'pointer' }}
    >

      {/* Date strip */}
      {isMulti ? (
        <div className="flex flex-col items-center justify-center shrink-0 px-2 py-3 gap-0.5"
          style={{ width: compact ? '52px' : '64px', background: 'var(--accent-muted)', borderRight: '1px solid var(--border)' }}>
          <CalendarRange size={14} style={{ color: 'var(--accent)', marginBottom: 2 }} />
          <span className="text-[11px] font-medium leading-tight text-center" style={{ color: 'var(--accent)' }}>
            {format(startDate, 'd MMM', { locale: th })}
          </span>
          <span className="text-[9px] text-muted">–</span>
          <span className="text-[11px] font-medium leading-tight text-center" style={{ color: 'var(--accent)' }}>
            {format(endDate!, 'd MMM', { locale: th })}
          </span>
          <span className="text-[9px] mt-1 px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}>
            {dayCount}วัน
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center shrink-0 px-3 py-4"
          style={{ width: compact ? '44px' : '56px', background: 'var(--accent-muted)', borderRight: '1px solid var(--border)' }}>
          <span className="font-medium leading-none"
            style={{ fontSize: compact ? '18px' : '22px', color: 'var(--accent)' }}>
            {format(startDate, 'd')}
          </span>
          <span className="text-[9px] uppercase mt-0.5" style={{ color: 'var(--accent)', opacity: .7 }}>
            {format(startDate, 'MMM', { locale: th })}
          </span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-w-0 px-3 py-3">
        <div className="flex gap-1.5 flex-wrap mb-1.5">
          <span className={cn('tag', status.cls)}>{status.label}</span>
          {isMulti && (
            <span className="tag" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              Festival
            </span>
          )}
          {event.genres.slice(0, 2).map(g => (
            <span key={g} className={cn('tag', genreTagClass(g))}>{g}</span>
          ))}
        </div>

        <h3 className={cn(
          'font-medium text-primary leading-tight mb-0.5 line-clamp-1',
          compact ? 'text-[12px]' : 'text-[14px]'
        )}>
          {event.title}
        </h3>

        {isMulti && event.lineup_count ? (
          <p className="text-[11px] text-secondary mb-1.5 flex items-center gap-1">
            <Users size={11} />
            {event.lineup_count} ศิลปิน
            {event.artists?.length > 0 && ` · ${event.artists.slice(0,2).map((a:any) => a.name).join(', ')}`}
          </p>
        ) : event.artists?.length > 0 && (
          <p className="text-[11px] text-secondary mb-1.5 line-clamp-1">
            {event.artists.map((a:any) => a.name).join(' · ')}
          </p>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {event.venue && (
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <MapPin size={10} /><span className="line-clamp-1">{event.venue.name}</span>
            </span>
          )}
          {isMulti
            ? <span className="flex items-center gap-1 text-[10px] text-muted"><Clock size={10} />ทุกคืน 19:00 น.</span>
            : event.start_time && (
              <span className="flex items-center gap-1 text-[10px] text-muted">
                <Clock size={10} />{event.start_time.slice(0,5)} น.
              </span>
            )
          }
          {!compact && (
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <MapPin size={10} />{event.province}
            </span>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="shrink-0 flex flex-col items-end justify-between px-3 py-3"
        style={{ borderLeft: '1px solid var(--border)', minWidth: compact ? '70px' : '90px' }}>
        <span className="text-[12px] font-medium"
          style={{ color: event.is_free ? '#5DCAA5' : 'var(--accent)' }}>
          {price}
        </span>
        <div className="flex flex-col gap-1 items-end">
          <div className="flex gap-1">
            <Btn icon={<Heart size={12} />}    active={liked}      onClick={e => { e.stopPropagation(); onLike?.() }}     title="ถูกใจ" />
            <Btn icon={<Bookmark size={12} />} active={bookmarked} onClick={e => { e.stopPropagation(); onBookmark?.() }} title="บันทึก" />
          </div>
          {!compact && (
            <div className="flex gap-1">
              <Btn icon={<CalendarPlus size={12} />}
                onClick={e => { e.stopPropagation(); window.open(googleCalendarUrl(event), '_blank') }}
                title="Add Calendar" />
              <Btn icon={<Share2 size={12} />} onClick={handleShare} title="แชร์" />
            </div>
          )}
          {event.ticket_url && !compact && (
            <a href={event.ticket_url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] mt-0.5"
              style={{ color: 'var(--accent)' }}>
              <Ticket size={10} />ซื้อบัตร<ExternalLink size={9} />
            </a>
          )}
          {!compact && (
            <button
              onClick={goDetail}
              className="flex items-center gap-0.5 text-[10px] mt-1"
              style={{ color: 'var(--accent)' }}>
              ดูเพิ่ม<ChevronRight size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Btn({ icon, active, onClick, title }: {
  icon: React.ReactNode
  active?: boolean
  onClick?: (e: React.MouseEvent) => void
  title: string
}) {
  return (
    <button onClick={onClick} title={title}
      className="w-[26px] h-[26px] rounded-md flex items-center justify-center transition-all"
      style={{
        border:     '1px solid var(--border)',
        background: active ? 'var(--accent-muted)' : 'var(--surface-2)',
        color:      active ? 'var(--accent)' : 'var(--text-muted)',
      }}>
      {icon}
    </button>
  )
}
