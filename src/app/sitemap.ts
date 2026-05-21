// @ts-nocheck
import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase'

const BASE = 'https://wvrn.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = createClient()

  const [evRes, arRes, vRes] = await Promise.all([
    sb.from('events').select('slug, updated_at').not('slug', 'is', null).order('start_date', { ascending: false }).limit(500),
    sb.from('artists').select('slug, updated_at').not('slug', 'is', null).limit(300),
    sb.from('venues').select('slug, updated_at').not('slug', 'is', null).limit(200),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/artists`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/venues`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ]

  const events = (evRes.data || []).map(e => ({
    url: `${BASE}/events/${e.slug}`,
    lastModified: new Date(e.updated_at || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const artists = (arRes.data || []).map(a => ({
    url: `${BASE}/artists/${a.slug}`,
    lastModified: new Date(a.updated_at || Date.now()),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const venues = (vRes.data || []).map(v => ({
    url: `${BASE}/venues/${v.slug}`,
    lastModified: new Date(v.updated_at || Date.now()),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  return [...staticPages, ...events, ...artists, ...venues]
}

