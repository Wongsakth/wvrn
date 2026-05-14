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
  capacity: '', maps_url: '',
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

  const sb = createClient()

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await sb.from('venues').select('*').order('name')
      if (error) throw error
      setVenues(data || [])
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
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อสถานที่'); return }
    setSaving(true)
    try {
      const payload = {
        name:     form.name.trim(),
        address:  form.address.trim()  || null,
        province: form.province,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        maps_url: form.maps_url.trim() || null,
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
      const { error } = await sb.from('venues').delete().eq('id', id)
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
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--accent-muted)' }}>
                <MapPin size={16} style={{ color: 'var(--accent)' }} />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-primary">{venue.name}</div>
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
              <Field label="ลิงก์ Google Maps">
                <input value={form.maps_url} onChange={e => setForm(f => ({ ...f, maps_url: e.target.value }))}
                  placeholder="https://maps.google.com/..." className="input-theme text-[13px]" />
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
              Event ที่ผูกกับสถานที่นี้จะยังคงอยู่ แต่จะไม่แสดงชื่อสถานที่
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
