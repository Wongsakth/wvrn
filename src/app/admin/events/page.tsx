'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, X, Edit2, Trash2, Check,
  CalendarDays, Clock, MapPin, Ticket, Loader2, ChevronUp, ChevronDown,
} from 'lucide-react'
import { cn, PROVINCES, formatThaiDate, statusLabel, genreTagClass } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Event, Artist, Venue, EventStatus, EventType, Genre } from '@/types'

const STATUS_OPTIONS: { id: EventStatus; label: string }[] = [
  { id: 'confirmed', label: 'ยืนยันแล้ว' },
  { id: 'tba',       label: 'TBA'         },
  { id: 'cancelled', label: 'ยกเลิก'      },
  { id: 'postponed', label: 'เลื่อน'      },
  { id: 'sold_out',  label: 'Sold Out'    },
]

const TYPE_OPTIONS: { id: EventType; label: string }[] = [
  { id: 'concert',    label: 'Concert'     },
  { id: 'festival',   label: 'Festival'    },
  { id: 'acoustic',   label: 'Acoustic'    },
  { id: 'showcase',   label: 'Showcase'    },
  { id: 'fanmeeting', label: 'Fan Meeting' },
  { id: 'other',      label: 'อื่นๆ'       },
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

// Generate time options ทุก 5 นาที แบบ 24 ชม.
const TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, i) => {
  const h = Math.floor(i / 12).toString().padStart(2, '0')
  const m = ((i % 12) * 5).toString().padStart(2, '0')
  return `${h}:${m}`
})

const EMPTY_FORM = {
  title: '', description: '', event_type: 'concert' as EventType,
  status: 'confirmed' as EventStatus, start_date: '', end_date: '',
  start_time: '', end_time: '', venue_id: '', genres: [] as Genre[],
  ticket_price_min: '', ticket_price_max: '', ticket_url: '',
  poster_url: '', is_free: false, province: 'กรุงเทพมหานคร',
  artist_ids: [] as string[],
  artist_orders: {} as Record<string, number>,
  artist_times:  {} as Record<string, string>,
  ticket_sale_start:    '',
  ticket_sale_end:      '',
  ticket_announce_date: '',
  featured_type:        '' as '' | 'partner' | 'wvrn_picks',
}

