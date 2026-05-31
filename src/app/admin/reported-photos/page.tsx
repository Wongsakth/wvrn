// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Flag, Trash2, Eye, EyeOff, Loader2, RefreshCw, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function ReportedPhotosPage() {
  const [photos,   setPhotos]   = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'reported' | 'hidden' | 'all'>('reported')
  const sb = createClient()

  async function load() {
    setLoading(true)
    try {
      let q = sb.from('event_photos')
        .select(`
          *,
          profile:profiles(id, display_name, avatar_url),
          reporter:event_photo_reports(user_id, profile:profiles(display_name)),
          event:events(id, title, slug, start_date)
        `)
        .order('report_count', { ascending: false })
        .order('created_at', { ascending: false })

      if (filter === 'reported') q = q.gt('report_count', 0).eq('is_hidden', false)
      else if (filter === 'hidden') q = q.eq('is_hidden', true)

      const { data, error } = await q
      if (error) throw error
      setPhotos(data || [])
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  async function hidePhoto(id: string) {
    await sb.from('event_photos').update({ is_hidden: true }).eq('id', id)
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, is_hidden: true } : p))
    toast.success('ซ่อนรูปแล้ว')
  }

  async function unhidePhoto(id: string) {
    await sb.from('event_photos').update({ is_hidden: false, report_count: 0 }).eq('id', id)
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, is_hidden: false, report_count: 0 } : p))
    toast.success('คืนรูปแล้ว')
  }

  async function deletePhoto(photo: any) {
    try {
      const { error } = await sb.from('event_photos').delete().eq('id', photo.id)
      if (error) throw error
      const path = photo.url.split('/event-photos/')[1]
      if (path) await sb.storage.from('event-photos').remove([decodeURIComponent(path)])
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      toast.success('ลบรูปแล้ว')
    } catch (e: any) {
      toast.error('ลบไม่ได้: ' + e.message)
    }
  }

  async function clearReport(id: string) {
    await sb.from('event_photos').update({ report_count: 0 }).eq('id', id)
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, report_count: 0 } : p))
    toast.success('ล้าง report แล้ว')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium text-primary flex items-center gap-2">
            <Flag size={18} style={{ color: '#E24B4A' }} />
            รูปที่ถูก Report
          </h1>
          <p className="text-[12px] text-muted mt-0.5">{photos.length} รายการ</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="icon-btn w-8 h-8"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        {([['reported','มี Report'], ['hidden','ซ่อนอยู่'], ['all','ทั้งหมด']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-all"
            style={{
              background: filter === val ? 'var(--accent)' : 'transparent',
              color: filter === val ? 'white' : 'var(--text-muted)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Flag size={32} className="mx-auto mb-3 text-muted" />
          <p className="text-[14px] font-medium text-primary">ไม่มีรูปที่ถูก Report</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {photos.map(photo => (
            <div key={photo.id} className="rounded-xl overflow-hidden"
              style={{ background: 'var(--surface-1)', border: `1px solid ${photo.report_count > 0 ? 'rgba(226,75,74,.3)' : 'var(--border)'}` }}>

              {/* Photo */}
              <div className="relative" style={{ aspectRatio: '16/9' }}>
                <img src={photo.url} alt="" className="w-full h-full object-cover"
                  style={{ opacity: photo.is_hidden ? 0.3 : 1 }} />
                {photo.is_hidden && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[12px] font-medium px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(0,0,0,.7)', color: 'white' }}>ซ่อนอยู่</span>
                  </div>
                )}
                {photo.report_count > 0 && (
                  <div className="absolute top-2 left-2">
                    <span className="text-[11px] font-medium px-2 py-1 rounded-full flex items-center gap-1"
                      style={{ background: '#E24B4A', color: 'white' }}>
                      <Flag size={10} /> {photo.report_count} report
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-primary truncate">
                      {photo.event?.title ?? 'ไม่ทราบงาน'}
                    </p>
                    <p className="text-[11px] text-muted">
                      โดย {photo.profile?.display_name ?? `user:${photo.user_id?.slice(0,8)}`} ·{' '}
                      {format(parseISO(photo.created_at), 'd MMM yyyy', { locale: th })}
                    </p>
                  </div>
                  {photo.event && (
                    <a href={`/events/${photo.event.slug || photo.event.id}`} target="_blank"
                      rel="noopener noreferrer" className="icon-btn w-7 h-7 shrink-0">
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 flex-wrap">
                  {!photo.is_hidden ? (
                    <button onClick={() => hidePhoto(photo.id)}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg"
                      style={{ background: 'rgba(239,159,39,.1)', color: '#854F0B', border: '1px solid rgba(239,159,39,.3)' }}>
                      <EyeOff size={11} /> ซ่อน
                    </button>
                  ) : (
                    <button onClick={() => unhidePhoto(photo.id)}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg"
                      style={{ background: 'rgba(29,158,117,.1)', color: '#0F6E56', border: '1px solid rgba(29,158,117,.3)' }}>
                      <Eye size={11} /> คืนรูป
                    </button>
                  )}
                  {photo.report_count > 0 && (
                    <button onClick={() => clearReport(photo.id)}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      ล้าง Report
                    </button>
                  )}
                  <button onClick={() => { if (window.confirm('ลบรูปนี้ถาวรหรือ? ไม่สามารถกู้คืนได้')) deletePhoto(photo) }}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg ml-auto"
                    style={{ background: 'rgba(226,75,74,.1)', color: '#E24B4A', border: '1px solid rgba(226,75,74,.2)' }}>
                    <Trash2 size={11} /> ลบถาวร
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
