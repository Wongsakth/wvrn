import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function logIngest(data: {
  source: string
  artist_name?: string
  status: 'success' | 'error'
  found?: number
  inserted?: number
  skipped?: number
  error?: string
}) {
  await supabase.from('ingest_logs').insert(data)
}