export default function EventsAdminPage() {
  const [events,     setEvents]     = useState<any[]>([])
  const [artists,    setArtists]    = useState<Artist[]>([])
  const [venues,     setVenues]     = useState<Venue[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [form,       setForm]       = useState({ ...EMPTY_FORM })

  const sb = createClient()

  async function load() {
    setLoading(true)
    try {
      const [evRes, arRes, veRes] = await Promise.all([
        sb.from('events').select('*, venue:venues(name,province), event_artists(sort_order,start_time,is_headliner,artist:artists(id,name))').order('start_date', { ascending: false }),
        sb.from('artists').select('id,name').order('name'),
        sb.from('venues').select('id,name,province').order('name'),
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
    } catch (e: any) {
      toast.error('โหลดไม่ได้: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM })
    setShowForm(true)
  }

  function openEdit(ev: any) {
    setEditTarget(ev)
    const orders: Record<string, number> = {}
    const times:  Record<string, string> = {}
    // event_artists มี sort_order และ start_time โดยตรง
    ev.event_artists?.forEach((ea: any) => {
      if (!ea.artist) return
      orders[ea.artist.id] = ea.sort_order ?? 0
      if (ea.start_time) times[ea.artist.id] = ea.start_time.slice(0, 5)
    })
    // เรียง artist_ids ตาม sort_order
    const sortedArtistIds = [...(ev.event_artists ?? [])]
      .filter((ea: any) => ea.artist)
      .sort((a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
      .map((ea: any) => ea.artist.id)
    setForm({
      ...EMPTY_FORM,
      title:           ev.title,
      description:     ev.description   ?? '',
      event_type:      ev.event_type,
      status:          ev.status,
      start_date:      ev.start_date,
      end_date:        ev.end_date       ?? '',
      start_time:      ev.start_time?.slice(0,5) ?? '',
      end_time:        ev.end_time?.slice(0,5)   ?? '',
      venue_id:        ev.venue_id       ?? '',
      genres:          ev.genres         ?? [],
      ticket_price_min: ev.ticket_price_min?.toString() ?? '',
      ticket_price_max: ev.ticket_price_max?.toString() ?? '',
      ticket_url:      ev.ticket_url     ?? '',
      poster_url:      ev.poster_url     ?? '',
      is_free:         ev.is_free,
      province:        ev.province,
      artist_ids:      sortedArtistIds,
      artist_orders:   orders,
      artist_times:    times,
      ticket_sale_start:    ev.ticket_sale_start ? ev.ticket_sale_start.slice(0,16) : '',
      ticket_sale_end:      ev.ticket_sale_end   ? ev.ticket_sale_end.slice(0,16)   : '',
      ticket_announce_date: ev.ticket_announce_date ?? '',
      featured_type:        ev.featured_type ?? '',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.title.trim())  { toast.error('กรุณากรอกชื่องาน'); return }
    if (!form.start_date)    { toast.error('กรุณาเลือกวันที่');  return }
    setSaving(true)
    try {
      const payload = {
        title:            form.title.trim(),
        description:      form.description.trim() || null,
        event_type:       form.event_type,
        status:           form.status,
        start_date:       form.start_date,
        end_date:         form.end_date   || null,
        start_time:       form.start_time || null,
        end_time:         form.end_time   || null,
        venue_id:         form.venue_id   || null,
        genres:           form.genres,
        ticket_price_min: form.is_free ? null : (form.ticket_price_min ? parseInt(form.ticket_price_min) : null),
        ticket_price_max: form.is_free ? null : (form.ticket_price_max ? parseInt(form.ticket_price_max) : null),
        ticket_url:       form.ticket_url.trim()   || null,
        poster_url:       form.poster_url.trim()   || null,
        is_free:          form.is_free,
        province:         form.province,
        ticket_sale_start:    form.ticket_sale_start    || null,
        ticket_sale_end:      form.ticket_sale_end      || null,
        ticket_announce_date: form.ticket_announce_date || null,
        featured_type:        form.featured_type        || null,
      }

      let eventId = editTarget?.id
      if (editTarget) {
        const { error } = await sb.from('events').update(payload).eq('id', editTarget.id)
        if (error) throw error
      } else {
        const { data, error } = await sb.from('events').insert(payload).select('id').single()
        if (error) throw error
        eventId = data.id
      }

      // Sync artists with sort_order + time
      if (eventId) {
        await sb.from('event_artists').delete().eq('event_id', eventId)
        if (form.artist_ids.length > 0) {
          await sb.from('event_artists').insert(
            form.artist_ids.map((aid, idx) => ({
              event_id:    eventId,
              artist_id:   aid,
              sort_order:  form.artist_orders[aid] ?? idx + 1,
              is_headliner: (form.artist_orders[aid] ?? idx + 1) === 1,
              start_time:  form.artist_times[aid] || null,
            }))
          )
        }
      }

      toast.success(editTarget ? 'แก้ไข Event สำเร็จ' : 'เพิ่ม Event สำเร็จ')
      setShowForm(false)
      load()
    } catch (e: any) {
      toast.error('บันทึกไม่ได้: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await sb.from('events').delete().eq('id', id)
      if (error) throw error
      toast.success('ลบ Event แล้ว')
      setDeleteId(null)
      load()
    } catch (e: any) {
      toast.error('ลบไม่ได้: ' + e.message)
    }
  }

  function toggleGenre(g: Genre) {
    setForm(f => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g] }))
  }

  function toggleArtist(id: string) {
    setForm(f => {
      const has = f.artist_ids.includes(id)
      if (has) {
        const newIds    = f.artist_ids.filter(x => x !== id)
        const newOrders = { ...f.artist_orders }
        const newTimes  = { ...f.artist_times }
        delete newOrders[id]
        delete newTimes[id]
        return { ...f, artist_ids: newIds, artist_orders: newOrders, artist_times: newTimes }
      } else {
        const nextOrder = f.artist_ids.length + 1
        return {
          ...f,
          artist_ids:    [...f.artist_ids, id],
          artist_orders: { ...f.artist_orders, [id]: nextOrder },
          artist_times:  { ...f.artist_times,  [id]: f.start_time || '' },
        }
      }
    })
  }

  function moveArtist(id: string, direction: 'up' | 'down') {
    setForm(f => {
      const ids    = [...f.artist_ids]
      const orders = { ...f.artist_orders }
      const idx    = ids.indexOf(id)
      if (direction === 'up' && idx > 0) {
        const swapId          = ids[idx - 1]
        ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
        orders[id]             = idx
        orders[swapId]         = idx + 1
      } else if (direction === 'down' && idx < ids.length - 1) {
        const swapId          = ids[idx + 1]
        ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
        orders[id]             = idx + 2
        orders[swapId]         = idx + 1
      }
      return { ...f, artist_ids: ids, artist_orders: orders }
    })
  }

  const filtered = events.filter(ev =>
    ev.title.toLowerCase().includes(search.toLowerCase()) ||
    ev.province.includes(search) ||
    ev.artists?.some((a: Artist) => a.name.toLowerCase().includes(search.toLowerCase()))
  )

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

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <Search size={15} className="text-muted shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่องาน, ศิลปิน, จังหวัด..."
          className="bg-transparent text-[14px] text-primary outline-none w-full placeholder:text-muted" />
        {search && <button onClick={() => setSearch('')}><X size={14} className="text-muted" /></button>}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <CalendarDays size={32} className="mx-auto mb-3 text-muted" />
          <p className="text-[14px] font-medium text-primary">
            {search ? 'ไม่พบ Event ที่ค้นหา' : 'ยังไม่มี Event'}
          </p>
          {!search && (
            <button onClick={openAdd} className="btn-accent mt-4 text-[13px] py-2 px-4">เพิ่ม Event แรก</button>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {filtered.map((ev, i) => {
            const st = statusLabel(ev.status)
            return (
              <div key={ev.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
                style={{
                  background: 'var(--surface-1)',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => { window.location.href = `/events/${ev.id}` }}>
                {/* Date box */}
                <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                  style={{ background: 'var(--accent-muted)' }}>
                  <span className="text-[16px] font-medium leading-none" style={{ color: 'var(--accent)' }}>
                    {new Date(ev.start_date).getDate()}
                  </span>
                  <span className="text-[9px] uppercase" style={{ color: 'var(--accent)', opacity: .7 }}>
                    {new Date(ev.start_date).toLocaleDateString('th', { month: 'short' })}
                  </span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[13px] font-medium text-primary">{ev.title}</span>
                    <span className={cn('tag text-[9px]', st.cls)}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {ev.artists?.length > 0 && (
                      <span className="text-[11px] text-muted">
                        {ev.artists.map((a: Artist) => a.name).join(', ')}
                      </span>
                    )}
                    {ev.venue && (
                      <span className="flex items-center gap-1 text-[10px] text-muted">
                        <MapPin size={9} />{ev.venue.name}
                      </span>
                    )}
                    {ev.start_time && (
                      <span className="flex items-center gap-1 text-[10px] text-muted">
                        <Clock size={9} />{ev.start_time.slice(0,5)}
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
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); openEdit(ev) }} className="icon-btn w-8 h-8" title="แก้ไข">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeleteId(ev.id) }} className="icon-btn w-8 h-8" title="ลบ"
                    style={{ color: deleteId === ev.id ? '#E24B4A' : undefined }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', maxHeight: '92vh' }}>

            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[15px] font-medium text-primary">
                {editTarget ? 'แก้ไข Event' : 'เพิ่ม Event ใหม่'}
              </h2>
              <button onClick={() => setShowForm(false)} className="icon-btn w-8 h-8"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-5" style={{ maxHeight: 'calc(92vh - 130px)' }}>

              {/* Basic info */}
              <Section title="ข้อมูลหลัก">
                <Field label="ชื่องาน *">
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="เช่น PAUSE World Tour 2026" className="input-theme text-[13px]" autoFocus />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ประเภทงาน">
                    <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value as EventType }))}
                      className="input-theme text-[13px]">
                      {TYPE_OPTIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
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

              {/* Date / Time */}
              <Section title="วันเวลา">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="วันที่เริ่ม *">
                    <input type="date" value={form.start_date}
                      onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                      className="input-theme text-[13px]" />
                  </Field>
                  <Field label="วันที่สิ้นสุด">
                    <input type="date" value={form.end_date}
                      onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                      className="input-theme text-[13px]" />
                  </Field>
                  <Field label="เวลาเริ่ม (24 ชม.)">
                    <select value={form.start_time}
                      onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      className="input-theme text-[13px]">
                      <option value="">-- เลือกเวลา --</option>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="เวลาสิ้นสุด (24 ชม.)">
                    <select value={form.end_time}
                      onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                      className="input-theme text-[13px]">
                      <option value="">-- เลือกเวลา --</option>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>

              {/* Venue */}
              <Section title="สถานที่">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="สถานที่">
                    <select value={form.venue_id} onChange={e => setForm(f => ({ ...f, venue_id: e.target.value }))}
                      className="input-theme text-[13px]">
                      <option value="">-- เลือกสถานที่ --</option>
                      {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </Field>
                  <Field label="จังหวัด">
                    <select value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
                      className="input-theme text-[13px]">
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>

              {/* Artists */}
              <Section title={`ศิลปิน ${form.artist_ids.length > 0 ? `(${form.artist_ids.length} คน)` : ''}`}>
                {/* Selected artists with order */}
                {form.artist_ids.length > 0 && (
                  <div className="flex flex-col gap-1 mb-3 p-3 rounded-xl"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <p className="text-[10px] text-muted uppercase tracking-wide mb-1">ลำดับการแสดง</p>
                    {form.artist_ids.map((aid, idx) => {
                      const artist = artists.find(a => a.id === aid)
                      if (!artist) return null
                      return (
                        <div key={aid} className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
                          style={{ background: 'var(--surface-1)' }}>
                          <span className="text-[11px] font-medium w-5 text-center shrink-0"
                            style={{ color: 'var(--accent)' }}>{idx + 1}</span>
                          <span className="text-[12px] text-primary flex-1 truncate">{artist.name}</span>
                          {/* Time picker */}
                          <select
                            value={form.artist_times[aid] || ''}
                            onChange={e => setForm(f => ({ ...f, artist_times: { ...f.artist_times, [aid]: e.target.value } }))}
                            className="text-[11px] rounded-lg px-2 py-1 shrink-0"
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', width: 80 }}>
                            <option value="">เวลา</option>
                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => moveArtist(aid, 'up')} disabled={idx === 0}
                              className="w-6 h-6 rounded flex items-center justify-center text-muted disabled:opacity-30 hover:text-primary text-[10px]"
                              style={{ background: 'var(--surface-2)' }}>▲</button>
                            <button onClick={() => moveArtist(aid, 'down')} disabled={idx === form.artist_ids.length - 1}
                              className="w-6 h-6 rounded flex items-center justify-center text-muted disabled:opacity-30 hover:text-primary text-[10px]"
                              style={{ background: 'var(--surface-2)' }}>▼</button>
                            <button onClick={() => toggleArtist(aid)}
                              className="w-6 h-6 rounded flex items-center justify-center"
                              style={{ background: 'rgba(226,75,74,.1)', color: '#E24B4A' }}>
                              <X size={11} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* Artist picker */}
                <p className="text-[11px] text-muted mb-2">กดเพื่อเพิ่มศิลปิน:</p>
                <div className="max-h-40 overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded-xl"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {artists.filter(a => !form.artist_ids.includes(a.id)).map(a => (
                    <button key={a.id} type="button" onClick={() => toggleArtist(a.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all border"
                      style={{
                        background: 'var(--surface-1)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                      }}>
                      <Plus size={9} /> {a.name}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Genre */}
              <Section title="แนวเพลง">
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map(g => {
                    const active = form.genres.includes(g.id)
                    return (
                      <button key={g.id} type="button" onClick={() => toggleGenre(g.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-all border"
                        style={{
                          background: active ? 'var(--accent-muted)' : 'var(--surface-2)',
                          borderColor: active ? 'var(--accent)' : 'var(--border)',
                          color: active ? 'var(--accent)' : 'var(--text-muted)',
                          fontWeight: active ? 600 : 400,
                        }}>
                        {active && <Check size={11} />}
                        {g.label}
                      </button>
                    )
                  })}
                </div>
              </Section>

              {/* Tickets */}
              <Section title="บัตรและราคา">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <div onClick={() => setForm(f => ({ ...f, is_free: !f.is_free }))}
                    className="w-9 h-5 rounded-full transition-colors relative"
                    style={{ background: form.is_free ? 'var(--accent)' : 'var(--surface-3)' }}>
                    <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                      style={{ left: form.is_free ? '18px' : '2px' }} />
                  </div>
                  <span className="text-[13px] text-primary">งานฟรี (ไม่มีค่าใช้จ่าย)</span>
                </label>
                {!form.is_free && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ราคาต่ำสุด (฿)">
                      <input type="number" value={form.ticket_price_min}
                        onChange={e => setForm(f => ({ ...f, ticket_price_min: e.target.value }))}
                        placeholder="เช่น 1500" className="input-theme text-[13px]" />
                    </Field>
                    <Field label="ราคาสูงสุด (฿)">
                      <input type="number" value={form.ticket_price_max}
                        onChange={e => setForm(f => ({ ...f, ticket_price_max: e.target.value }))}
                        placeholder="เช่น 3500" className="input-theme text-[13px]" />
                    </Field>
                  </div>
                )}
                <Field label="ลิงก์ซื้อบัตร">
                  <input value={form.ticket_url} onChange={e => setForm(f => ({ ...f, ticket_url: e.target.value }))}
                    placeholder="https://..." className="input-theme text-[13px]" />
                </Field>
                <div className="grid grid-cols-1 gap-3 mt-3">
                  <Field label="📅 วันประกาศขายบัตร">
                    <input type="date" value={form.ticket_announce_date}
                      onChange={e => setForm(f => ({ ...f, ticket_announce_date: e.target.value }))}
                      className="input-theme text-[13px]" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="🎟 เริ่มจำหน่ายบัตร">
                      <input type="datetime-local" value={form.ticket_sale_start}
                        onChange={e => setForm(f => ({ ...f, ticket_sale_start: e.target.value }))}
                        className="input-theme text-[13px]" />
                    </Field>
                    <Field label="🔚 สิ้นสุดจำหน่าย">
                      <input type="datetime-local" value={form.ticket_sale_end}
                        onChange={e => setForm(f => ({ ...f, ticket_sale_end: e.target.value }))}
                        className="input-theme text-[13px]" />
                    </Field>
                  </div>
                </div>
              </Section>

              {/* Details */}
              <Section title="รายละเอียด">
                <Field label="คำอธิบาย">
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="รายละเอียดงาน, dress code, การเดินทาง..."
                    className="input-theme text-[13px] resize-none" rows={3} />
                </Field>
                <Field label="URL รูป Poster">
                  <input value={form.poster_url} onChange={e => setForm(f => ({ ...f, poster_url: e.target.value }))}
                    placeholder="https://..." className="input-theme text-[13px]" />
                </Field>
              </Section>

              {/* Featured */}
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
                    {form.featured_type === 'partner'
                      ? '⭐ Event Partner — แสดง banner สีทอง + ขึ้นก่อนงานทั่วไป'
                      : '⚡ WVRN Picks — แสดง banner สีม่วง + ขึ้นหลัง Event Partner'}
                  </div>
                )}
              </Section>
            </div>

            <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2">
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก...</>
                  : <><Check size={14} /> {editTarget ? 'บันทึกการแก้ไข' : 'เพิ่ม Event'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(226,75,74,.1)' }}>
              <Trash2 size={20} style={{ color: '#E24B4A' }} />
            </div>
            <h3 className="text-[15px] font-medium text-primary text-center mb-2">ลบ Event นี้?</h3>
            <p className="text-[12px] text-muted text-center mb-5">ข้อมูลจะหายไปถาวร</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 text-[13px] rounded-lg font-medium"
                style={{ background: '#E24B4A', color: '#fff' }}>
                ลบเลย
              </button>
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
