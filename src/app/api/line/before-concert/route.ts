// src/app/api/line/before-concert/route.ts
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

  // หา events อีก 3 วัน
  const { data: events } = await sb
    .from('events')
    .select('id, title, slug, start_date, start_time, ticket_url, venue:venues(name, province), event_artists(artist:artists(id,name))')
    .eq('start_date', target)
    .is('deleted_at', null)

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No events in 3 days' })
  }

  const eventIds = events.map(e => e.id)

  // หา users ที่กด "going" ใน event_interactions
  const { data: interactions } = await sb
    .from('event_interactions')
    .select('user_id, event_id')
    .in('event_id', eventIds)
    .eq('type', 'going')

  if (!interactions || interactions.length === 0) {
    return NextResponse.json({ sent: 0, total: 0 })
  }

  // ดึง profiles — เช็ค line_user_id + notif_before_concert
  const userIds = [...new Set(interactions.map(i => i.user_id))]
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, line_user_id, notif_before_concert')
    .in('id', userIds)
    .eq('notif_before_concert', true)
    .not('line_user_id', 'is', null)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, total: 0 })
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]))
  const eventMap   = new Map(events.map(e => [e.id, e]))

  // Group by user
  const userEvMap = new Map<string, { lineId: string; events: any[] }>()
  for (const i of interactions) {
    const profile = profileMap.get(i.user_id)
    if (!profile?.line_user_id) continue
    if (!userEvMap.has(i.user_id)) {
      userEvMap.set(i.user_id, { lineId: profile.line_user_id, events: [] })
    }
    const ev = eventMap.get(i.event_id)
    if (ev) userEvMap.get(i.user_id)!.events.push(ev)
  }

  let sent = 0
  for (const { lineId, events: userEvs } of userEvMap.values()) {
    for (const ev of userEvs) {
      const artistNames = ev.event_artists
        ?.map((ea: any) => ea.artist?.name)
        .filter(Boolean)
        .join(', ') || ''

      const msg = [
        `⏰ อีก 3 วันแล้ว! เตรียมตัวได้เลย 🎉`,
        ``,
        `🎵 ${ev.title}`,
        artistNames ? `👤 ${artistNames}` : '',
        `📅 ${ev.start_date}${ev.start_time ? ` เวลา ${ev.start_time.slice(0, 5)} น.` : ''}`,
        ev.venue?.name ? `📍 ${ev.venue.name}${ev.venue.province ? ` · ${ev.venue.province}` : ''}` : '',
        ev.ticket_url ? `\n🎟️ ดูบัตร → ${ev.ticket_url}` : '',
        `\nดูรายละเอียด → https://wvrn.app/events/${ev.slug || ev.id}`,
      ].filter(Boolean).join('\n')

      await new Promise(r => setTimeout(r, 100))
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: lineId,
          messages: [{ type: 'text', text: msg }],
        }),
      })
      if (res.ok) sent++
    }
  }

  return NextResponse.json({ sent, total: userEvMap.size })
}
