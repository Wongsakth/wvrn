'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, X, Edit2, Trash2, Check,
  GripVertical, Loader2, ToggleLeft, ToggleRight, Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Genre {
  id:         string
  name:       string
  name_th:    string | null
  color:      string
  emoji:      string
  sort_order: number
  is_active:  boolean
  created_at: string
}

const PRESET_COLORS = [
  '#A78BFA','#EF9F27','#FFD700','#FF3CAC','#85B7EB',
  '#5DCAA5','#C4A882','#F472B6','#94A3B8','#DC2626',
  '#7C3AED','#92400E','#0EA5E9','#10B981','#F97316',
  '#E8003A','#6366F1','#EC4899','#14B8A6','#84CC16',
]

const PRESET_EMOJIS = [
  '🎵','🎤','🎸','🥁','🎷','🎺','🎻','🪕',
  '🎹','🎧','🎛️','🤘','🎶','🎼','🔊','⚡',
]

const EMPTY: Omit<Genre,'id'|'created_at'> = {
  name: '', name_th: '', color: '#A78BFA',
  emoji: '🎵', sort_order: 0, is_active: true,
}

export default function GenresAdminPage() {
  const [genres,     setGenres]     = useState<Genre[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Genre | null>(null)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [form,       setForm]       = useState({ ...EMPTY })
  const [showColors, setShowColors] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)

  const sb = createClient()

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await sb
        .from('genres').select('*').order('sort_order').order('name')
      if (error) throw error
      setGenres(data || [])
    } catch (e: any) {
      toast.error('โหลดไม่ได้: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditTarget(null)
    setForm({ ...EMPTY, sort_order: genres.length + 1 })
    setShowForm(true)
    setShowColors(false)
    setShowEmojis(false)
  }

  function openEdit(g: Genre) {
    setEditTarget(g)
    setForm({
      name:       g.name,
      name_th:    g.name_th    ?? '',
      color:      g.color,
      emoji:      g.emoji,
      sort_order: g.sort_order,
      is_active:  g.is_active,
    })
    setShowForm(true)
    setShowColors(false)
    setShowEmojis(false)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อ Genre'); return }
    setSaving(true)
    try {
      const payload = {
        name:       form.name.trim(),
        name_th:    form.name_th?.trim() || null,
        color:      form.color,
        emoji:      form.emoji,
        sort_order: Number(form.sort_order) || 0,
        is_active:  form.is_active,
      }
      if (editTarget) {
        const { error } = await sb.from('genres').update(payload).eq('id', editTarget.id)
        if (error) throw error
        toast.success(`แก้ไข "${form.name}" สำเร็จ`)
      } else {
        const { error } = await sb.from('genres').insert(payload)
        if (error) throw error
        toast.success(`เพิ่ม "${form.name}" สำเร็จ`)
      }
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
      const { error } = await sb.from('genres').delete().eq('id', id)
      if (error) throw error
      toast.success('ลบ Genre แล้ว')
      setDeleteId(null)
      load()
    } catch (e: any) {
      toast.error('ลบไม่ได้: ' + e.message)
    }
  }

  async function toggleActive(g: Genre) {
    try {
      const { error } = await sb
        .from('genres').update({ is_active: !g.is_active }).eq('id', g.id)
      if (error) throw error
      setGenres(prev => prev.map(x => x.id === g.id ? { ...x, is_active: !x.is_active } : x))
    } catch (e: any) {
      toast.error('แก้ไขไม่ได้: ' + e.message)
    }
  }

  const filtered = genres.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.name_th ?? '').includes(search)
  )

  const activeCount   = genres.filter(g => g.is_active).length
  const inactiveCount = genres.filter(g => !g.is_active).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium text-primary">จัดการแนวเพลง (Genre)</h1>
          <p className="text-[12px] text-muted mt-0.5">
            {activeCount} แนวเพลงที่ใช้งาน
            {inactiveCount > 0 && ` · ${inactiveCount} ปิดใช้งาน`}
          </p>
        </div>
        <button onClick={openAdd} className="btn-accent flex items-center gap-2 py-2 px-4 text-[13px]">
          <Plus size={15} /> เพิ่มแนวเพลง
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <Search size={15} className="text-muted shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาแนวเพลง..."
          className="bg-transparent text-[14px] text-primary outline-none w-full placeholder:text-muted" />
        {search && <button onClick={() => setSearch('')}><X size={14} className="text-muted" /></button>}
      </div>

      {/* Preview tags */}
      {!search && (
        <div className="flex flex-wrap gap-2 mb-5">
          {genres.filter(g => g.is_active).map(g => (
            <span key={g.id}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{ background: g.color + '20', color: g.color, border: `1px solid ${g.color}40` }}>
              {g.emoji} {g.name}
            </span>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Tag size={32} className="mx-auto mb-3 text-muted" />
          <p className="text-[14px] font-medium text-primary">
            {search ? 'ไม่พบแนวเพลงที่ค้นหา' : 'ยังไม่มีแนวเพลง'}
          </p>
          {!search && (
            <button onClick={openAdd} className="btn-accent mt-4 text-[13px] py-2 px-4">
              เพิ่มแนวเพลงแรก
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>

          {/* Column headers */}
          <div className="grid px-4 py-2 text-[10px] font-medium text-muted uppercase tracking-wide"
            style={{
              gridTemplateColumns: '32px 1fr 1fr 80px 80px 80px',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)',
            }}>
            <span></span>
            <span>ชื่อ (EN)</span>
            <span>ชื่อ (TH)</span>
            <span>สี + Emoji</span>
            <span className="text-center">ลำดับ</span>
            <span className="text-center">สถานะ</span>
          </div>

          {filtered.map((g, i) => (
            <div key={g.id}
              className={cn(
                'grid items-center px-4 py-3 transition-colors',
                !g.is_active && 'opacity-50',
              )}
              style={{
                gridTemplateColumns: '32px 1fr 1fr 80px 80px 80px',
                background: 'var(--surface-1)',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              }}>

              {/* Drag handle (visual only) */}
              <GripVertical size={14} className="text-muted cursor-grab" />

              {/* Name EN */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[14px] font-medium text-primary">{g.name}</span>
              </div>

              {/* Name TH */}
              <span className="text-[12px] text-muted">{g.name_th ?? '—'}</span>

              {/* Color + Emoji tag preview */}
              <div>
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium w-fit"
                  style={{ background: g.color + '20', color: g.color }}>
                  {g.emoji} {g.name}
                </span>
              </div>

              {/* Sort order */}
              <span className="text-[12px] text-muted text-center">{g.sort_order}</span>

              {/* Active toggle + actions */}
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => toggleActive(g)} title={g.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                  className="icon-btn w-8 h-8">
                  {g.is_active
                    ? <ToggleRight size={18} style={{ color: 'var(--accent)' }} />
                    : <ToggleLeft  size={18} className="text-muted" />}
                </button>
                <button onClick={() => openEdit(g)} className="icon-btn w-8 h-8" title="แก้ไข">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => setDeleteId(g.id)} className="icon-btn w-8 h-8" title="ลบ"
                  style={{ color: deleteId === g.id ? '#E24B4A' : undefined }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', maxHeight: '92vh' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[15px] font-medium text-primary">
                {editTarget ? `แก้ไข "${editTarget.name}"` : 'เพิ่มแนวเพลงใหม่'}
              </h2>
              <button onClick={() => setShowForm(false)} className="icon-btn w-8 h-8"><X size={16} /></button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4"
              style={{ maxHeight: 'calc(92vh - 130px)' }}>

              {/* Preview */}
              <div className="flex items-center justify-center py-3">
                <span className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium"
                  style={{ background: form.color + '20', color: form.color, border: `1px solid ${form.color}50` }}>
                  {form.emoji} {form.name || 'ตัวอย่าง Genre'}
                </span>
              </div>

              {/* Name EN */}
              <Field label="ชื่อแนวเพลง (English) *">
                <input value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น Rock, Pop, Jazz"
                  className="input-theme text-[13px]" autoFocus />
              </Field>

              {/* Name TH */}
              <Field label="ชื่อภาษาไทย">
                <input value={form.name_th ?? ''}
                  onChange={e => setForm(f => ({ ...f, name_th: e.target.value }))}
                  placeholder="เช่น ร็อค, ป็อป, แจ๊ส"
                  className="input-theme text-[13px]" />
              </Field>

              {/* Emoji picker */}
              <Field label="Emoji">
                <button onClick={() => { setShowEmojis(v => !v); setShowColors(false) }}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-all"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <span className="text-2xl">{form.emoji}</span>
                  <span className="text-[13px] text-secondary flex-1">เลือก emoji</span>
                  <span className="text-[10px] text-muted">{showEmojis ? '▲' : '▼'}</span>
                </button>
                {showEmojis && (
                  <div className="mt-2 p-3 rounded-xl animate-slide-up grid grid-cols-8 gap-2"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    {PRESET_EMOJIS.map(em => (
                      <button key={em} onClick={() => { setForm(f => ({ ...f, emoji: em })); setShowEmojis(false) }}
                        className={cn(
                          'text-xl p-1.5 rounded-lg transition-all hover:scale-110',
                          form.emoji === em && 'ring-2 ring-[var(--accent)]'
                        )}
                        style={{ background: form.emoji === em ? 'var(--accent-muted)' : 'transparent' }}>
                        {em}
                      </button>
                    ))}
                    {/* Custom emoji input */}
                    <input
                      value={form.emoji}
                      onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                      placeholder="..."
                      className="col-span-2 text-center rounded-lg px-2 py-1 text-[13px] outline-none"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      maxLength={2}
                    />
                  </div>
                )}
              </Field>

              {/* Color picker */}
              <Field label="สีของ Tag">
                <button onClick={() => { setShowColors(v => !v); setShowEmojis(false) }}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-all"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <span className="w-6 h-6 rounded-full shrink-0 border-2 border-white/20"
                    style={{ background: form.color }} />
                  <span className="text-[13px] font-mono text-secondary flex-1">{form.color}</span>
                  <span className="text-[10px] text-muted">{showColors ? '▲' : '▼'}</span>
                </button>
                {showColors && (
                  <div className="mt-2 p-3 rounded-xl animate-slide-up"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    {/* Preset swatches */}
                    <div className="grid grid-cols-10 gap-1.5 mb-3">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => { setForm(f => ({ ...f, color: c })); setShowColors(false) }}
                          className="w-full aspect-square rounded-lg transition-all hover:scale-110"
                          style={{
                            background: c,
                            outline: form.color === c ? `2px solid white` : 'none',
                            outlineOffset: '1px',
                          }} />
                      ))}
                    </div>
                    {/* Custom hex */}
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md shrink-0" style={{ background: form.color }} />
                      <input
                        value={form.color}
                        onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                        placeholder="#RRGGBB"
                        className="flex-1 rounded-lg px-2.5 py-1.5 text-[12px] font-mono outline-none"
                        style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        maxLength={7}
                      />
                      <input type="color" value={form.color}
                        onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent" />
                    </div>
                  </div>
                )}
              </Field>

              {/* Sort order + Active */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="ลำดับการแสดง">
                  <input type="number" value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    min={0} className="input-theme text-[13px]" />
                </Field>
                <Field label="สถานะ">
                  <button
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 transition-all"
                    style={{
                      background: form.is_active ? 'rgba(29,158,117,.1)' : 'var(--surface-2)',
                      border: `1px solid ${form.is_active ? '#1D9E75' : 'var(--border)'}`,
                    }}>
                    {form.is_active
                      ? <ToggleRight size={18} style={{ color: '#1D9E75' }} />
                      : <ToggleLeft  size={18} className="text-muted" />}
                    <span className="text-[13px]" style={{ color: form.is_active ? '#1D9E75' : 'var(--text-muted)' }}>
                      {form.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </button>
                </Field>
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-2.5 text-[13px]">
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={saving}
                className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2">
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก...</>
                  : <><Check size={14} /> {editTarget ? 'บันทึกการแก้ไข' : 'เพิ่มแนวเพลง'}</>}
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
            <h3 className="text-[15px] font-medium text-primary text-center mb-2">ลบแนวเพลงนี้?</h3>
            <p className="text-[12px] text-muted text-center mb-5">
              ศิลปินและ Event ที่ใช้แนวเพลงนี้จะไม่ได้รับผลกระทบ
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1 py-2.5 text-[13px]">
                ยกเลิก
              </button>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}
