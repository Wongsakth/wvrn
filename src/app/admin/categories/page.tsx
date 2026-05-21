// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Search, X, Edit2, Trash2, Check, Loader2, ToggleLeft, ToggleRight, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Category {
  id: string; name: string; name_th: string | null
  icon: string; color: string; description: string | null
  sort_order: number; is_active: boolean; created_at: string
}

const PRESET_ICONS = [
  'ti-microphone-2','ti-confetti','ti-heart','ti-device-speaker',
  'ti-music','ti-building-estate','ti-building','ti-heart-handshake',
  'ti-brand-youtube','ti-dots','ti-guitar','ti-headphones',
  'ti-star','ti-ticket','ti-users','ti-map-pin',
]

const PRESET_COLORS = [
  '#7F77DD','#FFD700','#FF3CAC','#5DCAA5','#C4A882',
  '#E8003A','#EF9F27','#1D9E75','#85B7EB','#888780',
  '#A78BFA','#F472B6','#97C459','#FB923C','#38BDF8',
]

const EMPTY = { name:'', name_th:'', icon:'ti-microphone-2', color:'#7F77DD', description:'', sort_order:0, is_active:true }

export default function CategoriesAdminPage() {
  const [cats,       setCats]       = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [form,       setForm]       = useState({ ...EMPTY })
  const [showColors, setShowColors] = useState(false)
  const [showIcons,  setShowIcons]  = useState(false)
  const sb = createClient()

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await sb.from('event_categories').select('*').order('sort_order').order('name')
      if (error) throw error
      setCats(data || [])
    } catch (e: any) { toast.error('โหลดไม่ได้: ' + e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function openAdd() { setEditTarget(null); setForm({ ...EMPTY, sort_order: cats.length + 1 }); setShowForm(true) }
  function openEdit(c: Category) {
    setEditTarget(c)
    setForm({ name: c.name, name_th: c.name_th??'', icon: c.icon, color: c.color, description: c.description??'', sort_order: c.sort_order, is_active: c.is_active })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อ Category'); return }
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), name_th: form.name_th||null, icon: form.icon, color: form.color, description: form.description||null, sort_order: Number(form.sort_order)||0, is_active: form.is_active }
      if (editTarget) {
        const { error } = await sb.from('event_categories').update(payload).eq('id', editTarget.id)
        if (error) throw error
        toast.success(`แก้ไข "${form.name}" สำเร็จ`)
      } else {
        const { error } = await sb.from('event_categories').insert(payload)
        if (error) throw error
        toast.success(`เพิ่ม "${form.name}" สำเร็จ`)
      }
      setShowForm(false); load()
    } catch (e: any) { toast.error('บันทึกไม่ได้: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await sb.from('event_categories').delete().eq('id', id)
      if (error) throw error
      toast.success('ลบ Category แล้ว'); setDeleteId(null); load()
    } catch (e: any) { toast.error('ลบไม่ได้: ' + e.message) }
  }

  async function toggleActive(c: Category) {
    try {
      const { error } = await sb.from('event_categories').update({ is_active: !c.is_active }).eq('id', c.id)
      if (error) throw error
      setCats(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x))
    } catch (e: any) { toast.error(e.message) }
  }

  const filtered = cats.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.name_th ?? '').includes(search)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium text-primary">จัดการ Category</h1>
          <p className="text-[12px] text-muted mt-0.5">{cats.filter(c=>c.is_active).length} ประเภทที่ใช้งาน</p>
        </div>
        <button onClick={openAdd} className="btn-accent flex items-center gap-2 py-2 px-4 text-[13px]">
          <Plus size={15} /> เพิ่ม Category
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <Search size={15} className="text-muted shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหา Category..."
          className="bg-transparent text-[14px] text-primary outline-none w-full placeholder:text-muted" />
        {search && <button onClick={() => setSearch('')}><X size={14} className="text-muted" /></button>}
      </div>

      {/* Preview */}
      {!search && (
        <div className="flex flex-wrap gap-2 mb-5">
          {cats.filter(c => c.is_active).map(c => (
            <span key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{ background: c.color + '20', color: c.color, border: `1px solid ${c.color}40` }}>
              <i className={`ti ${c.icon}`} style={{ fontSize: 13 }} aria-hidden="true"></i>
              {c.name_th || c.name}
            </span>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-muted" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Tag size={32} className="mx-auto mb-3 text-muted" />
          <p className="text-[14px] font-medium text-primary">{search ? 'ไม่พบ Category' : 'ยังไม่มี Category'}</p>
          {!search && <button onClick={openAdd} className="btn-accent mt-4 text-[13px] py-2 px-4">เพิ่มเลย</button>}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {filtered.map((c, i) => (
            <div key={c.id}
              className={cn('flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors', !c.is_active && 'opacity-50')}
              style={{ background: 'var(--surface-1)', borderBottom: i < filtered.length-1 ? '1px solid var(--border)' : 'none' }}>
              {/* Icon preview */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: c.color + '20' }}>
                <i className={`ti ${c.icon}`} style={{ fontSize: 18, color: c.color }} aria-hidden="true"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-primary">{c.name}</span>
                  {c.name_th && <span className="text-[11px] text-muted">{c.name_th}</span>}
                </div>
                {c.description && <p className="text-[11px] text-muted mt-0.5 truncate">{c.description}</p>}
              </div>
              <span className="text-[11px] text-muted hidden sm:block">ลำดับ {c.sort_order}</span>
              <button onClick={() => toggleActive(c)} className="icon-btn w-8 h-8">
                {c.is_active ? <ToggleRight size={18} style={{ color: 'var(--accent)' }} /> : <ToggleLeft size={18} className="text-muted" />}
              </button>
              <button onClick={() => openEdit(c)} className="icon-btn w-8 h-8"><Edit2 size={13} /></button>
              <button onClick={() => setDeleteId(c.id)} className="icon-btn w-8 h-8"
                style={{ color: deleteId===c.id ? '#E24B4A' : undefined }}><Trash2 size={13} /></button>
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
              <h2 className="text-[15px] font-medium text-primary">{editTarget ? `แก้ไข "${editTarget.name}"` : 'เพิ่ม Category ใหม่'}</h2>
              <button onClick={() => setShowForm(false)} className="icon-btn w-8 h-8"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ maxHeight: 'calc(90vh - 130px)' }}>

              {/* Preview */}
              <div className="flex items-center justify-center py-3">
                <span className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium"
                  style={{ background: form.color + '20', color: form.color, border: `1px solid ${form.color}50` }}>
                  <i className={`ti ${form.icon}`} style={{ fontSize: 16 }} aria-hidden="true"></i>
                  {form.name_th || form.name || 'ตัวอย่าง'}
                </span>
              </div>

              <Field label="ชื่อ (English) *">
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="เช่น Concert, Festival" className="input-theme text-[13px]" autoFocus />
              </Field>
              <Field label="ชื่อภาษาไทย">
                <input value={form.name_th} onChange={e => setForm(f=>({...f,name_th:e.target.value}))} placeholder="เช่น คอนเสิร์ต, เทศกาล" className="input-theme text-[13px]" />
              </Field>
              <Field label="คำอธิบาย">
                <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="อธิบายสั้นๆ..." className="input-theme text-[13px]" />
              </Field>

              {/* Icon picker */}
              <Field label="ไอคอน">
                <button onClick={() => { setShowIcons(v=>!v); setShowColors(false) }}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <i className={`ti ${form.icon}`} style={{ fontSize: 18, color: form.color }} aria-hidden="true"></i>
                  <span className="text-[13px] text-secondary flex-1 font-mono">{form.icon}</span>
                  <span className="text-[10px] text-muted">{showIcons ? '▲' : '▼'}</span>
                </button>
                {showIcons && (
                  <div className="mt-2 p-3 rounded-xl grid grid-cols-8 gap-2 animate-slide-up"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    {PRESET_ICONS.map(ic => (
                      <button key={ic} onClick={() => { setForm(f=>({...f,icon:ic})); setShowIcons(false) }}
                        className={cn('w-full aspect-square rounded-lg flex items-center justify-center transition-all', form.icon===ic && 'ring-2 ring-[var(--accent)]')}
                        style={{ background: form.icon===ic ? 'var(--accent-muted)' : 'var(--surface-3)' }}
                        title={ic}>
                        <i className={`ti ${ic}`} style={{ fontSize: 16, color: form.icon===ic ? 'var(--accent)' : 'var(--text-muted)' }} aria-hidden="true"></i>
                      </button>
                    ))}
                  </div>
                )}
              </Field>

              {/* Color picker */}
              <Field label="สี">
                <button onClick={() => { setShowColors(v=>!v); setShowIcons(false) }}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <span className="w-6 h-6 rounded-full shrink-0" style={{ background: form.color }} />
                  <span className="text-[13px] font-mono text-secondary flex-1">{form.color}</span>
                  <span className="text-[10px] text-muted">{showColors ? '▲' : '▼'}</span>
                </button>
                {showColors && (
                  <div className="mt-2 p-3 rounded-xl animate-slide-up" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="grid grid-cols-8 gap-1.5 mb-3">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => { setForm(f=>({...f,color:c})); setShowColors(false) }}
                          className="w-full aspect-square rounded-lg transition-all hover:scale-110"
                          style={{ background: c, outline: form.color===c ? '2px solid white' : 'none', outlineOffset: '1px' }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md shrink-0" style={{ background: form.color }} />
                      <input value={form.color} onChange={e => setForm(f=>({...f,color:e.target.value}))}
                        placeholder="#RRGGBB" className="flex-1 rounded-lg px-2.5 py-1.5 text-[12px] font-mono outline-none"
                        style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} maxLength={7} />
                      <input type="color" value={form.color} onChange={e => setForm(f=>({...f,color:e.target.value}))} className="w-8 h-8 rounded-lg cursor-pointer border-0" />
                    </div>
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="ลำดับ">
                  <input type="number" value={form.sort_order} onChange={e => setForm(f=>({...f,sort_order:parseInt(e.target.value)||0}))} className="input-theme text-[13px]" />
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
            </div>

            <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก...</> : <><Check size={14} /> {editTarget ? 'บันทึก' : 'เพิ่ม'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(226,75,74,.1)' }}>
              <Trash2 size={20} style={{ color: '#E24B4A' }} />
            </div>
            <h3 className="text-[15px] font-medium text-primary text-center mb-2">ลบ Category นี้?</h3>
            <p className="text-[12px] text-muted text-center mb-5">Event ที่ใช้ Category นี้จะถูก set เป็น null</p>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

