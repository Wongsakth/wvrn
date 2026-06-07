// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  TrendingUp, Search, Ticket, Users, MapPin, Music,
  BarChart2, Calendar, RefreshCw, Filter
} from 'lucide-react'

const RANGES = [
  { label: '7 วัน',  days: 7  },
  { label: '30 วัน', days: 30 },
  { label: '90 วัน', days: 90 },
]

export default function AnalyticsDashboard() {
  const [range,        setRange]        = useState(7)
  const [loading,      setLoading]      = useState(true)
  const [summary,      setSummary]      = useState<any>({})
  const [topEvents,    setTopEvents]    = useState<any[]>([])
  const [topArtists,   setTopArtists]   = useState<any[]>([])
  const [topVenues,    setTopVenues]    = useState<any[]>([])
  const [topSearches,  setTopSearches]  = useState<any[]>([])
  const [topFilters,   setTopFilters]   = useState<any[]>([])
  const [ticketClicks,  setTicketClicks]  = useState<any[]>([])
  const [topProvinces,  setTopProvinces]  = useState<any[]>([])
  const [uniqueUsers,   setUniqueUsers]   = useState(0)
  const sb = createClient()

  useEffect(() => { load() }, [range])

  async function load() {
    setLoading(true)
    const since = new Date(Date.now() - range * 86400000).toISOString()

    const [all, events, artists, venues, searches, filters, tickets, provinces] = await Promise.all([
      // Summary counts by type
      sb.from('analytics_events').select('event_type, user_id').gte('created_at', since),
      // Top events clicked
      sb.from('analytics_events').select('entity_id, entity_name')
        .eq('event_type', 'event_click').gte('created_at', since),
      // Top artists clicked
      sb.from('analytics_events').select('entity_id, entity_name')
        .eq('event_type', 'artist_click').gte('created_at', since),
      // Top venues clicked
      sb.from('analytics_events').select('entity_id, entity_name')
        .eq('event_type', 'venue_click').gte('created_at', since),
      // Top searches
      sb.from('analytics_events').select('value')
        .eq('event_type', 'search').gte('created_at', since).not('value', 'is', null),
      // Filters used
      sb.from('analytics_events').select('value')
        .eq('event_type', 'filter_used').gte('created_at', since),
      // Ticket clicks
      sb.from('analytics_events').select('entity_id, entity_name, value')
        .eq('event_type', 'ticket_click').gte('created_at', since),
      // Provinces
      sb.from('analytics_events').select('province, user_id')
        .gte('created_at', since).not('province', 'is', null),
    ])

    // Summary
    const counts: Record<string, number> = {}
    for (const row of (all.data || [])) {
      counts[row.event_type] = (counts[row.event_type] || 0) + 1
    }
    setSummary(counts)

    // Top events
    setTopEvents(countBy(events.data || [], r => r.entity_name || r.entity_id))
    // Top artists
    setTopArtists(countBy(artists.data || [], r => r.entity_name || r.entity_id))
    // Top venues
    setTopVenues(countBy(venues.data || [], r => r.entity_name || r.entity_id))
    // Top searches
    setTopSearches(countBy(searches.data || [], r => r.value?.toLowerCase()))
    // Ticket clicks
    setTicketClicks(countBy(tickets.data || [], r => r.entity_name || r.entity_id))

    // Filter parsing
    const filterCounts: Record<string, number> = {}
    for (const row of (filters.data || [])) {
      try {
        const f = JSON.parse(row.value || '{}')
        for (const key of Object.keys(f)) {
          if (f[key] !== undefined) filterCounts[key] = (filterCounts[key] || 0) + 1
        }
      } catch {}
    }
    setTopFilters(Object.entries(filterCounts)
      .map(([k, v]) => ({ name: k, count: v }))
      .sort((a, b) => b.count - a.count).slice(0, 8))

    // Top provinces
    setTopProvinces(countBy(provinces.data || [], r => r.province))

    // Unique users
    const uids = new Set((all.data || []).filter(r => r.user_id).map(r => r.user_id))
    setUniqueUsers(uids.size)

    setLoading(false)
  }

  function countBy(arr: any[], keyFn: (r: any) => string): { name: string; count: number }[] {
    const map: Record<string, number> = {}
    for (const r of arr) {
      const k = keyFn(r)
      if (k) map[k] = (map[k] || 0) + 1
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const totalEvents = Object.values(summary).reduce((a: any, b: any) => a + b, 0) as number

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart2 size={22} style={{ color: 'var(--accent)' }} />
          <div>
            <h1 className="text-[20px] font-medium text-primary">Analytics Dashboard</h1>
            <p className="text-[12px] text-muted">ข้อมูลพฤติกรรมผู้ใช้งาน</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map(r => (
            <button key={r.days} onClick={() => setRange(r.days)}
              className="px-3 py-1.5 rounded-lg text-[12px] border transition-all"
              style={{
                background: range === r.days ? 'var(--accent)' : 'var(--surface-1)',
                color: range === r.days ? 'white' : 'var(--text-secondary)',
                borderColor: range === r.days ? 'var(--accent)' : 'var(--border)',
              }}>
              {r.label}
            </button>
          ))}
          <button onClick={load} className="p-1.5 rounded-lg border transition-all"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin text-muted' : 'text-muted'} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted">กำลังโหลด...</div>
      ) : (
        <div className="flex flex-col gap-5">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'ทั้งหมด',       value: totalEvents,                 icon: <TrendingUp size={14} />, color: 'var(--accent)' },
              { label: 'Event Click',   value: summary.event_click   || 0,  icon: <Calendar  size={14} />, color: '#6366F1' },
              { label: 'Artist Click',  value: summary.artist_click  || 0,  icon: <Music     size={14} />, color: '#EC4899' },
              { label: 'Venue Click',   value: summary.venue_click   || 0,  icon: <MapPin    size={14} />, color: '#F59E0B' },
              { label: 'ซื้อบัตร',      value: summary.ticket_click  || 0,  icon: <Ticket    size={14} />, color: '#10B981' },
              { label: 'Search',        value: summary.search        || 0,  icon: <Search    size={14} />, color: '#3B82F6' },
              { label: 'Unique Users',  value: uniqueUsers,                      icon: <Users     size={14} />, color: '#8B5CF6' },
            ].map(card => (
              <div key={card.label} className="rounded-xl p-4"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-1.5 mb-2" style={{ color: card.color }}>
                  {card.icon}
                  <span className="text-[11px]">{card.label}</span>
                </div>
                <p className="text-[22px] font-semibold text-primary">{card.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Top Events */}
            <Table title="🎵 Event ยอดนิยม" data={topEvents} color="#6366F1" />

            {/* Top Artists */}
            <Table title="⭐ ศิลปินที่กดมากสุด" data={topArtists} color="#EC4899" />

            {/* Ticket Clicks */}
            <Table title="🎟️ งานที่กดซื้อบัตรมากสุด" data={ticketClicks} color="#10B981" />

            {/* Top Searches */}
            <Table title="🔍 คำค้นหายอดนิยม" data={topSearches} color="#3B82F6" />

            {/* Top Venues */}
            <Table title="📍 สถานที่ยอดนิยม" data={topVenues} color="#F59E0B" />

            {/* Top Provinces */}
            <Table title="🗺️ จังหวัดที่ใช้งานมากสุด" data={topProvinces} color="#06B6D4" />

            {/* Filters Used */}
            <div className="rounded-xl p-4"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <h3 className="text-[13px] font-medium text-primary mb-3 flex items-center gap-2">
                <Filter size={14} style={{ color: '#8B5CF6' }} /> Filter ที่ใช้บ่อย
              </h3>
              {topFilters.length === 0 ? (
                <p className="text-[12px] text-muted">ยังไม่มีข้อมูล</p>
              ) : topFilters.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-muted w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[12px] text-primary">{FILTER_LABELS[item.name] || item.name}</span>
                      <span className="text-[11px] text-muted">{item.count}</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'var(--surface-2)' }}>
                      <div className="h-1 rounded-full" style={{
                        width: `${(item.count / (topFilters[0]?.count || 1)) * 100}%`,
                        background: '#8B5CF6',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

const FILTER_LABELS: Record<string, string> = {
  province:        'จังหวัด',
  genre:           'แนวเพลง',
  categoryId:      'ประเภทงาน',
  isFree:          'ฟรีเข้าชม',
  nearMe:          'ใกล้ฉัน',
  datePreset:      'ช่วงวันที่',
  country:         'ต่างประเทศ',
  regionProvinces: 'ภูมิภาค',
}

function Table({ title, data, color }: { title: string; data: any[]; color: string }) {
  const max = data[0]?.count || 1
  return (
    <div className="rounded-xl p-4"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <h3 className="text-[13px] font-medium text-primary mb-3">{title}</h3>
      {data.length === 0 ? (
        <p className="text-[12px] text-muted">ยังไม่มีข้อมูล</p>
      ) : data.map((item, i) => (
        <div key={item.name} className="flex items-center gap-2 mb-2">
          <span className="text-[11px] text-muted w-4">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-0.5">
              <span className="text-[12px] text-primary truncate pr-2">{item.name}</span>
              <span className="text-[11px] text-muted shrink-0">{item.count}</span>
            </div>
            <div className="h-1 rounded-full" style={{ background: 'var(--surface-2)' }}>
              <div className="h-1 rounded-full transition-all" style={{
                width: `${(item.count / max) * 100}%`,
                background: color,
              }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
