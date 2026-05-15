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

  const hasPoster = !!poster

  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#0a0a0a',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Blurred bg */}
        {hasPoster && (
          <img src={poster} style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.12,
          }} />
        )}

        {/* Dark overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(120deg, rgba(0,0,0,0.96) 55%, rgba(0,0,0,0.6) 100%)',
        }} />

        {/* Glow */}
        <div style={{
          position: 'absolute', top: -80, left: -80,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,0,58,0.2) 0%, transparent 70%)',
        }} />

        {/* Content */}
        <div style={{
          display: 'flex',
          height: '100%', width: '100%',
          padding: '48px 56px', gap: 48,
          alignItems: 'center',
          position: 'relative', zIndex: 1,
        }}>

          {/* Poster */}
          {hasPoster ? (
            <img src={poster} style={{
              width: 280, height: 400,
              objectFit: 'cover', borderRadius: 20,
              flexShrink: 0,
              boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
            }} />
          ) : (
            <div style={{
              width: 280, height: 400, borderRadius: 20, flexShrink: 0,
              background: 'linear-gradient(135deg, #1a0a2e, #2d1060)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(232,0,58,0.3)',
            }}>
              <div style={{ fontSize: 80, color: '#E8003A' }}>♫</div>
            </div>
          )}

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 0 }}>

            {/* Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{
                background: '#E8003A', borderRadius: 10, padding: '7px 16px',
                fontSize: 20, fontWeight: 700, color: 'white', letterSpacing: 5,
              }}>WVRN</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 }}>
                NEVER MISS A SHOW
              </div>
            </div>

            {/* Title */}
            <div style={{
              fontSize: title.length > 35 ? 32 : title.length > 20 ? 40 : 48,
              fontWeight: 700, color: 'white', lineHeight: 1.25, marginBottom: 16,
            }}>
              {title}
            </div>

            {/* Artists */}
            {artists && (
              <div style={{ fontSize: 22, color: '#E8003A', marginBottom: 24, fontWeight: 600 }}>
                {artists}
              </div>
            )}

            {/* Divider */}
            <div style={{ width: 48, height: 2, background: 'rgba(255,255,255,0.15)', marginBottom: 24, borderRadius: 2 }} />

            {/* Date */}
            {date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(232,0,58,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>📅</div>
                <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{date}</div>
              </div>
            )}

            {/* Venue */}
            {(venue || province) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>📍</div>
                <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>
                  {venue}{province ? ` · ${province}` : ''}
                </div>
              </div>
            )}

            {/* URL */}
            <div style={{ marginTop: 40, fontSize: 15, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
              wvrn.vercel.app
            </div>
          </div>
        </div>

        {/* Bottom line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #E8003A 0%, transparent 60%)',
        }} />
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
