// app/venues/[slug]/page.tsx
// Server Component — fetch data ฝั่ง server เพื่อ SEO

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import VenueDetailClient from './VenueDetailClient'

// ─── Supabase server client ───────────────────────────────
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Fetch venue data ─────────────────────────────────────
async function getVenue(slug: string) {
  const sb = getSupabase()
  const decoded = decodeURIComponent(slug)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)

  const { data } = isUuid
    ? await sb.from('venues').select('*').eq('id', decoded).single()
    : await sb.from('venues').select('*').eq('slug', decoded).single()

  return data
}

async function getUpcomingEvents(venueId: string) {
  const sb = getSupabase()
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await sb
    .from('events')
    .select('id,title,slug,start_date,start_time,is_free,ticket_price_min,ticket_price_max,ticket_url,poster_url,status,event_artists(artist:artists(id,name,slug,image_url))')
    .eq('venue_id', venueId)
    .is('deleted_at', null)
    .gte('start_date', today)
    .order('start_date', { ascending: true })
  return (data || []).map((ev: any) => ({
    ...ev,
    artists: ev.event_artists?.map((ea: any) => ea.artist).filter(Boolean) ?? [],
  }))
}

// ─── generateMetadata ─────────────────────────────────────
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const venue = await getVenue(params.slug)
  if (!venue) return { title: 'ไม่พบสถานที่ | WVRN' }

  const events = await getUpcomingEvents(venue.id)
  const upcomingCount = events.length

  const title = `${venue.name} คอนเสิร์ต ${new Date().getFullYear() + 543} | WVRN`
  const description = upcomingCount > 0
    ? `${venue.name} มีคอนเสิร์ตและงานดนตรีที่กำลังจะมาถึง ${upcomingCount} งาน ดูรายละเอียดและซื้อบัตรได้ที่ WVRN`
    : `ดูคอนเสิร์ตและงานดนตรีทั้งหมดที่ ${venue.name}${venue.province ? ' ' + venue.province : ''} ที่ WVRN`

  const canonical = `https://www.wvrn.app/venues/${params.slug}`
  const ogImage = venue.image_url || 'https://www.wvrn.app/og-default.jpg'

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: venue.name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

// ─── JSON-LD ──────────────────────────────────────────────
function VenueJsonLd({ venue, events }: { venue: any; events: any[] }) {
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'MusicVenue',
    name: venue.name,
    url: `https://www.wvrn.app/venues/${venue.slug || venue.id}`,
    ...(venue.address && { address: {
      '@type': 'PostalAddress',
      streetAddress: venue.address,
      addressLocality: venue.province || 'กรุงเทพมหานคร',
      addressCountry: 'TH',
    }}),
    ...(venue.maps_url && { hasMap: venue.maps_url }),
    ...(venue.image_url && { image: venue.image_url }),
    ...(venue.capacity && { maximumAttendeeCapacity: venue.capacity }),
  }

  // เพิ่ม events ที่กำลังจะมาเป็น Event array
  if (events.length > 0) {
    jsonLd.event = events.slice(0, 10).map((ev: any) => ({
      '@type': 'MusicEvent',
      name: ev.title,
      startDate: ev.start_date,
      location: {
        '@type': 'Place',
        name: venue.name,
      },
      url: `https://www.wvrn.app/events/${ev.slug || ev.id}`,
      ...(ev.ticket_url && { offers: {
        '@type': 'Offer',
        url: ev.ticket_url,
        availability: 'https://schema.org/InStock',
        priceCurrency: 'THB',
        ...(ev.ticket_price_min != null && { price: ev.ticket_price_min }),
      }}),
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────
export default async function VenueDetailPage(
  { params }: { params: { slug: string } }
) {
  const venue = await getVenue(params.slug)
  if (!venue) notFound()

  const events = await getUpcomingEvents(venue.id)

  return (
    <>
      <VenueJsonLd venue={venue} events={events} />
      {/* ส่ง initial data ไปให้ client component — ไม่ต้อง fetch ซ้ำ */}
      <VenueDetailClient
        venue={venue}
        initialEvents={events}
        slug={params.slug}
      />
    </>
  )
}
