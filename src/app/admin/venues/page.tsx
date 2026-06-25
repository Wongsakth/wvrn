// @ts-nocheck
'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, Edit2, Trash2, X, Check,
  MapPin, ExternalLink, Loader2, Upload, ImageIcon,
} from 'lucide-react'
import { PROVINCES } from '@/lib/utils'
import toast from 'react-hot-toast'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { Venue } from '@/types'

const EMPTY = {
  name: '', address: '', province: 'กรุงเทพมหานคร',
  capacity: '', maps_url: '', aliases: [] as string[], image_url: '',
  category_id: '' as string,
  website: '', phone: '', facebook_url: '',
}

export default function VenuesAdminPage() {
  const [venues,      setVenues]      = useState<Venue[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [search,      setSearch]      = useState('')
  const [showForm,    setShowForm]    = useState(false)
  const [editTarget,  setEditTarget]  = useState<Venue | null>(null)
  const [deleteId,    setDeleteId]    = useState<string | null>(null)
  const [form,        setForm]        = useState({ ...EMPTY })
  const [aliasInput,  setAliasInput]  = useState('')
  const [categories,  setCategories]  = useState<any[]>([])
  const [uploading,   setUploading]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
      name:        v.name,
      address:     v.address  ?? '',
      province:    v.province,
      capacity:    v.capacity?.toString() ?? '',
      maps_url:    v.maps_url ?? '',
      aliases:     (v as any).aliases ?? [],
      image_url:   (v as any).image_url ?? '',
      category_id: (v as any).category_id ?? '',
      website:     (v as any).website ?? '',
      phone:       (v as any).phone ?? '',
      facebook_url:(v as any).facebook_url ?? '',
    })
    setAliasInput('')
    setShowForm(true)
  }

  // ─── Upload รูปไป Supabase Storage ───────────────────────
  async function handleUploadImage(file: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('กรุณาเลือกไฟล์รูปภาพ'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('รูปต้องไม่เกิน 5MB'); return }

    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `venues/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: upErr } = await sb.storage
        .from('venue-images')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data } = sb.storage.from('venue-images').getPublicUrl(path)
      setForm(f => ({ ...f, image_url: data.publicUrl }))
      toast.success('อัปโหลดรูปสำเร็จ')
    } catch (e: any) {
      toast.error('อัปโหลดไม่ได้: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อสถานที่'); return }
    setSaving(true)
    try {
      const payload = {
        name:        form.name.trim(),
        address:     form.address.trim()  || null,
        province:    form.province,
        capacity:    form.capacity ? parseInt(form.capacity) : null,
        maps_url:    form.maps_url.trim() || null,
        aliases:     form.aliases.length > 0 ? form.aliases : null,
        image_url:   form.image_url.trim() || null,
        category_id: form.category_id || null,
        website:     (form as any).website?.trim() || null,
        phone:       (form as any).phone?.trim() || null,
        facebook_url:(form as any).facebook_url?.trim() || null,
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

      {/* Stats + Charts — ไม่เปลี่ยนแปลง */}
      {!loading && (() => {
        const todayStr = new Date().toISOString().slice(0, 10)
        const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
        const newToday = venues.filter(v => v.created_at?.slice(0, 10) === todayStr).length
        const newWeek  = venues.filter(v => v.created_at && new Date(v.created_at) >= weekAgo).length

        const provMap: Record<string, number> = {}
        venues.forEach(v => { if (v.province) provMap[v.province] = (provMap[v.province] || 0) + 1 })
        const pieDataProvince = Object.entries(provMap)
          .sort((a, b) => b[1] - a[1]).slice(0, 8)
          .map(([name, value]) => ({ name, value }))

        const catMap: Record<string, number> = {}
        venues.forEach(v => {
          const catName = (v as any).category?.name_th
          if (catName) catMap[catName] = (catMap[catName] || 0) + 1
        })
        const barData = Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value }))

        const COLORS = ['#D4537E','#7F77DD','#1D9E75','#F59E0B','#3B82F6','#EC4899','#8B5CF6','#10B981','#6B7280','#14B8A6']

        return (
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'ทั้งหมด',      value: venues.length, color: 'var(--accent)' },
                { label: 'เพิ่มวันนี้',  value: newToday,      color: '#1D9E75' },
                { label: '7 วันล่าสุด',  value: newWeek,       color: '#3B82F6' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  <p className="text-[22px] font-medium" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[11px] text-muted">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <p className="text-[12px] font-medium text-muted mb-3">จังหวัด</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieDataProvince} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                      {pieDataProvince.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} สถานที่`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <p className="text-[12px] font-medium text-muted mb-3">ประเภทสถานที่</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip formatter={(v: number) => [`${v} สถานที่`]} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาสถานที่หรือจังหวัด..."
          className="input-theme pl-9 text-[13px] w-full" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted text-[13px]">ไม่พบสถานที่</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(venue => (
            <div key={venue.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

              {/* รูป venue */}
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                style={{ background: 'var(--surface-2)' }}>
                {(venue as any).image_url ? (
                  <img src={(venue as any).image_url} alt={venue.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={e => { e.currentTarget.style.display = 'none' }} />
                ) : (
                  <MapPin size={16} className="text-muted" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-primary truncate">{venue.name}</p>
                <p className="text-[11px] text-muted truncate">
                  {venue.province}
                  {venue.capacity ? ` · ${venue.capacity.toLocaleString()} คน` : ''}
                  {(venue as any).category?.name_th ? ` · ${(venue as any).category.name_th}` : ''}
                </p>
              </div>

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
              <Field label="เว็บไซต์">
                <input value={(form as any).website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value } as any))}
                  placeholder="https://venue.com" className="input-theme text-[13px]" />
              </Field>
              <Field label="Facebook Page">
                <input value={(form as any).facebook_url || ''} onChange={e => setForm(f => ({ ...f, facebook_url: e.target.value } as any))}
                  placeholder="https://facebook.com/venuename" className="input-theme text-[13px]" />
              </Field>
              <Field label="เบอร์โทรศัพท์">
                <input value={(form as any).phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value } as any))}
                  placeholder="02-xxx-xxxx" className="input-theme text-[13px]" />
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

              {/* ── รูปสถานที่ ── */}
              <Field label="รูปสถานที่">
                {/* Preview */}
                {form.image_url && (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden mb-2"
                    style={{ border: '1px solid var(--border)' }}>
                    <img src={form.image_url} alt="preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <X size={12} style={{ color: 'white' }} />
                    </button>
                  </div>
                )}

                {/* Upload button */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleUploadImage(file)
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] mb-2 transition-all"
                  style={{ background: 'var(--surface-2)', border: '1px dashed var(--border-md)', color: 'var(--text-secondary)' }}>
                  {uploading
                    ? <><Loader2 size={14} className="animate-spin" /> กำลังอัปโหลด...</>
                    : <><Upload size={14} /> อัปโหลดรูปจากเครื่อง</>}
                </button>

                {/* หรือวาง URL */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <span className="text-[10px] text-muted">หรือ</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>
                <input value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="วาง URL รูปภาพ..." className="input-theme text-[13px]" />
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
