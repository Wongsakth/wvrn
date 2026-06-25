// app/api/admin/rewrite-bio/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { artistName, artistNameEn, source1, source2 } = await req.json()
    if (!source1?.trim()) return NextResponse.json({ error: 'กรุณาใส่ข้อมูลอย่างน้อย 1 source' }, { status: 400 })

    const combined = [source1, source2].filter(Boolean).join('\n\n---\n\n')

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `คุณเป็นนักเขียนคอนเทนต์ดนตรีไทย เขียน bio ศิลปินภาษาไทยจากข้อมูลด้านล่าง

กฎสำคัญ:
- เขียนใหม่ด้วยภาษาของตัวเอง ห้าม copy ทั้งยวง
- กระชับ ไม่เกิน 3-4 ประโยค
- เน้นจุดเด่น ความสำเร็จ และเอกลักษณ์ของศิลปิน
- ภาษาไทยที่อ่านง่าย เป็นธรรมชาติ
- ห้ามขึ้นต้นด้วยชื่อศิลปิน

ศิลปิน: ${artistName}${artistNameEn ? ` (${artistNameEn})` : ''}

ข้อมูล:
${combined}

ตอบแค่ bio ภาษาไทยเท่านั้น ไม่มีคำนำหรือคำลงท้าย`
            }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
        }),
      }
    )

    const data = await res.json()
    const bio = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!bio) throw new Error('Gemini ไม่ตอบกลับ: ' + JSON.stringify(data).slice(0, 200))

    return NextResponse.json({ bio })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
