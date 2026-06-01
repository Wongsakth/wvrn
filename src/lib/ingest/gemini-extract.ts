import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export interface ExtractedEvent {
  title: string | null
  artist_name: string | null
  venue_name: string | null
  event_date: string | null          // raw text เช่น "14 มิถุนายน 2026"
  event_date_parsed: string | null   // YYYY-MM-DD
  ticket_url: string | null
  price_min: number | null
  price_max: number | null
  description: string | null
  country: string
  confidence: number                 // 0-1
  missing_fields: string[]
}

const EXTRACT_PROMPT = `
You are a concert/event data extractor for Thailand.
Extract event information and return ONLY valid JSON, no markdown, no explanation.

Rules:
- dates must be in YYYY-MM-DD format for event_date_parsed
- keep original date text in event_date
- prices in THB as integers
- country default "TH"
- confidence 0.0-1.0 based on how complete the data is
- missing_fields = array of field names you couldn't find
- if multiple events found, return the most relevant one

Return this exact JSON structure:
{
  "title": "...",
  "artist_name": "...",
  "venue_name": "...",
  "event_date": "...",
  "event_date_parsed": "YYYY-MM-DD or null",
  "ticket_url": "...",
  "price_min": 0,
  "price_max": 0,
  "description": "...",
  "country": "TH",
  "confidence": 0.0,
  "missing_fields": []
}
`

// Extract จาก text หรือ HTML
export async function extractFromText(
  content: string,
  artistHint?: string
): Promise<ExtractedEvent | null> {
  try {
    const prompt = `
${EXTRACT_PROMPT}
${artistHint ? `Focus on events related to artist: ${artistHint}` : ''}

Content to extract from:
${content.slice(0, 8000)}
`
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const json = JSON.parse(text)
    return json as ExtractedEvent
  } catch (e) {
    console.error('extractFromText error:', e)
    return null
  }
}

// Extract จากรูป (base64)
export async function extractFromImage(
  base64Image: string,
  mimeType: string = 'image/jpeg',
  artistHint?: string
): Promise<ExtractedEvent | null> {
  try {
    const prompt = `
${EXTRACT_PROMPT}
${artistHint ? `Focus on events related to artist: ${artistHint}` : ''}
Extract event information from this poster/image.
`
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType
        }
      }
    ])
    const text = result.response.text().trim()
    const json = JSON.parse(text)
    return json as ExtractedEvent
  } catch (e) {
    console.error('extractFromImage error:', e)
    return null
  }
}

// Extract จาก URL (fetch แล้วส่ง HTML)
export async function extractFromUrl(
  url: string,
  artistHint?: string
): Promise<ExtractedEvent | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const html = await res.text()

    // ตัด HTML tags ออก เหลือแค่ text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return extractFromText(text, artistHint)
  } catch (e) {
    console.error('extractFromUrl error:', e)
    return null
  }
}