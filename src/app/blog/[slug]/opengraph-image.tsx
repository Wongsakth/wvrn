import { ImageResponse } from 'next/og'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export const runtime = 'nodejs'
export const alt     = 'WVRN Blog'
export const size    = { width: 1200, height: 630 }

export default async function OGImage({ params }: { params: { slug: string } }) {
  const slug     = decodeURIComponent(params.slug)
  const filePath = path.join(process.cwd(), 'src/content/posts', `${slug}.mdx`)

  let title       = 'WVRN Blog'
  let description = 'ข่าวสาร คู่มือ และบทความคอนเสิร์ตในไทย'
  let tags: string[] = []
  let cover       = ''

  if (fs.existsSync(filePath)) {
    const raw    = fs.readFileSync(filePath, 'utf-8')
    const { data } = matter(raw)
    title       = data.title       ?? title
    description = data.description ?? description
    tags        = data.tags        ?? []
    cover       = data.cover       ?? ''
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#0d0a1f',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background cover image blur */}
        {cover && (
          <img
            src={cover}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', opacity: 0.1,
            }}
          />
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #0d0a1f 0%, #1a0d35 50%, #0d1a2f 100%)',
          opacity: cover ? 0.85 : 1,
          display: 'flex',
        }} />

        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(167,139,250,0.08)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(212,83,126,0.08)',
          display: 'flex',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '52px 60px',
          width: '100%', height: '100%',
        }}>

          {/* Top — WVRN brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: '#7C3AED', borderRadius: 12,
              padding: '8px 18px',
              fontSize: 22, fontWeight: 700,
              color: 'white', letterSpacing: 4,
              display: 'flex',
            }}>
              WVRN
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, display: 'flex' }}>
              NEVER MISS A SHOW
            </div>
          </div>

          {/* Middle — title + description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
            {/* Tags */}
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                {tags.slice(0, 3).map((tag: string) => (
                  <div key={tag} style={{
                    background: 'rgba(212,83,126,0.2)',
                    border: '1px solid rgba(212,83,126,0.4)',
                    borderRadius: 20, padding: '4px 12px',
                    fontSize: 13, color: '#f472b6',
                    fontWeight: 500, display: 'flex',
                  }}>
                    {tag}
                  </div>
                ))}
              </div>
            )}

            {/* Title */}
            <div style={{
              fontSize: title.length > 40 ? 36 : title.length > 25 ? 44 : 52,
              fontWeight: 700, color: 'white',
              lineHeight: 1.2, display: 'flex',
              maxWidth: 900,
            }}>
              {title}
            </div>

            {/* Description */}
            <div style={{
              fontSize: 20, color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.5, display: 'flex',
              maxWidth: 820,
            }}>
              {description.length > 100 ? description.slice(0, 100) + '...' : description}
            </div>
          </div>

          {/* Bottom — blog label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 2,
              background: 'rgba(167,139,250,0.6)',
              display: 'flex',
            }} />
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', display: 'flex' }}>
              wvrn.app/blog
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
