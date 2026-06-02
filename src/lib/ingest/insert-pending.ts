import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { ExtractedEvent } from './gemini-extract'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}

// เช็คว่า URL นี้เคยดึงมาแล้วไหม
export async function isSeenUrl(url: string): Promise<boolean> {
  if (!url) return false
  const supabase = getSupabase()
  const urlHash = md5(url)
  try {
    const { data } = await supabase
      .from('ingest_seen_urls')
      .select('url_hash')
      .eq('url_hash', urlHash)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

// บันทึก URL ว่าเห็นแล้ว
export async function markUrlSeen(url: string, source: string): Promise<void> {
  if (!url) return
  const supabase = getSupabase()
  const urlHash = md5(url)
  try {
    await supabase
      .from('ingest_seen_urls')
      .upsert({ url_hash: urlHash, source, first_seen_at: new Date().toISOString() })
  } catch (e) {
    console.error('markUrlSeen error:', e)
  }
}

export async function insertPending(
  event: ExtractedEvent,
  meta: {
    source_type: string
    source_url?: string
    source_raw?: string
    artist_id?: string
  }
): Promise<'inserted' | 'duplicate' | 'low_confidence' | 'error'> {
  const supabase = getSupabase()

  // ตัด confidence ต่ำออก
  if (event.confidence < 0.2) return 'low_confidence'

  // ข้อมูลขั้นต่ำต้องมี
  if (!event.title && !event.artist_name) return 'low_confidence'

  // Dedup hash
  const hashInput = [
    event.title?.toLowerCase().trim(),
    event.event_date_parsed,
    event.venue_name?.toLowerCase().trim()
  ].join('|')
  const content_hash = md5(hashInput)

  // เช็ค duplicate ใน events_pending
  const { data: existingPending } = await supabase
    .from('events_pending')
    .select('id')
    .eq('content_hash', content_hash)
    .maybeSingle()
  if (existingPending) return 'duplicate'

  // เช็ค duplicate ใน events จริงด้วย (ถ้า approve ไปแล้ว)
  const { data: existingEvent } = await supabase
    .from('events')
    .select('id')
    .ilike('title', event.title || '')
    .eq('event_date', event.event_date_parsed || '')
    .maybeSingle()
  if (existingEvent) return 'duplicate'

  // ลอง match artist_id จาก DB
  let artist_id = meta.artist_id
  if (!artist_id && event.artist_name) {
    const { data: artist } = await supabase
      .from('artists')
      .select('id')
      .ilike('name', `%${event.artist_name}%`)
      .maybeSingle()
    artist_id = artist?.id
  }

  const { error } = await supabase.from('events_pending').insert({
    ...event,
    ...meta,
    artist_id,
    content_hash,
    status: 'pending'
  })

  if (error) {
    console.error('insertPending error:', error)
    return 'error'
  }

  return 'inserted'
}
