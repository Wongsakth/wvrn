'use client'
import { useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { th } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, buildCalendarGrid, formatThaiMonth } from '@/lib/utils'
import type { Event } from '@/types'
import EventCard from '@/components/events/EventCard'

interface Props {
  events:      Event[]
  likedIds?:   Set<string>
  bookmarkIds?: Set<string>
  onLike?:     (id: string) => void
  onBookmark?: (id: string) => void
}

export default function CalendarView({ events, likedIds, bookmarkIds, onLike, onBookmark }: Props) {
  const today    = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [selected, setSelected] = useState<Date | null>(today)

  const grid = buildCalendarGrid(year, month, events)
  const DOW  = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const selectedEvents = selected
    ? events.filter(ev => {
        // เปรียบเทียบเป็น YYYY-MM-DD string หลีกเลี่ยง timezone
        const sel      = format(selected, 'yyyy-MM-dd')
        const evStart  = ev.start_date.slice(0, 10)
        const evEnd    = ev.end_date ? ev.end_date.slice(0, 10) : evStart
        return sel >= evStart && sel <= evEnd
      })
    : []

  const monthCount = events.filter(ev => {
    const evStart = new Date(ev.start_date)
    const evEnd   = ev.end_date ? new Date(ev.end_date) : evStart
    const mStart  = new Date(year, month - 1, 1)
    const mEnd    = new Date(year, month, 0)
    // นับถ้า event overlap กับเดือนนี้
    return evStart <= mEnd && evEnd >= mStart
  }).length

  return (
    <div className="flex flex-col lg:flex-row gap-4">

      {/* ── Calendar grid ── */}
      <div className="flex-1 min-w-0">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="icon-btn"><ChevronLeft size={16} /></button>
            <h2 className="text-[15px] font-medium text-primary">
              {formatThaiMonth(year, month)}
            </h2>
            <button onClick={nextMonth} className="icon-btn"><ChevronRight size={16} /></button>
          </div>
          <span className="text-[12px] text-muted">{monthCount} งาน</span>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DOW.map(d => (
            <div key={d} className="text-center text-[10px] text-muted font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px">
          {grid.map(({ date, isCurrentMonth, isToday, events: dayEvs }, i) => {
            const isSel = selected && isSameDay(date, selected)
            return (
              <button
                key={i}
                onClick={() => setSelected(date)}
                className={cn(
                  'relative flex flex-col items-center pt-1.5 pb-2 rounded-lg transition-all',
                  'aspect-square sm:aspect-auto sm:min-h-[52px]',
                  !isCurrentMonth && 'opacity-20',
                  isToday && !isSel && 'ring-1 ring-[var(--accent)]',
                  isSel && 'ring-0',
                )}
                style={{
                  background: isSel ? 'var(--accent)' : isToday ? 'var(--accent-muted)' : 'transparent',
                }}
              >
                {/* Date number */}
                <span
                  className="text-[12px] font-medium leading-none"
                  style={{ color: isSel ? 'var(--surface-0)' : isToday ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  {format(date, 'd')}
                </span>

                {/* Event dots (max 3) */}
                {dayEvs.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full px-0.5">
                    {dayEvs.slice(0, 3).map((_, di) => (
                      <span
                        key={di}
                        className="w-1 h-1 rounded-full"
                        style={{ background: isSel ? 'rgba(255,255,255,.7)' : 'var(--accent)' }}
                      />
                    ))}
                    {dayEvs.length > 3 && (
                      <span
                        className="text-[8px] leading-none"
                        style={{ color: isSel ? 'rgba(255,255,255,.7)' : 'var(--text-muted)' }}
                      >
                        +{dayEvs.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Desktop: event titles on hover */}
                {dayEvs.length > 0 && (
                  <div className="hidden lg:flex flex-col gap-0.5 w-full px-1 mt-1">
                    {dayEvs.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        className="text-[9px] rounded px-1 truncate text-left"
                        style={{
                          background: isSel ? 'rgba(255,255,255,.2)' : 'var(--accent-muted)',
                          color:      isSel ? '#fff' : 'var(--accent)',
                        }}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Selected day panel ── */}
      <div className="lg:w-[340px] xl:w-[380px] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-medium text-primary">
            {selected
              ? `${format(selected, 'd')} ${format(selected, 'MMMM', { locale: th })} · ${selectedEvents.length} งาน`
              : 'เลือกวันเพื่อดูงาน'}
          </h3>
        </div>

        {selectedEvents.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <p className="text-[13px] text-muted">ไม่มีงานในวันนี้</p>
            <p className="text-[11px] text-muted mt-1 opacity-60">ลองเลือกวันอื่นดูครับ</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {selectedEvents.map(ev => (
              <div key={ev.id}
                onClick={() => { window.location.href = `/events/${\1.slug || \1.id}` }}
                style={{ cursor: 'pointer' }}>
                <EventCard
                  event={ev}
                  liked={likedIds?.has(ev.id)}
                  bookmarked={bookmarkIds?.has(ev.id)}
                  onLike={() => onLike?.(ev.id)}
                  onBookmark={() => onBookmark?.(ev.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
