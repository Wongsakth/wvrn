'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Edit3, CheckCircle2, Clock, X, Loader2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ApplyEditorPage() {
  const { user, loading: authLoading } = useAuth()
  const [existing, setExisting] = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ reason: '', social_url: '', sample_url: '' })
  const sb = createClient()

  useEffect(() => {
    if (!user) { setLoading(false); return }
    sb.from('editor_applications').select('*').eq('user_id', user.id).single()
      .then(({ data }) => { setExisting(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.reason.trim()) { toast.error('กรุณากรอกเหตุผล'); return }
    setSubmitting(true)
    try {
      const { error } = await sb.from('editor_applications').insert({
        user_id:    user!.id,
        reason:     form.reason.trim(),
        social_url: form.social_url.trim() || null,
        sample_url: form.sample_url.trim() || null,
        status:     'pending',
      })
      if (error) throw error
      toast.success('ส่งคำขอแล้ว Admin จะตรวจสอบเร็วๆ นี้')
      setExisting({ status: 'pending', created_at: new Date().toISOString() })
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  if (!authLoading && !user) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-[15px] font-medium text-primary mb-4">กรุณา Login ก่อน</p>
        <button onClick={() => window.location.href = '/login'} className="btn-accent py-2 px-6 text-[14px]">Login</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-screen-sm mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-muted)' }}>
            <Edit3 size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-[20px] font-medium text-primary">ขอเป็น Editor</h1>
            <p className="text-[12px] text-muted">ช่วย WVRN เพิ่มข้อมูล Event และศิลปิน</p>
          </div>
        </div>

        {/* สิทธิ์ที่จะได้ */}
        <div className="rounded-2xl p-4 mb-5"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <p className="text-[12px] font-medium text-muted uppercase tracking-wide mb-3">Editor ทำอะไรได้บ้าง</p>
          {[
            'เพิ่ม / แก้ไข Event ได้โดยตรง ไม่ต้องรอ Approve',
            'เพิ่มศิลปินและสถานที่ใหม่ได้',
            'ดู Submissions ที่รอตรวจสอบ',
            'ได้รับ badge Editor ใน Profile',
          ].map(item => (
            <div key={item} className="flex items-start gap-2 mb-2">
              <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: '#1D9E75' }} />
              <p className="text-[13px] text-secondary">{item}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-muted" /></div>
        ) : existing ? (
          /* Already applied */
          <div className="rounded-2xl p-6 text-center"
            style={{
              background: existing.status === 'approved' ? 'rgba(29,158,117,.06)'
                        : existing.status === 'rejected' ? 'rgba(226,75,74,.06)'
                        : 'var(--surface-1)',
              border: `1px solid ${existing.status === 'approved' ? 'rgba(29,158,117,.3)'
                        : existing.status === 'rejected' ? 'rgba(226,75,74,.3)'
                        : 'var(--border)'}`,
            }}>
            {existing.status === 'pending' && (
              <>
                <Clock size={32} className="mx-auto mb-3" style={{ color: '#EF9F27' }} />
                <p className="text-[15px] font-medium text-primary mb-1">กำลังรอการตรวจสอบ</p>
                <p className="text-[12px] text-muted">Admin จะตรวจสอบและแจ้งผลเร็วๆ นี้</p>
              </>
            )}
            {existing.status === 'approved' && (
              <>
                <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: '#1D9E75' }} />
                <p className="text-[15px] font-medium text-primary mb-1">ได้รับอนุมัติแล้ว!</p>
                <p className="text-[12px] text-muted">คุณเป็น Editor ของ WVRN แล้ว</p>
              </>
            )}
            {existing.status === 'rejected' && (
              <>
                <X size={32} className="mx-auto mb-3" style={{ color: '#E24B4A' }} />
                <p className="text-[15px] font-medium text-primary mb-1">คำขอไม่ได้รับการอนุมัติ</p>
                {existing.reject_reason && (
                  <p className="text-[12px] text-muted mt-1">เหตุผล: {existing.reject_reason}</p>
                )}
                <p className="text-[12px] text-muted mt-3">ติดต่อ Admin หากต้องการข้อมูลเพิ่มเติม</p>
              </>
            )}
          </div>
        ) : (
          /* Application form */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

              <div>
                <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">
                  เหตุผลที่อยากเป็น Editor *
                </label>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="บอกเราว่าคุณสนใจด้านดนตรี Concert อย่างไร และจะช่วย WVRN ได้อย่างไรบ้าง..."
                  rows={4} className="input-theme text-[13px] resize-none w-full" required />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">
                  Social Media (optional)
                </label>
                <input value={form.social_url} onChange={e => setForm(f => ({ ...f, social_url: e.target.value }))}
                  placeholder="Facebook / Instagram / Twitter URL"
                  className="input-theme text-[13px] w-full" />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">
                  ตัวอย่างงาน / Portfolio (optional)
                </label>
                <input value={form.sample_url} onChange={e => setForm(f => ({ ...f, sample_url: e.target.value }))}
                  placeholder="Link บทความ / Event ที่เคยรายงาน"
                  className="input-theme text-[13px] w-full" />
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="btn-accent w-full py-3 text-[14px] flex items-center justify-center gap-2">
              {submitting ? <><Loader2 size={15} className="animate-spin" /> กำลังส่ง...</> : 'ส่งคำขอ'}
            </button>

            <p className="text-[11px] text-muted text-center">
              Admin จะตรวจสอบและแจ้งผลผ่าน Notification ใน App
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
