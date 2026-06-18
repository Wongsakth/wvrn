// app/api/admin/predict-setlist/route.ts
// AI Setlist Prediction — ดึง past setlists แล้วให้ Gemini ทำนาย
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { artistId, artistName, eventTitle, eventId } = await req.json()
    if (!artistId || !artistName) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    const sb = getSupabase()

    // ── 1. ดึง past setlists ของศิลปินนี้จาก DB ────────────
    const { data: pastSetlists } = await sb
      .from('setlists')
      .select('notes, setlist_songs(song_title, order_num, is_encore)')
      .eq('artist_id', artistId)
      .eq('is_prediction', false)
      .order('created_at', { ascending: false })
      .limit(5)

    // ── 2. ดึง artist news เพื่อ context ──────────────────
    const { data: news } = await sb
      .from('artist_news')
      .select('title, published_at')
      .eq('artist_id', artistId)
      .order('published_at', { ascending: false })
      .limit(10)

    // ── 3. สร้าง prompt ────────────────────────────────────
    const pastSetlistText = pastSetlists?.length
      ? pastSetlists.map((sl, i) => {
          const songs = (sl.setlist_songs ?? [])
            .sort((a: any, b: any) => a.order_num - b.order_num)
            .map((s: any) => s.song_title + (s.is_encore ? ' [encore]' : ''))
            .join(', ')
          return `Past ${i + 1}: ${songs}`
        }).join('\n')
      : 'ไม่มีข้อมูล past setlist'

    const newsText = news?.length
      ? news.map(n => `- ${n.title}`).join('\n')
      : 'ไม่มีข้อมูล news'

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านดนตรีไทย วิเคราะห์และทำนาย setlist สำหรับคอนเสิร์ตนี้

ศิลปิน: ${artistName}
งาน: ${eventTitle}

Past Setlists ของศิลปิน:
${pastSetlistText}

ข่าวล่าสุด:
${newsText}

กรุณาทำนาย setlist ที่น่าจะเล่นในคอนเสิร์ตนี้ โดย:
1. ดูจาก pattern ของ past setlists
2. เพลง hit ที่คนนิยม
3. อัลบั้มล่าสุดที่มีในข่าว
4. เพลงที่เหมาะกับ encore

ตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น:
{
  "songs": ["ชื่อเพลง 1", "ชื่อเพลง 2", ...],
  "encore": ["ชื่อเพลง encore 1", ...],
  "confidence": 0.75,
  "reasoning": "เหตุผลสั้นๆ"
}`

    // ── 4. Call Gemini ─────────────────────────────────────
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
        }),
      }
    )

    const geminiData = await geminiRes.json()
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // รวม songs + encore
    const allSongs = [
      ...(parsed.songs || []),
      ...(parsed.encore || []).map((s: string) => `${s} [encore]`),
    ]

    return NextResponse.json({
      songs: allSongs,
      confidence: parsed.confidence ?? 0.7,
      reasoning: parsed.reasoning ?? '',
    })

  } catch (e: any) {
    console.error('predict-setlist error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
