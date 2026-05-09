'use client'
import { useState } from 'react'
import { Check, X, Edit2 } from 'lucide-react'
import { formatThaiDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { EventSubmission } from '@/types'

const MOCK_SUBMISSIONS: EventSubmission[] = [
  {
    id:'s1', title:'MILLI Live in BKK', artist_name:'MILLI', venue_name:'Lido Connect',
    province:'กรุงเทพมหานคร', event_date:'2026-06-15', start_time:'20:00',
    ticket_price:'1,200', description:'', status:'pending',
    submitted_by:'user_abc', created_at:'2026-05-07T10:00:00Z',
  },
  {
    id:'s2', title:'Scrubb Acoustic Night', artist_name:'Scrubb', venue_name:'Mustache Bar',
    province:'กรุงเทพมหานคร', event_date:'2026-06-22', start_time:'21:00',
    ticket_price:'600', description:'งาน Acoustic เล็กๆ', status:'pending',
    submitted_by:'fan_scrubb', created_at:'2026-05-07T05:00:00Z',
  },
]

export default function AdminDashboard() {
  const [subs, setSubs] = useState(MOCK_SUBMISSIONS)

  function approve(id: string) {
    setSubs(s => s.filter(x => x.id !== id))
    toast.success('อนุมัติแล้ว — Event จะแสดงในหน้าหลัก')
  }
  function reject(id: string) {
    setSubs(s => s.filter(x => x.id !== id))
    toast.error('ปฏิเสธแล้ว')
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'รออนุมัติ',     value: subs.length, accent: true },
          { label: 'Event ทั้งหมด', value: 12 },
          { label: 'ศิลปิน',        value: 7  },
          { label: 'สถานที่',       value: 5  },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="text-[24px] font-medium"
              style={{ color: s.accent ? 'var(--accent)' : 'var(--text-primary)' }}>
              {s.value}
            </div>
            <div className="text-[11px] text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending */}
      <div>
        <h2 className="text-[14px] font-medium text-primary mb-3">
          รออนุมัติ
          {subs.length > 0 && (
            <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}>
              {subs.length}
            </span>
          )}
        </h2>
        {subs.length === 0 ? (
          <div className="rounded-xl p-8 text-center"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <p className="text-[13px] text-muted">ไม่มีรายการรออนุมัติ 🎉</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {subs.map(sub => (
              <SubmissionCard key={sub.id} sub={sub}
                onApprove={() => approve(sub.id)}
                onReject={() => reject(sub.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Recent events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-medium text-primary">Event ล่าสุด</h2>
          <a href="/admin/events" className="text-[12px] text-accent hover:underline">ดูทั้งหมด →</a>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {['PAUSE Summer Concert','Rock Festival BKK','Billy Black Acoustic','Bedroom Audio Live'].map((title, i) => (
            <div key={i}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-2)] transition-colors"
              style={{
                background: 'var(--surface-1)',
                borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
              }}>
              <div>
                <div className="text-[13px] font-medium text-primary">{title}</div>
                <div className="text-[11px] text-muted">พ.ค. 2026 · กรุงเทพฯ</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tag tag-confirm text-[9px]">confirmed</span>
                <button className="icon-btn w-7 h-7"><Edit2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SubmissionCard({ sub, onApprove, onReject }: {
  sub: EventSubmission; onApprove: () => void; onReject: () => void
}) {
  const [note, setNote] = useState('')
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="px-4 py-2 flex items-center justify-between"
        style={{ background: 'rgba(186,117,23,.08)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#EF9F27' }}>
          รอตรวจสอบ
        </span>
        <span className="text-[10px] text-muted">แจ้งโดย {sub.submitted_by}</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {[
            ['ชื่องาน',  sub.title],
            ['ศิลปิน',   sub.artist_name],
            ['สถานที่',  sub.venue_name],
            ['วันที่',   formatThaiDate(sub.event_date)],
            ['เวลา',     sub.start_time ? sub.start_time + ' น.' : '-'],
            ['ราคาบัตร', sub.ticket_price ?? '-'],
          ].map(([l, v]) => (
            <div key={l}>
              <div className="text-[9px] text-muted uppercase tracking-wide mb-0.5">{l}</div>
              <div className="text-[12px] text-primary font-medium">{v}</div>
            </div>
          ))}
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="หมายเหตุถึงผู้แจ้ง (ถ้ามี)..."
          className="input-theme resize-none mb-3 text-[12px]" rows={2} />
        <div className="flex gap-2">
          <button onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium"
            style={{ background: '#1D9E75', color: '#fff' }}>
            <Check size={14} /> อนุมัติ
          </button>
          <button onClick={onReject}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] btn-ghost"
            style={{ color: '#E24B4A', borderColor: 'rgba(226,75,74,.3)' }}>
            <X size={14} /> ปฏิเสธ
          </button>
          <button className="px-3 py-2 rounded-lg text-[12px] btn-ghost"><Edit2 size={13} /></button>
        </div>
      </div>
    </div>
  )
}
