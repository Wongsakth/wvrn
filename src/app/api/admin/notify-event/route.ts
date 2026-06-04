// src/app/api/admin/notify-event/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { eventId } = await req.json()
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })

  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://wvrn.vercel.app'
    const res = await fetch(`${base}/api/line/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET!,
      },
      body: JSON.stringify({ eventId }),
    })
    const data = await res.json()
    return NextResponse.json({ ok: res.ok, ...data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
