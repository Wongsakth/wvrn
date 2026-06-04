// src/app/api/line/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET!
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64')
  return hash === signature
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature') || ''

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)
  const events = body.events || []

  for (const event of events) {
    if (event.type !== 'message' || event.message?.type !== 'text') continue

    const lineUserId = event.source?.userId
    const text = event.message?.text?.trim()
    if (!lineUserId || !text) continue

    // User พิมพ์ "id" → ตอบด้วย userId ของตัวเอง
    if (text.toLowerCase() === 'id') {
      await sendLineReply(event.replyToken, [
        {
          type: 'text',
          text: `LINE User ID ของคุณคือ:\n${lineUserId}\n\nคัดลอก ID นี้ไปวางในหน้าตั้งค่าโปรไฟล์ของ WVRN ได้เลยครับ 🎵`,
        }
      ])
      continue
    }

    // User พิมพ์ "เปิด" หรือ "ปิด" แจ้งเตือน
    if (text === 'เปิดแจ้งเตือน' || text === 'ปิดแจ้งเตือน') {
      const enabled = text === 'เปิดแจ้งเตือน'
      const sb = getSupabase()
      await sb
        .from('profiles')
        .update({ notif_enabled: enabled })
        .eq('line_user_id', lineUserId)

      await sendLineReply(event.replyToken, [
        {
          type: 'text',
          text: enabled
            ? '✅ เปิดการแจ้งเตือนแล้ว คุณจะได้รับข่าวสาร concert จากศิลปินที่ติดตาม 🎵'
            : '🔕 ปิดการแจ้งเตือนแล้ว พิมพ์ "เปิดแจ้งเตือน" เมื่อต้องการเปิดใหม่',
        }
      ])
      continue
    }

    // Default reply
    await sendLineReply(event.replyToken, [
      {
        type: 'text',
        text: '🎵 WVRN — Never Miss a Show\n\nพิมพ์ "id" เพื่อดู LINE User ID ของคุณ\nพิมพ์ "เปิดแจ้งเตือน" / "ปิดแจ้งเตือน" เพื่อจัดการการแจ้งเตือน',
      }
    ])
  }

  return NextResponse.json({ ok: true })
}

async function sendLineReply(replyToken: string, messages: any[]) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
}
