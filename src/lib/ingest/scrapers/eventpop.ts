// src/lib/ingest/scrapers/eventpop.ts
// eventpop embed event data ใน data-react-props ของ HTML โดยตรง
// ไม่ใช้ API แยก — parse JSON จาก HTML แทน

import { extractFromText } from '../gemini-extract'
import { insertPending } from '../insert-pending'
import { logIngest } from '../log'

const BASE_URL = 'https://www.eventpop.me'

// ─── Types ────────────────────────────────────────────────
interface EventVenue {
  venue_name: string
  province: string
  latitude: number
  longitude: number
}

interface EventAction {
  url: string
}

interface EventpopEvent {
  id: number
  slug: string
  title: string
  start_at: string
  end_at: string
  location_name: string
  min_price: string
  poster?: string
  event_venue?: EventVenue
  action?: EventAction
}

// ─── Music filter ─────────────────────────────────────────
const MUSIC_KEYWORDS = [
  'concert', 'คอนเสิร์ต', 'festival', 'เฟสติวัล', 'เฟส',
  'live concert', 'live show', 'tour', 'gig', 'showcase',
  'acoustic', 'music', 'ดนตรี', 'มิวสิคัล',
  'band', 'ร็อก', 'rock', 'jazz', 'edm', 'rave', 'dj',
]

const EXCLUDE_KEYWORDS = [
  'course', 'คอร์ส', 'อบรม', 'workshop', 'seminar', 'class', 'training',
  'online+', 'administrator', 'azure', 'aws', 'certificate', 'certification',
  'talk', 'lecture', 'bootcamp', 'camp', 'ค่าย',
]

function isMusicEvent(ev: EventpopEvent): boolean {
  const title = ev.title.toLowerCase()
  if (EXCLUDE_KEYWORDS.some(k => title.includes(k))) return false
  const text = title + ' ' + (ev.location_name || '').toLowerCase()
  return MUSIC_KEYWORDS.some(k => text.includes(k))
}

// ─── Fetch event list from HTML pages ────────────────────
async function fetchEventList(): Promise<EventpopEvent[]> {
  const events: EventpopEvent[] = []
  const seen = new Set<number>()

  const pages = [
    `${BASE_URL}/explore`,
    `${BASE_URL}/c/music-festival`,
    `${BASE_URL}/c/upcoming`,
    `${BASE_URL}/c/new_releases`,
  ]

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
  }

  for (const pageUrl of pages) {
    try {
      const res = await fetch(pageUrl, { headers })
      if (!res.ok) {
        console.error(`fetchEventList: ${res.status} for ${pageUrl}`)
        continue
      }
      const html = await res.text()

      for (const match of html.matchAll(/data-react-props="([^"]+)"/g)) {
        try {
          const decoded = match[1]
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&#39;/g, "'")
          const props = JSON.parse(decoded)
          const eventDetails: EventpopEvent[] = props.eventDetails || []

          for (const ev of eventDetails) {
            if (!ev.id || seen.has(ev.id)) continue
            const year = new Date(ev.start_at).getFullYear()
            if (year < 2025 || year > 2028) continue
            if (!isMusicEvent(ev)) continue
            seen.add(ev.id)
            events.push(ev)
          }
        } catch { continue }
      }
    } catch (e) {
      console.error(`fetchEventList error ${pageUrl}:`, e)
    }
    await new Promise(r => setTimeout(r, 800))
  }

  return events
}

// ─── Build text for Gemini ────────────────────────────────
function buildEventText(ev: EventpopEvent): string {
  // venue: ใช้ event_venue.venue_name ถ้ามี ไม่งั้น fallback location_name
  const venueName = (ev.event_venue?.venue_name || '').trim()
  const venue = venueName && venueName !== 'Thailand'
    ? venueName
    : ev.location_name || ''
  const province = ev.event_venue?.province || ''
  const eventUrl = `${BASE_URL}/e/${ev.id}${ev.slug ? '/' + ev.slug : ''}`
  const ticketUrl = ev.action?.url || eventUrl

  return [
    `Title: ${ev.title}`,
    `Date: ${ev.start_at}`,
    ev.end_at ? `End: ${ev.end_at}` : '',
    `Venue: ${venue}`,
    province ? `Province: ${province}` : '',
    `Price from: ${ev.min_price}`,
    `Ticket URL: ${ticketUrl}`,
    `Event URL: ${eventUrl}`,
    ev.poster ? `Poster: ${ev.poster}` : '',
  ].filter(Boolean).join('\n')
}

// ─── Main export ──────────────────────────────────────────
export async function scrapeEventpop(
  artistFilter?: string
): Promise<{ found: number; inserted: number; skipped: number }> {
  const result = { found: 0, inserted: 0, skipped: 0 }

  try {
    const events = await fetchEventList()
    result.found = events.length
    console.log(`Eventpop: found ${events.length} music events`)

    for (const ev of events) {
      await new Promise(r => setTimeout(r, 500))

      const pageText = buildEventText(ev)
      const sourceUrl = `${BASE_URL}/e/${ev.id}${ev.slug ? '/' + ev.slug : ''}`

      const extracted = await extractFromText(pageText, artistFilter)
      if (!extracted) { result.skipped++; continue }

      console.log(`Extracted: "${extracted.title}" (conf: ${extracted.confidence})`)

      const status = await insertPending(extracted, {
        source_type: 'eventpop',
        source_url: sourceUrl,
        source_raw: pageText,
      })

      console.log(`  → ${status}`)

      if (status === 'inserted') result.inserted++
      else result.skipped++
    }

    await logIngest({ source: 'eventpop', status: 'success', ...result })
  } catch (e: any) {
    console.error('scrapeEventpop error:', e)
    await logIngest({ source: 'eventpop', status: 'error', error: e.message })
  }

  return result
}
