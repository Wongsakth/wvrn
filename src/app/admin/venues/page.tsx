// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, Edit2, Trash2, X, Check,
  MapPin, ExternalLink, Loader2,
} from 'lucide-react'
import { PROVINCES } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Venue } from '@/types'

const EMPTY = {
  name: '', address: '', province: 'กรุงเทพมหานคร',
  capacity: '', maps_url: '', aliases: [] as string[], image_url: '',
  category_id: '' as string,
}

export default function VenuesAdminPage() {
  const [venues,     setVenues]     = useState<Venue[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Venue | null>(null)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [form,       setForm]       = useState({ ...EMPTY })
  const [aliasInput,  setAliasInput]  = useState('')
  const [categories,  setCategories]  = useState<any[]>([])

  const sb = createClient()

  async function load() {
    setLoading(true)
    try {
      const [vRes, catRes] = await Promise.all([
        sb.from('venues').select('*, category:venue_categories(id,name,name_th,color,icon)').is('deleted_at', null).order('name'),
        sb.from('venue_categories').select('*').eq('is_active', true).order('sort_order'),
      ])
      if (vRes.error) throw vRes.error
      setVenues(vRes.data || [])
      setCategories(catRes.data || [])
    } catch (e: any) {
      toast.error('โหลดไม่ได้: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditTarget(null)
    setForm({ ...EMPTY })
    setShowForm(true)
  }

  function openEdit(v: Venue) {
    setEditTarget(v)
    setForm({
      name:     v.name,
      address:  v.address  ?? '',
      province: v.province,
      capacity: v.capacity?.toString() ?? '',
      maps_url: v.maps_url ?? '',
      aliases:  (v as any).aliases ?? [],
      image_url: (v as any).image_url ?? '',
      category_id: (v as any).category_id ?? '',
    })
    setAliasInput('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อสถานที่'); return }
    setSaving(true)
    try {
      const payload = {
        name:      form.name.trim(),
        address:   form.address.trim()  || null,
        province:  form.province,
        capacity:  form.capacity ? parseInt(form.capacity) : null,
        maps_url:  form.maps_url.trim() || null,
        aliases:    form.aliases.length > 0 ? form.aliases : null,
        image_url:  form.image_url.trim() || null,
        category_id: form.category_id || null,
      }
      if (editTarget) {
        const { error } = await sb.from('venues').update(payload).eq('id', editTarget.id)
        if (error) throw error
        toast.success(`แก้ไข "${form.name}" สำเร็จ`)
      } else {
        const { error } = await sb.from('venues').insert(payload)
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
      const { error } = await sb.from('venues')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      toast.success('ลบสถานที่แล้ว')
      setDeleteId(null)
      load()
    } catch (e: any) {
      toast.error('ลบไม่ได้: ' + e.message)
    }
  }

  const filtered = venues.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.province.includes(search)
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium text-primary">จัดการสถานที่</h1>
          <p className="text-[12px] text-muted mt-0.5">{venues.length} สถานที่ในระบบ</p>
        </div>
        <button onClick={openAdd} className="btn-accent flex items-center gap-2 py-2 px-4 text-[13px]">
          <Plus size={15} /> เพิ่มสถานที่
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <Search size={15} className="text-muted shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อสถานที่, จังหวัด..."
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
          <MapPin size={32} className="mx-auto mb-3 text-muted" />
          <p className="text-[14px] font-medium text-primary">
            {search ? 'ไม่พบสถานที่ที่ค้นหา' : 'ยังไม่มีสถานที่'}
          </p>
          {!search && (
            <button onClick={openAdd} className="btn-accent mt-4 text-[13px] py-2 px-4">
              เพิ่มสถานที่แรก
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {filtered.map((venue, i) => (
            <div key={venue.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
              style={{
                background: 'var(--surface-1)',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                style={{ background: 'var(--accent-muted)', border: '1px solid var(--border)' }}>
                {(venue as any).image_url ? (
                  <img src={(venue as any).image_url} alt={venue.name}
                    className="w-full h-full object-cover" />
                ) : (
                  <MapPin size={16} style={{ color: 'var(--accent)' }} />
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-[14px] font-medium text-primary">{venue.name}</div>
                  {(venue as any).category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: ((venue as any).category.color || '#7F77DD') + '20', color: (venue as any).category.color || '#7F77DD' }}>
                      {(venue as any).category.name_th}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] text-muted">{venue.province}</span>
                  {venue.address && (
                    <span className="text-[11px] text-muted truncate max-w-[200px]">· {venue.address}</span>
                  )}
                  {venue.capacity && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                      ความจุ {venue.capacity.toLocaleString()} คน
                    </span>
                  )}
                </div>
              </div>
              {/* Links + actions */}
              <div className="flex items-center gap-1 shrink-0">
                {venue.maps_url && (
                  <a href={venue.maps_url} target="_blank" rel="noopener noreferrer"
                    className="icon-btn w-8 h-8" title="Google Maps">
                    <ExternalLink size={13} />
                  </a>
                )}
                <button onClick={() => openEdit(venue)} className="icon-btn w-8 h-8" title="แก้ไข">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setDeleteId(venue.id)} className="icon-btn w-8 h-8" title="ลบ"
                  style={{ color: deleteId === venue.id ? '#E24B4A' : undefined }}>
                  <Trash2 size={14} />
                </button>
              </div>
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

            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[15px] font-medium text-primary">
                {editTarget ? `แก้ไข "${editTarget.name}"` : 'เพิ่มสถานที่ใหม่'}
              </h2>
              <button onClick={() => setShowForm(false)} className="icon-btn w-8 h-8"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ maxHeight: 'calc(90vh - 130px)' }}>
              <Field label="ชื่อสถานที่ *">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น Thunder Dome" className="input-theme text-[13px]" autoFocus />
              </Field>
              <Field label="ที่อยู่">
                <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="เลขที่ ถนน แขวง เขต..." className="input-theme text-[13px] resize-none" rows={2} />
              </Field>
              <Field label="จังหวัด">
                <select value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
                  className="input-theme text-[13px]">
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="ความจุ (คน)">
                <input value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  type="number" placeholder="เช่น 5000" className="input-theme text-[13px]" />
              </Field>
              <Field label="ประเภทสถานที่">
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="input-theme text-[13px]">
                  <option value="">-- เลือกประเภท --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name_th} ({c.name})</option>
                  ))}
                </select>
              </Field>
              <Field label="ลิงก์ Google Maps">
                <input value={form.maps_url} onChange={e => setForm(f => ({ ...f, maps_url: e.target.value }))}
                  placeholder="https://maps.google.com/..." className="input-theme text-[13px]" />
              </Field>

              <Field label="ชื่อเรียกอื่น (Aliases)">
                <div className="flex gap-2 mb-2">
                  <input
                    value={aliasInput}
                    onChange={e => setAliasInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && aliasInput.trim()) {
                        e.preventDefault()
                        if (!form.aliases.includes(aliasInput.trim())) {
                          setForm(f => ({ ...f, aliases: [...f.aliases, aliasInput.trim()] }))
                        }
                        setAliasInput('')
                      }
                    }}
                    placeholder="พิมพ์ชื่ออื่น แล้วกด Enter..."
                    className="input-theme text-[13px] flex-1" />
                  <button
                    onClick={() => {
                      if (aliasInput.trim() && !form.aliases.includes(aliasInput.trim())) {
                        setForm(f => ({ ...f, aliases: [...f.aliases, aliasInput.trim()] }))
                        setAliasInput('')
                      }
                    }}
                    className="btn-accent px-3 py-2 text-[12px]">
                    เพิ่ม
                  </button>
                </div>
                {form.aliases.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.aliases.map(a => (
                      <span key={a} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px]"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                        {a}
                        <button onClick={() => setForm(f => ({ ...f, aliases: f.aliases.filter(x => x !== a) }))}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted mt-1.5">ใช้สำหรับ search — เช่น ชื่อเก่า ชื่อย่อ ชื่อภาษาอื่น</p>
              </Field>

              <Field label="รูปสถานที่ (Image URL)">
                {form.image_url && (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden mb-2"
                    style={{ border: '1px solid var(--border)' }}>
                    <img src={form.image_url} alt="preview"
                      className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <X size={12} style={{ color: 'white' }} />
                    </button>
                  </div>
                )}
                <input value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://..." className="input-theme text-[13px]" />
                <p className="text-[10px] text-muted mt-1.5">วาง URL รูปภาพ จะแสดง preview ด้านบน</p>
              </Field>

            </div>

            <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2">
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก...</>
                  : <><Check size={14} /> {editTarget ? 'บันทึกการแก้ไข' : 'เพิ่มสถานที่'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(226,75,74,.1)' }}>
              <Trash2 size={20} style={{ color: '#E24B4A' }} />
            </div>
            <h3 className="text-[15px] font-medium text-primary text-center mb-2">ลบสถานที่นี้?</h3>
            <p className="text-[12px] text-muted text-center mb-5">
              สถานที่จะถูกซ่อนจากระบบ แต่ข้อมูลยังคงอยู่ใน database
            </p>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

