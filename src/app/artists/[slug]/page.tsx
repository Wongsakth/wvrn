// app/artists/[slug]/page.tsx
// Server Component — fetch ครั้งเดียว ส่งให้ client

import { createClient } from '@supabase/supabase-js'
import ArtistDetailClient from './ArtistDetailClient'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props { params: { slug: string } }

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getArtist(slug: string) {
  const sb = getSupabase()
  const decoded = decodeURIComponent(slug)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)
  const { data } = isUuid
    ? await sb.from('artists').select('*, label:labels(id,name,website_url,facebook_url)').eq('id', decoded).single()
    : await sb.from('artists').select('*, label:labels(id,name,website_url,facebook_url)').eq('slug', decoded).single()
  return data
}

async function getUpcomingEvents(artistId: string) {
  const sb = getSupabase()
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await sb
    .from('events')
    .select('id,title,slug,start_date,start_time,is_free,ticket_price_min,ticket_price_max,ticket_url,poster_url,status,venue:venues(id,name,province),event_artists!inner(artist_id)')
    .eq('event_artists.artist_id', artistId)
    .gte('start_date', today)
    .is('deleted_at', null)
    .order('start_date', { ascending: true })
    .limit(20)
  return (data || []).map((ev: any) => {
    const { event_artists, ...rest } = ev
    return rest
  })
}

// ─── generateMetadata ─────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await getArtist(params.slug)
  if (!artist) return { title: 'ศิลปิน | WVRN' }

  const name = artist.name_en || artist.name
  const year = new Date().getFullYear() + 543
  const title = `${name} คอนเสิร์ต ${year} | WVRN`
  const description = artist.bio_final_th
    ?? artist.bio
    ?? `ติดตาม ${name} และรับแจ้งเตือนคอนเสิร์ตก่อนใครที่ WVRN`
  const canonical = `https://www.wvrn.app/artists/${artist.slug || artist.id}`
  const ogImage = artist.image_url || 'https://www.wvrn.app/og-default.jpg'

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title, description, url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: name }],
      type: 'profile',
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  }
}

// ─── JSON-LD ──────────────────────────────────────────────
function ArtistJsonLd({ artist, events }: { artist: any; events: any[] }) {
  const name = artist.name_en || artist.name
  const artistUrl = `https://www.wvrn.app/artists/${artist.slug || artist.id}`

  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name,
    url: artistUrl,
    ...(artist.name && artist.name !== artist.name_en ? { alternateName: artist.name } : {}),
    ...(artist.image_url ? { image: artist.image_url } : {}),
    ...(artist.bio_final_th || artist.bio ? { description: artist.bio_final_th || artist.bio } : {}),
    ...(artist.genres?.length ? { genre: artist.genres } : {}),
    ...([artist.instagram_url, artist.facebook_url, artist.website_url].filter(Boolean).length > 0
      ? { sameAs: [artist.instagram_url, artist.facebook_url, artist.website_url].filter(Boolean) }
      : {}),
  }

  // เพิ่ม upcoming events
  if (events.length > 0) {
    jsonLd.event = events.slice(0, 10).map((ev: any) => {
      const eventUrl = `https://www.wvrn.app/events/${ev.slug || ev.id}`
      return {
        '@type': 'MusicEvent',
        name: ev.title,
        startDate: ev.start_time ? `${ev.start_date}T${ev.start_time}` : ev.start_date,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        url: eventUrl,
        performer: { '@type': 'MusicGroup', name, url: artistUrl },
        ...(ev.venue ? {
          location: {
            '@type': 'Place',
            name: ev.venue.name,
            address: {
              '@type': 'PostalAddress',
              addressLocality: ev.venue.province || 'กรุงเทพมหานคร',
              addressCountry: 'TH',
            },
          },
        } : {}),
        offers: {
          '@type': 'Offer',
          url: ev.ticket_url || eventUrl,
          availability: 'https://schema.org/InStock',
          priceCurrency: 'THB',
          ...(ev.is_free ? { price: 0 } : ev.ticket_price_min != null ? { price: ev.ticket_price_min } : {}),
        },
        ...(ev.poster_url ? { image: ev.poster_url } : {}),
      }
    })
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────
export default async function ArtistPage({ params }: Props) {
  const artist = await getArtist(params.slug)
  if (!artist) notFound()

  const events = await getUpcomingEvents(artist.id)

  return (
    <>
      <ArtistJsonLd artist={artist} events={events} />
      <ArtistDetailClient
        artist={artist}
        initialEvents={events}
      />
    </>
  )
}
