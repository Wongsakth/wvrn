// src/app/api/line/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { type, userId, message } = body

  if (userId) {
    // ส่งให้ user คนเดียว
    const result = await pushMessage(userId, message)
    return NextResponse.json(result)
  }

  if (type) {
    // ส่งหา users ทุกคนที่เปิด notification ประเภทนี้
    const sb = getSupabase()
    const column = notifColumn(type)
    const { data: profiles } = await sb
      .from('profiles')
      .select('line_user_id')
      .eq(column, true)
      .not('line_user_id', 'is', null)

    const results = []
    for (const p of profiles || []) {
      if (!p.line_user_id) continue
      await new Promise(r => setTimeout(r, 100)) // rate limit
      const r = await pushMessage(p.line_user_id, message)
      results.push(r)
    }

    return NextResponse.json({ sent: results.length })
  }

  return NextResponse.json({ error: 'Missing userId or type' }, { status: 400 })
}

function notifColumn(type: string): string {
  const map: Record<string, string> = {
    new_event:      'notif_new_event',
    ticket_open:    'notif_ticket_open',
    before_concert: 'notif_before_concert',
    morning:        'notif_morning',
  }
  return map[type] || 'notif_new_event'
}

async function pushMessage(lineUserId: string, message: string) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: 'text', text: message }],
    }),
  })
  return { userId: lineUserId, status: res.status, ok: res.ok }
}
