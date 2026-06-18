// @ts-nocheck
'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, Edit2, Trash2, X, Check, RotateCcw,
  Music, Instagram, Facebook, Loader2,
  Globe, Building2, Star, Calendar, Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Artist, Genre } from '@/types'
import ImageUpload from '@/components/ImageUpload'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const EMPTY_FORM = {
  name: '', name_en: '', bio: '', image_url: '',
  genres: [] as Genre[], facebook_url: '', instagram_url: '',
  tiktok_url: '', website_url: '', label_url: '',
  label_id: '' as string | null, nationality: 'TH' as string,
}

const NAT_FLAG: Record<string, string> = {
  TH: '🇹🇭', KR: '🇰🇷', JP: '🇯🇵', US: '🇺🇸', UK: '🇬🇧', INT: '🌏',
}

const PIE_COLORS = ['#D4537E','#7F77DD','#1D9E75','#F59E0B','#3B82F6','#EC4899','#8B5CF6','#10B981','#6B7280']

export default function ArtistsAdminPage() {
  const [artists,      setArtists]      = useState<any[]>([])
  const [deleted,      setDeleted]      = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [genreList,    setGenreList]    = useState<any[]>([])
  const [labelList,    setLabelList]    = useState<any[]>([])

  // tabs
  const [activeTab,    setActiveTab]    = useState<'all'|'upcoming'|'no_bio'|'trash'>('all')

  // filters
  const [search,       setSearch]       = useState('')
  const [filterGenre,  setFilterGenre]  = useState('')
  const [filterNat,    setFilterNat]    = useState('')
  const [filterBio,    setFilterBio]    = useState('')
  const [sortBy,       setSortBy]       = useState<'name'|'followers'|'recent'>('name')

  // form
  const [showForm,     setShowForm]     = useState(false)
  const [editTarget,   setEditTarget]   = useState<any>(null)
  const [deleteId,     setDeleteId]     = useState<string|null>(null)
  const [form,         setForm]         = useState({ ...EMPTY_FORM })
  const [dupSuggestions, setDupSuggestions] = useState<any[]>([])

  const sb = createClient()
  const dupTimer = useRef<any>(null)

  // ─── Load ─────────────────────────────────────────────────
  async function load() {
    setLoading(true)
    try {
      const { data, error } = await sb.from('artists')
        .select('*, label:labels(id,name), event_count:event_artists(count), last_event:event_artists(event:events(start_date))')
        .is('deleted_at', null)
        .order('is_featured', { ascending: false })
        .order('name')
      if (error) throw error
      setArtists(data || [])
    } catch (e: any) { toast.error('โหลดไม่ได้: ' + e.message) }
    finally { setLoading(false) }
  }

  async function loadDeleted() {
    const { data } = await sb.from('artists')
      .select('id,name,name_en,image_url,deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    setDeleted(data || [])
  }

  useEffect(() => {
    load(); loadDeleted()
    sb.from('genres').select('id,label_th,label_en,category,color').order('label_en').then(({ data }) => setGenreList(data || []))
    sb.from('labels').select('id,name,website_url,facebook_url').is('deleted_at', null).order('name').then(({ data }) => setLabelList(data || []))
  }, [])

  // ─── Stats ────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

  const stats = useMemo(() => {
    const hasBio = artists.filter(a => a.bio_final_th || a.bio).length
    const newWeek = artists.filter(a => a.created_at && new Date(a.created_at) >= weekAgo).length
    const hasUpcoming = artists.filter(a => {
      const dates = (a.last_event || []).map((ea: any) => ea.event?.start_date).filter(Boolean)
      return dates.some((d: string) => d >= today)
    }).length
    return { total: artists.length, hasBio, newWeek, hasUpcoming }
  }, [artists])

  // Genre pie data
  const genrePieData = useMemo(() => {
    const map: Record<string, number> = {}
    artists.forEach(a => (a.genres || []).forEach((g: string) => { map[g] = (map[g] || 0) + 1 }))
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([id, value]) => {
        const g = genreList.find(x => x.id === id)
        return { name: g?.label_en || id, value }
      })
  }, [artists, genreList])

  // Top artists by event count
  const topArtistsData = useMemo(() => {
    return [...artists]
      .map(a => ({
        name: a.name_en || a.name,
        count: (a.event_count?.[0]?.count ?? 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [artists])

  // ─── Filter + Sort ────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...artists]

    if (activeTab === 'upcoming') list = list.filter(a => {
      const dates = (a.last_event || []).map((ea: any) => ea.event?.start_date).filter(Boolean)
      return dates.some((d: string) => d >= today)
    })
    else if (activeTab === 'no_bio') list = list.filter(a => !a.bio_final_th && !a.bio)

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a => a.name.toLowerCase().includes(q) || (a.name_en || '').toLowerCase().includes(q))
    }
    if (filterGenre) list = list.filter(a => (a.genres || []).includes(filterGenre))
    if (filterNat) list = list.filter(a => (a.nationality || 'TH') === filterNat)
    if (filterBio === 'has') list = list.filter(a => a.bio_final_th || a.bio)
    else if (filterBio === 'no') list = list.filter(a => !a.bio_final_th && !a.bio)

    if (sortBy === 'followers') list.sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0))
    else if (sortBy === 'recent') list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    else list.sort((a, b) => a.name.localeCompare(b.name))

    return list
  }, [artists, activeTab, search, filterGenre, filterNat, filterBio, sortBy])

  const hasFilter = filterGenre || filterNat || filterBio

  // ─── Duplicate check ──────────────────────────────────────
  function checkDuplicate(val: string) {
    clearTimeout(dupTimer.current)
    if (!val || val.length < 2 || editTarget) { setDupSuggestions([]); return }
    dupTimer.current = setTimeout(async () => {
      const { data } = await sb.from('artists').select('id,name,name_en,image_url')
        .or(`name.ilike.%${val}%,name_en.ilike.%${val}%`).limit(4)
      setDupSuggestions(data || [])
    }, 500)
  }

  // ─── Actions ─────────────────────────────────────────────
  function openAdd() { setEditTarget(null); setForm({ ...EMPTY_FORM }); setDupSuggestions([]); setShowForm(true) }

  function openEdit(a: any) {
    setEditTarget(a)
    setForm({
      name: a.name, name_en: a.name_en ?? '', bio: a.bio ?? '',
      image_url: a.image_url ?? '', genres: a.genres ?? [],
      facebook_url: a.facebook_url ?? '', instagram_url: a.instagram_url ?? '',
      tiktok_url: a.tiktok_url ?? '', website_url: a.website_url ?? '',
      label_url: a.label_url ?? '', label_id: a.label_id ?? null,
      nationality: a.nationality ?? 'TH',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อศิลปิน'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(), name_en: form.name_en.trim() || null,
        bio: form.bio.trim() || null, image_url: form.image_url || null,
        genres: form.genres, facebook_url: form.facebook_url.trim() || null,
        instagram_url: form.instagram_url.trim() || null, tiktok_url: form.tiktok_url.trim() || null,
        website_url: form.website_url.trim() || null, label_url: form.label_url.trim() || null,
        label_id: form.label_id || null, nationality: form.nationality || 'TH',
      }
      if (editTarget) {
        const { error } = await sb.from('artists').update(payload).eq('id', editTarget.id)
        if (error) throw error
        toast.success(`แก้ไข "${form.name}" สำเร็จ`)
      } else {
        const { error } = await sb.from('artists').insert(payload)
        if (error) throw error
        toast.success(`เพิ่ม "${form.name}" สำเร็จ`)
      }
      setShowForm(false); load()
    } catch (e: any) { toast.error('บันทึกไม่ได้: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    const { error } = await sb.from('artists').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('ลบไม่ได้'); return }
    toast.success('ลบศิลปินแล้ว'); setDeleteId(null); load(); loadDeleted()
  }

  async function handleRestore(id: string) {
    const { error } = await sb.from('artists').update({ deleted_at: null }).eq('id', id)
    if (error) { toast.error('Restore ไม่สำเร็จ'); return }
    toast.success('Restore สำเร็จ'); loadDeleted(); load()
  }

  async function handleHardDelete(id: string) {
    if (!confirm('ลบถาวร?')) return
    const { error } = await sb.from('artists').delete().eq('id', id)
    if (error) { toast.error('ลบไม่สำเร็จ'); return }
    toast.success('ลบถาวรแล้ว'); loadDeleted()
  }

  async function toggleFeatured(a: any) {
    const newVal = !a.is_featured
    await sb.from('artists').update({ is_featured: newVal }).eq('id', a.id)
    setArtists(prev => prev.map(x => x.id === a.id ? { ...x, is_featured: newVal } : x))
    toast.success(newVal ? `⭐ ${a.name} เป็น Top Artist` : 'ยกเลิก Top Artist')
  }

  function toggleGenre(g: string) {
    setForm(f => ({ ...f, genres: (f.genres as string[]).includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g] }))
  }

  function Avatar({ a, size = 40 }: { a: any; size?: number }) {
    return a.image_url ? (
      <img src={a.image_url} alt={a.name} referrerPolicy="no-referrer"
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={e => { e.currentTarget.style.display = 'none' }} />
    ) : (
      <div className="rounded-full flex items-center justify-center shrink-0 font-medium"
        style={{ width: size, height: size, background: 'var(--accent-muted)', color: 'var(--accent)', fontSize: size * 0.35 }}>
        {a.name.slice(0, 2)}
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium text-primary">จัดการศิลปิน</h1>
          <p className="text-[12px] text-muted mt-0.5">{artists.length} ศิลปินในระบบ</p>
        </div>
        <button onClick={openAdd} className="btn-accent flex items-center gap-2 py-2 px-4 text-[13px]">
          <Plus size={15} /> เพิ่มศิลปิน
        </button>
      </div>

      {/* ── Dashboard ── */}
      {!loading && (
        <div className="mb-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'ทั้งหมด',        value: stats.total,      color: 'var(--accent)' },
              { label: 'เพิ่มสัปดาห์นี้', value: stats.newWeek,    color: '#1D9E75'       },
              { label: 'มี Bio',          value: stats.hasBio,     color: '#3B82F6'       },
              { label: 'มีงานกำลังจะมา', value: stats.hasUpcoming, color: '#F59E0B'       },
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
            {/* Bar: Top 10 ศิลปิน */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-medium text-muted mb-3">Top 10 ศิลปินที่มีงานเยอะสุด</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topArtistsData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip formatter={(v: number) => [`${v} งาน`]} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie: genre */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-medium text-muted mb-3">Genre ของศิลปิน</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={genrePieData} cx="50%" cy="50%" outerRadius={65} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                    labelLine={false} fontSize={9}>
                    {genrePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} ศิลปิน`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[
          { id: 'all',      label: `ทั้งหมด (${artists.length})` },
          { id: 'upcoming', label: `มีงาน (${stats.hasUpcoming})` },
          { id: 'no_bio',   label: `ไม่มี Bio (${artists.length - stats.hasBio})` },
          { id: 'trash',    label: `🗑️ ถังขยะ (${deleted.length})` },
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
        <div className="flex flex-col gap-2">
          {deleted.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <Trash2 size={32} className="mx-auto mb-3 text-muted" />
              <p className="text-[14px] font-medium text-primary">ถังขยะว่างเปล่า</p>
            </div>
          ) : deleted.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', opacity: 0.7 }}>
              <Avatar a={a} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-primary line-through">{a.name}</p>
                <p className="text-[11px] text-muted">ลบเมื่อ {new Date(a.deleted_at).toLocaleDateString('th')}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleRestore(a.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                  style={{ background: 'rgba(16,185,129,.1)', color: '#059669', border: '1px solid rgba(16,185,129,.2)' }}>
                  <RotateCcw size={12} /> Restore
                </button>
                <button onClick={() => handleHardDelete(a.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                  style={{ background: 'rgba(239,68,68,.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,.2)' }}>
                  <Trash2 size={12} /> ลบถาวร
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Active tabs ── */}
      {activeTab !== 'trash' && (
        <>
          {/* Filter bar — 1 แถว */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-0"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', minWidth: 160 }}>
              <Search size={13} className="text-muted shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อศิลปิน..."
                className="bg-transparent text-[13px] text-primary outline-none w-full placeholder:text-muted" />
              {search && <button onClick={() => setSearch('')}><X size={13} className="text-muted" /></button>}
            </div>

            <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)}
              className="input-theme text-[12px] py-2 px-2 rounded-xl shrink-0" style={{ maxWidth: 110 }}>
              <option value="">Genre</option>
              {genreList.map(g => <option key={g.id} value={g.id}>{g.label_en}</option>)}
            </select>

            <select value={filterNat} onChange={e => setFilterNat(e.target.value)}
              className="input-theme text-[12px] py-2 px-2 rounded-xl shrink-0" style={{ maxWidth: 110 }}>
              <option value="">สัญชาติ</option>
              {Object.entries(NAT_FLAG).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
            </select>

            <select value={filterBio} onChange={e => setFilterBio(e.target.value)}
              className="input-theme text-[12px] py-2 px-2 rounded-xl shrink-0" style={{ maxWidth: 100 }}>
              <option value="">Bio</option>
              <option value="has">✅ มี Bio</option>
              <option value="no">❌ ไม่มี</option>
            </select>

            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="input-theme text-[12px] py-2 px-2 rounded-xl shrink-0" style={{ maxWidth: 120 }}>
              <option value="name">ชื่อ A→Z</option>
              <option value="followers">Followers</option>
              <option value="recent">เพิ่มล่าสุด</option>
            </select>

            {hasFilter && (
              <button onClick={() => { setFilterGenre(''); setFilterNat(''); setFilterBio('') }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-[12px] shrink-0"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <X size={12} /> ล้าง
              </button>
            )}
          </div>

          <p className="text-[11px] text-muted mb-3">แสดง {filtered.length} จาก {artists.length} ศิลปิน</p>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <Music size={32} className="mx-auto mb-3 text-muted" />
              <p className="text-[14px] font-medium text-primary">ไม่พบศิลปินที่ค้นหา</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(a => {
                const dates = (a.last_event || []).map((ea: any) => ea.event?.start_date).filter(Boolean).sort().reverse()
                const upcoming = dates.filter((d: string) => d >= today)
                const hasBio = !!(a.bio_final_th || a.bio)
                return (
                  <div key={a.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    onClick={() => { window.location.href = `/artists/${a.slug || a.id}` }}>

                    <Avatar a={a} size={44} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {a.nationality && a.nationality !== 'TH' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: 'rgba(55,138,221,.1)', color: '#1a6fb5' }}>
                            {NAT_FLAG[a.nationality] || '🌏'} {a.nationality}
                          </span>
                        )}
                        {a.is_featured && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                            style={{ background: 'rgba(239,159,39,.15)', color: '#BA7517' }}>
                            ⭐ Top
                          </span>
                        )}
                        <span className="text-[13px] font-medium text-primary truncate">{a.name}</span>
                        {a.name_en && <span className="text-[11px] text-muted truncate">{a.name_en}</span>}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* genres */}
                        {(a.genres || []).slice(0, 3).map((g: string) => {
                          const gc = genreList.find(x => x.id === g)
                          return (
                            <span key={g} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase"
                              style={{ background: gc?.color ? gc.color + '20' : 'var(--surface-3)', color: gc?.color || 'var(--text-muted)' }}>
                              {gc?.label_en || g}
                            </span>
                          )
                        })}
                        {/* bio badge */}
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: hasBio ? 'rgba(29,158,117,.1)' : 'rgba(226,75,74,.08)', color: hasBio ? '#1D9E75' : '#E24B4A' }}>
                          {hasBio ? '✓ Bio' : '✗ Bio'}
                        </span>
                        {/* upcoming events */}
                        {upcoming.length > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: 'rgba(245,158,11,.1)', color: '#D97706' }}>
                            🎵 {upcoming.length} งาน
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {a.instagram_url && (
                        <a href={a.instagram_url} target="_blank" rel="noopener noreferrer"
                          className="icon-btn w-7 h-7 hidden sm:flex"><Instagram size={12} /></a>
                      )}
                      {a.facebook_url && (
                        <a href={a.facebook_url} target="_blank" rel="noopener noreferrer"
                          className="icon-btn w-7 h-7 hidden sm:flex"><Facebook size={12} /></a>
                      )}
                      <button onClick={() => toggleFeatured(a)} className="icon-btn w-8 h-8"
                        style={{ color: a.is_featured ? '#EF9F27' : undefined }}>
                        <Star size={13} style={{ fill: a.is_featured ? '#EF9F27' : 'none' }} />
                      </button>
                      <button onClick={() => openEdit(a)} className="icon-btn w-8 h-8"><Edit2 size={13} /></button>
                      <button onClick={() => setDeleteId(a.id)} className="icon-btn w-8 h-8"
                        style={{ color: deleteId === a.id ? '#E24B4A' : undefined }}>
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

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', maxHeight: '92vh' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[15px] font-medium text-primary">{editTarget ? `แก้ไข "${editTarget.name}"` : 'เพิ่มศิลปินใหม่'}</h2>
              <button onClick={() => setShowForm(false)} className="icon-btn w-8 h-8"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ maxHeight: 'calc(92vh - 130px)' }}>

              {/* Dup suggestions */}
              {dupSuggestions.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)' }}>
                  <p className="text-[11px] font-medium mb-2" style={{ color: '#D97706' }}>⚠️ ศิลปินที่ชื่อคล้ายกัน:</p>
                  <div className="flex flex-wrap gap-2">
                    {dupSuggestions.map(d => (
                      <div key={d.id} className="flex items-center gap-2 px-2 py-1 rounded-lg"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        {d.image_url && <img src={d.image_url} alt={d.name} className="w-5 h-5 rounded-full object-cover" />}
                        <span className="text-[11px] text-secondary">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <FormField label="ชื่อไทย *">
                <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); checkDuplicate(e.target.value) }}
                  placeholder="เช่น บอดี้สแลม" className="input-theme text-[13px]" autoFocus />
              </FormField>
              <FormField label="ชื่ออังกฤษ">
                <input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                  placeholder="เช่น Bodyslam" className="input-theme text-[13px]" />
              </FormField>
              <FormField label="สัญชาติ">
                <select value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                  className="input-theme text-[13px]">
                  {Object.entries(NAT_FLAG).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
                </select>
              </FormField>
              <FormField label="ค่ายเพลง">
                <select value={form.label_id ?? ''} onChange={e => {
                  const id = e.target.value || null
                  const lbl = labelList.find(l => l.id === id)
                  setForm(f => ({ ...f, label_id: id, label_url: lbl?.website_url || lbl?.facebook_url || f.label_url }))
                }} className="input-theme text-[13px]">
                  <option value="">— ไม่สังกัดค่าย —</option>
                  {labelList.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </FormField>
              <FormField label="Genre">
                <div className="flex flex-wrap gap-1.5">
                  {genreList.map(g => (
                    <button key={g.id} onClick={() => toggleGenre(g.id)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                      style={{
                        background: form.genres.includes(g.id) ? (g.color || 'var(--accent)') + '20' : 'var(--surface-2)',
                        color: form.genres.includes(g.id) ? (g.color || 'var(--accent)') : 'var(--text-muted)',
                        border: `1px solid ${form.genres.includes(g.id) ? (g.color || 'var(--accent)') : 'var(--border)'}`,
                      }}>
                      {g.label_en}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField label="รูปศิลปิน">
                <ImageUpload bucket="images" folder="artists" value={form.image_url}
                  onChange={url => setForm(f => ({ ...f, image_url: url }))} aspect="1:1" />
              </FormField>
              <FormField label="Bio">
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="ประวัติศิลปิน..." className="input-theme text-[13px] resize-none" rows={3} />
              </FormField>
              <FormField label="Social Media">
                <div className="flex flex-col gap-2">
                  {[
                    { key: 'instagram_url', placeholder: 'https://instagram.com/...', color: '#E1306C', label: 'IG' },
                    { key: 'facebook_url',  placeholder: 'https://facebook.com/...',  color: '#1877F2', label: 'FB' },
                    { key: 'tiktok_url',    placeholder: 'https://tiktok.com/@...',   color: '#010101', label: 'TT' },
                    { key: 'website_url',   placeholder: 'https://website.com',       color: 'var(--accent)', label: 'WEB' },
                    { key: 'label_url',     placeholder: 'https://... (ค่ายเพลง)',    color: 'var(--text-muted)', label: 'LABEL' },
                  ].map(s => (
                    <div key={s.key} className="flex items-center gap-2">
                      <span className="text-[9px] font-bold w-10 text-right shrink-0" style={{ color: s.color }}>{s.label}</span>
                      <input value={(form as any)[s.key]} onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))}
                        placeholder={s.placeholder} className="input-theme text-[13px] flex-1" />
                    </div>
                  ))}
                </div>
              </FormField>
            </div>
            <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={14} /> {editTarget ? 'บันทึก' : 'เพิ่มศิลปิน'}</>}
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
            <h3 className="text-[15px] font-medium text-primary text-center mb-2">ลบศิลปินนี้?</h3>
            <p className="text-[12px] text-muted text-center mb-5">ข้อมูลจะถูกย้ายไปถังขยะ</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 text-[13px] rounded-lg font-medium"
                style={{ background: '#E24B4A', color: '#fff' }}>ลบเลย</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}
