// Server Component — fetch artist data + JSON-LD
import { createClient } from '@/lib/supabase'
import ArtistDetailClient from './ArtistDetailClient'
import type { Metadata } from 'next'

interface Props { params: { slug: string } }

async function getArtist(slug: string) {
  const sb = createClient()
  const decoded = decodeURIComponent(slug)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)
  const { data } = isUuid
    ? await sb.from('artists').select('id,name,name_en,slug,image_url,bio,bio_final_th,bio_final_en,genres,instagram_url,facebook_url,website_url,follower_count').eq('id', decoded).single()
    : await sb.from('artists').select('id,name,name_en,slug,image_url,bio,bio_final_th,bio_final_en,genres,instagram_url,facebook_url,website_url,follower_count').eq('slug', decoded).single()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await getArtist(params.slug)
  if (!artist) return { title: 'ศิลปิน | WVRN' }
  const name = artist.name_en || artist.name
  return {
    title: `${name} คอนเสิร์ต 2026 | WVRN`,
    description: artist.bio_final_th ?? artist.bio ?? `ติดตาม ${name} และรับแจ้งเตือนคอนเสิร์ตก่อนใครที่ WVRN`,
    openGraph: {
      title: `${name} คอนเสิร์ต 2026 | WVRN`,
      description: artist.bio_final_th ?? artist.bio ?? `ติดตาม ${name} และรับแจ้งเตือนคอนเสิร์ตก่อนใครที่ WVRN`,
      images: artist.image_url ? [{ url: artist.image_url }] : [{ url: '/logo.png' }],
    },
    alternates: {
      canonical: `https://www.wvrn.app/artists/${artist.slug || artist.id}`,
    },
  }
}

export default async function ArtistPage({ params }: Props) {
  const artist = await getArtist(params.slug)

  const jsonLd = artist ? {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    "name": artist.name_en || artist.name,
    ...(artist.name && artist.name !== artist.name_en ? { "alternateName": artist.name } : {}),
    "url": `https://www.wvrn.app/artists/${artist.slug || artist.id}`,
    ...(artist.image_url ? { "image": artist.image_url } : {}),
    ...(artist.bio ? { "description": artist.bio } : {}),
    ...(artist.genres?.length ? { "genre": artist.genres } : {}),
    ...([artist.instagram_url, artist.facebook_url, artist.website_url].filter(Boolean).length > 0
      ? { "sameAs": [artist.instagram_url, artist.facebook_url, artist.website_url].filter(Boolean) }
      : {}),
  } : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ArtistDetailClient bioTh={artist?.bio_final_th ?? null} bioEn={artist?.bio_final_en ?? null} />
    </>
  )
}
