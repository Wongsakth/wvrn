// src/app/api/cron/ingest-status/route.ts  ← ไฟล์ใหม่
// ดู log ย้อนหลัง — ใช้ test ว่า run แล้วได้อะไรบ้าง

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20')

  // logs ล่าสุด
  const { data: logs } = await supabase
    .from('ingest_logs')
    .select('*')
    .order('ran_at', { ascending: false })
    .limit(limit)

  // pending summary
  const { data: pendingSummary } = await supabase
    .from('events_pending')
    .select('source_type, status')

  const summary = pendingSummary?.reduce((acc: any, row) => {
    const key = `${row.source_type}_${row.status}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    logs,
    pending_summary: summary,
    fetched_at: new Date().toISOString()
  })
}