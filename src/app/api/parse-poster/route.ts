import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { base64, mimeType } = await request.json()

    if (!base64 || !mimeType) {
      return NextResponse.json({ error: 'Missing base64 or mimeType' }, { status: 400 })
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const prompt = `อ่านข้อมูลจากโปสเตอร์คอนเสิร์ต/เทศกาลดนตรีนี้ แล้วตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น:

{
  "title": "ชื่องาน",
  "event_date": "YYYY-MM-DD",
  "venue_name": "ชื่อสถานที่",
  "province": "จังหวัด",
  "is_free": true/false,
  "ticket_price": "ราคาบัตร เช่น 500-1500 หรือ FREE",
  "ticket_url": "URL ซื้อบัตร ถ้ามี",
  "description": "รายละเอียดงานสั้น",
  "artists": ["ชื่อศิลปิน1", "ชื่อศิลปิน2", ...]
}

ถ้าไม่รู้ค่าให้ใส่ "" หรือ null
ศิลปินให้เอาชื่อจริง ไม่รวม DJ prefix ที่ไม่ใช่ชื่อ
วันที่ให้ตอบเป็น YYYY-MM-DD เสมอ`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ]
          }]
        })
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Gemini error: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'ไม่สามารถแกะข้อมูลจากโปสเตอร์ได้' }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ parsed })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
