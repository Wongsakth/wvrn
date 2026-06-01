// @ts-nocheck
'use client'
import { useState, useEffect, useRef } from 'react'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, Edit2, Trash2, X, Check,
  Music, Instagram, Facebook, Upload, Loader2, ChevronDown,
  Globe, Building2, Star, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Artist, Genre } from '@/types'
import ImageUpload from '@/components/ImageUpload'



const EMPTY_FORM = {
  name:          '',
  name_en:       '',
  bio:           '',
  image_url:     '',
  genres:        [] as Genre[],
  facebook_url:  '',
  instagram_url: '',
  tiktok_url:    '',
  website_url:   '',
  label_url:     '',
  label_id:      '' as string | null,
  nationality:   'TH' as string,
}

export default function ArtistsAdminPage() {
  const [artists,    setArtists]    = useState<Artist[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Artist | null>(null)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [form,       setForm]       = useState({ ...EMPTY_FORM })
  const [imagePreview, setImagePreview] = useState<string>('')
  const [dupSuggestions, setDupSuggestions] = useState<any[]>([])
  const [genreList,  setGenreList]  = useState<{id:string;label_th:string;label_en:string;category:string}[]>([])
  const [labelList,  setLabelList]  = useState<{id:string;name:string;website_url?:string|null;facebook_url?:string|null}[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const sb = createClient()

  // ─── Duplicate check ─────────────────────────────────────
  const dupTimer = useRef<any>(null)
  function checkDuplicate(val: string) {
    clearTimeout(dupTimer.current)
    if (!val || val.length < 2) { setDupSuggestions([]); return }
    dupTimer.current = setTimeout(async () => {
      if (editTarget) return // ตอนแก้ไขไม่ต้องเช็ค
      const { data } = await sb.from('artists')
        .select('id,name,name_en,image_url')
        .or(`name.ilike.%${val}%,name_en.ilike.%${val}%`)
        .limit(4)
      setDupSuggestions(data || [])
    }, 500)
  }

  // ─── Load artists ────────────────────────────────────────
  async function load() {
    setLoading(true)
    try {
      const { data, error } = await sb
        .from('artists').select('*, nationality, last_event:event_artists(event:events(start_date))').is('deleted_at', null).order('is_featured', { ascending: false }).order('featured_order').order('name')
      if (error) throw error
      setArtists(data || [])
    } catch (e: any) {
      toast.error('โหลดข้อมูลไม่ได้: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    sb.from('genres').select('id,label_th,label_en,category').order('category').order('label_en')
      .then(({ data }) => setGenreList(data || []))
    sb.from('labels').select('id,name,website_url,facebook_url').is('deleted_at', null).order('name')
      .then(({ data }) => setLabelList(data || []))
  }, [])

  // ─── Open form ────────────────────────────────────────────
  function openAdd() {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM })
    setImagePreview('')
    setDupSuggestions([])
    setShowForm(true)
  }

  function openEdit(artist: Artist) {
    setEditTarget(artist)
    setForm({
      name:          artist.name,
      name_en:       artist.name_en       ?? '',
      bio:           artist.bio           ?? '',
      image_url:     artist.image_url     ?? '',
      genres:        artist.genres        ?? [],
      facebook_url:  artist.facebook_url  ?? '',
      instagram_url: artist.instagram_url ?? '',
      tiktok_url:    (artist as any).tiktok_url   ?? '',
      website_url:   (artist as any).website_url  ?? '',
      label_url:     (artist as any).label_url    ?? '',
      label_id:      (artist as any).label_id     ?? null,
      nationality:   (artist as any).nationality  ?? 'TH',
    })
    setImagePreview(artist.image_url ?? '')
    setShowForm(true)
  }

  // ─── Image upload (Supabase Storage) ─────────────────────
  async function handleImageUpload(file: File) {
    const ext  = file.name.split('.').pop()
    const path = `artists/${Date.now()}.${ext}`
    const { error } = await sb.storage
      .from('images').upload(path, file, { upsert: true })
    if (error) { toast.error('อัปโหลดรูปไม่ได้'); return }
    const { data } = sb.storage.from('images').getPublicUrl(path)
    setForm(f => ({ ...f, image_url: data.publicUrl }))
    setImagePreview(data.publicUrl)
    toast.success('อัปโหลดรูปสำเร็จ')
  }

  // ─── Save (insert / update) ───────────────────────────────
  async function handleSave() {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อศิลปิน'); return }
    setSaving(true)
    try {
      const payload: Record<string, any> = {
        name:          form.name.trim(),
        name_en:       form.name_en.trim()       || null,
        bio:           form.bio.trim()            || null,
        image_url:     form.image_url             || null,
        genres:        form.genres,
        facebook_url:  form.facebook_url.trim()   || null,
        instagram_url: form.instagram_url.trim()  || null,
        tiktok_url:    form.tiktok_url.trim()     || null,
        website_url:   form.website_url.trim()    || null,
        label_url:     form.label_url.trim()      || null,
        label_id:      form.label_id                || null,
        nationality:   form.nationality             || 'TH',
      }

      if (editTarget) {
        const { error } = await sb
          .from('artists').update(payload).eq('id', editTarget.id)
        if (error) throw error
        toast.success(`แก้ไข "${form.name}" สำเร็จ`)
      } else {
        const { error } = await sb.from('artists').insert(payload)
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

  // ─── Delete ───────────────────────────────────────────────
  async function handleDelete(id: string) {
    try {
      const { error } = await sb.from('artists').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      toast.success('ลบศิลปินแล้ว')
      setDeleteId(null)
      load()
    } catch (e: any) {
      toast.error('ลบไม่ได้: ' + e.message)
    }
  }

  // ─── Toggle featured ──────────────────────────────────────
  async function toggleFeatured(artist: any) {
    try {
      const newVal = !artist.is_featured
      await sb.from('artists').update({ is_featured: newVal }).eq('id', artist.id)
      setArtists(prev => prev.map(a => a.id === artist.id ? { ...a, is_featured: newVal } : a))
      toast.success(newVal ? `⭐ ${artist.name} เป็น Top Artist แล้ว` : `ยกเลิก Top Artist`)
    } catch (e: any) { toast.error(e.message) }
  }

  // ─── Toggle genre ─────────────────────────────────────────
  function toggleGenre(g: string) {
    setForm(f => ({
      ...f,
      genres: (f.genres as string[]).includes(g)
        ? f.genres.filter(x => x !== g)
        : [...f.genres, g],
    }))
  }

  const filtered = artists.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.name_en ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // ─── Avatar component ─────────────────────────────────────
  function Avatar({ artist, size = 40 }: { artist: Artist; size?: number }) {
    if (artist.image_url) {
      return (
        <img
          src={artist.image_url}
          alt={artist.name}
          className="rounded-full object-cover shrink-0"
          style={{ width: size, height: size }}
        />
      )
    }
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0 font-medium"
        style={{
          width: size, height: size,
          background: 'var(--accent-muted)',
          color: 'var(--accent)',
          fontSize: size * 0.35,
        }}
      >
        {artist.name.slice(0, 2)}
      </div>
    )
  }

  return (
    <div>

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-[20px] font-medium text-primary">จัดการศิลปิน</h1>
            <p className="text-[12px] text-muted mt-0.5">{artists.length} ศิลปินในระบบ</p>
          </div>
          <button onClick={openAdd} className="btn-accent flex items-center gap-2 py-2 px-4 text-[13px]">
            <Plus size={15} />
            เพิ่มศิลปิน
          </button>
        </div>

        {/* ── Search ── */}
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-5"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
        >
          <Search size={15} className="text-muted shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อศิลปิน..."
            className="bg-transparent text-[14px] text-primary outline-none w-full placeholder:text-muted"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={14} className="text-muted" />
            </button>
          )}
        </div>

        {/* ── Artist list ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted" />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-xl p-12 text-center"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
          >
            <Music size={32} className="mx-auto mb-3 text-muted" />
            <p className="text-[14px] font-medium text-primary">
              {search ? 'ไม่พบศิลปินที่ค้นหา' : 'ยังไม่มีศิลปิน'}
            </p>
            {!search && (
              <button onClick={openAdd} className="btn-accent mt-4 text-[13px] py-2 px-4">
                เพิ่มศิลปินแรก
              </button>
            )}
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            {filtered.map((artist, i) => (
              <div
                key={artist.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <Avatar artist={artist} size={44} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-medium text-primary">{artist.name}</span>
                    {artist.name_en && (
                      <span className="text-[11px] text-muted">{artist.name_en}</span>
                    )}
                    {(artist as any).nationality && (artist as any).nationality !== 'TH' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(55,138,221,.1)', color: '#1a6fb5' }}>
                        {(artist as any).nationality}
                      </span>
                    )}
                    {artist.is_featured && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                        style={{ background: 'rgba(239,159,39,.15)', color: '#BA7517' }}>
                        <Star size={9} /> Top Artist
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {(artist as any).label_id && (() => {
                      const lbl = labelList.find(l => l.id === (artist as any).label_id)
                      return lbl ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          🏷 {lbl.name}
                        </span>
                      ) : null
                    })()}
                    {(artist.genres ?? []).map(g => {
                      const gc = genreList.find(x => x.id === g)
                      return (
                        <span
                          key={g}
                          className="text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide"
                          style={{
                            background: gc ? gc.color + '20' : 'var(--surface-3)',
                            color: gc?.color ?? 'var(--text-muted)',
                          }}
                        >
                          {gc?.label ?? g}
                        </span>
                      )
                    })}
                  </div>
                  {(() => {
                    const dates = (artist.last_event || []).map((ea: any) => ea.event?.start_date).filter(Boolean).sort().reverse()
                    const last = dates[0]
                    return last ? (
                      <p className="text-[10px] text-muted mt-1 flex items-center gap-1">
                        <Calendar size={10} /> อัพเดทล่าสุด: {last}
                      </p>
                    ) : (
                      <p className="text-[10px] mt-1" style={{ color: '#E24B4A' }}>ยังไม่มีงานในระบบ</p>
                    )
                  })()}
                </div>

                {/* Social links */}
                <div className="hidden sm:flex items-center gap-1">
                  {artist.instagram_url && (
                    <a href={artist.instagram_url} target="_blank" rel="noopener noreferrer"
                      className="icon-btn w-7 h-7" title="Instagram">
                      <Instagram size={13} />
                    </a>
                  )}
                  {artist.facebook_url && (
                    <a href={artist.facebook_url} target="_blank" rel="noopener noreferrer"
                      className="icon-btn w-7 h-7" title="Facebook">
                      <Facebook size={13} />
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleFeatured(artist)}
                    className="icon-btn w-8 h-8"
                    title={artist.is_featured ? 'ยกเลิก Top Artist' : 'ตั้งเป็น Top Artist'}
                    style={{ color: artist.is_featured ? '#EF9F27' : undefined }}
                  >
                    <Star size={14} style={{ fill: artist.is_featured ? '#EF9F27' : 'none' }} />
                  </button>
                  <button
                    onClick={() => openEdit(artist)}
                    className="icon-btn w-8 h-8"
                    title="แก้ไข"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(artist.id)}
                    className="icon-btn w-8 h-8"
                    title="ลบ"
                    style={{ color: deleteId === artist.id ? '#E24B4A' : undefined }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* ════════════════════════════════════════
          FORM MODAL — Add / Edit
      ════════════════════════════════════════ */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', maxHeight: '92vh' }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <h2 className="text-[15px] font-medium text-primary">
                {editTarget ? `แก้ไข "${editTarget.name}"` : 'เพิ่มศิลปินใหม่'}
              </h2>
              <button onClick={() => setShowForm(false)} className="icon-btn w-8 h-8">
                <X size={16} />
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ maxHeight: 'calc(92vh - 130px)' }}>

              {/* Image upload */}
              <ImageUpload
                bucket="artists"
                value={form.image_url}
                onChange={url => { setForm(f => ({ ...f, image_url: url })); setImagePreview(url) }}
                label="รูปศิลปิน"
                aspect="1:1"
              />

              {/* Name (required) */}
              <FormField label="ชื่อศิลปิน (ภาษาไทย) *">
                <input
                  value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); checkDuplicate(e.target.value) }}
                  placeholder="เช่น บิลลี่ แบล็ก"
                  className="input-theme text-[13px]"
                  autoFocus
                />
                {!editTarget && dupSuggestions.length > 0 && (
                  <div className="mt-2 rounded-xl overflow-hidden"
                    style={{ border: '1px solid rgba(239,159,39,.4)', background: 'rgba(239,159,39,.05)' }}>
                    <p className="text-[11px] font-medium px-3 py-2 flex items-center gap-1.5"
                      style={{ color: '#EF9F27', borderBottom: '1px solid rgba(239,159,39,.2)' }}>
                      ⚠️ พบศิลปินที่คล้ายกันในระบบ — กดเลือกใช้อันที่มีอยู่แทนการสร้างใหม่
                    </p>
                    {dupSuggestions.map(s => (
                      <button key={s.id} type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, name: s.name, name_en: s.name_en ?? '' }))
                          setDupSuggestions([])
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)]"
                        style={{ borderTop: '1px solid rgba(239,159,39,.1)' }}>
                        {s.image_url
                          ? <img src={s.image_url} className="w-7 h-7 rounded-full object-cover shrink-0" alt={s.name} />
                          : <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-medium"
                              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                              {s.name.slice(0,2)}
                            </div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-primary">{s.name}</p>
                          {s.name_en && <p className="text-[10px] text-muted">{s.name_en}</p>}
                        </div>
                        <span className="text-[10px] shrink-0" style={{ color: '#EF9F27' }}>ใช้อันนี้ →</span>
                      </button>
                    ))}
                  </div>
                )}
              </FormField>

              {/* Name EN */}
              <FormField label="ชื่อศิลปิน (ภาษาอังกฤษ)">
                <input
                  value={form.name_en}
                  onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                  placeholder="เช่น Billy Black"
                  className="input-theme text-[13px]"
                />
              </FormField>

              {/* Genres */}
              <FormField label={`แนวเพลง${form.genres.length > 0 ? ` · เลือกแล้ว ${form.genres.length} แนว` : ''}`}>
                <div className="flex flex-col gap-3">
                  {(['pop','rock','hiphop','electronic','folk','thai','jazz','other'] as const).map(cat => {
                    const catGenres = genreList.filter(g => g.category === cat)
                    if (catGenres.length === 0) return null
                    const catLabel: Record<string,string> = {
                      pop: 'Pop & Mainstream', rock: 'Rock', hiphop: 'Hip-Hop & Urban',
                      electronic: 'Electronic', folk: 'Folk & Acoustic', thai: '🇹🇭 ไทย',
                      jazz: 'Jazz & Soul', other: 'อื่นๆ',
                    }
                    return (
                      <div key={cat}>
                        <p className="text-[10px] font-medium text-muted uppercase tracking-wide mb-1.5">
                          {catLabel[cat]}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {catGenres.map(g => {
                            const active = (form.genres as string[]).includes(g.id)
                            return (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => toggleGenre(g.id)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all border"
                                style={{
                                  background: active ? 'var(--accent-muted)' : 'var(--surface-2)',
                                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                                  fontWeight: active ? 600 : 400,
                                }}
                              >
                                {active && <Check size={9} />}
                                {g.label_th}
                                <span className="opacity-50 ml-0.5">{g.label_en}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </FormField>

              {/* Bio */}
              <FormField label="ประวัติย่อ">
                <textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="เขียนประวัติศิลปินสั้นๆ..."
                  className="input-theme text-[13px] resize-none"
                  rows={3}
                />
              </FormField>

              {/* Social */}
              <FormField label="Social Media & Links">
                <div className="flex flex-col gap-2">

                  {/* Instagram */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                      <Instagram size={13} className="text-white" />
                    </div>
                    <input
                      value={form.instagram_url}
                      onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                      placeholder="https://instagram.com/..."
                      className="input-theme text-[13px]"
                    />
                  </div>

                  {/* Facebook */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: '#1877F2' }}>
                      <Facebook size={13} className="text-white" />
                    </div>
                    <input
                      value={form.facebook_url}
                      onChange={e => setForm(f => ({ ...f, facebook_url: e.target.value }))}
                      placeholder="https://facebook.com/..."
                      className="input-theme text-[13px]"
                    />
                  </div>

                  {/* TikTok */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: '#010101' }}>
                      {/* TikTok icon SVG */}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.27 8.27 0 004.83 1.55V6.86a4.85 4.85 0 01-1.06-.17z"/>
                      </svg>
                    </div>
                    <input
                      value={form.tiktok_url}
                      onChange={e => setForm(f => ({ ...f, tiktok_url: e.target.value }))}
                      placeholder="https://tiktok.com/@..."
                      className="input-theme text-[13px]"
                    />
                  </div>

                  {/* Website */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--accent-muted)', border: '1px solid var(--border)' }}>
                      <Globe size={13} style={{ color: 'var(--accent)' }} />
                    </div>
                    <input
                      value={form.website_url}
                      onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
                      placeholder="https://website.com (เว็บไซต์ศิลปิน)"
                      className="input-theme text-[13px]"
                    />
                  </div>

                  {/* Label / ค่ายเพลง - dropdown */}
                  <FormField label="สัญชาติ / ต้นกำเนิด">
                <select value={form.nationality}
                  onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                  className="input-theme text-[13px]">
                  <option value="TH">🇹🇭 ไทย (TH)</option>
                  <option value="KR">🇰🇷 เกาหลี (KR)</option>
                  <option value="JP">🇯🇵 ญี่ปุ่น (JP)</option>
                  <option value="US">🇺🇸 อเมริกา (US)</option>
                  <option value="UK">🇬🇧 อังกฤษ (UK)</option>
                  <option value="INT">🌏 ต่างประเทศอื่นๆ (INT)</option>
                </select>
              </FormField>
              <FormField label="ค่ายเพลง">
                    <select
                      value={form.label_id ?? ''}
                      onChange={e => {
                        const selectedId = e.target.value || null
                        const selectedLabel = labelList.find(l => l.id === selectedId)
                        const autoUrl = selectedLabel?.website_url || selectedLabel?.facebook_url || ''
                        setForm(f => ({
                          ...f,
                          label_id:  selectedId,
                          label_url: autoUrl || f.label_url,
                        }))
                      }}
                      className="input-theme text-[13px]">
                      <option value="">— ไม่สังกัดค่าย —</option>
                      {labelList.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </FormField>

                  {/* Label / ค่ายเพลง URL */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                      <Building2 size={13} className="text-muted" />
                    </div>
                    <input
                      value={form.label_url}
                      onChange={e => setForm(f => ({ ...f, label_url: e.target.value }))}
                      placeholder="https://... (เว็บค่ายเพลง)"
                      className="input-theme text-[13px]"
                    />
                  </div>

                </div>
              </FormField>

            </div>

            {/* Modal footer */}
            <div
              className="flex gap-2 px-5 py-4"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setShowForm(false)}
                className="btn-ghost flex-1 py-2.5 text-[13px]"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2"
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก...</>
                  : <><Check size={14} /> {editTarget ? 'บันทึกการแก้ไข' : 'เพิ่มศิลปิน'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          DELETE CONFIRM DIALOG
      ════════════════════════════════════════ */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(226,75,74,.1)' }}
            >
              <Trash2 size={20} style={{ color: '#E24B4A' }} />
            </div>
            <h3 className="text-[15px] font-medium text-primary text-center mb-2">
              ลบศิลปินนี้?
            </h3>
            <p className="text-[12px] text-muted text-center mb-5">
              ข้อมูลจะหายไปถาวร และจะถูกถอดออกจาก Event ที่เกี่ยวข้อง
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="btn-ghost flex-1 py-2.5 text-[13px]"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 text-[13px] rounded-lg font-medium transition-all"
                style={{ background: '#E24B4A', color: '#fff' }}
              >
                ลบเลย
              </button>
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
      <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

