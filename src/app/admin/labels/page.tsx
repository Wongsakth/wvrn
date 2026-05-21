// @ts-nocheck
'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, X, Edit2, Trash2, Check, Loader2,
  Building2, Music, ChevronDown, ChevronUp, Globe,
  Instagram, Facebook, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

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

export default function LabelsAdminPage() {
  const [labels,     setLabels]     = useState<Label[]>([])
  const [artists,    setArtists]    = useState<Artist[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Label | null>(null)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [form,       setForm]       = useState({ ...EMPTY })
  const [expanded,   setExpanded]   = useState<string | null>(null) // label id ที่ขยาย
  const [artistSearch, setArtistSearch] = useState('')
  const [showColors, setShowColors] = useState(false)
  const sb = createClient()

  async function load() {
    setLoading(true)
    try {
      const [lRes, aRes] = await Promise.all([
        sb.from('labels').select('*').order('name'),
        sb.from('artists').select('id,name,name_en,genres,image_url,label_id').order('name'),
      ])
      const labelList = lRes.data || []
      const artistList = aRes.data || []
      // attach artists to each label
      setLabels(labelList.map(l => ({
        ...l,
        artists: artistList.filter(a => a.label_id === l.id),
      })))
      setArtists(artistList)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditTarget(null); setForm({ ...EMPTY }); setShowForm(true); setShowColors(false)
  }
  function openEdit(l: Label) {
    setEditTarget(l)
    setForm({
      name: l.name, name_en: l.name_en ?? '', description: l.description ?? '',
      logo_url: l.logo_url ?? '', website_url: l.website_url ?? '',
      facebook_url: l.facebook_url ?? '', instagram_url: l.instagram_url ?? '',
      color: l.color, is_active: l.is_active,
    })
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
        instagram_url: form.instagram_url || null, color: form.color,
        is_active: form.is_active,
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
      // ถอด label ออกจากศิลปินก่อน
      await sb.from('artists').update({ label_id: null }).eq('label_id', id)
      const { error } = await sb.from('labels').delete().eq('id', id)
      if (error) throw error
      toast.success('ลบค่ายแล้ว'); setDeleteId(null); load()
    } catch (e: any) { toast.error(e.message) }
  }

  // Assign artist to label
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
    try {
      await sb.from('labels').update({ is_active: !l.is_active }).eq('id', l.id)
      setLabels(prev => prev.map(x => x.id === l.id ? { ...x, is_active: !x.is_active } : x))
    } catch (e: any) { toast.error(e.message) }
  }

  const filtered = labels.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.name_en ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Artists ที่ยังไม่มีค่าย (สำหรับ assign)
  const unassignedArtists = useMemo(() =>
    artists.filter(a => !a.label_id && a.name.toLowerCase().includes(artistSearch.toLowerCase()))
  , [artists, artistSearch])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium text-primary">จัดการค่ายเพลง</h1>
          <p className="text-[12px] text-muted mt-0.5">
            {labels.length} ค่าย · {artists.filter(a => a.label_id).length} ศิลปินในค่าย
          </p>
        </div>
        <button onClick={openAdd} className="btn-accent flex items-center gap-2 py-2 px-4 text-[13px]">
          <Plus size={15} /> เพิ่มค่ายเพลง
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <Search size={15} className="text-muted shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาค่ายเพลง..."
          className="bg-transparent text-[14px] text-primary outline-none w-full placeholder:text-muted" />
        {search && <button onClick={() => setSearch('')}><X size={14} className="text-muted" /></button>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-muted" /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(label => (
            <div key={label.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderLeft: `4px solid ${label.color}` }}>

              {/* Label header */}
              <div className="flex items-center gap-3 p-4">
                {/* Color dot */}
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
                  </div>
                  {label.description && <p className="text-[11px] text-muted mt-0.5 truncate">{label.description}</p>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(label)} className="icon-btn w-8 h-8">
                    {label.is_active
                      ? <ToggleRight size={18} style={{ color: 'var(--accent)' }} />
                      : <ToggleLeft  size={18} className="text-muted" />}
                  </button>
                  <button onClick={() => openEdit(label)} className="icon-btn w-8 h-8"><Edit2 size={13} /></button>
                  <button onClick={() => setDeleteId(label.id)} className="icon-btn w-8 h-8"
                    style={{ color: deleteId === label.id ? '#E24B4A' : undefined }}><Trash2 size={13} /></button>
                  <button
                    onClick={() => setExpanded(expanded === label.id ? null : label.id)}
                    className="icon-btn w-8 h-8">
                    {expanded === label.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded: artist list + assign */}
              {expanded === label.id && (
                <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>

                  {/* Artists in this label */}
                  <div className="p-4">
                    <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-3">
                      ศิลปินในค่าย ({(label.artists ?? []).length})
                    </p>

                    {(label.artists ?? []).length === 0 ? (
                      <p className="text-[12px] text-muted py-2">ยังไม่มีศิลปินในค่ายนี้</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(label.artists ?? []).map(artist => (
                          <div key={artist.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                            {artist.image_url
                              ? <img src={artist.image_url} alt={artist.name} className="w-5 h-5 rounded-full object-cover" />
                              : <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium"
                                  style={{ background: label.color + '30', color: label.color }}>{artist.name.slice(0,2)}</div>
                            }
                            <span className="text-[12px] text-primary">{artist.name}</span>
                            <button
                              onClick={() => assignArtist(artist.id, null)}
                              className="text-muted hover:text-red-400 transition-colors ml-1">
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add artist to label */}
                    <div>
                      <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-2">
                        เพิ่มศิลปินเข้าค่าย
                      </p>
                      <input
                        value={artistSearch}
                        onChange={e => setArtistSearch(e.target.value)}
                        placeholder="ค้นหาศิลปินที่ยังไม่มีค่าย..."
                        className="input-theme text-[12px] mb-2"
                      />
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {unassignedArtists.slice(0, 20).map(artist => (
                          <button key={artist.id}
                            onClick={() => assignArtist(artist.id, label.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all"
                            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            <Plus size={9} /> {artist.name}
                          </button>
                        ))}
                        {unassignedArtists.length === 0 && (
                          <p className="text-[11px] text-muted py-1">ไม่พบศิลปินที่ยังไม่มีค่าย</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', maxHeight: '90vh' }}>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[15px] font-medium text-primary">
                {editTarget ? `แก้ไข "${editTarget.name}"` : 'เพิ่มค่ายเพลงใหม่'}
              </h2>
              <button onClick={() => setShowForm(false)} className="icon-btn w-8 h-8"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ maxHeight: 'calc(90vh - 130px)' }}>

              {/* Preview */}
              <div className="flex items-center justify-center py-2">
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl"
                  style={{ background: form.color + '15', border: `1px solid ${form.color}40` }}>
                  <Building2 size={20} style={{ color: form.color }} />
                  <span className="text-[15px] font-medium" style={{ color: form.color }}>
                    {form.name || 'ชื่อค่ายเพลง'}
                  </span>
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

              {/* Color picker */}
              <Field label="สีประจำค่าย">
                <button onClick={() => setShowColors(v => !v)}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <span className="w-5 h-5 rounded-full shrink-0" style={{ background: form.color }} />
                  <span className="text-[13px] font-mono text-secondary flex-1">{form.color}</span>
                  <span className="text-[10px] text-muted">{showColors ? '▲' : '▼'}</span>
                </button>
                {showColors && (
                  <div className="mt-2 p-3 rounded-xl animate-slide-up"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
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

              {/* Social + Website */}
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

              {/* Active */}
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
            <p className="text-[12px] text-muted text-center mb-5">
              ศิลปินในค่ายจะถูกถอดออกจากค่าย แต่ยังคงอยู่ในระบบ
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 text-[13px] rounded-lg font-medium"
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

