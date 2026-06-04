// src/app/api/line/morning/route.ts
// ส่งแจ้งเตือนตอนเช้า — งานวันนี้และพรุ่งนี้
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
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  // หา events วันนี้และพรุ่งนี้
  const { data: events } = await sb
    .from('events')
    .select('*, venue:venues(name,province), event_artists(artist:artists(id,name))')
    .in('start_date', [today, tomorrow])
    .is('deleted_at', null)
    .order('start_date', { ascending: true })

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No events today or tomorrow' })
  }

  // Map artist → events
  const artistEventMap = new Map<string, any[]>()
  for (const ev of events) {
    for (const ea of ev.event_artists || []) {
      const artistId = ea.artist?.id
      if (!artistId) continue
      if (!artistEventMap.has(artistId)) artistEventMap.set(artistId, [])
      artistEventMap.get(artistId)!.push(ev)
    }
  }

  const artistIds = Array.from(artistEventMap.keys())
  if (artistIds.length === 0) return NextResponse.json({ sent: 0 })

  // หา users ที่ follow ศิลปินเหล่านี้ + เปิด notif_morning
  const { data: follows } = await sb
    .from('follows')
    .select('user_id, artist_id, profiles!inner(line_user_id, notif_morning)')
    .in('artist_id', artistIds)
    .not('profiles.line_user_id', 'is', null)
    .eq('profiles.notif_morning', true)

  // Group by user → รวม events ทั้งหมดของ user นั้น
  const userEventsMap = new Map<string, { lineId: string; events: any[] }>()
  for (const f of follows || []) {
    const lineId = (f as any).profiles?.line_user_id
    if (!lineId) continue
    if (!userEventsMap.has(f.user_id)) {
      userEventsMap.set(f.user_id, { lineId, events: [] })
    }
    const evs = artistEventMap.get(f.artist_id) || []
    for (const ev of evs) {
      const existing = userEventsMap.get(f.user_id)!
      if (!existing.events.find(e => e.id === ev.id)) {
        existing.events.push(ev)
      }
    }
  }

  let sent = 0
  for (const { lineId, events: userEvs } of userEventsMap.values()) {
    const todayEvs = userEvs.filter(e => e.start_date === today)
    const tomorrowEvs = userEvs.filter(e => e.start_date === tomorrow)

    const lines = [`☀️ อรุณสวัสดิ์! มีงานจากศิลปินที่คุณติดตาม\n`]

    if (todayEvs.length > 0) {
      lines.push('🎵 วันนี้:')
      for (const ev of todayEvs) {
        const artists = ev.event_artists?.map((ea: any) => ea.artist?.name).filter(Boolean).join(', ')
        lines.push(`• ${ev.title}${ev.start_time ? ` (${ev.start_time.slice(0,5)})` : ''}`)
        if (ev.venue?.name) lines.push(`  📍 ${ev.venue.name}`)
      }
    }

    if (tomorrowEvs.length > 0) {
      if (todayEvs.length > 0) lines.push('')
      lines.push('📅 พรุ่งนี้:')
      for (const ev of tomorrowEvs) {
        lines.push(`• ${ev.title}${ev.start_time ? ` (${ev.start_time.slice(0,5)})` : ''}`)
        if (ev.venue?.name) lines.push(`  📍 ${ev.venue.name}`)
      }
    }

    lines.push(`\nดูทั้งหมด → https://wvrn.app`)

    await new Promise(r => setTimeout(r, 100))
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineId,
        messages: [{ type: 'text', text: lines.join('\n') }],
      }),
    })
    if (res.ok) sent++
  }

  return NextResponse.json({ sent, total: userEventsMap.size })
}
