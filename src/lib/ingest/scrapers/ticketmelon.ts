// src/lib/ingest/scrapers/ticketmelon.ts  ← ไฟล์ใหม่

import { extractFromText } from '../gemini-extract'
import { insertPending } from '../insert-pending'
import { logIngest } from '../log'

const BASE_URL = 'https://www.ticketmelon.com'

interface ScrapeResult {
  found: number
  inserted: number
  skipped: number
}

// ดึงรายการ events จากหน้า listing
async function fetchEventList(): Promise<string[]> {
  const urls: string[] = []

  try {
    const res = await fetch(`${BASE_URL}/th/events`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8'
      }
    })
    const html = await res.text()

    // ดึง event URLs จาก HTML
    const matches = html.matchAll(/href="(\/th\/events\/[^"]+)"/g)
    for (const match of matches) {
      const url = `${BASE_URL}${match[1]}`
      if (!urls.includes(url)) urls.push(url)
    }
  } catch (e) {
    console.error('fetchEventList error:', e)
  }

  return urls.slice(0, 20) // max 20 per run ป้องกัน rate limit
}

// ดึงข้อมูลแต่ละ event page
async function fetchEventPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8'
      }
    })
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

    return text
  } catch (e) {
    console.error(`fetchEventPage error ${url}:`, e)
    return null
  }
}

// Main function
export async function scrapeTicketmelon(
  artistFilter?: string  // ถ้าส่งมา จะ filter เฉพาะ artist นั้น
): Promise<ScrapeResult> {
  const result: ScrapeResult = { found: 0, inserted: 0, skipped: 0 }

  try {
    // 1. ดึง event URL list
    const urls = await fetchEventList()
    result.found = urls.length

    // 2. Process แต่ละ URL
    for (const url of urls) {
      // delay ป้องกัน rate limit
      await new Promise(r => setTimeout(r, 1500))

      const pageText = await fetchEventPage(url)
      if (!pageText) { result.skipped++; continue }

      // 3. Gemini extract
      const extracted = await extractFromText(pageText, artistFilter)
      if (!extracted) { result.skipped++; continue }

      // 4. Insert pending
      const status = await insertPending(extracted, {
        source_type: 'ticketmelon',
        source_url: url,
        source_raw: pageText.slice(0, 2000)
      })

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
    await logIngest({
      source: 'ticketmelon',
      status: 'error',
      error: e.message
    })
  }

  return result
}