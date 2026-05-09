'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Upload, Download, CheckCircle2, XCircle, Loader2, AlertCircle, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

interface ParsedArtist {
  name: string
  name_en: string
  genres: string[]
  facebook_url: string
  instagram_url: string
  tiktok_url: string
  website_url: string
  valid: boolean
  error?: string
}

interface ImportResult {
  success: number
  skipped: number
  failed:  number
  details: { name: string; status: 'success' | 'skipped' | 'failed'; msg?: string }[]
}

const CSV_TEMPLATE = `name,name_en,genres,facebook_url,instagram_url,tiktok_url,website_url
บิลลี่ แบล็ก,Billy Black,"pop,indie",https://facebook.com/billyblack,https://instagram.com/billyblack,,
PAUSE,PAUSE,pop,https://facebook.com/pause,,, 
สิงโต นำโชค,Singto Numchok,"pop,indie",,,, `

export default function ImportArtistsPage() {
  const [file,      setFile]      = useState<File | null>(null)
  const [parsed,    setParsed]    = useState<ParsedArtist[]>([])
  const [importing, setImporting] = useState(false)
  const [result,    setResult]    = useState<ImportResult | null>(null)
  const [step,      setStep]      = useState<'upload'|'preview'|'done'>('upload')
  const fileRef = useRef<HTMLInputElement>(null)
  const sb = createClient()

  function parseCSV(text: string): ParsedArtist[] {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    // skip header
    return lines.slice(1).map(line => {
      // Handle quoted fields
      const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) ?? []
      const clean = (s?: string) => (s ?? '').replace(/^"|"$/g, '').trim()

      const name       = clean(cols[0])
      const name_en    = clean(cols[1])
      const genreRaw   = clean(cols[2])
      const facebook   = clean(cols[3])
      const instagram  = clean(cols[4])
      const tiktok     = clean(cols[5])
      const website    = clean(cols[6])

      const genres = genreRaw
        ? genreRaw.split(',').map(g => g.trim().toLowerCase()).filter(Boolean)
        : []

      const valid = name.length > 0
      return {
        name, name_en, genres,
        facebook_url:  facebook,
        instagram_url: instagram,
        tiktok_url:    tiktok,
        website_url:   website,
        valid,
        error: !valid ? 'ชื่อศิลปินว่าง' : undefined,
      }
    }).filter(a => a.name)
  }

  function handleFile(f: File) {
    setFile(f)
    setResult(null)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const artists = parseCSV(text)
      setParsed(artists)
      setStep('preview')
    }
    reader.readAsText(f, 'UTF-8')
  }

  async function handleImport() {
    const valid = parsed.filter(a => a.valid)
    if (!valid.length) { toast.error('ไม่มีข้อมูลที่ valid'); return }

    setImporting(true)
    const res: ImportResult = { success: 0, skipped: 0, failed: 0, details: [] }

    for (const a of valid) {
      try {
        const { error } = await sb.from('artists').insert({
          name:          a.name,
          name_en:       a.name_en  || null,
          genres:        a.genres,
          facebook_url:  a.facebook_url  || null,
          instagram_url: a.instagram_url || null,
          tiktok_url:    a.tiktok_url    || null,
          website_url:   a.website_url   || null,
        })

        if (error) {
          // Duplicate name = skip
          if (error.code === '23505' || error.message.includes('duplicate')) {
            res.skipped++
            res.details.push({ name: a.name, status: 'skipped', msg: 'มีอยู่แล้ว' })
          } else {
            res.failed++
            res.details.push({ name: a.name, status: 'failed', msg: error.message })
          }
        } else {
          res.success++
          res.details.push({ name: a.name, status: 'success' })
        }
      } catch (e: any) {
        res.failed++
        res.details.push({ name: a.name, status: 'failed', msg: e.message })
      }
    }

    setResult(res)
    setStep('done')
    setImporting(false)
    toast.success(`Import สำเร็จ ${res.success} คน`)
  }

  function downloadTemplate() {
    const blob = new Blob(['\uFEFF' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'wvrn_artists_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function reset() {
    setFile(null); setParsed([]); setResult(null); setStep('upload')
    if (fileRef.current) fileRef.current.value = ''
  }

  const validCount   = parsed.filter(a => a.valid).length
  const invalidCount = parsed.filter(a => !a.valid).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium text-primary">Import ศิลปิน (CSV)</h1>
          <p className="text-[12px] text-muted mt-0.5">อัปโหลดไฟล์ CSV เพื่อเพิ่มศิลปินหลายคนพร้อมกัน</p>
        </div>
        <button onClick={downloadTemplate}
          className="btn-ghost flex items-center gap-2 text-[13px] py-2 px-3">
          <Download size={14} /> ดาวน์โหลด Template
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { id: 'upload',  label: '1. เลือกไฟล์' },
          { id: 'preview', label: '2. ตรวจสอบ'    },
          { id: 'done',    label: '3. เสร็จสิ้น'  },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium transition-all"
                style={{
                  background: step === s.id ? 'var(--accent)' :
                    (i < ['upload','preview','done'].indexOf(step)) ? 'rgba(29,158,117,.2)' : 'var(--surface-3)',
                  color: step === s.id ? 'var(--surface-0)' :
                    (i < ['upload','preview','done'].indexOf(step)) ? '#1D9E75' : 'var(--text-muted)',
                }}>
                {i+1}
              </div>
              <span className="text-[12px]" style={{ color: step === s.id ? 'var(--accent)' : 'var(--text-muted)' }}>
                {s.label}
              </span>
            </div>
            {i < 2 && <div className="w-8 h-px" style={{ background: 'var(--border)' }} />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div className="flex flex-col gap-4">
          {/* Drop zone */}
          <label
            className="flex flex-col items-center gap-3 rounded-2xl p-10 cursor-pointer transition-all"
            style={{ border: '2px dashed var(--border)', background: 'var(--surface-1)' }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--accent-muted)' }}>
              <Upload size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium text-primary">คลิกหรือลากไฟล์มาวางที่นี่</p>
              <p className="text-[12px] text-muted mt-1">รองรับ .csv เท่านั้น · UTF-8 encoding</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </label>

          {/* Format guide */}
          <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-[12px] font-medium text-primary">รูปแบบ CSV ที่รองรับ</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['name *','name_en','genres','facebook_url','instagram_url','tiktok_url','website_url'].map(h => (
                      <th key={h} className="text-left pb-2 pr-4 font-medium text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pt-2 pr-4 text-primary">บิลลี่ แบล็ก</td>
                    <td className="pt-2 pr-4 text-secondary">Billy Black</td>
                    <td className="pt-2 pr-4 text-secondary">pop,indie</td>
                    <td className="pt-2 pr-4 text-secondary">https://...</td>
                    <td className="pt-2 pr-4 text-secondary">https://...</td>
                    <td className="pt-2 pr-4 text-secondary">https://...</td>
                    <td className="pt-2 pr-4 text-secondary">https://...</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted mt-2">* = จำเป็น · genres คั่นด้วย , เช่น "pop,indie,rock"</p>
          </div>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 'preview' && (
        <div className="flex flex-col gap-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div className="text-[24px] font-medium text-primary">{parsed.length}</div>
              <div className="text-[11px] text-muted">ทั้งหมด</div>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(29,158,117,.08)', border: '1px solid rgba(29,158,117,.2)' }}>
              <div className="text-[24px] font-medium" style={{ color: '#1D9E75' }}>{validCount}</div>
              <div className="text-[11px]" style={{ color: '#1D9E75' }}>พร้อม import</div>
            </div>
            <div className="rounded-xl p-4 text-center" style={{
              background: invalidCount > 0 ? 'rgba(226,75,74,.08)' : 'var(--surface-1)',
              border: `1px solid ${invalidCount > 0 ? 'rgba(226,75,74,.2)' : 'var(--border)'}`,
            }}>
              <div className="text-[24px] font-medium" style={{ color: invalidCount > 0 ? '#E24B4A' : 'var(--text-muted)' }}>
                {invalidCount}
              </div>
              <div className="text-[11px]" style={{ color: invalidCount > 0 ? '#E24B4A' : 'var(--text-muted)' }}>มีปัญหา</div>
            </div>
          </div>

          {/* Preview table */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-2 text-[10px] font-medium text-muted uppercase tracking-wide grid"
              style={{ gridTemplateColumns: '24px 1fr 1fr 120px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <span></span><span>ชื่อ</span><span>ชื่ออังกฤษ</span><span>แนวเพลง</span><span></span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {parsed.map((a, i) => (
                <div key={i}
                  className="grid items-center px-4 py-2.5 text-[12px]"
                  style={{
                    gridTemplateColumns: '24px 1fr 1fr 120px 24px',
                    borderBottom: i < parsed.length-1 ? '1px solid var(--border)' : 'none',
                    background: a.valid ? 'var(--surface-1)' : 'rgba(226,75,74,.05)',
                  }}>
                  <span>{a.valid ? '✅' : '❌'}</span>
                  <span className="font-medium text-primary truncate">{a.name}</span>
                  <span className="text-muted truncate">{a.name_en || '—'}</span>
                  <div className="flex gap-1 flex-wrap">
                    {a.genres.slice(0,3).map(g => (
                      <span key={g} className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{g}</span>
                    ))}
                  </div>
                  {a.error && (
                    <span title={a.error} className="cursor-help">
                      <AlertCircle size={14} style={{ color: '#E24B4A' }} />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={reset} className="btn-ghost flex-1 py-2.5 text-[13px]">
              เลือกไฟล์ใหม่
            </button>
            <button onClick={handleImport} disabled={importing || validCount === 0}
              className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2">
              {importing
                ? <><Loader2 size={14} className="animate-spin" /> กำลัง import...</>
                : <>Import {validCount} ศิลปิน</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 'done' && result && (
        <div className="flex flex-col gap-4">
          {/* Result summary */}
          <div className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="text-4xl mb-3">
              {result.failed === 0 ? '🎉' : '⚠️'}
            </div>
            <h3 className="text-[16px] font-medium text-primary mb-4">Import เสร็จแล้ว</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[22px] font-medium" style={{ color: '#1D9E75' }}>{result.success}</div>
                <div className="text-[11px] text-muted">เพิ่มสำเร็จ</div>
              </div>
              <div>
                <div className="text-[22px] font-medium" style={{ color: '#EF9F27' }}>{result.skipped}</div>
                <div className="text-[11px] text-muted">ซ้ำ (ข้าม)</div>
              </div>
              <div>
                <div className="text-[22px] font-medium" style={{ color: '#E24B4A' }}>{result.failed}</div>
                <div className="text-[11px] text-muted">ผิดพลาด</div>
              </div>
            </div>
          </div>

          {/* Detail list */}
          <div className="rounded-xl overflow-hidden max-h-64 overflow-y-auto"
            style={{ border: '1px solid var(--border)' }}>
            {result.details.map((d, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5"
                style={{
                  borderBottom: i < result.details.length-1 ? '1px solid var(--border)' : 'none',
                  background: 'var(--surface-1)',
                }}>
                {d.status === 'success'  && <CheckCircle2 size={14} style={{ color: '#1D9E75' }} />}
                {d.status === 'skipped'  && <AlertCircle  size={14} style={{ color: '#EF9F27' }} />}
                {d.status === 'failed'   && <XCircle      size={14} style={{ color: '#E24B4A' }} />}
                <span className="text-[12px] text-primary flex-1">{d.name}</span>
                <span className="text-[10px] text-muted">{d.msg ?? ''}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={reset} className="btn-ghost flex-1 py-2.5 text-[13px]">
              Import ไฟล์ใหม่
            </button>
            <a href="/admin/artists" className="btn-accent flex-1 py-2.5 text-[13px] flex items-center justify-center">
              ดูรายการศิลปิน →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
