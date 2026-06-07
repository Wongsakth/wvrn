// src/lib/analytics.ts
// Track user behavior events to analytics_events table

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

// Session ID สำหรับ guest tracking
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

    // fire and forget — ไม่ block UI
    sb.from('analytics_events').insert({
      event_type:  params.event_type,
      entity_id:   params.entity_id   || null,
      entity_name: params.entity_name || null,
      value:       params.value        || null,
      page:        params.page         || (typeof window !== 'undefined' ? window.location.pathname : null),
      user_id:     user?.id            || null,
      session_id:  getSessionId(),
    }).then(() => {}) // ignore result
  } catch {
    // silent fail — analytics ไม่ควร affect UX
  }
}

// Debounced search tracker — ไม่ track ทุก keystroke
let searchTimer: ReturnType<typeof setTimeout> | null = null
export function trackSearch(keyword: string) {
  if (!keyword || keyword.length < 2) return
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    track({ event_type: 'search', value: keyword })
  }, 1000) // รอ 1 วิหลังหยุดพิมพ์
}
