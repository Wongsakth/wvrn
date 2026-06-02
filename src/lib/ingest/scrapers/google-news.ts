// src/lib/ingest/scrapers/google-news.ts  ← ไฟล์ใหม่

import { extractFromText } from '../gemini-extract'
import { insertPending } from '../insert-pending'
import { logIngest } from '../log'

// RSS feeds ที่ใช้
const RSS_SOURCES = [
  {
    name: 'google_news_th',
    url: 'https://news.google.com/rss/search?q=คอนเสิร์ต+ไทย&hl=th&gl=TH&ceid=TH:th'
  },
  {
    name: 'google_news_concert',
    url: 'https://news.google.com/rss/search?q=concert+Thailand+2026&hl=en&gl=TH'
  },
  {
    name: 'sanook_music',
    url: 'https://www.sanook.com/music/rss/'
  }
]

async function fetchRSS(url: string): Promise<string[]> {
  const items: string[] = []
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const xml = await res.text()

    // ดึง title + description + link จาก RSS
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
    for (const match of itemMatches) {
      const item = match[1]
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        || item.match(/<title>(.*?)<\/title>/)?.[1] || ''
      const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        || item.match(/<description>(.*?)<\/description>/)?.[1] || ''
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || ''

      if (title) items.push(`${title}\n${desc}\nURL: ${link}`)
    }
  } catch (e) {
    console.error(`fetchRSS error ${url}:`, e)
  }
  return items.slice(0, 3)
}

export async function fetchGoogleNews(
  artistFilter?: string
): Promise<{ found: number; inserted: number; skipped: number }> {
  const result = { found: 0, inserted: 0, skipped: 0 }

  // ถ้ามี artist → เพิ่ม source เฉพาะศิลปินนั้น
  const sources = [...RSS_SOURCES]
  if (artistFilter) {
    sources.push({
      name: 'google_news_artist',
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(artistFilter + ' concert 2026')}&hl=th&gl=TH`
    })
  }

  try {
    for (const source of sources) {
      const items = await fetchRSS(source.url)
      result.found += items.length

      for (const item of items) {
        // กรองเฉพาะที่เกี่ยวกับ concert/event
        const lower = item.toLowerCase()
        const relevant = ['concert', 'คอนเสิร์ต', 'festival', 'live', 'tour', 'show', 'งาน']
          .some(k => lower.includes(k))
        if (!relevant) { result.skipped++; continue }

        await new Promise(r => setTimeout(r, 800))

        const extracted = await extractFromText(item, artistFilter)
console.log('item:', item.slice(0, 100))
console.log('extracted:', JSON.stringify(extracted))
        if (!extracted || extracted.confidence < 0.6) { result.skipped++; continue }

        const status = await insertPending(extracted, {
          source_type: source.name,
          source_raw: item.slice(0, 2000)
        })

        if (status === 'inserted') result.inserted++
        else result.skipped++
      }
    }

    await logIngest({ source: 'google_news', status: 'success', ...result })
  } catch (e: any) {
    await logIngest({ source: 'google_news', status: 'error', error: e.message })
  }

  return result
}