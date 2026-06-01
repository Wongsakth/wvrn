// src/lib/ingest/scrapers/eventpop.ts  ← ไฟล์ใหม่

import { extractFromText } from '../gemini-extract'
import { insertPending } from '../insert-pending'
import { logIngest } from '../log'

const BASE_URL = 'https://www.eventpop.me'

async function fetchEventList(): Promise<string[]> {
  const urls: string[] = []
  try {
    const res = await fetch(`${BASE_URL}/events?country=TH&category=concert`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const html = await res.text()
    const matches = html.matchAll(/href="(\/e\/[^"]+)"/g)
    for (const match of matches) {
      const url = `${BASE_URL}${match[1]}`
      if (!urls.includes(url)) urls.push(url)
    }
  } catch (e) {
    console.error('eventpop fetchEventList error:', e)
  }
  return urls.slice(0, 20)
}

async function fetchEventPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const html = await res.text()
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } catch (e) {
    console.error(`eventpop fetchEventPage error ${url}:`, e)
    return null
  }
}

export async function scrapeEventpop(
  artistFilter?: string
): Promise<{ found: number; inserted: number; skipped: number }> {
  const result = { found: 0, inserted: 0, skipped: 0 }

  try {
    const urls = await fetchEventList()
    result.found = urls.length

    for (const url of urls) {
      await new Promise(r => setTimeout(r, 1500))

      const pageText = await fetchEventPage(url)
      if (!pageText) { result.skipped++; continue }

      const extracted = await extractFromText(pageText, artistFilter)
      if (!extracted) { result.skipped++; continue }

      const status = await insertPending(extracted, {
        source_type: 'eventpop',
        source_url: url,
        source_raw: pageText.slice(0, 2000)
      })

      if (status === 'inserted') result.inserted++
      else result.skipped++
    }

    await logIngest({ source: 'eventpop', status: 'success', ...result })
  } catch (e: any) {
    await logIngest({ source: 'eventpop', status: 'error', error: e.message })
  }

  return result
}