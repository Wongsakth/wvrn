// @ts-nocheck
'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  Upload, Loader2, CheckCircle2, AlertCircle,
  X, Plus, Trash2, ImageIcon, Sparkles, Send,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PROVINCES } from '@/lib/utils'

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

// ── Types ──────────────────────────────────────────────────
interface ParsedArtist {
  name: string
  matched: boolean
  matchedId: string | null
  willCreate: boolean
}

interface ParsedEvent {
  title:       string
  event_date:  string
  venue_name:  string
  province:    string
  is_free:     boolean
  ticket_price: string
  ticket_url:  string
  description: string
  artists:     ParsedArtist[]
  poster_url:  string
}

// ── Main Page ───────────────────────────────────────────────
export default function ImportPosterPage() {
  const { user } = useAuth()
  const sb = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step,        setStep]        = useState<'upload' | 'parsing' | 'preview' | 'submitting' | 'done'>('upload')
  const [imageFile,   setImageFile]   = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [parsed,      setParsed]      = useState<ParsedEvent | null>(null)
  const [newArtist,   setNewArtist]   = useState('')
  const [similarEvents, setSimilarEvents] = useState<any[]>([])

  // ── Upload image ────────────────────────────────────────
  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('กรุณาอัพโหลดไฟล์รูปภาพ'); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // ── OCR with Gemini Vision ──────────────────────────────
  async function parseWithGemini() {
    if (!imageFile) return
    setStep('parsing')

    try {
      // Resize image 50% before sending to Gemini
      const base64 = await new Promise<string>((res, rej) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width  = Math.round(img.width  * 0.5)
          canvas.height = Math.round(img.height * 0.5)
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
          res(canvas.toDataURL(imageFile.type, 0.8).split(',')[1])
        }
        img.onerror = rej
        img.src = imagePreview
      })

      const prompt = `อ่านข้อมูลจากโปสเตอร์คอนเสิร์ต/เทศกาลดนตรีนี้ แล้วตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น:

{
  "title": "ชื่องาน",
  "event_date": "YYYY-MM-DD",
  "venue_name": "ชื่อสถานที่",
  "province": "จังหวัด",
  "is_free": true/false,
  "ticket_price": "ราคาบัตร เช่น 500-1500 หรือ FREE",
  "ticket_url": "URL ซื้อบัตร ถ้ามี",
  "description": "รายละเอียดงานสั้นๆ",
  "artists": ["ชื่อศิลปิน1", "ชื่อศิลปิน2", ...]
}

ถ้าไม่รู้ค่าไหนให้ใส่ "" หรือ null
ศิลปินให้เอาชื่อจริงๆ ไม่รวม DJ prefix ที่ไม่ใช่ชื่อ
วันที่ให้แปลงเป็น YYYY-MM-DD เสมอ`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: imageFile.type, data: base64 } },
              ]
            }]
          })
        }
      )

      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('ไม่สามารถแกะข้อมูลจากโปสเตอร์ได้')

      const raw = JSON.parse(jsonMatch[0])

      // Match artists with DB
      const artistList = (raw.artists || []) as string[]
      const matchedArtists = await Promise.all(
        artistList.map(async (name: string) => {
          const { data: found } = await sb
            .from('artists')
            .select('id, name, name_en')
            .or(`name.ilike.%${name.trim()}%,name_en.ilike.%${name.trim()}%`)
            .limit(1)
            .single()

          return {
            name:      name.trim(),
            matched:   !!found,
            matchedId: found?.id ?? null,
            willCreate: !found,
          } as ParsedArtist
        })
      )


      // ── Duplicate check ──────────────────────────────────
      const similar: any[] = []
      const titleWords = (raw.title || '').toLowerCase().split(' ').filter((w: string) => w.length > 2)
      const artistNames = matchedArtists.filter(a => a.matched).map(a => a.name.toLowerCase())

      // Query events ใกล้เคียง — เช็คหลายมิติ
      let q = sb.from('events').select('id,title,start_date,venue:venues(name),event_artists(artist:artists(name,name_en))')
        .is('deleted_at', null)

      // ถ้ามีวันที่ → เช็ค ±30 วัน
      if (raw.event_date) {
        const d = new Date(raw.event_date)
        const from = new Date(d); from.setDate(d.getDate() - 30)
        const to   = new Date(d); to.setDate(d.getDate() + 30)
        q = q.gte('start_date', from.toISOString().slice(0,10))
             .lte('start_date', to.toISOString().slice(0,10))
      }

      const { data: candidates } = await q.limit(200)

      for (const ev of (candidates || [])) {
        let score = 0
        const evTitle = (ev.title || '').toLowerCase()
        const evArtists = (ev.event_artists || []).flatMap((ea: any) => [
          ea.artist?.name?.toLowerCase(), ea.artist?.name_en?.toLowerCase()
        ]).filter(Boolean)
        const evVenue = (ev.venue?.name || '').toLowerCase()

        // Title similarity — common words
        const matchedWords = titleWords.filter((w: string) => evTitle.includes(w))
        score += matchedWords.length * 20

        // Exact title
        if (evTitle === (raw.title || '').toLowerCase()) score += 60

        // Date match
        if (raw.event_date && ev.start_date === raw.event_date) score += 30

        // Artist overlap
        const artistOverlap = artistNames.filter((n: string) => evArtists.some((a: string) => a?.includes(n) || n.includes(a || '')))
        score += artistOverlap.length * 25

        // Venue match
        if (raw.venue_name && evVenue.includes((raw.venue_name || '').toLowerCase().slice(0, 5))) score += 20

        if (score >= 40) {
          similar.push({ ...ev, score })
        }
      }

      similar.sort((a, b) => b.score - a.score)
      setSimilarEvents(similar.slice(0, 5))
      // ── End duplicate check ───────────────────────────────

      setParsed({
        title:        raw.title || '',
        event_date:   raw.event_date || '',
        venue_name:   raw.venue_name || '',
        province:     raw.province || 'กรุงเทพมหานคร',
        is_free:      raw.is_free ?? false,
        ticket_price: raw.ticket_price || '',
        ticket_url:   raw.ticket_url || '',
        description:  raw.description || '',
        artists:      matchedArtists,
        poster_url:   '',
      })
      setStep('preview')

    } catch (e: any) {
      toast.error('เกิดข้อผิดพลาด: ' + e.message)
      setStep('upload')
    }
  }

  // ── Upload poster to Supabase Storage ──────────────────
  async function uploadPoster(): Promise<string> {
    if (!imageFile) return ''
    const ext  = imageFile.name.split('.').pop()
    const path = `posters/${Date.now()}.${ext}`
    const { error } = await sb.storage.from('events').upload(path, imageFile, { upsert: true })
    if (error) throw error
    const { data } = sb.storage.from('events').getPublicUrl(path)
    return data.publicUrl
  }

  // ── Submit ──────────────────────────────────────────────
  async function handleSubmit() {
    if (!parsed) return
    setStep('submitting')

    try {
      // 1. Upload poster
      const posterUrl = await uploadPoster()

      // 2. Create missing artists
      for (const artist of parsed.artists) {
        if (artist.willCreate) {
          const { data: newA } = await sb.from('artists')
            .insert({ name: artist.name, name_en: artist.name })
            .select('id').single()
          if (newA) artist.matchedId = newA.id
        }
      }

      // 3. Insert event_submission
      const { data: sub, error } = await sb.from('event_submissions').insert({
        title:       parsed.title,
        event_date:  parsed.event_date || null,
        venue_name:  parsed.venue_name || null,
        province:    parsed.province || null,
        artist_name: parsed.artists.map(a => a.name).join(', '),
        ticket_price: parsed.ticket_price || null,
        ticket_url:  parsed.ticket_url || null,
        description: parsed.description || null,
        poster_url:  posterUrl || null,
        status:      'pending',
        source:      'auto_scrape',
        type:        'event',
        submitted_by: user?.id ?? null,
      }).select().single()

      if (error) throw error

      toast.success('ส่งข้อมูลเข้า Pending แล้ว!')
      setStep('done')

    } catch (e: any) {
      toast.error('เกิดข้อผิดพลาด: ' + e.message)
      setStep('preview')
    }
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ImageIcon size={20} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 className="text-[20px] font-medium text-primary">Import จากโปสเตอร์</h1>
          <p className="text-[12px] text-muted mt-0.5">อัพโหลดโปสเตอร์งาน AI จะแกะข้อมูลให้อัตโนมัติ</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['upload', 'parsing', 'preview', 'submitting', 'done'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium"
              style={{
                background: step === s ? 'var(--accent)' : ['upload','parsing','preview','submitting','done'].indexOf(step) > i ? 'var(--accent-muted)' : 'var(--surface-2)',
                color: step === s ? 'white' : 'var(--text-muted)',
              }}>
              {['upload','parsing','preview','submitting','done'].indexOf(step) > i ? '✓' : i + 1}
            </div>
            {i < 4 && <div className="w-6 h-px" style={{ background: 'var(--border)' }} />}
          </div>
        ))}
      </div>

      {/* STEP: Upload */}
      {step === 'upload' && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 py-12"
            style={{ borderColor: imagePreview ? 'var(--accent)' : 'var(--border)', background: 'var(--surface-1)' }}>

            {imagePreview ? (
              <img src={imagePreview} alt="preview"
                className="max-h-64 rounded-xl object-contain" />
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--accent-muted)' }}>
                  <Upload size={24} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-medium text-primary">วางรูปโปสเตอร์ที่นี่</p>
                  <p className="text-[12px] text-muted mt-1">หรือคลิกเพื่อเลือกไฟล์ (JPG, PNG)</p>
                </div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          {imagePreview && (
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setImageFile(null); setImagePreview('') }}
                className="flex-1 py-2.5 rounded-xl text-[13px] btn-ghost border border-[var(--border)]">
                เลือกรูปใหม่
              </button>
              <button onClick={parseWithGemini}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2"
                style={{ background: 'var(--accent)', color: 'white' }}>
                <Sparkles size={15} /> แกะข้อมูล AI
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP: Parsing */}
      {step === 'parsing' && (
        <div className="rounded-2xl p-12 flex flex-col items-center gap-4"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="text-[14px] font-medium text-primary">AI กำลังอ่านโปสเตอร์...</p>
          <p className="text-[12px] text-muted">อาจใช้เวลา 5-15 วินาที</p>
        </div>
      )}

      {/* STEP: Preview & Edit */}
      {step === 'preview' && parsed && (
        <div className="flex flex-col gap-4">

          {/* Poster preview */}
          {imagePreview && (
            <div className="rounded-xl overflow-hidden h-48"
              style={{ border: '1px solid var(--border)' }}>
              <img src={imagePreview} alt="poster" className="w-full h-full object-contain" style={{ background: 'var(--surface-2)' }} />
            </div>
          )}


          {/* Duplicate Warning */}
          {similarEvents.length > 0 && (
            <div className="rounded-xl overflow-hidden"
              style={{ border: '1.5px solid #EF9F27', background: 'rgba(239,159,39,.04)' }}>
              <div className="px-4 py-2.5 flex items-center gap-2"
                style={{ background: 'rgba(239,159,39,.1)', borderBottom: '1px solid rgba(239,159,39,.2)' }}>
                <AlertCircle size={14} style={{ color: '#EF9F27' }} />
                <span className="text-[12px] font-medium" style={{ color: '#EF9F27' }}>
                  ⚠️ พบงานใกล้เคียง {similarEvents.length} รายการ — กรุณาตรวจสอบก่อน Submit
                </span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {similarEvents.map(ev => (
                  <div key={ev.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-primary truncate">{ev.title}</p>
                      <div className="flex gap-2 text-[11px] text-muted mt-0.5 flex-wrap">
                        {ev.start_date && <span>📅 {ev.start_date}</span>}
                        {ev.venue?.name && <span>📍 {ev.venue.name}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full font-medium shrink-0"
                      style={{ background: ev.score >= 80 ? 'rgba(226,75,74,.1)' : 'rgba(239,159,39,.1)', color: ev.score >= 80 ? '#E24B4A' : '#EF9F27' }}>
                      {ev.score >= 80 ? '🔴 ซ้ำมาก' : '🟡 คล้ายกัน'}
                    </span>
                    <a href={`/events/${ev.id}`} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] shrink-0" style={{ color: 'var(--accent)' }}>ดู →</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event info */}
          <div className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide">ข้อมูลงาน</h2>

            <Field label="ชื่องาน *">
              <input value={parsed.title} onChange={e => setParsed(p => p && ({ ...p, title: e.target.value }))}
                className="input-theme text-[13px]" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="วันที่">
                <input type="date" value={parsed.event_date} onChange={e => setParsed(p => p && ({ ...p, event_date: e.target.value }))}
                  className="input-theme text-[13px]" />
              </Field>
              <Field label="จังหวัด">
                <select value={parsed.province} onChange={e => setParsed(p => p && ({ ...p, province: e.target.value }))}
                  className="input-theme text-[13px]">
                  {PROVINCES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                </select>
              </Field>
            </div>
            <Field label="สถานที่">
              <input value={parsed.venue_name} onChange={e => setParsed(p => p && ({ ...p, venue_name: e.target.value }))}
                className="input-theme text-[13px]" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ราคาบัตร">
                <input value={parsed.ticket_price} onChange={e => setParsed(p => p && ({ ...p, ticket_price: e.target.value }))}
                  placeholder="เช่น 500-1500 หรือ FREE" className="input-theme text-[13px]" />
              </Field>
              <Field label="เข้าฟรี">
                <div className="flex items-center gap-2 h-10">
                  <input type="checkbox" checked={parsed.is_free} onChange={e => setParsed(p => p && ({ ...p, is_free: e.target.checked }))}
                    className="w-4 h-4" />
                  <span className="text-[13px] text-secondary">งานเข้าฟรี</span>
                </div>
              </Field>
            </div>
            <Field label="ลิงก์ซื้อบัตร">
              <input value={parsed.ticket_url} onChange={e => setParsed(p => p && ({ ...p, ticket_url: e.target.value }))}
                placeholder="https://..." className="input-theme text-[13px]" />
            </Field>
          </div>

          {/* Artists */}
          <div className="rounded-xl p-4"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <h2 className="text-[13px] font-medium text-muted uppercase tracking-wide mb-3">
              ศิลปิน ({parsed.artists.length})
            </h2>

            <div className="flex flex-col gap-2 mb-3">
              {parsed.artists.map((artist, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {artist.matched ? (
                    <CheckCircle2 size={14} style={{ color: '#1D9E75' }} />
                  ) : (
                    <AlertCircle size={14} style={{ color: '#EF9F27' }} />
                  )}
                  <span className="flex-1 text-[13px] text-primary">{artist.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: artist.matched ? 'rgba(29,158,117,.1)' : 'rgba(239,159,39,.1)',
                      color: artist.matched ? '#1D9E75' : '#EF9F27',
                    }}>
                    {artist.matched ? '✓ พบในระบบ' : '+ สร้างใหม่'}
                  </span>
                  <button onClick={() => setParsed(p => p && ({ ...p, artists: p.artists.filter((_, j) => j !== i) }))}
                    className="text-muted hover:text-red-400 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add artist manually */}
            <div className="flex gap-2">
              <input value={newArtist} onChange={e => setNewArtist(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === 'Enter' && newArtist.trim()) {
                    const { data: found } = await sb.from('artists')
                      .select('id').or(`name.ilike.%${newArtist.trim()}%,name_en.ilike.%${newArtist.trim()}%`)
                      .limit(1).single()
                    setParsed(p => p && ({
                      ...p,
                      artists: [...p.artists, { name: newArtist.trim(), matched: !!found, matchedId: found?.id ?? null, willCreate: !found }]
                    }))
                    setNewArtist('')
                  }
                }}
                placeholder="เพิ่มศิลปิน แล้วกด Enter"
                className="input-theme text-[13px] flex-1" />
              <button onClick={async () => {
                if (!newArtist.trim()) return
                const { data: found } = await sb.from('artists')
                  .select('id').or(`name.ilike.%${newArtist.trim()}%,name_en.ilike.%${newArtist.trim()}%`)
                  .limit(1).single()
                setParsed(p => p && ({
                  ...p,
                  artists: [...p.artists, { name: newArtist.trim(), matched: !!found, matchedId: found?.id ?? null, willCreate: !found }]
                }))
                setNewArtist('')
              }} className="btn-accent px-3 py-2 rounded-lg"><Plus size={14} /></button>
            </div>

            {/* Summary */}
            <div className="flex gap-3 mt-3 text-[11px] text-muted">
              <span>✅ พบในระบบ: {parsed.artists.filter(a => a.matched).length}</span>
              <span>⚠️ สร้างใหม่: {parsed.artists.filter(a => a.willCreate).length}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => { setStep('upload'); setParsed(null) }}
              className="flex-1 py-3 rounded-xl text-[13px] btn-ghost border border-[var(--border)]">
              ← กลับ
            </button>
            <button onClick={handleSubmit}
              disabled={!parsed.title}
              className="flex-1 py-3 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2"
              style={{ background: 'var(--accent)', color: 'white', opacity: !parsed.title ? 0.5 : 1 }}>
              <Send size={15} /> ส่งเข้า Pending
            </button>
          </div>
        </div>
      )}

      {/* STEP: Submitting */}
      {step === 'submitting' && (
        <div className="rounded-2xl p-12 flex flex-col items-center gap-4"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="text-[14px] font-medium text-primary">กำลังบันทึกข้อมูล...</p>
        </div>
      )}

      {/* STEP: Done */}
      {step === 'done' && (
        <div className="rounded-2xl p-12 flex flex-col items-center gap-4 text-center"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <CheckCircle2 size={48} style={{ color: '#1D9E75' }} />
          <p className="text-[18px] font-medium text-primary">ส่งข้อมูลสำเร็จ!</p>
          <p className="text-[13px] text-muted">งานถูกส่งเข้า Pending รอ Admin Approve</p>
          <div className="flex gap-3 mt-2">
            <a href="/admin/pending"
              className="px-5 py-2.5 rounded-xl text-[13px] font-medium"
              style={{ background: 'var(--accent)', color: 'white' }}>
              ดู Pending
            </a>
            <button onClick={() => { setStep('upload'); setImageFile(null); setImagePreview(''); setParsed(null) }}
              className="px-5 py-2.5 rounded-xl text-[13px] btn-ghost border border-[var(--border)]">
              Import อีกงาน
            </button>
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
