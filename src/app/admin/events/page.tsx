// @ts-nocheck
'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, X, Edit2, Trash2, Check, RotateCcw,
  CalendarDays, Clock, MapPin, Loader2, ChevronUp, ChevronDown,
  Star, Zap, TrendingUp, Calendar, Filter,
} from 'lucide-react'
import { cn, PROVINCES, formatThaiDate, statusLabel, genreTagClass } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Event, Artist, Venue, EventStatus, EventType, Genre } from '@/types'
import ImageUpload from '@/components/ImageUpload'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

// ─── Constants ────────────────────────────────────────────
const STATUS_OPTIONS: { id: EventStatus; label: string }[] = [
  { id: 'confirmed', label: 'ยืนยันแล้ว' },
  { id: 'tba',       label: 'TBA'         },
  { id: 'cancelled', label: 'ยกเลิก'      },
  { id: 'postponed', label: 'เลื่อน'      },
  { id: 'sold_out',  label: 'Sold Out'    },
]

const GENRE_OPTIONS: { id: Genre; label: string }[] = [
  { id: 'pop',        label: 'Pop'        },
  { id: 'rock',       label: 'Rock'       },
  { id: 'indie',      label: 'Indie'      },
  { id: 'hiphop',     label: 'Hip-Hop'    },
  { id: 'jazz',       label: 'Jazz'       },
  { id: 'electronic', label: 'Electronic' },
  { id: 'folk',       label: 'Folk'       },
]

const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

const EMPTY_FORM = {
  title: '', description: '', event_type: 'concert' as EventType,
  status: 'confirmed' as EventStatus, start_date: '', end_date: '',
  start_time: '', end_time: '', venue_id: '', genres: [] as Genre[],
  ticket_price_min: '', ticket_price_max: '', ticket_url: '',
  poster_url: '', is_free: false, province: 'กรุงเทพมหานคร', country: 'TH',
  category_id: '' as string, artist_ids: [] as string[],
  artist_orders: {} as Record<string, number>,
  artist_times:  {} as Record<string, string>,
  ticket_sale_start: '', ticket_sale_end: '',
  featured_type: '' as '' | 'partner' | 'wvrn_picks',
}

// ─── Status color map ─────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  confirmed: '#1D9E75',
  tba:       '#F59E0B',
  cancelled: '#E24B4A',
  postponed: '#6B7280',
  sold_out:  '#D4537E',
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'ยืนยันแล้ว',
  tba:       'TBA',
  cancelled: 'ยกเลิก',
  postponed: 'เลื่อน',
  sold_out:  'Sold Out',
}

const PIE_COLORS = ['#1D9E75','#F59E0B','#E24B4A','#6B7280','#D4537E']

