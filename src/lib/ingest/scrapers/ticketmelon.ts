import { extractFromText } from '../gemini-extract'
import { insertPending } from '../insert-pending'
import { logIngest } from '../log'

interface ScrapeResult {
  found: number
  inserted: number
  skipped: number
}

// ดึงรายการ event URLs จาก Google Search (เพราะ ticketmelon block direct scrape)
async function fetchEventList(): Promise<string[]> {
  const urls: string[] = []

  try {
    // ค้นหาผ่าน Google
    const queries = [
      'site:ticketmelon.com concert Bangkok 2026',
      'site:ticketmelon.com live Thailand 2026',
      'site:ticketmelon.com tour Bangkok 2026',
    ]

    for (const q of queries) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=10`
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8'
        }
      })
      const html = await res.text()

      // ดึง ticketmelon URLs จาก Google results
      const matches = html.matchAll(/https?:\/\/www\.ticketmelon\.com\/([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+)/g)
      for (const match of matches) {
        const url = `https://www.ticketmelon.com/${match[1]}`
        if (!urls.includes(url)) urls.push(url)
      }

      await new Promise(r => setTimeout(r, 1000))
    }

  } catch (e) {
    console.error('fetchEventList error:', e)
  }

  // fallback — ถ้า Google ไม่ return อะไร ใช้ known URLs จาก search results ล่าสุด
  if (urls.length === 0) {
    console.log('Using fallback known URLs')
    urls.push(
      'https://www.ticketmelon.com/grandstarconnext/ateezinbangkok',
      'https://www.ticketmelon.com/grandstarconnext/kpop-masterz-bambam-ten',
      'https://www.ticketmelon.com/grandstarconnext/irene-i-will-in-bkk-2026',
      'https://www.ticketmelon.com/odrock/dreamtheaterbkk2026',
      'https://www.ticketmelon.com/skeshentertainment/wispbkk26',
      'https://www.ticketmelon.com/parklivesa/till_lindemann_bangkok',
      'https://www.ticketmelon.com/slammanbookingasia/eillbkk',
      'https://www.ticketmelon.com/POYU/waybetterworldtour2026',
      'https://www.ticketmelon.com/mahidolmusic/tijc2026',
    )
  }

  return urls.slice(0, 20)
}

// ดึงข้อมูลแต่ละ event page
async function fetchEventPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
        'Referer': 'https://www.google.com/'
      }
    })

    if (!res.ok) {
      console.error(`fetchEventPage HTTP ${res.status} for ${url}`)
      return null
    }

    const html = await res.text()

    // ตัด noise ออก เหลือแค่ content
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // ถ้าได้ข้อมูลน้อยเกินไป ถือว่า block
    if (text.length < 200) {
      console.error(`fetchEventPage too short (${text.length} chars) for ${url}`)
      return null
    }

    return text
  } catch (e) {
    console.error(`fetchEventPage error ${url}:`, e)
    return null
  }
}

// Main function
export async function scrapeTicketmelon(
  artistFilter?: string
): Promise<ScrapeResult> {
  const result: ScrapeResult = { found: 0, inserted: 0, skipped: 0 }

  try {
    const urls = await fetchEventList()
    result.found = urls.length
    console.log(`Ticketmelon: found ${urls.length} URLs`)

    for (const url of urls) {
      await new Promise(r => setTimeout(r, 2000))

      const pageText = await fetchEventPage(url)
      if (!pageText) { result.skipped++; continue }

      const extracted = await extractFromText(pageText, artistFilter)
      if (!extracted) { result.skipped++; continue }

      console.log(`Extracted: ${extracted.title} (conf: ${extracted.confidence})`)

      const status = await insertPending(extracted, {
        source_type: 'ticketmelon',
        source_url: url,
        source_raw: pageText.slice(0, 2000)
      })

      console.log(`Insert status: ${status} for ${url}`)

      if (status === 'inserted') result.inserted++
      else result.skipped++
    }

    await logIngest({
      source: 'ticketmelon',
      artist_name: artistFilter,
      status: 'success',
      ...result
    })

  } catch (e: any) {
    console.error('scrapeTicketmelon error:', e)
    await logIngest({
      source: 'ticketmelon',
      status: 'error',
      error: e.message
    })
  }

  return result
}
