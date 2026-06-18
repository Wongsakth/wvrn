// app/api/admin/predict-setlist/route.ts
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

    // 1. Past setlists
    const { data: pastSetlists } = await sb
      .from('setlists')
      .select('notes, setlist_songs(song_title, order_num, is_encore)')
      .eq('artist_id', artistId)
      .eq('is_prediction', false)
      .order('created_at', { ascending: false })
      .limit(5)

    // 2. Artist news
    const { data: news } = await sb
      .from('artist_news')
      .select('title, published_at')
      .eq('artist_id', artistId)
      .order('published_at', { ascending: false })
      .limit(10)

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

    // 3. Prompt — บังคับ JSON output เข้มขึ้น
    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านดนตรีไทย ทำนาย setlist สำหรับคอนเสิร์ตนี้

ศิลปิน: ${artistName}
งาน: ${eventTitle}
Past Setlists: ${pastSetlistText}
ข่าวล่าสุด: ${newsText}

กฎสำคัญ:
- ใส่เฉพาะเพลงที่ ${artistName} เป็นคนร้อง/เล่นจริงๆ เท่านั้น
- ถ้าไม่แน่ใจว่าเพลงนั้นเป็นของ ${artistName} จริง ห้ามใส่
- ถ้าไม่รู้จักศิลปินนี้เลย ให้ใส่ songs เป็น array ว่าง [] และ confidence เป็น 0
- ห้ามสุ่มชื่อเพลงที่ไม่ใช่ของศิลปินนี้มาใส่

ตอบด้วย JSON เท่านั้น ห้ามมีข้อความอื่นนอกจาก JSON
songs เป็น array of object พร้อม duration_sec (วินาที) ถ้าไม่รู้ใส่ 250:
{"songs":[{"title":"เพลง1","duration_sec":215},{"title":"เพลง2","duration_sec":198}],"encore":[{"title":"เพลง encore","duration_sec":230}],"confidence":0.8,"reasoning":"เหตุผล"}`

    // 4. Call Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json', // บังคับ JSON output
          },
        }),
      }
    )

    const geminiData = await geminiRes.json()

    // debug log
    console.log('Gemini response:', JSON.stringify(geminiData).slice(0, 500))

    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!raw) {
      // check for errors from Gemini
      const errMsg = geminiData?.error?.message || geminiData?.promptFeedback?.blockReason || 'No response from Gemini'
      throw new Error(errMsg)
    }

    // parse — try multiple strategies
    let parsed: any = null
    const strategies = [
      () => JSON.parse(raw),
      () => JSON.parse(raw.replace(/```json|```/g, '').trim()),
      () => { const m = raw.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('no JSON found') },
    ]

    for (const strategy of strategies) {
      try { parsed = strategy(); break } catch { continue }
    }

    if (!parsed) throw new Error('Cannot parse Gemini response: ' + raw.slice(0, 200))

    // รองรับทั้ง format เก่า (string[]) และใหม่ (object[])
    const normalizeSong = (s: any, isEncore = false) => {
      if (typeof s === 'string') return { title: s.replace(' [encore]', ''), duration_sec: 250, is_encore: isEncore || s.includes('[encore]') }
      return { title: s.title || s, duration_sec: s.duration_sec || 250, is_encore: isEncore }
    }

    const allSongs = [
      ...(parsed.songs || []).map((s: any) => normalizeSong(s, false)),
      ...(parsed.encore || []).map((s: any) => normalizeSong(s, true)),
    ]

    if (allSongs.length === 0 || parsed.confidence === 0) {
      throw new Error(`AI ไม่รู้จักศิลปิน "${artistName}" ดีพอ กรุณาใส่ setlist เองครับ`)
    }

    return NextResponse.json({
      songs: allSongs,
      confidence: parsed.confidence ?? 0.7,
      reasoning: parsed.reasoning ?? '',
    })

  } catch (e: any) {
    console.error('predict-setlist error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
