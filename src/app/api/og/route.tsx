import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title    = searchParams.get('title')    ?? 'WVRN Event'
  const artists  = searchParams.get('artists')  ?? ''
  const date     = searchParams.get('date')     ?? ''
  const venue    = searchParams.get('venue')    ?? ''
  const province = searchParams.get('province') ?? ''
  const poster   = searchParams.get('poster')   ?? ''

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: '#0d0d0d', position: 'relative',
      }}>
        {/* Poster bg blur */}
        {poster && (
          <img src={poster} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.15, filter: 'blur(20px)',
          }} />
        )}

        <div style={{ display: 'flex', height: '100%', padding: 48, gap: 40, alignItems: 'center', zIndex: 1 }}>
          {/* Poster */}
          {poster ? (
            <img src={poster} style={{ width: 300, height: 400, objectFit: 'cover', borderRadius: 16, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 300, height: 400, borderRadius: 16, flexShrink: 0, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 80, color: '#7C3AED' }}>♫</div>
            </div>
          )}

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            {/* WVRN logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#7C3AED', borderRadius: 10, padding: '6px 12px', fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: 4 }}>WVRN</div>
              <div style={{ fontSize: 14, color: '#666', letterSpacing: 2 }}>NEVER MISS A SHOW</div>
            </div>

            {/* Title */}
            <div style={{ fontSize: title.length > 30 ? 36 : 44, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
              {title}
            </div>

            {/* Artists */}
            {artists && (
              <div style={{ fontSize: 22, color: '#A78BFA' }}>{artists}</div>
            )}

            {/* Date */}
            {date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, color: '#fff' }}>
                <div style={{ fontSize: 22 }}>📅</div>
                <div>{date}</div>
              </div>
            )}

            {/* Venue */}
            {venue && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: '#999' }}>
                <div style={{ fontSize: 20 }}>📍</div>
                <div>{venue}{province ? ` · ${province}` : ''}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
