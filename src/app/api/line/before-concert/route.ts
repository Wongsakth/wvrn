// src/app/api/line/before-concert/route.ts
// ส่งแจ้งเตือน 3 วันก่อนงาน
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

  const sb = getSupabase()
  const target = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

  const { data: events } = await sb
    .from('events')
    .select('*, venue:venues(name,province), event_artists(artist:artists(id,name))')
    .eq('start_date', target)
    .is('deleted_at', null)

  if (!events || events.length === 0) return NextResponse.json({ sent: 0 })

  const artistIds = events.flatMap(e =>
    (e.event_artists || []).map((ea: any) => ea.artist?.id).filter(Boolean)
  )

  const { data: follows } = await sb
    .from('follows')
    .select('user_id, artist_id, profiles!inner(line_user_id, notif_before_concert)')
    .in('artist_id', artistIds)
    .not('profiles.line_user_id', 'is', null)
    .eq('profiles.notif_before_concert', true)

  const userEvMap = new Map<string, { lineId: string; events: any[] }>()
  for (const f of follows || []) {
    const lineId = (f as any).profiles?.line_user_id
    if (!lineId) continue
    if (!userEvMap.has(f.user_id)) userEvMap.set(f.user_id, { lineId, events: [] })
    const evs = events.filter(e => e.event_artists?.some((ea: any) => ea.artist?.id === f.artist_id))
    for (const ev of evs) {
      if (!userEvMap.get(f.user_id)!.events.find(e => e.id === ev.id)) {
        userEvMap.get(f.user_id)!.events.push(ev)
      }
    }
  }

  let sent = 0
  for (const { lineId, events: userEvs } of userEvMap.values()) {
    for (const ev of userEvs) {
      const artists = ev.event_artists?.map((ea: any) => ea.artist?.name).filter(Boolean).join(', ')
      const msg = [
        `⏰ อีก 3 วันแล้ว!`,
        `🎵 ${ev.title}`,
        artists ? `👤 ${artists}` : '',
        `📅 ${ev.start_date}${ev.start_time ? ` เวลา ${ev.start_time.slice(0,5)}` : ''}`,
        ev.venue?.name ? `📍 ${ev.venue.name}` : '',
        `\nดูรายละเอียด → https://wvrn.app/events/${ev.slug || ev.id}`,
      ].filter(Boolean).join('\n')

      await new Promise(r => setTimeout(r, 100))
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ to: lineId, messages: [{ type: 'text', text: msg }] }),
      })
      if (res.ok) sent++
    }
  }

  return NextResponse.json({ sent, total: userEvMap.size })
}
