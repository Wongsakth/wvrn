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
              text: `คุณเป็นบรรณาธิการเนื้อหาดนตรีไทยมืออาชีพ จงเขียน bio ภาษาไทยสำหรับศิลปิน/วงดนตรีนี้

ชื่อ: ${artistName}${artistNameEn ? ` (${artistNameEn})` : ''}

ข้อมูลจาก source:
${combined}

format ที่ต้องการ (เขียนเป็นย่อหน้าเดียว ไม่ใช่ bullet):
- ประเภท: ศิลปินเดี่ยว / กลุ่ม / วงดนตรี
- ปีที่เริ่มต้น / ก่อตั้ง
- สังกัดค่ายเพลง (ถ้ามี)
- แนวดนตรีและเอกลักษณ์
- เพลงฮิตที่คนรู้จัก (ใส่ชื่อเพลงจริง ถ้ามีใน source)

กฎเคร่งครัด:
1. เขียนใหม่ทั้งหมด ห้าม copy ประโยคจาก source โดยตรง
2. ยาว 2-3 ประโยคเท่านั้น กระชับ ได้ใจความ ครอบคลุม format ด้านบน
3. ภาษาไทยเป็นธรรมชาติ อ่านง่าย ไม่เป็นทางการจนเกินไป
4. ห้ามขึ้นต้นด้วยชื่อศิลปิน ให้ขึ้นต้นด้วยคำอื่น
5. ห้ามใส่ markdown, bullet, เครื่องหมายคำพูด, หรือ formatting ใดๆ
6. ถ้าข้อมูลใดไม่มีใน source ให้ข้ามไป อย่าแต่งเอง

ตัวอย่าง output ที่ดี:
"วงดนตรีแนว Pop-Rock จากกรุงเทพฯ ก่อตั้งปี 2548 สังกัด GMM Grammy โดดเด่นด้วยเสียงร้องที่ทรงพลังและเนื้อหาเพลงที่โดนใจ มีผลงานเพลงฮิตอย่าง 'ชื่อเพลง' และ 'ชื่อเพลง' ที่ครองใจแฟนเพลงมายาวนาน"

ตอบเฉพาะ bio ภาษาไทยล้วนๆ ไม่ต้องมีคำนำหรือคำอธิบาย`
            }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
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
