'use client'
import { useState, useEffect } from 'react'
import { Ticket, Bell, CalendarPlus, ExternalLink, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TicketSaleInfo {
  ticket_sale_start?:    string | null  // ISO datetime
  ticket_sale_end?:      string | null
  ticket_announce_date?: string | null  // date only
  ticket_url?:           string | null
  ticket_price_min?:     number | null
  ticket_price_max?:     number | null
  is_free:               boolean
  title:                 string
  start_date:            string
}

interface Props {
  event: TicketSaleInfo
  compact?: boolean
}

type SaleStatus = 'not_announced' | 'announced' | 'on_sale' | 'ended' | 'free'

function getSaleStatus(info: TicketSaleInfo): SaleStatus {
  if (info.is_free) return 'free'
  const now = new Date()
  if (!info.ticket_sale_start) return info.ticket_announce_date ? 'announced' : 'not_announced'
  const saleStart = new Date(info.ticket_sale_start)
  const saleEnd   = info.ticket_sale_end ? new Date(info.ticket_sale_end) : null
  if (saleEnd && now > saleEnd) return 'ended'
  if (now >= saleStart) return 'on_sale'
  return 'announced'
}

function useCountdown(target: string | null | undefined) {
  const [diff, setDiff] = useState(0)

  useEffect(() => {
    if (!target) return
    const update = () => setDiff(new Date(target).getTime() - Date.now())
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [target])

  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { d, h, m, s, total: diff }
}

export default function TicketSaleWidget({ event, compact }: Props) {
  const status    = getSaleStatus(event)
  const countdown = useCountdown(event.ticket_sale_start)

  function addSaleReminder() {
    if (!event.ticket_sale_start) return
    const date  = new Date(event.ticket_sale_start)
    // Set reminder 1 hour before
    const remind = new Date(date.getTime() - 3600000)
    const fmt    = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0]
    const url = `https://www.google.com/calendar/render?action=TEMPLATE`
      + `&text=${encodeURIComponent(`🎟 เปิดจำหน่ายบัตร: ${event.title}`)}`
      + `&dates=${fmt(remind)}/${fmt(date)}`
      + `&details=${encodeURIComponent(`บัตรคอนเสิร์ต ${event.title} เปิดจำหน่าย ${date.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`)}`
    window.open(url, '_blank')
  }

  function addEventCalendar() {
    const date = event.start_date.replace(/-/g, '')
    const url = `https://www.google.com/calendar/render?action=TEMPLATE`
      + `&text=${encodeURIComponent(event.title)}`
      + `&dates=${date}/${date}`
    window.open(url, '_blank')
  }

  const priceText = event.is_free
    ? 'ฟรี'
    : event.ticket_price_min
      ? event.ticket_price_max && event.ticket_price_max !== event.ticket_price_min
        ? `฿${event.ticket_price_min.toLocaleString()} – ฿${event.ticket_price_max.toLocaleString()}`
        : `฿${event.ticket_price_min.toLocaleString()}`
      : 'TBA'

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={status} />
        <span className="text-[12px] font-medium" style={{ color: event.is_free ? '#5DCAA5' : 'var(--accent)' }}>
          {priceText}
        </span>
        {status === 'on_sale' && event.ticket_url && (
          <a href={event.ticket_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg"
            style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}>
            <Ticket size={11} /> ซื้อบัตร
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        <Ticket size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-[12px] font-medium text-primary">ข้อมูลบัตร</span>
        <div className="ml-auto"><StatusBadge status={status} /></div>
      </div>

      <div className="px-4 py-4" style={{ background: 'var(--surface-1)' }}>
        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-[22px] font-medium" style={{ color: event.is_free ? '#5DCAA5' : 'var(--accent)' }}>
            {priceText}
          </span>
          {!event.is_free && event.ticket_price_min && (
            <span className="text-[11px] text-muted">บาท</span>
          )}
        </div>

        {/* Sale start countdown */}
        {status === 'announced' && event.ticket_sale_start && countdown && (
          <div className="mb-4">
            <div className="text-[11px] text-muted mb-2 flex items-center gap-1">
              <Clock size={11} />
              เปิดจำหน่าย {new Date(event.ticket_sale_start).toLocaleString('th-TH', {
                day: 'numeric', month: 'short', year: '2-digit',
                hour: '2-digit', minute: '2-digit',
                timeZone: 'Asia/Bangkok'
              })} น.
            </div>
            {/* Countdown boxes */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: countdown.d, label: 'วัน'    },
                { val: countdown.h, label: 'ชั่วโมง' },
                { val: countdown.m, label: 'นาที'   },
                { val: countdown.s, label: 'วินาที' },
              ].map(({ val, label }) => (
                <div key={label} className="flex flex-col items-center rounded-lg py-2"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <span className="text-[20px] font-medium" style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                    {String(val).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] text-muted mt-0.5">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* On sale now */}
        {status === 'on_sale' && (
          <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg"
            style={{ background: 'rgba(29,158,117,.08)', border: '1px solid rgba(29,158,117,.2)' }}>
            <CheckCircle2 size={14} style={{ color: '#1D9E75' }} />
            <span className="text-[12px] font-medium" style={{ color: '#1D9E75' }}>
              เปิดจำหน่ายแล้ว!
            </span>
            {event.ticket_sale_end && (
              <span className="text-[11px] text-muted ml-auto">
                ถึง {new Date(event.ticket_sale_end).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' })}
              </span>
            )}
          </div>
        )}

        {/* Ended */}
        {status === 'ended' && (
          <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg"
            style={{ background: 'rgba(226,75,74,.06)', border: '1px solid rgba(226,75,74,.15)' }}>
            <AlertCircle size={14} style={{ color: '#E24B4A' }} />
            <span className="text-[12px]" style={{ color: '#E24B4A' }}>การจำหน่ายบัตรสิ้นสุดแล้ว</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {/* Buy ticket */}
          {event.ticket_url && status === 'on_sale' && (
            <a href={event.ticket_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium transition-all"
              style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}>
              <Ticket size={14} />
              ซื้อบัตรเลย
              <ExternalLink size={11} />
            </a>
          )}

          <div className="grid grid-cols-2 gap-2">
            {/* Add sale reminder */}
            {(status === 'announced') && event.ticket_sale_start && (
              <button onClick={addSaleReminder}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] btn-ghost">
                <Bell size={13} />
                แจ้งเตือนวันขาย
              </button>
            )}

            {/* Add event to calendar */}
            <button onClick={addEventCalendar}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] btn-ghost',
                status !== 'announced' && 'col-span-2'
              )}>
              <CalendarPlus size={13} />
              เพิ่มในปฏิทิน
            </button>
          </div>

          {/* Ticket URL when not on sale yet */}
          {event.ticket_url && status === 'announced' && (
            <a href={event.ticket_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-[11px] text-muted hover:text-primary transition-colors">
              <ExternalLink size={11} />
              ดูข้อมูลบัตร
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: SaleStatus }) {
  const config = {
    not_announced: { label: 'ยังไม่ประกาศ',   bg: 'rgba(136,135,128,.1)',  color: '#888780' },
    announced:     { label: 'เร็วๆ นี้',        bg: 'rgba(186,117,23,.1)',   color: '#EF9F27' },
    on_sale:       { label: '🟢 เปิดจำหน่าย',  bg: 'rgba(29,158,117,.1)',   color: '#1D9E75' },
    ended:         { label: 'หมดเวลา',          bg: 'rgba(226,75,74,.08)',   color: '#E24B4A' },
    free:          { label: '✓ ฟรี',            bg: 'rgba(29,158,117,.1)',   color: '#1D9E75' },
  }[status]

  return (
    <span className="text-[10px] px-2.5 py-1 rounded-full font-medium"
      style={{ background: config.bg, color: config.color }}>
      {config.label}
    </span>
  )
}
