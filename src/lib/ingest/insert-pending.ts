import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { ExtractedEvent } from './gemini-extract'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // service role — bypass RLS
)

export async function insertPending(
  event: ExtractedEvent,
  meta: {
    source_type: string   // 'ticketmelon' | 'google_news' | 'instagram' | ...
    source_url?: string
    source_raw?: string
    artist_id?: string
  }
): Promise<'inserted' | 'duplicate' | 'low_confidence' | 'error'> {

  // ตัด confidence ต่ำออก
  if (event.confidence < 0.5) return 'low_confidence'

  // ข้อมูลขั้นต่ำต้องมี
  if (!event.title && !event.artist_name) return 'low_confidence'

  // Dedup hash
  const hashInput = [
    event.title?.toLowerCase().trim(),
    event.event_date_parsed,
    event.venue_name?.toLowerCase().trim()
  ].join('|')
  const content_hash = crypto
    .createHash('md5')
    .update(hashInput)
    .digest('hex')

  // เช็ค duplicate
  const { data: existing } = await supabase
    .from('events_pending')
    .select('id')
    .eq('content_hash', content_hash)
    .maybeSingle()

  if (existing) return 'duplicate'

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