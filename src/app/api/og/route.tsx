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

  // Load Thai font (Sarabun) from Google Fonts
  const fontRes = await fetch(
    'https://fonts.gstatic.com/s/sarabun/v15/DtVmJx26TKEr37c9YHZJmnYI5gnOpg.woff2'
  )
  const fontData = await fontRes.arrayBuffer()

  // Load Sarabun Bold
  const fontBoldRes = await fetch(
    'https://fonts.gstatic.com/s/sarabun/v15/DtVhJx26TKEr37c9YNpoulwm6gDXvwE.woff2'
  )
  const fontBoldData = await fontBoldRes.arrayBuffer()

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
        fontFamily: 'Sarabun',
      }}>

        {/* ── Blurred bg from poster ── */}
        {hasPoster && (
          <img src={poster} style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.12,
          }} />
        )}

        {/* Dark gradient overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: hasPoster
            ? 'linear-gradient(120deg, rgba(0,0,0,0.95) 55%, rgba(0,0,0,0.5) 100%)'
            : 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 100%)',
        }} />

        {/* Accent glow */}
        <div style={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,0,58,0.15) 0%, transparent 70%)',
        }} />

        {/* ── Content ── */}
        <div style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          padding: '48px 56px',
          gap: 48,
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}>

          {/* Poster image */}
          {hasPoster ? (
            <div style={{
              display: 'flex',
              flexShrink: 0,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <img
                src={poster}
                style={{
                  width: 280,
                  height: 400,
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <div style={{
              width: 280,
              height: 400,
              borderRadius: 20,
              flexShrink: 0,
              background: 'linear-gradient(135deg, #1a0a2e, #2d1060)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(232,0,58,0.3)',
            }}>
              <div style={{ fontSize: 96, color: '#E8003A' }}>♫</div>
            </div>
          )}

          {/* Info panel */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap: 0,
            minWidth: 0,
          }}>

            {/* WVRN badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{
                background: '#E8003A',
                borderRadius: 10,
                padding: '7px 16px',
                fontSize: 20,
                fontWeight: 700,
                color: 'white',
                letterSpacing: 5,
              }}>
                WVRN
              </div>
              <div style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: 3,
                textTransform: 'uppercase',
              }}>
                Never Miss a Show
              </div>
            </div>

            {/* Title */}
            <div style={{
              fontSize: title.length > 35 ? 32 : title.length > 20 ? 40 : 48,
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.2,
              marginBottom: 16,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {title}
            </div>

            {/* Artists */}
            {artists && (
              <div style={{
                fontSize: 22,
                color: '#E8003A',
                marginBottom: 24,
                fontWeight: 600,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {artists}
              </div>
            )}

            {/* Divider */}
            <div style={{
              width: 48,
              height: 2,
              background: 'rgba(255,255,255,0.15)',
              marginBottom: 24,
              borderRadius: 2,
            }} />

            {/* Date */}
            {date && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(232,0,58,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}>
                  📅
                </div>
                <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                  {date}
                </div>
              </div>
            )}

            {/* Venue */}
            {(venue || province) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}>
                  📍
                </div>
                <div style={{
                  fontSize: 18,
                  color: 'rgba(255,255,255,0.5)',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {venue}{province ? ` · ${province}` : ''}
                </div>
              </div>
            )}

            {/* Bottom: wvrn.vercel.app */}
            <div style={{
              marginTop: 'auto',
              paddingTop: 32,
              fontSize: 15,
              color: 'rgba(255,255,255,0.2)',
              letterSpacing: 1,
            }}>
              wvrn.vercel.app
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #E8003A, transparent)',
        }} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Sarabun',
          data: fontData,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Sarabun',
          data: fontBoldData,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  )
}
