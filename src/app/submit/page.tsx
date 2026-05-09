'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { PROVINCES } from '@/lib/utils'
import { submitEvent } from '@/lib/supabase'
import { Upload, Send, Info } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SubmitPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title:       '',
    artist_name: '',
    venue_name:  '',
    province:    'กรุงเทพมหานคร',
    event_date:  '',
    start_time:  '',
    ticket_price:'',
    ticket_url:  '',
    description: '',
  })

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value })),
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.artist_name || !form.event_date || !form.venue_name) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็น')
      return
    }
    setLoading(true)
    try {
      // In production: pass auth user id as submitted_by
      await submitEvent({ ...form, status: 'pending', submitted_by: null })
      toast.success('ส่งข้อมูลแล้ว รอ Admin อนุมัติ')
      router.push('/')
    } catch {
      toast.error('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[20px] font-medium text-primary">แจ้งงาน Concert</h1>
          <p className="text-[13px] text-muted mt-1">
            แจ้ง Event ที่รู้มา — Admin จะตรวจสอบและอนุมัติภายใน 24 ชม.
          </p>
        </div>

        {/* Info banner */}
        <div
          className="flex gap-3 rounded-xl p-4 mb-6 text-[12px]"
          style={{ background: 'var(--accent-muted)', border: '1px solid var(--border)' }}
        >
          <Info size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>
            ข้อมูลจะถูกส่งไปให้ Admin ตรวจสอบก่อน เมื่ออนุมัติแล้วจะแสดงในตาราง
            และผู้ติดตามศิลปินนั้นจะได้รับการแจ้งเตือนทันที
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Card title="ข้อมูลหลัก">
            <Field label="ชื่องาน / Concert *">
              <input {...field('title')} placeholder="เช่น PAUSE World Tour 2026" className="input-theme" required />
            </Field>
            <Field label="ศิลปิน (คั่นด้วย , หากมีหลายคน) *">
              <input {...field('artist_name')} placeholder="เช่น PAUSE, MILLI" className="input-theme" required />
            </Field>
          </Card>

          <Card title="วันเวลา">
            <div className="grid grid-cols-2 gap-3">
              <Field label="วันที่จัดงาน *">
                <input {...field('event_date')} type="date" className="input-theme" required />
              </Field>
              <Field label="เวลาเริ่ม">
                <input {...field('start_time')} type="time" className="input-theme" />
              </Field>
            </div>
          </Card>

          <Card title="สถานที่">
            <Field label="ชื่อสถานที่ *">
              <input {...field('venue_name')} placeholder="เช่น Thunder Dome, Impact Arena" className="input-theme" required />
            </Field>
            <Field label="จังหวัด">
              <select {...field('province')} className="input-theme">
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </Card>

          <Card title="บัตรและราคา">
            <div className="grid grid-cols-2 gap-3">
              <Field label="ราคาบัตร">
                <input {...field('ticket_price')} placeholder="เช่น 1,500 หรือ ฟรี" className="input-theme" />
              </Field>
              <Field label="ลิงก์ซื้อบัตร">
                <input {...field('ticket_url')} type="url" placeholder="https://..." className="input-theme" />
              </Field>
            </div>
          </Card>

          <Card title="รายละเอียดเพิ่มเติม">
            <Field label="คำอธิบายงาน">
              <textarea
                {...field('description')}
                placeholder="รายละเอียดงาน เช่น lineup, dress code, การเดินทาง..."
                className="input-theme resize-none"
                rows={4}
              />
            </Field>

            {/* Poster upload (UI only — needs storage integration) */}
            <Field label="รูป Poster">
              <label
                className="flex flex-col items-center gap-2 rounded-xl p-6 cursor-pointer transition-all"
                style={{ border: '1.5px dashed var(--border)', background: 'var(--surface-2)' }}
              >
                <Upload size={20} style={{ color: 'var(--text-muted)' }} />
                <span className="text-[12px] text-muted">คลิกเพื่ออัปโหลดรูป Poster</span>
                <span className="text-[10px] text-muted opacity-60">PNG, JPG ขนาดไม่เกิน 5MB</span>
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </Field>
          </Card>

          <button
            type="submit"
            disabled={loading}
            className="btn-accent flex items-center justify-center gap-2 py-3 w-full text-[14px] mt-2"
          >
            <Send size={15} />
            {loading ? 'กำลังส่ง...' : 'ส่งให้ Admin ตรวจสอบ'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
    >
      <h3 className="text-[12px] font-medium text-muted uppercase tracking-wide mb-3">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  )
}
