'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  bucket:      'artists' | 'events'
  value:       string        // current URL
  onChange:    (url: string) => void
  label?:      string
  aspect?:     '1:1' | '3:4'  // square or portrait
}

export default function ImageUpload({ bucket, value, onChange, label = 'รูปภาพ', aspect = '1:1' }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const sb = createClient()

  async function handleFile(file: File) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('ไฟล์ใหญ่เกิน 5MB'); return }

    setUploading(true)
    try {
      // Preview ก่อน
      const localUrl = URL.createObjectURL(file)
      setPreview(localUrl)

      // Upload to Supabase Storage
      const ext  = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true })
      if (error) throw error

      // Get public URL
      const { data } = sb.storage.from(bucket).getPublicUrl(path)
      onChange(data.publicUrl)
      setPreview(data.publicUrl)
      toast.success('อัปโหลดสำเร็จ')
    } catch (e: any) {
      toast.error(e.message || 'อัปโหลดไม่สำเร็จ')
      setPreview(value)
    } finally { setUploading(false) }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function clear() {
    setPreview('')
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const h = aspect === '3:4' ? 160 : 120

  return (
    <div>
      <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">
        {label}
      </label>

      <div className="flex gap-3 items-start">
        {/* Preview */}
        <div
          className="relative shrink-0 rounded-xl overflow-hidden"
          style={{
            width: aspect === '3:4' ? 120 : h,
            height: h,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
          }}>
          {preview ? (
            <>
              <img src={preview} alt="" className="w-full h-full object-cover" />
              <button
                onClick={clear}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,.6)' }}>
                <X size={12} style={{ color: 'white' }} />
              </button>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
              <ImageIcon size={24} className="text-muted" />
              <span className="text-[10px] text-muted">{aspect}</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,.5)' }}>
              <Loader2 size={20} className="animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Upload area */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex-1 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
          style={{
            height: h,
            border: '1.5px dashed var(--border)',
            background: 'var(--surface-1)',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <Upload size={20} className="text-muted" />
          <div className="text-center">
            <p className="text-[12px] font-medium text-primary">คลิก หรือลากไฟล์มาวาง</p>
            <p className="text-[10px] text-muted mt-0.5">JPG, PNG, WebP · สูงสุด 5MB</p>
            {aspect === '3:4' && <p className="text-[10px] text-muted">แนะนำ 600×800px (3:4)</p>}
            {aspect === '1:1' && <p className="text-[10px] text-muted">แนะนำ 800×800px (1:1)</p>}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {/* URL input fallback */}
      <div className="mt-2">
        <input
          type="url"
          value={value}
          onChange={e => { onChange(e.target.value); setPreview(e.target.value) }}
          placeholder="หรือวาง URL รูปภาพ..."
          className="input-theme text-[12px] w-full"
        />
      </div>
    </div>
  )
}
