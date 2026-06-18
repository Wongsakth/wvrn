// @ts-nocheck
'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, X, Edit2, Trash2, Check, Loader2,
  Building2, ChevronDown, ChevronUp, Globe,
  Instagram, Facebook, ToggleLeft, ToggleRight, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

interface Label {
  id: string; name: string; name_en: string | null
  description: string | null; logo_url: string | null
  website_url: string | null; facebook_url: string | null
  instagram_url: string | null; color: string
  is_active: boolean; created_at: string
  artists?: Artist[]
}
interface Artist {
  id: string; name: string; name_en: string | null
  genres: string[]; image_url: string | null; label_id: string | null
}

const PRESET_COLORS = [
  '#E8003A','#FF6B00','#1877F2','#7F77DD','#1D9E75',
  '#FFD700','#FF3CAC','#EF9F27','#5DCAA5','#94A3B8',
  '#C4A882','#7C3AED','#A78BFA','#F472B6','#84CC16',
]
const EMPTY = {
  name:'', name_en:'', description:'', logo_url:'', website_url:'',
  facebook_url:'', instagram_url:'', color:'#7F77DD', is_active:true,
}
const PIE_COLORS = ['#D4537E','#7F77DD','#1D9E75','#F59E0B','#3B82F6','#10B981','#6B7280']