// ─── Main Component ───────────────────────────────────────
export default function EventsAdminPage() {
  const [events,        setEvents]        = useState<any[]>([])
  const [deletedEvents, setDeletedEvents] = useState<any[]>([])
  const [artists,       setArtists]       = useState<Artist[]>([])
  const [venues,        setVenues]        = useState<Venue[]>([])
  const [categories,    setCategories]    = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)

  // Tabs: upcoming | all | past | trash
  const [activeTab,     setActiveTab]     = useState<'upcoming'|'all'|'past'|'trash'>('upcoming')

  // Filters
  const [search,        setSearch]        = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterProvince,setFilterProvince]= useState('')
  const [filterMonth,   setFilterMonth]   = useState('')
  const [filterFeatured,setFilterFeatured]= useState('')
  const [sortBy,        setSortBy]        = useState<'date_desc'|'date_asc'|'title'>('date_desc')

  // Form
  const [showForm,       setShowForm]       = useState(false)
  const [editTarget,     setEditTarget]     = useState<any|null>(null)
  const [deleteId,       setDeleteId]       = useState<string|null>(null)
  const [form,           setForm]           = useState({ ...EMPTY_FORM })
  const [artistSearch,   setArtistSearch]   = useState('')
  const [venueSearch,    setVenueSearch]    = useState('')
  const [newArtistModal, setNewArtistModal] = useState(false)
  const [newVenueModal,  setNewVenueModal]  = useState(false)
  const [newArtistForm,  setNewArtistForm]  = useState({ name: '', name_en: '' })
  const [newVenueForm,   setNewVenueForm]   = useState({ name: '', province: 'กรุงเทพมหานคร' })
  const [creating,       setCreating]       = useState(false)

  const sb = createClient()

  // ─── Load ────────────────────────────────────────────────
  async function load() {
    setLoading(true)
    try {
      const [evRes, arRes, veRes, catRes] = await Promise.all([
        sb.from('events').select('*, venue:venues(name,province), event_artists(sort_order,start_time,is_headliner,artist:artists(id,name))').is('deleted_at', null).order('start_date', { ascending: false }),
        sb.from('artists').select('id,name,name_en').is('deleted_at', null).order('name_en', { nullsFirst: false }).order('name'),
        sb.from('venues').select('id,name,province').is('deleted_at', null).order('name'),
        sb.from('event_categories').select('id,name,name_th').eq('is_active', true).order('sort_order'),
      ])
      if (evRes.error) throw evRes.error
      setEvents((evRes.data || []).map((ev: any) => ({
        ...ev,
        artists: [...(ev.event_artists ?? [])]
          .filter((ea: any) => ea.artist)
          .sort((a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
          .map((ea: any) => ea.artist),
      })))
      setArtists(arRes.data || [])
      setVenues(veRes.data || [])
      setCategories(catRes.data || [])
    } catch (e: any) {
      toast.error('โหลดไม่ได้: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadDeleted() {
    const { data } = await sb.from('events')
      .select('*, venue:venues(name,province), event_artists(artist:artists(id,name))')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    setDeletedEvents((data || []).map((ev: any) => ({
      ...ev,
      artists: (ev.event_artists ?? []).filter((ea: any) => ea.artist).map((ea: any) => ea.artist),
    })))
  }

  useEffect(() => { load(); loadDeleted() }, [])

  // ─── Dashboard stats ──────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = new Date().toISOString().slice(0, 7)

  const stats = useMemo(() => {
    const upcoming  = events.filter(e => e.start_date >= today)
    const thisMonthEvs = events.filter(e => e.start_date?.startsWith(thisMonth))
    const tba       = events.filter(e => e.status === 'tba')
    const featured  = events.filter(e => e.featured_type)
    return { total: events.length, upcoming: upcoming.length, thisMonth: thisMonthEvs.length, tba: tba.length, featured: featured.length }
  }, [events])

  // Pie: status distribution
  const statusPieData = useMemo(() => {
    const map: Record<string, number> = {}
    events.forEach(e => { map[e.status] = (map[e.status] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name: STATUS_LABEL[name] || name, value, key: name }))
  }, [events])

  // Bar: งานแต่ละเดือน 6 เดือนล่าสุด
  const monthBarData = useMemo(() => {
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      months.push(d.toISOString().slice(0, 7))
    }
    return months.map(m => ({
      name: new Date(m + '-01').toLocaleDateString('th', { month: 'short' }),
      count: events.filter(e => e.start_date?.startsWith(m)).length,
    }))
  }, [events])

  // ─── Filter + Sort ────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...events]

    // tab filter
    if (activeTab === 'upcoming') list = list.filter(e => e.start_date >= today)
    else if (activeTab === 'past') list = list.filter(e => e.start_date < today)

    // search
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.province?.includes(search) ||
        e.artists?.some((a: any) => a.name.toLowerCase().includes(q))
      )
    }

    // status
    if (filterStatus) list = list.filter(e => e.status === filterStatus)

    // province
    if (filterProvince) list = list.filter(e => e.province === filterProvince)

    // month
    if (filterMonth) list = list.filter(e => e.start_date?.startsWith(filterMonth))

    // featured
    if (filterFeatured === 'yes') list = list.filter(e => e.featured_type)
    else if (filterFeatured === 'partner') list = list.filter(e => e.featured_type === 'partner')
    else if (filterFeatured === 'wvrn_picks') list = list.filter(e => e.featured_type === 'wvrn_picks')

    // sort
    if (sortBy === 'date_asc')  list.sort((a, b) => a.start_date.localeCompare(b.start_date))
    else if (sortBy === 'date_desc') list.sort((a, b) => b.start_date.localeCompare(a.start_date))
    else if (sortBy === 'title') list.sort((a, b) => a.title.localeCompare(b.title))

    return list
  }, [events, activeTab, search, filterStatus, filterProvince, filterMonth, filterFeatured, sortBy])

  // provinces ที่มีงาน
  const provinceOptions = useMemo(() => {
    const set = new Set(events.map(e => e.province).filter(Boolean))
    return Array.from(set).sort()
  }, [events])

  // ─── Actions ─────────────────────────────────────────────
  function openAdd() { setEditTarget(null); setForm({ ...EMPTY_FORM }); setShowForm(true) }

  function openEdit(ev: any) {
    setEditTarget(ev)
    const orders: Record<string, number> = {}
    const times:  Record<string, string> = {}
    ev.event_artists?.forEach((ea: any) => {
      if (!ea.artist) return
      orders[ea.artist.id] = ea.sort_order ?? 0
      if (ea.start_time) times[ea.artist.id] = ea.start_time.slice(0, 5)
    })
    const sortedArtistIds = [...(ev.event_artists ?? [])]
      .filter((ea: any) => ea.artist)
      .sort((a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
      .map((ea: any) => ea.artist.id)
    setForm({
      ...EMPTY_FORM,
      title: ev.title, description: ev.description ?? '',
      event_type: ev.event_type, category_id: ev.category_id ?? '',
      status: ev.status, start_date: ev.start_date, end_date: ev.end_date ?? '',
      start_time: ev.start_time?.slice(0,5) ?? '', end_time: ev.end_time?.slice(0,5) ?? '',
      venue_id: ev.venue_id ?? '', genres: ev.genres ?? [],
      ticket_price_min: ev.ticket_price_min?.toString() ?? '',
      ticket_price_max: ev.ticket_price_max?.toString() ?? '',
      ticket_url: ev.ticket_url ?? '', poster_url: ev.poster_url ?? '',
      is_free: ev.is_free, province: ev.province, country: ev.country ?? 'TH',
      artist_ids: sortedArtistIds, artist_orders: orders, artist_times: times,
      ticket_sale_start: ev.ticket_sale_start ? ev.ticket_sale_start.slice(0,16) : '',
      ticket_sale_end:   ev.ticket_sale_end   ? ev.ticket_sale_end.slice(0,16)   : '',
      featured_type: ev.featured_type ?? '',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.title.trim())  { toast.error('กรุณากรอกชื่องาน'); return }
    if (!form.start_date)    { toast.error('กรุณาเลือกวันที่');  return }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(), description: form.description.trim() || null,
        event_type: form.event_type, category_id: form.category_id || null,
        status: form.status, start_date: form.start_date,
        end_date: form.end_date || null, start_time: form.start_time || null,
        end_time: form.end_time || null, venue_id: form.venue_id || null,
        genres: form.genres,
        ticket_price_min: form.is_free ? null : (form.ticket_price_min ? parseInt(form.ticket_price_min) : null),
        ticket_price_max: form.is_free ? null : (form.ticket_price_max ? parseInt(form.ticket_price_max) : null),
        ticket_url: form.ticket_url.trim() || null, poster_url: form.poster_url.trim() || null,
        is_free: form.is_free, province: form.province, country: form.country || 'TH',
        ticket_sale_start: form.ticket_sale_start || null, ticket_sale_end: form.ticket_sale_end || null,
        featured_type: form.featured_type || null,
        slug: form.title
          ? (form.title.toLowerCase().replace(/[^a-z0-9\u0e00-\u0e7f\s]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim())
            + '-' + Math.random().toString(36).slice(2,8)
          : null,
      }
      let eventId = editTarget?.id
      let isNewEvent = false
      if (editTarget) {
        const { error } = await sb.from('events').update(payload).eq('id', editTarget.id)
        if (error) throw error
      } else {
        const { data, error } = await sb.from('events').insert(payload).select('id').single()
        if (error) throw error
        eventId = data.id; isNewEvent = true
      }
      if (eventId) {
        await sb.from('event_artists').delete().eq('event_id', eventId)
        if (form.artist_ids.length > 0) {
          await sb.from('event_artists').insert(
            form.artist_ids.map((aid, idx) => ({
              event_id: eventId, artist_id: aid,
              sort_order: form.artist_orders[aid] ?? idx + 1,
              is_headliner: (form.artist_orders[aid] ?? idx + 1) === 1,
              start_time: form.artist_times[aid] || null,
            }))
          )
        }
      }
      if (isNewEvent && eventId) {
        fetch('/api/admin/notify-event', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        }).catch(() => {})
      }
      toast.success(editTarget ? 'แก้ไข Event สำเร็จ' : 'เพิ่ม Event สำเร็จ')
      setShowForm(false); load()
    } catch (e: any) { toast.error('บันทึกไม่ได้: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await sb.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      toast.success('ลบ Event แล้ว'); setDeleteId(null); load()
    } catch (e: any) { toast.error('ลบไม่ได้: ' + e.message) }
  }

  async function handleRestore(id: string) {
    const { error } = await sb.from('events').update({ deleted_at: null }).eq('id', id)
    if (error) { toast.error('Restore ไม่สำเร็จ'); return }
    toast.success('Restore สำเร็จ'); loadDeleted(); load()
  }

  async function handleHardDelete(id: string) {
    if (!confirm('ลบถาวร? ไม่สามารถกู้คืนได้')) return
    const { error } = await sb.from('events').delete().eq('id', id)
    if (error) { toast.error('ลบไม่สำเร็จ'); return }
    toast.success('ลบถาวรแล้ว'); loadDeleted()
  }

  async function createArtist() {
    if (!newArtistForm.name.trim()) { toast.error('กรุณากรอกชื่อศิลปิน'); return }
    setCreating(true)
    try {
      const { data, error } = await sb.from('artists')
        .insert({ name: newArtistForm.name.trim(), name_en: newArtistForm.name_en.trim() || null })
        .select('id,name,name_en').single()
      if (error) throw error
      setArtists(prev => [...prev, data]); toggleArtist(data.id)
      setNewArtistModal(false); setNewArtistForm({ name: '', name_en: '' }); setArtistSearch('')
      toast.success('สร้างศิลปินใหม่แล้ว')
    } catch (e: any) { toast.error('สร้างไม่ได้: ' + e.message) }
    finally { setCreating(false) }
  }

  async function createVenue() {
    if (!newVenueForm.name.trim()) { toast.error('กรุณากรอกชื่อสถานที่'); return }
    setCreating(true)
    try {
      const { data, error } = await sb.from('venues')
        .insert({ name: newVenueForm.name.trim(), province: newVenueForm.province })
        .select('id,name,province').single()
      if (error) throw error
      setVenues(prev => [...prev, data])
      setForm(f => ({ ...f, venue_id: data.id, province: data.province }))
      setNewVenueModal(false); setNewVenueForm({ name: '', province: 'กรุงเทพมหานคร' }); setVenueSearch('')
      toast.success('สร้างสถานที่ใหม่แล้ว')
    } catch (e: any) { toast.error('สร้างไม่ได้: ' + e.message) }
    finally { setCreating(false) }
  }

  function toggleGenre(g: Genre) {
    setForm(f => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g] }))
  }

  function toggleArtist(id: string) {
    setForm(f => {
      const has = f.artist_ids.includes(id)
      if (has) {
        const newIds = f.artist_ids.filter(x => x !== id)
        const newOrders = { ...f.artist_orders }; const newTimes = { ...f.artist_times }
        delete newOrders[id]; delete newTimes[id]
        return { ...f, artist_ids: newIds, artist_orders: newOrders, artist_times: newTimes }
      } else {
        const nextOrder = f.artist_ids.length + 1
        return { ...f, artist_ids: [...f.artist_ids, id], artist_orders: { ...f.artist_orders, [id]: nextOrder }, artist_times: { ...f.artist_times, [id]: f.start_time || '' } }
      }
    })
  }

  function moveArtist(id: string, direction: 'up' | 'down') {
    setForm(f => {
      const ids = [...f.artist_ids]; const orders = { ...f.artist_orders }
      const idx = ids.indexOf(id)
      if (direction === 'up' && idx > 0) {
        const swapId = ids[idx - 1];[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
        orders[id] = idx; orders[swapId] = idx + 1
      } else if (direction === 'down' && idx < ids.length - 1) {
        const swapId = ids[idx + 1];[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
        orders[id] = idx + 2; orders[swapId] = idx + 1
      }
      return { ...f, artist_ids: ids, artist_orders: orders }
    })
  }

  const hasFilter = filterStatus || filterProvince || filterMonth || filterFeatured

  // ─── Render ───────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium text-primary">จัดการ Event</h1>
          <p className="text-[12px] text-muted mt-0.5">{events.length} Event ในระบบ</p>
        </div>
        <button onClick={openAdd} className="btn-accent flex items-center gap-2 py-2 px-4 text-[13px]">
          <Plus size={15} /> เพิ่ม Event
        </button>
      </div>

      {/* ── Dashboard ── */}
      {!loading && (
        <div className="mb-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {[
              { label: 'ทั้งหมด',      value: stats.total,     color: 'var(--accent)' },
              { label: 'กำลังจะมา',   value: stats.upcoming,  color: '#1D9E75' },
              { label: 'เดือนนี้',     value: stats.thisMonth, color: '#3B82F6' },
              { label: 'TBA',          value: stats.tba,       color: '#F59E0B' },
              { label: '⭐ Featured',  value: stats.featured,  color: '#7C3AED' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <p className="text-[22px] font-medium" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bar: งานต่อเดือน */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-medium text-muted mb-3">งาน 6 เดือนล่าสุด</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthBarData} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v} งาน`]} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie: status */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-medium text-muted mb-3">สถานะ Event</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={65} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                    labelLine={false} fontSize={9}>
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLOR[entry.key] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} งาน`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[
          { id: 'upcoming', label: `กำลังจะมา (${events.filter(e => e.start_date >= today).length})` },
          { id: 'all',      label: `ทั้งหมด (${events.length})` },
          { id: 'past',     label: `ผ่านมาแล้ว (${events.filter(e => e.start_date < today).length})` },
          { id: 'trash',    label: `🗑️ ถังขยะ (${deletedEvents.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
            style={{
              background: activeTab === t.id ? (t.id === 'trash' ? '#E24B4A' : 'var(--accent)') : 'var(--surface-1)',
              color: activeTab === t.id ? 'white' : 'var(--text-muted)',
              border: `1px solid ${activeTab === t.id ? 'transparent' : 'var(--border)'}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Trash tab ── */}
      {activeTab === 'trash' && (
        <div>
          {deletedEvents.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <Trash2 size={32} className="mx-auto mb-3 text-muted" />
              <p className="text-[14px] font-medium text-primary">ถังขยะว่างเปล่า</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {deletedEvents.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', opacity: 0.7 }}>
                  <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0"
                    style={{ background: 'rgba(226,75,74,.1)' }}>
                    <span className="text-[14px] font-medium leading-none text-red-500">{new Date(ev.start_date).getDate()}</span>
                    <span className="text-[8px] uppercase text-red-400">{new Date(ev.start_date).toLocaleDateString('th', { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-primary line-through">{ev.title}</p>
                    <p className="text-[11px] text-muted">ลบเมื่อ {new Date(ev.deleted_at).toLocaleDateString('th')}{ev.venue && ` · ${ev.venue.name}`}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleRestore(ev.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                      style={{ background: 'rgba(16,185,129,.1)', color: '#059669', border: '1px solid rgba(16,185,129,.2)' }}>
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button onClick={() => handleHardDelete(ev.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                      style={{ background: 'rgba(239,68,68,.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,.2)' }}>
                      <Trash2 size={12} /> ลบถาวร
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Active tabs ── */}
      {activeTab !== 'trash' && (
        <>
          {/* Filter + Sort bar — 1 แถว */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-0"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', minWidth: 160 }}>
              <Search size={13} className="text-muted shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่องาน, ศิลปิน..."
                className="bg-transparent text-[13px] text-primary outline-none w-full placeholder:text-muted" />
              {search && <button onClick={() => setSearch('')}><X size={13} className="text-muted" /></button>}
            </div>

            {/* Status filter */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="input-theme text-[12px] py-2 px-2 rounded-xl shrink-0"
              style={{ maxWidth: 110 }}>
              <option value="">สถานะ</option>
              {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>

            {/* Province filter */}
            <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)}
              className="input-theme text-[12px] py-2 px-2 rounded-xl shrink-0"
              style={{ maxWidth: 120 }}>
              <option value="">จังหวัด</option>
              {provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Featured filter */}
            <select value={filterFeatured} onChange={e => setFilterFeatured(e.target.value)}
              className="input-theme text-[12px] py-2 px-2 rounded-xl shrink-0"
              style={{ maxWidth: 110 }}>
              <option value="">Featured</option>
              <option value="yes">⭐ มี</option>
              <option value="partner">⭐ Partner</option>
              <option value="wvrn_picks">⚡ Picks</option>
            </select>

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="input-theme text-[12px] py-2 px-2 rounded-xl shrink-0"
              style={{ maxWidth: 120 }}>
              <option value="date_desc">ใหม่→เก่า</option>
              <option value="date_asc">เก่า→ใหม่</option>
              <option value="title">A→Z</option>
            </select>

            {/* Clear filters */}
            {hasFilter && (
              <button onClick={() => { setFilterStatus(''); setFilterProvince(''); setFilterMonth(''); setFilterFeatured('') }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-[12px] shrink-0 transition-colors"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <X size={12} /> ล้าง
              </button>
            )}
          </div>

          {/* Result count */}
          <p className="text-[11px] text-muted mb-3">
            แสดง {filtered.length} จาก {events.length} งาน
          </p>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <CalendarDays size={32} className="mx-auto mb-3 text-muted" />
              <p className="text-[14px] font-medium text-primary">ไม่พบ Event ที่ค้นหา</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(ev => {
                const isPast = ev.start_date < today
                const statusColor = STATUS_COLOR[ev.status] || 'var(--text-muted)'
                return (
                  <div key={ev.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border)',
                      opacity: isPast ? 0.65 : 1,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    onClick={() => { window.location.href = `/events/${ev.slug || ev.id}` }}>

                    {/* Date box */}
                    <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0"
                      style={{ background: isPast ? 'var(--surface-2)' : 'var(--accent-muted)' }}>
                      <span className="text-[15px] font-medium leading-none"
                        style={{ color: isPast ? 'var(--text-muted)' : 'var(--accent)' }}>
                        {new Date(ev.start_date).getDate()}
                      </span>
                      <span className="text-[8px] uppercase mt-0.5"
                        style={{ color: isPast ? 'var(--text-muted)' : 'var(--accent)', opacity: .7 }}>
                        {new Date(ev.start_date).toLocaleDateString('th', { month: 'short' })}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {/* Featured badge */}
                        {ev.featured_type === 'partner' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: 'rgba(239,159,39,.15)', color: '#BA7517' }}>⭐ Partner</span>
                        )}
                        {ev.featured_type === 'wvrn_picks' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: 'rgba(124,58,237,.12)', color: '#7C3AED' }}>⚡ Picks</span>
                        )}
                        <span className="text-[13px] font-medium text-primary truncate">{ev.title}</span>
                        {/* Status badge */}
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
                          style={{ background: `${statusColor}18`, color: statusColor }}>
                          {STATUS_LABEL[ev.status] || ev.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Artists facepile */}
                        {ev.artists?.length > 0 && (
                          <span className="text-[11px] text-muted truncate max-w-[200px]">
                            {ev.artists.map((a: any) => a.name).join(' · ')}
                          </span>
                        )}
                        {ev.venue && (
                          <span className="flex items-center gap-1 text-[10px] text-muted shrink-0">
                            <MapPin size={9} />{ev.venue.name}
                          </span>
                        )}
                        {ev.start_time && (
                          <span className="flex items-center gap-1 text-[10px] text-muted shrink-0">
                            <Clock size={9} />{ev.start_time.slice(0,5)}
                          </span>
                        )}
                        {ev.country && ev.country !== 'TH' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(55,138,221,.1)', color: '#1a6fb5' }}>
                            🌏 {ev.country}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="hidden sm:block text-[12px] font-medium shrink-0"
                      style={{ color: ev.is_free ? '#5DCAA5' : 'var(--accent)' }}>
                      {ev.is_free ? 'ฟรี' : ev.ticket_price_min ? `฿${ev.ticket_price_min.toLocaleString()}` : 'TBA'}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <a href={`/admin/events/${ev.id}`}
                        className="icon-btn w-8 h-8 flex items-center justify-center" title="Setlist">
                        <Music size={13} />
                      </a>
                      <button onClick={() => openEdit(ev)} className="icon-btn w-8 h-8" title="แก้ไข">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteId(ev.id)} className="icon-btn w-8 h-8" title="ลบ"
                        style={{ color: deleteId === ev.id ? '#E24B4A' : undefined }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Form Modal (ไม่แตะ) ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', maxHeight: '92vh' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[15px] font-medium text-primary">{editTarget ? 'แก้ไข Event' : 'เพิ่ม Event ใหม่'}</h2>
              <button onClick={() => setShowForm(false)} className="icon-btn w-8 h-8"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-5" style={{ maxHeight: 'calc(92vh - 130px)' }}>
              <Section title="ข้อมูลหลัก">
                <Field label="ชื่องาน *">
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="เช่น PAUSE World Tour 2026" className="input-theme text-[13px]" autoFocus />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ประเภทงาน">
                    <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                      className="input-theme text-[13px]">
                      <option value="">-- เลือกประเภท --</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name} — {c.name_th}</option>)}
                    </select>
                  </Field>
                  <Field label="สถานะ">
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EventStatus }))}
                      className="input-theme text-[13px]">
                      {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>
              <Section title="วันที่และเวลา">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="วันเริ่ม *">
                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                      className="input-theme text-[13px]" />
                  </Field>
                  <Field label="วันจบ">
                    <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                      className="input-theme text-[13px]" />
                  </Field>
                  <Field label="เวลาเริ่ม">
                    <select value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      className="input-theme text-[13px]">
                      <option value="">-- เวลา --</option>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="เวลาจบ">
                    <select value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                      className="input-theme text-[13px]">
                      <option value="">-- เวลา --</option>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>
              <Section title="สถานที่">
                <Field label="ค้นหาสถานที่">
                  <input value={venueSearch} onChange={e => setVenueSearch(e.target.value)}
                    placeholder="พิมพ์ชื่อสถานที่..." className="input-theme text-[13px] mb-2" />
                </Field>
                <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
                  {venues.filter(v => v.name.toLowerCase().includes(venueSearch.toLowerCase()) || v.province.includes(venueSearch)).slice(0, 20).map(v => (
                    <button key={v.id} onClick={() => { setForm(f => ({ ...f, venue_id: v.id, province: v.province })); setVenueSearch('') }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[12px] transition-colors"
                      style={{ background: form.venue_id === v.id ? 'var(--accent-muted)' : 'var(--surface-0)', color: form.venue_id === v.id ? 'var(--accent)' : 'var(--text-secondary)', border: form.venue_id === v.id ? '1px solid var(--accent)' : '1px solid transparent' }}>
                      <MapPin size={11} />{v.name} <span className="text-muted ml-auto">{v.province}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setNewVenueModal(true)}
                  className="flex items-center gap-1.5 text-[12px] mt-1" style={{ color: 'var(--accent)' }}>
                  <Plus size={12} /> สร้างสถานที่ใหม่
                </button>
              </Section>
              <Section title="ศิลปิน">
                <Field label="ค้นหาศิลปิน">
                  <input value={artistSearch} onChange={e => setArtistSearch(e.target.value)}
                    placeholder="พิมพ์ชื่อศิลปิน..." className="input-theme text-[13px] mb-2" />
                </Field>
                {form.artist_ids.length > 0 && (
                  <div className="flex flex-col gap-1 mb-2 p-2 rounded-lg" style={{ background: 'var(--surface-0)', border: '1px solid var(--border)' }}>
                    {form.artist_ids.map((id, idx) => {
                      const a = artists.find(x => x.id === id)
                      return a ? (
                        <div key={id} className="flex items-center gap-2 text-[12px]">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0"
                            style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{idx + 1}</span>
                          <span className="flex-1 text-primary">{a.name}</span>
                          <input value={form.artist_times[id] || ''} onChange={e => setForm(f => ({ ...f, artist_times: { ...f.artist_times, [id]: e.target.value } }))}
                            placeholder="เวลา" className="input-theme text-[11px] w-16 py-1 px-2" />
                          <button onClick={() => moveArtist(id, 'up')} className="icon-btn w-6 h-6" disabled={idx === 0}><ChevronUp size={11} /></button>
                          <button onClick={() => moveArtist(id, 'down')} className="icon-btn w-6 h-6" disabled={idx === form.artist_ids.length - 1}><ChevronDown size={11} /></button>
                          <button onClick={() => toggleArtist(id)} className="icon-btn w-6 h-6" style={{ color: '#E24B4A' }}><X size={11} /></button>
                        </div>
                      ) : null
                    })}
                  </div>
                )}
                <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5">
                  {artists.filter(a => !form.artist_ids.includes(a.id) && (a.name.toLowerCase().includes(artistSearch.toLowerCase()) || a.name_en?.toLowerCase().includes(artistSearch.toLowerCase()))).slice(0, 20).map(a => (
                    <button key={a.id} onClick={() => toggleArtist(a.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[12px] transition-colors hover:bg-[var(--surface-0)]"
                      style={{ color: 'var(--text-secondary)' }}>
                      <Plus size={11} style={{ color: 'var(--accent)' }} />
                      {a.name}{a.name_en && <span className="text-muted">{a.name_en}</span>}
                    </button>
                  ))}
                </div>
                <button onClick={() => setNewArtistModal(true)}
                  className="flex items-center gap-1.5 text-[12px] mt-1" style={{ color: 'var(--accent)' }}>
                  <Plus size={12} /> สร้างศิลปินใหม่
                </button>
              </Section>
              <Section title="บัตร">
                <div className="flex items-center gap-2 mb-1">
                  <input type="checkbox" id="is_free" checked={form.is_free}
                    onChange={e => setForm(f => ({ ...f, is_free: e.target.checked }))} />
                  <label htmlFor="is_free" className="text-[13px] text-secondary">งานฟรี ไม่มีค่าใช้จ่าย</label>
                </div>
                {!form.is_free && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ราคาเริ่มต้น (฿)">
                      <input type="number" value={form.ticket_price_min} onChange={e => setForm(f => ({ ...f, ticket_price_min: e.target.value }))}
                        placeholder="เช่น 1500" className="input-theme text-[13px]" />
                    </Field>
                    <Field label="ราคาสูงสุด (฿)">
                      <input type="number" value={form.ticket_price_max} onChange={e => setForm(f => ({ ...f, ticket_price_max: e.target.value }))}
                        placeholder="เช่น 5000" className="input-theme text-[13px]" />
                    </Field>
                  </div>
                )}
                <Field label="ลิงก์ซื้อบัตร">
                  <input value={form.ticket_url} onChange={e => setForm(f => ({ ...f, ticket_url: e.target.value }))}
                    placeholder="https://..." className="input-theme text-[13px]" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="เริ่มขายบัตร">
                    <input type="datetime-local" value={form.ticket_sale_start}
                      onChange={e => setForm(f => ({ ...f, ticket_sale_start: e.target.value }))}
                      className="input-theme text-[13px]" />
                  </Field>
                  <Field label="หมดเขตขาย">
                    <input type="datetime-local" value={form.ticket_sale_end}
                      onChange={e => setForm(f => ({ ...f, ticket_sale_end: e.target.value }))}
                      className="input-theme text-[13px]" />
                  </Field>
                </div>
              </Section>
              <Section title="รายละเอียด">
                <Field label="คำอธิบาย">
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="รายละเอียดงาน, dress code, การเดินทาง..."
                    className="input-theme text-[13px] resize-none" rows={3} />
                </Field>
                <ImageUpload bucket="events" value={form.poster_url}
                  onChange={url => setForm(f => ({ ...f, poster_url: url }))}
                  label="รูปปก Event" aspect="3:4" />
              </Section>
              <Section title="🌟 Featured">
                <Field label="ประเภท Featured">
                  <select value={form.featured_type}
                    onChange={e => setForm(f => ({ ...f, featured_type: e.target.value as any }))}
                    className="input-theme text-[13px]">
                    <option value="">— ปกติ (Normal) —</option>
                    <option value="partner">⭐ Event Partner</option>
                    <option value="wvrn_picks">⚡ WVRN Picks</option>
                  </select>
                </Field>
                {form.featured_type && (
                  <div className="mt-2 p-3 rounded-xl text-[12px]"
                    style={{
                      background: form.featured_type === 'partner' ? 'rgba(239,159,39,.08)' : 'rgba(124,58,237,.08)',
                      border: `1px solid ${form.featured_type === 'partner' ? 'rgba(239,159,39,.3)' : 'rgba(124,58,237,.3)'}`,
                      color: form.featured_type === 'partner' ? '#BA7517' : '#7C3AED',
                    }}>
                    {form.featured_type === 'partner' ? '⭐ Event Partner — แสดง banner สีทอง + ขึ้นก่อนงานทั่วไป' : '⚡ WVRN Picks — แสดง banner สีม่วง + ขึ้นหลัง Event Partner'}
                  </div>
                )}
              </Section>
            </div>
            <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={14} /> {editTarget ? 'บันทึกการแก้ไข' : 'เพิ่ม Event'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Artist Modal */}
      {newArtistModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <h3 className="text-[15px] font-medium text-primary mb-4 flex items-center gap-2"><Plus size={16} style={{ color: 'var(--accent)' }} /> สร้างศิลปินใหม่</h3>
            <div className="flex flex-col gap-3 mb-4">
              <Field label="ชื่อไทย *"><input value={newArtistForm.name} onChange={e => setNewArtistForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น บอดี้สแลม" className="input-theme text-[13px]" autoFocus /></Field>
              <Field label="ชื่ออังกฤษ"><input value={newArtistForm.name_en} onChange={e => setNewArtistForm(f => ({ ...f, name_en: e.target.value }))} placeholder="เช่น Bodyslam" className="input-theme text-[13px]" /></Field>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setNewArtistModal(false); setNewArtistForm({ name: '', name_en: '' }) }} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={createArtist} disabled={creating} className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2">
                {creating ? <><Loader2 size={13} className="animate-spin" /> สร้าง...</> : <><Check size={13} /> สร้างเลย</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Venue Modal */}
      {newVenueModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <h3 className="text-[15px] font-medium text-primary mb-4 flex items-center gap-2"><Plus size={16} style={{ color: 'var(--accent)' }} /> สร้างสถานที่ใหม่</h3>
            <div className="flex flex-col gap-3 mb-4">
              <Field label="ชื่อสถานที่ *"><input value={newVenueForm.name} onChange={e => setNewVenueForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น Thunder Dome" className="input-theme text-[13px]" autoFocus /></Field>
              <Field label="จังหวัด"><select value={newVenueForm.province} onChange={e => setNewVenueForm(f => ({ ...f, province: e.target.value }))} className="input-theme text-[13px]">{PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}</select></Field>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setNewVenueModal(false); setNewVenueForm({ name: '', province: 'กรุงเทพมหานคร' }) }} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={createVenue} disabled={creating} className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2">
                {creating ? <><Loader2 size={13} className="animate-spin" /> สร้าง...</> : <><Check size={13} /> สร้างเลย</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(226,75,74,.1)' }}>
              <Trash2 size={20} style={{ color: '#E24B4A' }} />
            </div>
            <h3 className="text-[15px] font-medium text-primary text-center mb-2">ลบ Event นี้?</h3>
            <p className="text-[12px] text-muted text-center mb-5">ข้อมูลจะถูกย้ายไปถังขยะ</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 text-[13px] rounded-lg font-medium" style={{ background: '#E24B4A', color: '#fff' }}>ลบเลย</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div className="text-[10px] font-medium text-muted uppercase tracking-widest mb-3">{title}</div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-muted mb-1.5">{label}</label>
      {children}
    </div>
  )
}
