// src/lib/supabase.ts
// Browser client (for client components)
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── Typed query helpers ──────────────────────────────────────────────────────
import type { EventFilters } from '@/types'

export async function getEvents(filters: EventFilters = {}) {
  const sb = createClient()
  let q = sb
    .from('events')
    .select(`
      *,
      venue:venues(*),
      event_artists(artist:artists(*))
    `)
    .order('start_date', { ascending: true })

  if (filters.province)  q = q.eq('province', filters.province)
  if (filters.isFree)    q = q.eq('is_free', true)
  if (filters.dateFrom)  q = q.gte('start_date', filters.dateFrom)
  if (filters.dateTo)    q = q.lte('start_date', filters.dateTo)
  if (filters.status)    q = q.eq('status', filters.status)
  if (filters.search)    q = q.ilike('title', `%${filters.search}%`)

  const { data, error } = await q
  if (error) throw error

  // Flatten artists from junction table
  return (data || []).map((ev: any) => ({
    ...ev,
    artists: ev.event_artists?.map((ea: any) => ea.artist) ?? [],
  }))
}

export async function getEventById(id: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('events')
    .select(`*, venue:venues(*), event_artists(artist:artists(*))`)
    .eq('id', id)
    .single()
  if (error) throw error
  const d = data as any
  return { ...d, artists: d.event_artists?.map((ea: any) => ea.artist) ?? [] }
}

export async function getArtists() {
  const sb = createClient()
  const { data, error } = await sb
    .from('artists').select('*').order('name')
  if (error) throw error
  return data || []
}

export async function getFollowedArtistIds(userId: string) {
  const sb = createClient()
  const { data } = await sb
    .from('follows').select('artist_id').eq('user_id', userId)
  return (data || []).map((f: any) => f.artist_id)
}

export async function toggleFollow(userId: string, artistId: string) {
  const sb = createClient()
  const { data } = await sb
    .from('follows').select('artist_id')
    .eq('user_id', userId).eq('artist_id', artistId).maybeSingle()

  if (data) {
    await sb.from('follows').delete()
      .eq('user_id', userId).eq('artist_id', artistId)
    return false
  } else {
    await (sb.from('follows') as any).insert({ user_id: userId, artist_id: artistId })
    return true
  }
}

export async function toggleBookmark(userId: string, eventId: string) {
  const sb = createClient()
  const { data } = await sb
    .from('bookmarks').select('event_id')
    .eq('user_id', userId).eq('event_id', eventId).maybeSingle()

  if (data) {
    await sb.from('bookmarks').delete()
      .eq('user_id', userId).eq('event_id', eventId)
    return false
  } else {
    await (sb.from('bookmarks') as any).insert({ user_id: userId, event_id: eventId })
    return true
  }
}

export async function getBookmarkedEventIds(userId: string) {
  const sb = createClient()
  const { data } = await sb
    .from('bookmarks').select('event_id').eq('user_id', userId)
  return (data || []).map((b: any) => b.event_id)
}

export async function submitEvent(submission: any) {
  const sb = createClient()
  const { error } = await sb.from('event_submissions').insert(submission)
  if (error) throw error
}

export async function getPendingSubmissions() {
  const sb = createClient()
  const { data, error } = await sb
    .from('event_submissions').select('*')
    .eq('status', 'pending').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getUserProfile(userId: string) {
  const sb = createClient()
  const { data } = await sb
    .from('profiles').select('*').eq('id', userId).maybeSingle()
  return data
}

export async function updateUserTheme(userId: string, theme: string) {
  const sb = createClient()
  await (sb.from('profiles') as any).update({ theme }).eq('id', userId)
}
