import { createClient } from '@/lib/supabase'
import type { Metadata } from 'next'

const BASE = 'https://wvrn.vercel.app'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug)
  const sb   = createClient()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  const { data } = isUuid
    ? await sb.from('events').select('title,slug,poster_url,start_date,province,venue:venues(name),event_artists(artist:artists(name,name_en))').eq('id', slug).single()
    : await sb.from('events').select('title,slug,poster_url,start_date,province,venue:venues(name),event_artists(artist:artists(name,name_en))').eq('slug', slug).single()

  if (!data) return { title: 'WVRN — Never Miss a Show' }

  const artists = (data.event_artists ?? []).slice(0,3).map((ea: any) => ea.artist?.name_en || ea.artist?.name).filter(Boolean).join(', ')
  const date    = data.start_date ? new Date(data.start_date).toLocaleDateString('th-TH', { dateStyle: 'long' }) : ''
  const desc    = [artists, (data.venue as any)?.name, date].filter(Boolean).join(' · ')
  const url     = `${BASE}/events/${data.slug || slug}`
  const ogUrl   = `${BASE}/api/og?title=${encodeURIComponent(data.title)}&artists=${encodeURIComponent(artists)}&date=${encodeURIComponent(date)}&venue=${encodeURIComponent((data.venue as any)?.name ?? '')}${data.poster_url ? `&poster=${encodeURIComponent(data.poster_url)}` : ''}`

  return {
    title:       `${data.title} | WVRN`,
    description: desc,
    openGraph: {
      title:       data.title,
      description: desc,
      url,
      siteName:    'WVRN',
      type:        'website',
      images: [{ url: ogUrl, width: 1200, height: 630, alt: data.title }],
    },
    twitter: {
      card:  'summary_large_image',
      title: data.title,
      images: [ogUrl],
    },
  }
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
