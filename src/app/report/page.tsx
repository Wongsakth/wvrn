// @ts-nocheck
'use client'
import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  AlertCircle, CheckCircle2, Loader2,
  Calendar, Ticket, Music, MapPin, Image, Monitor, MessageSquare, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { id: 'event_info',    label: 'ข้อมูล Event ผิดพลาด',     desc: 'วันที่ / เวลา / สถานที่ไม่ถูกต้อง', icon: Calendar,      color: '#3B82F6' },
  { id: 'ticket_price',  label: 'ราคาบัตรผิดพลาด',           desc: 'ราคาไม่ตรง หรือขายหมดแล้ว',         icon: Ticket,        color: '#8B5CF6' },
  { id: 'artist_info',   label: 'ข้อมูลศิลปินผิดพลาด',       desc: 'ชื่อ / รูป / ข้อมูลไม่ถูกต้อง',     icon: Music,         color: '#EC4899' },
  { id: 'venue_info',    label: 'ข้อมูลสถานที่ผิดพลาด',      desc: 'ที่อยู่ / แผนที่ผิด',               icon: MapPin,        color: '#10B981' },
  { id: 'new_event',     label: 'แจ้ง Event ใหม่',            desc: 'งานที่ยังไม่มีใน WVRN',             icon: CheckCircle2,  color: '#EF9F27' },
  { id: 'cancelled',     label: 'Event ถูกยกเลิก / เลื่อน',  desc: 'ยืนยันว่างานยกเลิกหรือเลื่อนแล้ว', icon: XCircle,       color: '#EF4444' },
  { id: 'image',         label: 'รูปภาพไม่เหมาะสม',           desc: 'รูปผิด / ไม่เกี่ยวข้อง',           icon: Image,         color: '#F59E0B' },
  { id: 'bug',           label: 'ปัญหาการใช้งานเว็บ',         desc: 'Bug / โหลดไม่ได้ / ปุ่มใช้งานไม่ได้',icon: Monitor,      color: '#6366F1' },
  { id: 'other',         label: 'อื่นๆ',                      desc: 'นอกเหนือจากข้างต้น',                icon: MessageSquare, color: '#6B7280' },
]

