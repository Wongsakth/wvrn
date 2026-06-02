import { extractFromText } from '../gemini-extract'
import { insertPending, isSeenUrl, markUrlSeen } from '../insert-pending'
import { logIngest } from '../log'
import crypto from 'crypto'

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

interface RSSItem {
  title: string
  desc: string
  link: string
  content: string  // title + desc + link รวมกัน
}

async function fetchRSS(url: string): Promise<RSSItem[]> {
  const items: RSSItem[] = []
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const xml = await res.text()

    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
    for (const match of itemMatches) {
      const item = match[1]
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        || item.match(/<title>(.*?)<\/title>/)?.[1] || ''
      const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        || item.match(/<description>(.*?)<\/description>/)?.[1] || ''
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || ''

      if (title) {
        items.push({
          title,
          desc,
          link,
          content: `${title}\n${desc}\nURL: ${link}`
        })
      }
    }
  } catch (e) {
    console.error(`fetchRSS error ${url}:`, e)
  }
  return items.slice(0, 5)
}

export async function fetchGoogleNews(
  artistFilter?: string
): Promise<{ found: number; inserted: number; skipped: number; saved_tokens: number }> {
  const result = { found: 0, inserted: 0, skipped: 0, saved_tokens: 0 }

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

        // ── ชั้น 1: เช็ค URL ที่เคยดึงมาแล้ว ──
        if (item.link) {
          const seen = await isSeenUrl(item.link)
          if (seen) {
            console.log(`[SKIP-SEEN] ${item.title.slice(0, 60)}`)
            result.skipped++
            result.saved_tokens++  // ประหยัด 1 Gemini call
            continue
          }
        }

        // ── ชั้น 2: กรองเฉพาะที่เกี่ยวกับ concert/event ──
        const lower = item.content.toLowerCase()
        const relevant = ['concert', 'คอนเสิร์ต', 'festival', 'live', 'tour', 'show', 'งาน', 'ร้อก', 'ดนตรี']
          .some(k => lower.includes(k))
        if (!relevant) {
          console.log(`[SKIP-IRRELEVANT] ${item.title.slice(0, 60)}`)
          result.skipped++
          continue
        }

        // ── บันทึก URL ว่าเห็นแล้ว (ก่อน Gemini เพื่อไม่ให้ดึงซ้ำรอบหน้า) ──
        if (item.link) {
          await markUrlSeen(item.link, source.name)
        }

        await new Promise(r => setTimeout(r, 800))

        // ── ชั้น 3: ส่ง Gemini extract (เฉพาะที่ผ่าน 2 ชั้นแรก) ──
        console.log(`[GEMINI] ${item.title.slice(0, 60)}`)
        const extracted = await extractFromText(item.content, artistFilter)

        if (!extracted || extracted.confidence < 0.3) {
          console.log(`[SKIP-LOW-CONF] conf=${extracted?.confidence}`)
          result.skipped++
          continue
        }

        console.log(`[EXTRACTED] ${extracted.title} (conf: ${extracted.confidence})`)

        // ── ชั้น 4: insert พร้อม dedup hash ──
        const status = await insertPending(extracted, {
          source_type: source.name,
          source_url: item.link,
          source_raw: item.content.slice(0, 2000)
        })

        console.log(`[INSERT] status=${status}`)

        if (status === 'inserted') result.inserted++
        else result.skipped++
      }
    }

    console.log(`[DONE] found=${result.found} inserted=${result.inserted} skipped=${result.skipped} saved_gemini_calls=${result.saved_tokens}`)
    await logIngest({ source: 'google_news', status: 'success', ...result })

  } catch (e: any) {
    console.error('fetchGoogleNews error:', e)
    await logIngest({ source: 'google_news', status: 'error', error: e.message })
  }

  return result
}
