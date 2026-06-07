// src/lib/analytics.ts
import { createClient } from '@/lib/supabase'

type EventType =
  | 'artist_click'
  | 'event_click'
  | 'venue_click'
  | 'search'
  | 'ticket_click'
  | 'filter_used'

interface TrackParams {
  event_type:   EventType
  entity_id?:   string
  entity_name?: string
  value?:       string
  page?:        string
}

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = sessionStorage.getItem('wvrn_sid')
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('wvrn_sid', sid)
  }
  return sid
}

export async function track(params: TrackParams) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()

    let province: string | null = null
    if (user?.id) {
      const { data: profile } = await sb
        .from('profiles')
        .select('province')
        .eq('id', user.id)
        .single()
      province = profile?.province || null
    }

    sb.from('analytics_events').insert({
      event_type:  params.event_type,
      entity_id:   params.entity_id   || null,
      entity_name: params.entity_name || null,
      value:       params.value        || null,
      page:        params.page         || (typeof window !== 'undefined' ? window.location.pathname : null),
      user_id:     user?.id            || null,
      province,
      session_id:  getSessionId(),
    }).then(() => {})
  } catch {
    // silent fail
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
export function trackSearch(keyword: string) {
  if (!keyword || keyword.length < 2) return
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    track({ event_type: 'search', value: keyword })
  }, 1000)
}
