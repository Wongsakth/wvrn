// src/app/api/line/notify/route.ts
// เรียกเมื่อ Admin approve event ใหม่
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

  const { eventId } = await req.json()
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })

  const sb = getSupabase()

  // ดึงข้อมูล event + artists
  const { data: event } = await sb
    .from('events')
    .select('*, venue:venues(name,province), event_artists(artist:artists(id,name))')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const artistIds = event.event_artists?.map((ea: any) => ea.artist?.id).filter(Boolean) || []
  if (artistIds.length === 0) return NextResponse.json({ sent: 0 })

  // หา users ที่ follow ศิลปินเหล่านี้
  const { data: follows } = await sb
    .from('follows')
    .select('user_id, artist_id')
    .in('artist_id', artistIds)

  if (!follows || follows.length === 0) return NextResponse.json({ sent: 0, total: 0 })

  // ดึง profiles แยก
  const userIds = [...new Set(follows.map(f => f.user_id))]
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, line_user_id, notif_new_event')
    .in('id', userIds)
    .eq('notif_new_event', true)
    .not('line_user_id', 'is', null)

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))

  const artistNames = event.event_artists
    ?.map((ea: any) => ea.artist?.name)
    .filter(Boolean)
    .join(', ') || ''

  const message = [
    `🎵 มีงานใหม่!`,
    `${event.title}`,
    artistNames ? `👤 ${artistNames}` : '',
    `📅 ${event.start_date}${event.start_time ? ` เวลา ${event.start_time.slice(0,5)}` : ''}`,
    event.venue?.name ? `📍 ${event.venue.name}` : '',
    `\nดูรายละเอียด → https://wvrn.app/events/${event.slug || event.id}`,
  ].filter(Boolean).join('\n')

  // dedup user (คน follow หลายศิลปินในงานเดียวกัน)
  const uniqueUsers = new Map<string, string>()
  for (const f of follows || []) {
    const profile = profileMap.get(f.user_id)
    const lineId = profile?.line_user_id
    if (lineId) uniqueUsers.set(f.user_id, lineId)
  }

  let sent = 0
  for (const lineUserId of uniqueUsers.values()) {
    await new Promise(r => setTimeout(r, 100))
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
    if (res.ok) sent++
  }

  return NextResponse.json({ sent, total: uniqueUsers.size })
}
