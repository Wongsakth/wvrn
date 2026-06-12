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
  event_type:          EventType
  entity_id?:          string
  entity_name?:        string
  value?:              string
  page?:               string
  search_result_count?: number
}

function getDevice(): string {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) return 'mobile'
  return 'desktop'
}

function getOS(): string {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/android/i.test(ua)) return 'Android'
  if (/windows/i.test(ua)) return 'Windows'
  if (/mac/i.test(ua)) return 'Mac'
  if (/linux/i.test(ua)) return 'Linux'
  return 'unknown'
}

function getReferrer(): string {
  if (typeof window === 'undefined') return 'direct'
  const ref = document.referrer
  if (!ref) return 'direct'
  if (/google/i.test(ref))   return 'google'
  if (/facebook|fb/i.test(ref)) return 'facebook'
  if (/line/i.test(ref))     return 'line'
  if (/twitter|x\.com/i.test(ref)) return 'twitter'
  if (ref.includes(window.location.hostname)) return 'internal'
  return 'other'
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
      event_type:          params.event_type,
      entity_id:           params.entity_id   || null,
      entity_name:         params.entity_name || null,
      value:               params.value        || null,
      page:                params.page         || (typeof window !== 'undefined' ? window.location.pathname : null),
      user_id:             user?.id            || null,
      province,
      session_id:          getSessionId(),
      device:              getDevice(),
      os:                  getOS(),
      referrer:            getReferrer(),
      search_result_count: params.search_result_count ?? null,
    }).then(() => {})
  } catch {
    // silent fail
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
export function trackSearch(keyword: string, resultCount?: number) {
  if (!keyword || keyword.length < 2) return
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    track({
      event_type: 'search',
      value: keyword,
      search_result_count: resultCount,
    })
  }, 1000)
}
