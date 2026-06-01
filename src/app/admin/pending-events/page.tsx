// src/app/admin/pending-events/page.tsx  ← ไฟล์ใหม่

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PendingEvent {
  id: string
  title: string | null
  artist_name: string | null
  artist_id: string | null
  venue_name: string | null
  event_date: string | null
  event_date_parsed: string | null
  ticket_url: string | null
  price_min: number | null
  price_max: number | null
  description: string | null
  country: string
  source_type: string
  source_url: string | null
  confidence: number
  missing_fields: string[] | null
  extracted_json: any
  status: string
  review_note: string | null
  created_at: string
}

const SOURCE_COLORS: Record<string, string> = {
  ticketmelon: 'bg-blue-50 text-blue-700',
  eventpop: 'bg-purple-50 text-purple-700',
  google_news: 'bg-green-50 text-green-700',
  google_news_artist: 'bg-green-50 text-green-700',
  sanook_music: 'bg-yellow-50 text-yellow-700',
  instagram: 'bg-pink-50 text-pink-700',
  user_submit: 'bg-gray-50 text-gray-700',
}

const CONF_COLOR = (c: number) => {
  if (c >= 0.85) return 'text-green-600'
  if (c >= 0.65) return 'text-yellow-600'
  return 'text-red-500'
}

export default function PendingEventsPage() {
  const [events, setEvents] = useState<PendingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selected, setSelected] = useState<PendingEvent | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })

  useEffect(() => { fetchEvents() }, [filter, sourceFilter])

  async function fetchEvents() {
    setLoading(true)
    let query = supabase
      .from('events_pending')
      .select('*')
      .eq('status', filter)
      .order('confidence', { ascending: false })
      .order('created_at', { ascending: false })

    if (sourceFilter !== 'all') {
      query = query.eq('source_type', sourceFilter)
    }

    const { data } = await query.limit(50)
    setEvents(data || [])

    // นับแต่ละ status
    const { data: allData } = await supabase
      .from('events_pending')
      .select('status')
    const c = { pending: 0, approved: 0, rejected: 0 }
    allData?.forEach((r: any) => { c[r.status as keyof typeof c]++ })
    setCounts(c)
    setLoading(false)
  }

  async function handleApprove(event: PendingEvent) {
    setProcessing(event.id)
    try {
      // 1. Insert เข้า events จริง
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert({
          title: event.title,
          description: event.description,
          event_date: event.event_date_parsed,
          ticket_url: event.ticket_url,
          country: event.country || 'TH',
          status: 'published',
        })
        .select()
        .single()

      if (insertError) throw insertError

      // 2. Link artist ถ้ามี artist_id
      if (newEvent && event.artist_id) {
        await supabase.from('event_artists').insert({
          event_id: newEvent.id,
          artist_id: event.artist_id
        })
      }

      // 3. อัพเดท pending → approved
      await supabase
        .from('events_pending')
        .update({
          status: 'approved',
          review_note: reviewNote || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', event.id)

      setSelected(null)
      setReviewNote('')
      fetchEvents()
    } catch (e: any) {
      alert('Error: ' + e.message)
    }
    setProcessing(null)
  }

  async function handleReject(event: PendingEvent) {
    setProcessing(event.id)
    await supabase
      .from('events_pending')
      .update({
        status: 'rejected',
        review_note: reviewNote || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', event.id)
    setSelected(null)
    setReviewNote('')
    setProcessing(null)
    fetchEvents()
  }

  async function handleApproveAll() {
    const highConf = events.filter(e => e.confidence >= 0.85)
    if (!confirm(`Approve ${highConf.length} events ที่ confidence ≥ 85%?`)) return
    for (const e of highConf) await handleApprove(e)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Pending Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            ตรวจสอบ events ที่ดึงมาจาก sources ต่างๆ
          </p>
        </div>
        {filter === 'pending' && events.some(e => e.confidence >= 0.85) && (
          <button
            onClick={handleApproveAll}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            ✅ Approve ทั้งหมด (conf ≥ 85%)
          </button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-4">
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === s
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {s === 'pending' ? '⏳' : s === 'approved' ? '✅' : '❌'} {s}
            <span className="ml-1.5 text-xs opacity-70">
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Source Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['all', 'ticketmelon', 'eventpop', 'google_news', 'instagram', 'user_submit'].map(s => (
          <button
            key={s}
            onClick={() => setSourceFilter(s)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              sourceFilter === s
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">กำลังโหลด...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          ไม่มี {filter} events
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Event</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ศิลปิน</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">วันที่</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Conf</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map(e => (
                <tr
                  key={e.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setSelected(e); setReviewNote('') }}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 line-clamp-1">
                      {e.title || '—'}
                    </div>
                    {e.venue_name && (
                      <div className="text-xs text-gray-400 mt-0.5">{e.venue_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {e.artist_name || '—'}
                    {e.artist_id && (
                      <span className="ml-1 text-xs text-green-600">✓</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {e.event_date_parsed || e.event_date || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      SOURCE_COLORS[e.source_type] || 'bg-gray-100 text-gray-600'
                    }`}>
                      {e.source_type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${CONF_COLOR(e.confidence)}`}>
                    {Math.round(e.confidence * 100)}%
                  </td>
                  <td className="px-4 py-3">
                    {filter === 'pending' && (
                      <div className="flex gap-1.5" onClick={ev => ev.stopPropagation()}>
                        <button
                          onClick={() => handleApprove(e)}