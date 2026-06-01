
import { NextRequest, NextResponse } from 'next/server'
import { scrapeTicketmelon } from '@/lib/ingest/scrapers/ticketmelon'
import { scrapeEventpop } from '@/lib/ingest/scrapers/eventpop'
import { fetchGoogleNews } from '@/lib/ingest/scrapers/google-news'

// ตรวจ secret key ป้องกันคนอื่นเรียก
function authCheck(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret')
  return secret === process.env.CRON_SECRET
}

// POST /api/cron/fetch-events
// Body: { source?: string, artist?: string }
// source: 'all' | 'ticketmelon' | 'eventpop' | 'google_news'
export async function POST(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const source: string = body.source || 'all'
  const artist: string | undefined = body.artist

  const results: Record<string, any> = {}

  try {
    if (source === 'ticketmelon' || source === 'all') {
      console.log('🎫 Scraping Ticketmelon...')
      results.ticketmelon = await scrapeTicketmelon(artist)
    }

    if (source === 'eventpop' || source === 'all') {
      console.log('🎪 Scraping Eventpop...')
      results.eventpop = await scrapeEventpop(artist)
    }

    if (source === 'google_news' || source === 'all') {
      console.log('📰 Fetching Google News...')
      results.google_news = await fetchGoogleNews(artist)
    }

    const total = Object.values(results).reduce((acc: any, r: any) => ({
      found: (acc.found || 0) + (r.found || 0),
      inserted: (acc.inserted || 0) + (r.inserted || 0),
      skipped: (acc.skipped || 0) + (r.skipped || 0)
    }), {})

    return NextResponse.json({
      success: true,
      source,
      artist: artist || 'all artists',
      results,
      total,
      ran_at: new Date().toISOString()
    })

  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message
    }, { status: 500 })
  }
}

// GET /api/cron/fetch-events?source=ticketmelon&artist=Bodyslam
// สำหรับ test ใน browser / curl ง่ายๆ
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source') || 'all'
  const artist = searchParams.get('artist') || undefined

  // redirect ไป POST logic เดียวกัน
  const mockReq = new Request(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({ source, artist })
  })

  return POST(mockReq as NextRequest)
}