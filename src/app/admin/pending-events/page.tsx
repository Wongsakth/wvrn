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

      if (newEvent && event.artist_id) {
        await supabase.from('event_artists').insert({
          event_id: newEvent.id,
          artist_id: event.artist_id
        })
      }

      await supabase
        .from('events_pending')
        .update({
          status: 'approved',
          review_note: reviewNote || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', event.id)

      // LINE notify — fire and forget ไม่ block UI
      if (newEvent?.id) {
        fetch('/api/admin/notify-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: newEvent.id }),
        }).catch(() => {})
      }

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
            <span className="ml-1.5 text-xs opacity-70">{counts[s]}</span>
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
        <div className="text-center py-16 text-gray-400">ไม่มี {filter} events</div>
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
                          disabled={processing === e.id}
                          className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs hover:bg-green-100"
                        >
                          {processing === e.id ? '...' : '✅'}
                        </button>
                        <button
                          onClick={() => handleReject(e)}
                          disabled={processing === e.id}
                          className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs hover:bg-red-100"
                        >
                          ❌
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-white h-full overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">รายละเอียด</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-5">
              {[
                { label: 'ชื่องาน', value: selected.title },
                { label: 'ศิลปิน', value: selected.artist_name },
                { label: 'สถานที่', value: selected.venue_name },
                { label: 'วันที่ (raw)', value: selected.event_date },
                { label: 'วันที่ (parsed)', value: selected.event_date_parsed },
                { label: 'ราคา', value: selected.price_min && selected.price_max
                    ? `${selected.price_min.toLocaleString()} – ${selected.price_max.toLocaleString()} ฿`
                    : null },
                { label: 'ประเทศ', value: selected.country },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-gray-800">{value || '—'}</span>
                </div>
              ))}

              {selected.ticket_url && (
                <div className="flex gap-3">
                  <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">ลิงก์บัตร</span>
                  <a
                    href={selected.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {selected.ticket_url}
                  </a>
                </div>
              )}

              {selected.source_url && (
                <div className="flex gap-3">
                  <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">Source</span>
                  <a
                    href={selected.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {selected.source_url}
                  </a>
                </div>
              )}

              <div className="flex gap-3 items-center">
                <span className="text-xs text-gray-400 w-24 flex-shrink-0">Confidence</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          selected.confidence >= 0.85 ? 'bg-green-500' :
                          selected.confidence >= 0.65 ? 'bg-yellow-500' : 'bg-red-400'
                        }`}
                        style={{ width: `${selected.confidence * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-semibold ${CONF_COLOR(selected.confidence)}`}>
                      {Math.round(selected.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {selected.missing_fields && selected.missing_fields.length > 0 && (
                <div className="flex gap-3">
                  <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">ขาด</span>
                  <div className="flex gap-1 flex-wrap">
                    {selected.missing_fields.map(f => (
                      <span key={f} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selected.description && (
              <div className="mb-5">
                <p className="text-xs text-gray-400 mb-1">รายละเอียด</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 line-clamp-4">
                  {selected.description}
                </p>
              </div>
            )}

            {filter === 'pending' && (
              <div className="mb-5">
                <p className="text-xs text-gray-400 mb-1">หมายเหตุ (optional)</p>
                <textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="เหตุผล approve/reject..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-gray-400"
                />
              </div>
            )}

            {filter === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(selected)}
                  disabled={processing === selected.id}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {processing === selected.id ? 'กำลังบันทึก...' : '✅ Approve'}
                </button>
                <button
                  onClick={() => handleReject(selected)}
                  disabled={processing === selected.id}
                  className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                >
                  ❌ Reject
                </button>
              </div>
            )}

            {filter !== 'pending' && selected.review_note && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                หมายเหตุ: {selected.review_note}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