export default function LabelsAdminPage() {
  const [labels,      setLabels]      = useState<Label[]>([])
  const [artists,     setArtists]     = useState<Artist[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [search,      setSearch]      = useState('')
  const [filterStatus,setFilterStatus]= useState<''|'active'|'inactive'>('')
  const [sortBy,      setSortBy]      = useState<'name'|'count'>('count')
  const [showForm,    setShowForm]    = useState(false)
  const [editTarget,  setEditTarget]  = useState<Label|null>(null)
  const [deleteId,    setDeleteId]    = useState<string|null>(null)
  const [form,        setForm]        = useState({ ...EMPTY })
  const [expanded,    setExpanded]    = useState<string|null>(null)
  const [artistSearch,setArtistSearch]= useState('')
  const [showColors,  setShowColors]  = useState(false)
  const [checking,    setChecking]    = useState(false)
  const [checkResults,setCheckResults]= useState<Record<string, boolean>>({})
  const [showCheckModal,setShowCheckModal] = useState(false)

  const sb = createClient()

  // ─── Load ─────────────────────────────────────────────────
  async function load() {
    setLoading(true)
    try {
      const [lRes, aRes] = await Promise.all([
        sb.from('labels').select('*').order('name'),
        sb.from('artists').select('id,name,name_en,genres,image_url,label_id').is('deleted_at', null).order('name'),
      ])
      const labelList = lRes.data || []
      const artistList = aRes.data || []
      setLabels(labelList.map(l => ({ ...l, artists: artistList.filter(a => a.label_id === l.id) })))
      setArtists(artistList)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // ─── Dashboard stats ──────────────────────────────────────
  const stats = useMemo(() => {
    const active   = labels.filter(l => l.is_active).length
    const inactive = labels.filter(l => !l.is_active).length
    const withArtists = labels.filter(l => (l.artists?.length ?? 0) > 0).length
    const assignedArtists = artists.filter(a => a.label_id).length
    return { total: labels.length, active, inactive, withArtists, assignedArtists }
  }, [labels, artists])

  // Bar: Top 10 ค่ายที่มีศิลปินเยอะสุด
  const topLabelsData = useMemo(() =>
    [...labels]
      .sort((a, b) => (b.artists?.length ?? 0) - (a.artists?.length ?? 0))
      .slice(0, 10)
      .map(l => ({ name: l.name_en || l.name, count: l.artists?.length ?? 0, color: l.color }))
  , [labels])

  // Pie: active vs inactive
  const statusPieData = useMemo(() => [
    { name: 'Active', value: stats.active },
    { name: 'Inactive', value: stats.inactive },
  ].filter(d => d.value > 0), [stats])

  // ─── Filter + Sort ────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...labels]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(l => l.name.toLowerCase().includes(q) || (l.name_en || '').toLowerCase().includes(q))
    }
    if (filterStatus === 'active')   list = list.filter(l => l.is_active)
    if (filterStatus === 'inactive') list = list.filter(l => !l.is_active)
    if (sortBy === 'count') list.sort((a, b) => (b.artists?.length ?? 0) - (a.artists?.length ?? 0))
    else list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [labels, search, filterStatus, sortBy])

  const unassignedArtists = useMemo(() =>
    artists.filter(a => !a.label_id && a.name.toLowerCase().includes(artistSearch.toLowerCase()))
  , [artists, artistSearch])

  // ─── Actions ─────────────────────────────────────────────
  function openAdd() { setEditTarget(null); setForm({ ...EMPTY }); setShowForm(true); setShowColors(false) }
  function openEdit(l: Label) {
    setEditTarget(l)
    setForm({ name: l.name, name_en: l.name_en ?? '', description: l.description ?? '',
      logo_url: l.logo_url ?? '', website_url: l.website_url ?? '',
      facebook_url: l.facebook_url ?? '', instagram_url: l.instagram_url ?? '',
      color: l.color, is_active: l.is_active })
    setShowForm(true); setShowColors(false)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อค่าย'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(), name_en: form.name_en || null,
        description: form.description || null, logo_url: form.logo_url || null,
        website_url: form.website_url || null, facebook_url: form.facebook_url || null,
        instagram_url: form.instagram_url || null, color: form.color, is_active: form.is_active,
      }
      if (editTarget) {
        const { error } = await sb.from('labels').update(payload).eq('id', editTarget.id)
        if (error) throw error
        toast.success(`แก้ไข "${form.name}" สำเร็จ`)
      } else {
        const { error } = await sb.from('labels').insert(payload)
        if (error) throw error
        toast.success(`เพิ่ม "${form.name}" สำเร็จ`)
      }
      setShowForm(false); load()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      await sb.from('artists').update({ label_id: null }).eq('label_id', id)
      const { error } = await sb.from('labels').delete().eq('id', id)
      if (error) throw error
      toast.success('ลบค่ายแล้ว'); setDeleteId(null); load()
    } catch (e: any) { toast.error(e.message) }
  }

  async function assignArtist(artistId: string, labelId: string | null) {
    try {
      const { error } = await sb.from('artists').update({ label_id: labelId }).eq('id', artistId)
      if (error) throw error
      setArtists(prev => prev.map(a => a.id === artistId ? { ...a, label_id: labelId } : a))
      setLabels(prev => prev.map(l => ({
        ...l,
        artists: l.id === labelId
          ? [...(l.artists ?? []), artists.find(a => a.id === artistId)!].filter(Boolean)
          : (l.artists ?? []).filter(a => a.id !== artistId),
      })))
      toast.success(labelId ? 'เพิ่มศิลปินเข้าค่ายแล้ว' : 'ถอดศิลปินออกจากค่ายแล้ว')
    } catch (e: any) { toast.error(e.message) }
  }

  async function toggleActive(l: Label) {
    await sb.from('labels').update({ is_active: !l.is_active }).eq('id', l.id)
    setLabels(prev => prev.map(x => x.id === l.id ? { ...x, is_active: !x.is_active } : x))
  }

  async function checkAllLabels() {
    setChecking(true)
    const results: Record<string, boolean> = {}
    const BATCH = 10
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
    for (let i = 0; i < labels.length; i += BATCH) {
      const batch = labels.slice(i, i + BATCH)
      const names = batch.map(l => l.name_en || l.name).join(', ')
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `ค่ายเพลงไทยเหล่านี้ยังดำเนินการอยู่ไหม ตอบเป็น JSON เท่านั้น format {"ชื่อค่าย": true/false} true=ยังเปิดอยู่ false=ปิดแล้วหรือไม่มีข้อมูล\nค่ายเพลง: ${names}` }] }] }) })
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
        const match = text.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          batch.forEach(l => {
            const key = l.name_en || l.name
            const found = Object.entries(parsed).find(([k]) =>
              k.toLowerCase().includes(key.toLowerCase().slice(0,6)) ||
              key.toLowerCase().includes(k.toLowerCase().slice(0,6)))
            results[l.id] = found ? Boolean(found[1]) : false
          })
        } else { batch.forEach(l => { results[l.id] = false }) }
      } catch { batch.forEach(l => { results[l.id] = false }) }
      setCheckResults({ ...results })
    }
    setChecking(false); setShowCheckModal(true)
  }

  async function saveCheckResults() {
    try {
      await Promise.all(Object.entries(checkResults).map(([id, is_active]) =>
        sb.from('labels').update({ is_active }).eq('id', id)))
      setLabels(prev => prev.map(l => ({ ...l, is_active: checkResults[l.id] ?? l.is_active })))
      toast.success('อัพเดทสถานะทั้งหมดแล้ว'); setShowCheckModal(false); setCheckResults({})
    } catch (e: any) { toast.error(e.message) }
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium text-primary">จัดการค่ายเพลง</h1>
          <p className="text-[12px] text-muted mt-0.5">{labels.length} ค่าย · {stats.assignedArtists} ศิลปินในค่าย</p>
        </div>
        <div className="flex gap-2">
          <button onClick={checkAllLabels} disabled={checking || labels.length === 0}
            className="flex items-center gap-2 py-2 px-4 text-[13px] rounded-xl font-medium transition-all"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            {checking
              ? <><Loader2 size={14} className="animate-spin" /> {Object.keys(checkResults).length}/{labels.length}</>
              : <><Zap size={14} style={{ color: 'var(--accent)' }} /> Check สถานะ</>}
          </button>
          <button onClick={openAdd} className="btn-accent flex items-center gap-2 py-2 px-4 text-[13px]">
            <Plus size={15} /> เพิ่มค่ายเพลง
          </button>
        </div>
      </div>

      {/* ── Dashboard ── */}
      {!loading && (
        <div className="mb-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'ค่ายทั้งหมด',    value: stats.total,           color: 'var(--accent)' },
              { label: 'Active',          value: stats.active,          color: '#1D9E75'        },
              { label: 'Inactive',        value: stats.inactive,        color: '#E24B4A'        },
              { label: 'ศิลปินในค่าย',   value: stats.assignedArtists, color: '#3B82F6'        },
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
            {/* Bar: Top labels */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-medium text-muted mb-3">Top 10 ค่ายที่มีศิลปินเยอะสุด</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topLabelsData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip formatter={(v: number) => [`${v} ศิลปิน`]} />
                  <Bar dataKey="count" radius={[0,4,4,0]}>
                    {topLabelsData.map((entry, i) => <Cell key={i} fill={entry.color || 'var(--accent)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie: active/inactive */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-medium text-muted mb-3">สถานะค่ายเพลง</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={60} dataKey="value"
                    label={({ name, value, percent }) => `${name} ${value} (${(percent*100).toFixed(0)}%)`}
                    labelLine={false} fontSize={10}>
                    <Cell fill="#1D9E75" />
                    <Cell fill="#E24B4A" />
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} ค่าย`]} />
                </PieChart>
              </ResponsiveContainer>
              {/* ค่ายที่ไม่มีศิลปิน */}
              <p className="text-center text-[11px] text-muted mt-2">
                {stats.withArtists} ค่ายมีศิลปิน · {stats.total - stats.withArtists} ค่ายว่างเปล่า
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-0"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', minWidth: 160 }}>
          <Search size={13} className="text-muted shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาค่ายเพลง..."
            className="bg-transparent text-[13px] text-primary outline-none w-full placeholder:text-muted" />
          {search && <button onClick={() => setSearch('')}><X size={13} className="text-muted" /></button>}
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="input-theme text-[12px] py-2 px-2 rounded-xl shrink-0" style={{ maxWidth: 110 }}>
          <option value="">สถานะ</option>
          <option value="active">✅ Active</option>
          <option value="inactive">❌ Inactive</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="input-theme text-[12px] py-2 px-2 rounded-xl shrink-0" style={{ maxWidth: 120 }}>
          <option value="count">ศิลปินมากสุด</option>
          <option value="name">ชื่อ A→Z</option>
        </select>
      </div>

      <p className="text-[11px] text-muted mb-3">แสดง {filtered.length} จาก {labels.length} ค่าย</p>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-muted" /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(label => (
            <div key={label.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderLeft: `4px solid ${label.color}` }}>

              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: label.color + '20' }}>
                  <Building2 size={18} style={{ color: label.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-medium text-primary">{label.name}</span>
                    {label.name_en && <span className="text-[11px] text-muted">{label.name_en}</span>}
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: label.color + '20', color: label.color }}>
                      {(label.artists ?? []).length} ศิลปิน
                    </span>
                    {!label.is_active && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(226,75,74,.1)', color: '#E24B4A' }}>Inactive</span>
                    )}
                  </div>
                  {label.description && <p className="text-[11px] text-muted mt-0.5 truncate">{label.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(label)} className="icon-btn w-8 h-8">
                    {label.is_active
                      ? <ToggleRight size={18} style={{ color: 'var(--accent)' }} />
                      : <ToggleLeft size={18} className="text-muted" />}
                  </button>
                  <button onClick={() => openEdit(label)} className="icon-btn w-8 h-8"><Edit2 size={13} /></button>
                  <button onClick={() => setDeleteId(label.id)} className="icon-btn w-8 h-8"
                    style={{ color: deleteId === label.id ? '#E24B4A' : undefined }}><Trash2 size={13} /></button>
                  <button onClick={() => setExpanded(expanded === label.id ? null : label.id)} className="icon-btn w-8 h-8">
                    {expanded === label.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded */}
              {expanded === label.id && (
                <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  <div className="p-4">
                    <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-3">
                      ศิลปินในค่าย ({(label.artists ?? []).length})
                    </p>
                    {(label.artists ?? []).length === 0 ? (
                      <p className="text-[12px] text-muted py-2">ยังไม่มีศิลปินในค่ายนี้</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(label.artists ?? []).map(artist => (
                          <div key={artist.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                            {artist.image_url
                              ? <img src={artist.image_url} alt={artist.name} className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                              : <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium"
                                  style={{ background: label.color + '30', color: label.color }}>{artist.name.slice(0,2)}</div>}
                            <span className="text-[12px] text-primary">{artist.name}</span>
                            <button onClick={() => assignArtist(artist.id, null)} className="text-muted hover:text-red-400 ml-1">
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-2">เพิ่มศิลปินเข้าค่าย</p>
                      <input value={artistSearch} onChange={e => setArtistSearch(e.target.value)}
                        placeholder="ค้นหาศิลปินที่ยังไม่มีค่าย..." className="input-theme text-[12px] mb-2" />
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {unassignedArtists.slice(0, 20).map(artist => (
                          <button key={artist.id} onClick={() => assignArtist(artist.id, label.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all"
                            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            <Plus size={9} /> {artist.name}
                          </button>
                        ))}
                        {unassignedArtists.length === 0 && <p className="text-[11px] text-muted py-1">ไม่พบศิลปินที่ยังไม่มีค่าย</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[15px] font-medium text-primary">{editTarget ? `แก้ไข "${editTarget.name}"` : 'เพิ่มค่ายเพลงใหม่'}</h2>
              <button onClick={() => setShowForm(false)} className="icon-btn w-8 h-8"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ maxHeight: 'calc(90vh - 130px)' }}>
              <div className="flex items-center justify-center py-2">
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl"
                  style={{ background: form.color + '15', border: `1px solid ${form.color}40` }}>
                  <Building2 size={20} style={{ color: form.color }} />
                  <span className="text-[15px] font-medium" style={{ color: form.color }}>{form.name || 'ชื่อค่ายเพลง'}</span>
                </div>
              </div>
              <Field label="ชื่อค่าย (ไทย) *">
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
                  placeholder="เช่น GMM Grammy" className="input-theme text-[13px]" autoFocus />
              </Field>
              <Field label="ชื่อ (English)">
                <input value={form.name_en} onChange={e => setForm(f=>({...f,name_en:e.target.value}))}
                  placeholder="English name" className="input-theme text-[13px]" />
              </Field>
              <Field label="คำอธิบาย">
                <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                  placeholder="อธิบายสั้นๆ..." className="input-theme text-[13px]" />
              </Field>
              <Field label="สีประจำค่าย">
                <button onClick={() => setShowColors(v => !v)}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <span className="w-5 h-5 rounded-full shrink-0" style={{ background: form.color }} />
                  <span className="text-[13px] font-mono text-secondary flex-1">{form.color}</span>
                  <span className="text-[10px] text-muted">{showColors ? '▲' : '▼'}</span>
                </button>
                {showColors && (
                  <div className="mt-2 p-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="grid grid-cols-8 gap-1.5 mb-3">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => { setForm(f=>({...f,color:c})); setShowColors(false) }}
                          className="w-full aspect-square rounded-lg transition-all hover:scale-110"
                          style={{ background: c, outline: form.color===c ? '2px solid white' : 'none', outlineOffset:'1px' }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md shrink-0" style={{ background: form.color }} />
                      <input value={form.color} onChange={e => setForm(f=>({...f,color:e.target.value}))}
                        className="flex-1 rounded-lg px-2.5 py-1.5 text-[12px] font-mono outline-none"
                        style={{ background:'var(--surface-3)', border:'1px solid var(--border)', color:'var(--text-primary)' }} maxLength={7} />
                      <input type="color" value={form.color} onChange={e => setForm(f=>({...f,color:e.target.value}))}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0" />
                    </div>
                  </div>
                )}
              </Field>
              <Field label="Links">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-muted shrink-0" />
                    <input value={form.website_url} onChange={e => setForm(f=>({...f,website_url:e.target.value}))}
                      placeholder="https://website.com" className="input-theme text-[13px]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Facebook size={14} style={{ color:'#1877F2', flexShrink:0 }} />
                    <input value={form.facebook_url} onChange={e => setForm(f=>({...f,facebook_url:e.target.value}))}
                      placeholder="https://facebook.com/..." className="input-theme text-[13px]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Instagram size={14} style={{ color:'#E1306C', flexShrink:0 }} />
                    <input value={form.instagram_url} onChange={e => setForm(f=>({...f,instagram_url:e.target.value}))}
                      placeholder="https://instagram.com/..." className="input-theme text-[13px]" />
                  </div>
                </div>
              </Field>
              <Field label="สถานะ">
                <button onClick={() => setForm(f=>({...f,is_active:!f.is_active}))}
                  className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 transition-all"
                  style={{ background: form.is_active ? 'rgba(29,158,117,.08)' : 'var(--surface-2)', border: `1px solid ${form.is_active ? '#1D9E75' : 'var(--border)'}` }}>
                  {form.is_active ? <ToggleRight size={18} style={{color:'#1D9E75'}} /> : <ToggleLeft size={18} className="text-muted" />}
                  <span className="text-[13px]" style={{ color: form.is_active ? '#1D9E75' : 'var(--text-muted)' }}>
                    {form.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </button>
              </Field>
            </div>
            <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={14} /> {editTarget ? 'บันทึก' : 'เพิ่มค่าย'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check Results Modal */}
      {showCheckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', maxHeight: '80vh' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[15px] font-medium text-primary flex items-center gap-2">
                <Zap size={15} style={{ color: 'var(--accent)' }} /> ผลตรวจสอบสถานะค่ายเพลง
              </h2>
              <button onClick={() => setShowCheckModal(false)} className="icon-btn w-8 h-8"><X size={16} /></button>
            </div>
            <div className="px-5 py-2.5 flex gap-4 text-[12px]" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <span style={{ color: '#1D9E75' }}>✓ Active: {Object.values(checkResults).filter(v => v).length}</span>
              <span style={{ color: '#E24B4A' }}>✗ Inactive: {Object.values(checkResults).filter(v => !v).length}</span>
              <span className="text-muted ml-auto text-[11px]">กดสลับสถานะก่อน Save ได้</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 180px)' }}>
              {labels.map(l => {
                if (checkResults[l.id] === undefined) return null
                const active = checkResults[l.id]
                return (
                  <div key={l.id} className="flex items-center gap-3 px-5 py-2.5"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
                    <span className="flex-1 text-[13px] text-primary truncate">{l.name}</span>
                    {l.name_en && <span className="text-[11px] text-muted truncate max-w-[120px]">{l.name_en}</span>}
                    <button onClick={() => setCheckResults(r => ({ ...r, [l.id]: !r[l.id] }))}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0"
                      style={{ background: active ? 'rgba(29,158,117,.1)' : 'rgba(226,75,74,.1)', color: active ? '#1D9E75' : '#E24B4A' }}>
                      {active ? '✓ Active' : '✗ Inactive'}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowCheckModal(false)} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={saveCheckResults} className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2">
                <Check size={14} /> บันทึกสถานะทั้งหมด
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
            <h3 className="text-[15px] font-medium text-primary text-center mb-2">ลบค่ายนี้?</h3>
            <p className="text-[12px] text-muted text-center mb-5">ศิลปินในค่ายจะถูกถอดออกจากค่าย แต่ยังคงอยู่ในระบบ</p>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}
