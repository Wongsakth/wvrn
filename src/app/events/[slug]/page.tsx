// src/app/events/[slug]/page.tsx

import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format, parseISO, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'

import {
  MapPin,
  Clock,
  ExternalLink,
  Users,
  CalendarPlus,
  CalendarRange,
  AlertCircle,
  Music,
} from 'lucide-react'

import Navbar from '@/components/layout/Navbar'
import EventLineupTimeline from '@/components/events/EventLineupTimeline'
import TicketSaleWidget from '@/components/events/TicketSaleWidget'

import { createClient } from '@/lib/supabase'
import {
  formatPrice,
  statusLabel,
  genreTagClass,
  cn,
} from '@/lib/utils'

type Props = {
  params: {
    slug: string
  }
}

async function getEvent(slug: string) {
  const sb = createClient()

  const select = `
    *,
    venue:venues(*),
    event_artists(
      sort_order,
      is_headliner,
      start_time,
      artist:artists(*)
    )
  `

  const decoded = decodeURIComponent(slug)

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      decoded
    )

  let data = null

  if (isUuid) {
    const res = await sb
      .from('events')
      .select(select)
      .eq('id', decoded)
      .single()

    data = res.data
  } else {
    const res1 = await sb
      .from('events')
      .select(select)
      .eq('slug', decoded)
      .single()

    data = res1.data

    if (!data) {
      const res2 = await sb
        .from('events')
        .select(select)
        .ilike('slug', decoded)
        .single()

      data = res2.data
    }
  }

  if (!data) return null

  const sortedArtists = [...(data.event_artists ?? [])]
    .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
    .map((ea: any) => ({
      ...ea.artist,
      artist_time: ea.start_time,
      is_headliner: ea.is_headliner,
    }))

  return {
    ...data,
    artists: sortedArtists,
  }
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const event = await getEvent(params.slug)

  if (!event) {
    return {
      title: 'Event Not Found | WVRN',
    }
  }

  const title = `${event.title} | WVRN`

  const description = [
    event.artists?.map((a: any) => a.name_en || a.name).join(', '),
    event.venue?.name,
    event.start_date
      ? new Date(event.start_date).toLocaleDateString('th-TH', {
          dateStyle: 'long',
        })
      : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const url = `https://wvrn.vercel.app/events/${
    event.slug || event.id
  }`

  const image =
    event.poster_url ||
    'https://wvrn.vercel.app/og-default.jpg'

  return {
    title,
    description,

    openGraph: {
      title,
      description,
      url,
      siteName: 'WVRN',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
        },
      ],
      locale: 'th_TH',
      type: 'website',
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function EventDetailPage({
  params,
}: Props) {
  const event = await getEvent(params.slug)

  if (!event) {
    notFound()
  }

  const startDate = parseISO(event.start_date)

  const endDate = event.end_date
    ? parseISO(event.end_date)
    : null

  const isMulti = event.is_multi_day && endDate

  const dayCount = isMulti
    ? differenceInDays(endDate!, startDate) + 1
    : 1

  const price = formatPrice(event)

  const status = statusLabel(event.status)

  return (
    <div
      className="min-h-screen pb-24 md:pb-8"
      style={{ background: 'var(--surface-0)' }}
    >
      <Navbar />

      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary mb-5"
        >
          ← กลับ
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Poster */}
              {event.poster_url ? (
                <div
                  className="w-full overflow-hidden rounded-t-2xl"
                  style={{
                    maxHeight: 480,
                    background: 'var(--surface-2)',
                  }}
                >
                  <img
                    src={event.poster_url}
                    alt={event.title}
                    className="w-full object-contain"
                    style={{
                      maxHeight: 480,
                      display: 'block',
                      margin: '0 auto',
                    }}
                  />
                </div>
              ) : (
                <div
                  className="w-full h-32 flex items-center justify-center"
                  style={{
                    background: 'var(--accent-muted)',
                  }}
                >
                  <Music
                    size={40}
                    style={{
                      color: 'var(--accent)',
                      opacity: 0.4,
                    }}
                  />
                </div>
              )}

              <div className="p-5">
                {/* TAGS */}
                <div className="flex gap-2 flex-wrap mb-3">
                  <span className={cn('tag', status.cls)}>
                    {status.label}
                  </span>

                  {isMulti && (
                    <span
                      className="tag"
                      style={{
                        background:
                          'var(--accent-muted)',
                        color: 'var(--accent)',
                      }}
                    >
                      Multi-day Festival
                    </span>
                  )}

                  {event.genres?.map((g: string) => (
                    <span
                      key={g}
                      className={cn(
                        'tag',
                        genreTagClass(g)
                      )}
                    >
                      {g}
                    </span>
                  ))}
                </div>

                {/* TITLE */}
                <h1 className="text-[22px] font-medium text-primary leading-tight mb-3">
                  {event.title}
                </h1>

                {/* DATE */}
                <div className="flex items-center gap-2 mb-2">
                  {isMulti ? (
                    <CalendarRange
                      size={15}
                      style={{
                        color: 'var(--accent)',
                      }}
                    />
                  ) : (
                    <CalendarPlus
                      size={15}
                      style={{
                        color: 'var(--accent)',
                      }}
                    />
                  )}

                  <span className="text-[14px] font-medium text-primary">
                    {isMulti
                      ? `${format(
                          startDate,
                          'd MMM',
                          { locale: th }
                        )} – ${format(
                          endDate!,
                          'd MMMM yyyy',
                          { locale: th }
                        )} (${dayCount} วัน)`
                      : format(
                          startDate,
                          'd MMMM yyyy',
                          { locale: th }
                        )}
                  </span>
                </div>

                {/* TIME */}
                {event.start_time && !isMulti && (
                  <div className="flex items-center gap-2 mb-2">
                    <Clock
                      size={15}
                      className="text-muted"
                    />

                    <span className="text-[14px] text-secondary">
                      {event.start_time.slice(0, 5)} น.
                    </span>
                  </div>
                )}

                {/* VENUE */}
                {event.venue && (
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin
                      size={15}
                      className="text-muted"
                    />

                    <span className="text-[14px] text-secondary">
                      {event.venue.name}
                    </span>

                    {event.venue.maps_url && (
                      <a
                        href={event.venue.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] flex items-center gap-0.5 ml-auto"
                        style={{
                          color: 'var(--accent)',
                        }}
                      >
                        Maps
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )}

                {/* LINEUP */}
                {isMulti &&
                  event.lineup_count > 0 && (
                    <div
                      className="flex items-center gap-2 mt-3 p-3 rounded-xl"
                      style={{
                        background:
                          'var(--surface-2)',
                        border:
                          '1px solid var(--border)',
                      }}
                    >
                      <Users
                        size={15}
                        style={{
                          color: 'var(--accent)',
                        }}
                      />

                      <span className="text-[13px] font-medium text-primary">
                        {event.lineup_count} ศิลปิน
                      </span>
                    </div>
                  )}
              </div>
            </div>

            {/* DESCRIPTION */}
            {event.description && (
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                }}
              >
                <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide mb-2">
                  รายละเอียด
                </h2>

                <p className="text-[14px] text-secondary leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}

            {/* ARTISTS */}
            {!isMulti &&
              event.artists?.length > 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background:
                      'var(--surface-1)',
                    border:
                      '1px solid var(--border)',
                  }}
                >
                  <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide mb-3">
                    ศิลปิน
                  </h2>

                  <div className="flex flex-col gap-2">
                    {event.artists.map(
                      (artist: any) => (
                        <ArtistRow
                          key={artist.id}
                          artist={artist}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

            {/* TIMELINE */}
            {isMulti && (
              <EventLineupTimeline
                eventId={event.id}
                startDate={event.start_date}
                endDate={event.end_date}
              />
            )}
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-4">
            

            <TicketSaleWidget
              event={{
                ticket_sale_start:
                  event.ticket_sale_start,
                ticket_sale_end:
                  event.ticket_sale_end,
                ticket_announce_date:
                  event.ticket_announce_date,
                ticket_url: event.ticket_url,
                ticket_price_min:
                  event.ticket_price_min,
                ticket_price_max:
                  event.ticket_price_max,
                is_free: event.is_free,
                title: event.title,
                start_date: event.start_date,
              }}
            />

            {/* DISCLAIMER */}
            <div
              className="rounded-xl p-3 flex items-start gap-2"
              style={{
                background:
                  'rgba(186,117,23,.06)',
                border:
                  '1px solid rgba(186,117,23,.15)',
              }}
            >
              <AlertCircle
                size={13}
                style={{
                  color: '#EF9F27',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />

              <p
                className="text-[11px] leading-relaxed"
                style={{
                  color: '#EF9F27',
                  opacity: 0.9,
                }}
              >
                ข้อมูลเพื่อประชาสัมพันธ์เท่านั้น
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArtistRow({
  artist,
}: {
  artist: any
}) {
  return (
    <Link
      href={`/artists/${artist.slug || artist.id}`}
      className="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-[var(--surface-2)]"
    >
      {artist.image_url ? (
        <img
          src={artist.image_url}
          alt={artist.name}
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium"
          style={{
            background: 'var(--accent-muted)',
            color: 'var(--accent)',
          }}
        >
          {artist.name.slice(0, 2)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-primary">
          {artist.name}
        </p>

        {artist.name_en && (
          <p className="text-[11px] text-muted">
            {artist.name_en}
          </p>
        )}
      </div>
    </Link>
  )
}