export default function ReportPage() {
  const { user } = useAuth()

// เพิ่มหลัง const { user } = useAuth()
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const urlParam = params.get('url')
  const catParam = params.get('category')
  if (urlParam) setForm(f => ({ ...f, page_url: urlParam }))
  if (catParam) setCategory(catParam)
}, [])
  const sb = createClient()
  const [category, setCategory] = useState('')
  const [form, setForm] = useState({
    page_url: typeof window !== 'undefined' ? window.location.href : '',
    description: '',
    correct_info: '',
    evidence_url: '',
    contact_email: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const selected = CATEGORIES.find(c => c.id === category)

  async function handleSubmit() {
    if (!category) { toast.error('กรุณาเลือกประเภทปัญหา'); return }
    if (!form.description.trim()) { toast.error('กรุณาอธิบายปัญหา'); return }

    setSubmitting(true)
    try {
      const { error } = await sb.from('reports').insert({
        category,
        page_url:      form.page_url || null,
        description:   form.description,
        correct_info:  form.correct_info || null,
        evidence_url:  form.evidence_url || null,
        contact_email: form.contact_email || null,
        submitted_by:  user?.id ?? null,
        status:        'open',
      })
      if (error) throw error
      setSubmitted(true)
      toast.success('รับเรื่องแล้ว ขอบคุณที่แจ้งปัญหา')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(16,185,129,.1)' }}>
          <CheckCircle2 size={32} style={{ color: '#10B981' }} />
        </div>
        <h2 className="text-[18px] font-medium text-primary mb-2">รับเรื่องแล้ว!</h2>
        <p className="text-[13px] text-secondary leading-relaxed mb-6">
          ทีมงาน WVRN ได้รับการแจ้งปัญหาของคุณแล้ว<br />
          จะดำเนินการตรวจสอบและแก้ไขโดยเร็วที่สุด
        </p>
        <button onClick={() => window.location.href = '/'}
          className="btn-accent py-2.5 px-6 text-[13px]">
          กลับหน้าหลัก
        </button>
      </div>
      <Footer />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 pb-24 md:pb-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,.1)' }}>
            <AlertCircle size={20} style={{ color: '#EF4444' }} />
          </div>
          <div>
            <h1 className="text-[20px] font-medium text-primary">แจ้งปัญหา / รายงานข้อมูล</h1>
            <p className="text-[12px] text-muted">ช่วยเราปรับปรุง WVRN ให้ดียิ่งขึ้น</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">

          {/* Category Selector */}
          <div>
            <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-3">
              ประเภทปัญหา *
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CATEGORIES.map(c => {
                const Icon = c.icon
                const isSelected = category === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{
                      background: isSelected ? `${c.color}14` : 'var(--surface-1)',
                      border: `1px solid ${isSelected ? c.color : 'var(--border)'}`,
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${c.color}18` }}>
                      <Icon size={15} style={{ color: c.color }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-primary">{c.label}</p>
                      <p className="text-[11px] text-muted">{c.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form — แสดงหลังเลือก category */}
          {category && (
            <div className="flex flex-col gap-4 rounded-xl p-5"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

              {/* แสดง category ที่เลือก */}
              <div className="flex items-center gap-2 pb-3"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: `${selected?.color}18` }}>
                  {selected && <selected.icon size={13} style={{ color: selected.color }} />}
                </div>
                <span className="text-[13px] font-medium text-primary">{selected?.label}</span>
              </div>

              <Field label="URL หน้าที่มีปัญหา (optional)">
                <input
                  value={form.page_url}
                  onChange={e => setForm(f => ({ ...f, page_url: e.target.value }))}
                  placeholder="https://wvrn.app/events/..."
                  className="input-theme text-[13px]"
                />
              </Field>

              <Field label="อธิบายปัญหา *">
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={
                    category === 'event_info' ? 'เช่น วันที่แสดงเป็น 15 มิ.ย. แต่จริงๆ คือ 20 มิ.ย.' :
                    category === 'ticket_price' ? 'เช่น ราคาแสดง 1,500 บาท แต่จริงๆ ราคา 2,000 บาท' :
                    category === 'cancelled' ? 'เช่น งานนี้ถูกยกเลิกแล้ว ประกาศโดยผู้จัด...' :
                    category === 'bug' ? 'เช่น กดปุ่ม Login แล้วหน้าค้าง บน iPhone Safari...' :
                    'อธิบายปัญหาที่พบ...'
                  }
                  rows={4}
                  className="input-theme text-[13px] resize-none"
                />
              </Field>

              {category !== 'bug' && category !== 'other' && (
                <Field label="ข้อมูลที่ถูกต้องควรเป็นอะไร (optional)">
                  <textarea
                    value={form.correct_info}
                    onChange={e => setForm(f => ({ ...f, correct_info: e.target.value }))}
                    placeholder="ระบุข้อมูลที่ถูกต้อง เช่น ลิงก์แหล่งข้อมูลต้นฉบับ..."
                    rows={2}
                    className="input-theme text-[13px] resize-none"
                  />
                </Field>
              )}

              <Field label="ลิงก์หลักฐาน / แหล่งอ้างอิง (optional)">
                <input
                  value={form.evidence_url}
                  onChange={e => setForm(f => ({ ...f, evidence_url: e.target.value }))}
                  placeholder="https://... (IG post, เว็บผู้จัด, ฯลฯ)"
                  className="input-theme text-[13px]"
                />
              </Field>

              <Field label="อีเมลสำหรับติดต่อกลับ (optional)">
                <input
                  value={form.contact_email}
                  onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                  placeholder="กรณีต้องการให้ทีมงานติดต่อกลับ"
                  className="input-theme text-[13px]"
                  type="email"
                />
              </Field>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-accent w-full py-3 text-[14px] flex items-center justify-center gap-2 mt-2"
              >
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> กำลังส่ง...</>
                  : '📨 ส่งรายงานปัญหา'
                }
              </button>
            </div>
          )}

          {/* Note */}
          <p className="text-[11px] text-muted text-center leading-relaxed">
            ทีมงาน WVRN จะตรวจสอบและดำเนินการแก้ไขโดยเร็วที่สุด<br />
            ขอบคุณที่ช่วยทำให้ WVRN ดียิ่งขึ้น 🙏
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}
