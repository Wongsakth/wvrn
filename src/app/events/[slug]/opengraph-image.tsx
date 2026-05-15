import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase'

export const runtime = 'edge'
export const alt     = 'WVRN Event'
export const size    = { width: 1200, height: 630 }

export default async function OGImage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug)
  const sb   = createClient()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  const { data: event } = isUuid
    ? await sb.from('events').select('title,poster_url,start_date,province,venue:venues(name),event_artists(artist:artists(name,name_en))').eq('id', slug).single()
    : await sb.from('events').select('title,poster_url,start_date,province,venue:venues(name),event_artists(artist:artists(name,name_en))').eq('slug', slug).single()

  const title   = event?.title ?? 'WVRN Event'
  const artists = (event?.event_artists ?? []).slice(0,3).map((ea: any) => ea.artist?.name_en || ea.artist?.name).filter(Boolean).join(' · ')
  const date    = event?.start_date ? new Date(event.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const venue   = (event?.venue as any)?.name ?? ''
  const poster  = event?.poster_url ?? ''

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0d0d0d', position: 'relative' }}>
      {poster && <img src={poster} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15 }} />}
      <div style={{ display: 'flex', height: '100%', padding: 48, gap: 40, alignItems: 'center', zIndex: 1, width: '100%' }}>
        {poster
          ? <img src={poster} style={{ width: 280, height: 373, objectFit: 'cover', borderRadius: 16, flexShrink: 0 }} />
          : <div style={{ width: 280, height: 373, borderRadius: 16, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 80, color: '#7C3AED' }}>♫</div>
            </div>
        }
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#7C3AED', borderRadius: 10, padding: '6px 14px', fontSize: 20, fontWeight: 700, color: 'white', letterSpacing: 4 }}>WVRN</div>
            <div style={{ fontSize: 14, color: '#666', letterSpacing: 2 }}>NEVER MISS A SHOW</div>
          </div>
          <div style={{ fontSize: title.length > 30 ? 34 : 42, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{title}</div>
          {artists && <div style={{ fontSize: 22, color: '#A78BFA' }}>{artists}</div>}
          {date    && <div style={{ fontSize: 20, color: '#fff', display: 'flex', gap: 8 }}>📅 {date}</div>}
          {venue   && <div style={{ fontSize: 18, color: '#999', display: 'flex', gap: 8 }}>📍 {venue}</div>}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  )
}
