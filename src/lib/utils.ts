import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  format, parseISO, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isSameDay, isSameMonth, isToday,
} from 'date-fns'
import { th } from 'date-fns/locale'
import type { Event, Genre, EventStatus } from '@/types'

// ─── Class name helper ────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date formatting ─────────────────────────────────────────────────────────
export function formatThaiDate(dateStr: string) {
  return format(parseISO(dateStr), 'd MMM yyyy', { locale: th })
}

export function formatThaiDateShort(dateStr: string) {
  return format(parseISO(dateStr), 'd MMM', { locale: th })
}

export function formatThaiMonth(year: number, month: number) {
  const d = new Date(year, month - 1, 1)
  return format(d, 'MMMM yyyy', { locale: th })
}

export function formatTime(time?: string) {
  if (!time) return ''
  return time.slice(0, 5) + ' น.'
}

// ─── Calendar grid ───────────────────────────────────────────────────────────
export interface CalendarDay {
  date:        Date
  isCurrentMonth: boolean
  isToday:     boolean
  events:      Event[]
}

export function buildCalendarGrid(year: number, month: number, events: Event[]): CalendarDay[] {
  const start = startOfMonth(new Date(year, month - 1))
  const end   = endOfMonth(start)
  const days  = eachDayOfInterval({ start, end })

  // Pad front with previous-month days
  const padStart = getDay(start)
  const padDays: Date[] = []
  for (let i = padStart - 1; i >= 0; i--) {
    const d = new Date(start)
    d.setDate(d.getDate() - i - 1)
    padDays.push(d)
  }

  const allDays = [...padDays, ...days]

  // Pad end to complete 6 rows
  while (allDays.length < 42) {
    const last = allDays[allDays.length - 1]
    const next = new Date(last)
    next.setDate(next.getDate() + 1)
    allDays.push(next)
  }

  return allDays.map(date => ({
    date,
    isCurrentMonth: isSameMonth(date, start),
    isToday: isToday(date),
    events: events.filter(ev => {
      const day     = format(date, 'yyyy-MM-dd')
      const evStart = ev.start_date.slice(0, 10)
      const evEnd   = ev.end_date ? ev.end_date.slice(0, 10) : evStart
      return day >= evStart && day <= evEnd
    }),
  }))
}

// ─── Genre → tag class ───────────────────────────────────────────────────────
export function genreTagClass(genre: Genre | string): string {
  const map: Record<string, string> = {
    pop: 'tag-pop', rock: 'tag-rock', indie: 'tag-indie',
    hiphop: 'tag-hiphop', jazz: 'tag-jazz', electronic: 'tag-indie',
    folk: 'tag-folk', rnb: 'tag-hiphop', other: '',
  }
  return map[genre] || ''
}

// ─── Status → label + class ──────────────────────────────────────────────────
export function statusLabel(status: EventStatus) {
  const map: Record<EventStatus, { label: string; cls: string }> = {
    confirmed: { label: 'ยืนยันแล้ว', cls: 'tag-confirm'  },
    tba:       { label: 'TBA',        cls: 'tag-pending'  },
    cancelled: { label: 'ยกเลิก',     cls: 'tag-cancel'   },
    postponed: { label: 'เลื่อน',     cls: 'tag-sold'     },
    sold_out:  { label: 'Sold Out',   cls: 'tag-sold'     },
  }
  return map[status] ?? { label: status, cls: '' }
}

// ─── Price display ───────────────────────────────────────────────────────────
export function formatPrice(event: Event): string {
  if (event.is_free) return 'ฟรี'
  if (!event.ticket_price_min) return 'TBA'
  if (event.ticket_price_max && event.ticket_price_max !== event.ticket_price_min) {
    return `฿${event.ticket_price_min.toLocaleString()} – ฿${event.ticket_price_max.toLocaleString()}`
  }
  return `฿${event.ticket_price_min.toLocaleString()}`
}

// ─── Google Calendar link ─────────────────────────────────────────────────────
export function googleCalendarUrl(event: Event): string {
  const base = 'https://www.google.com/calendar/render?action=TEMPLATE'
  const title = encodeURIComponent(event.title)
  const date  = event.start_date.replace(/-/g, '')
  const start = event.start_time
    ? `${date}T${event.start_time.replace(':', '')}00`
    : date
  const end = event.end_date
    ? event.end_date.replace(/-/g, '')
    : date
  const loc = encodeURIComponent(event.venue?.name ?? event.province)
  const details = encodeURIComponent(event.description ?? '')
  return `${base}&text=${title}&dates=${start}/${end}&location=${loc}&details=${details}`
}

// ─── iCal download ────────────────────────────────────────────────────────────
export function generateIcal(event: Event): string {
  const date  = event.start_date.replace(/-/g, '')
  const start = event.start_time ? `${date}T${event.start_time.replace(':', '')}00` : date
  const end   = event.end_date   ? event.end_date.replace(/-/g, '') : date
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WVRN//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@wvrn.app`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.venue?.name ?? event.province}`,
    `DESCRIPTION:${event.description ?? ''}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}

// ─── Thai provinces ───────────────────────────────────────────────────────────
export const PROVINCES = [
  'กรุงเทพมหานคร','เชียงใหม่','เชียงราย','ภูเก็ต','ขอนแก่น',
  'อุดรธานี','นครราชสีมา','สงขลา','สุราษฎร์ธานี','ชลบุรี',
  'นนทบุรี','ปทุมธานี','อยุธยา','กาญจนบุรี','เพชรบุรี','อื่นๆ',
]
