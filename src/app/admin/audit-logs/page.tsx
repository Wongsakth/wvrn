// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { Loader2, Search, X, Shield } from 'lucide-react'

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  approve: { label: 'อนุมัติ',  color: '#1D9E75', bg: 'rgba(29,158,117,.1)' },
  reject:  { label: 'ปฏิเสธ',  color: '#E24B4A', bg: 'rgba(226,75,74,.1)'  },
  create:  { label: 'สร้าง',   color: '#3B82F6', bg: 'rgba(59,130,246,.1)' },
  edit:    { label: 'แก้ไข',   color: '#EF9F27', bg: 'rgba(239,159,39,.1)' },
  delete:  { label: 'ลบ',      color: '#E24B4A', bg: 'rgba(226,75,74,.1)'  },
  restore: { label: 'กู้คืน',  color: '#8B5CF6', bg: 'rgba(139,92,246,.1)' },
}

const TARGET_LABELS: Record<string, string> = {
  event:      'Event',
  artist:     'ศิลปิน',
  venue:      'สถานที่',
  label:      'ค่ายเพลง',
  submission: 'Submission',
  genre:      'แนวเพลง',
  user:       'User',
}

export default function AuditLogsPage() {
  const [logs,    setLogs]    = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [action,  setAction]  = useState('')
  const [target,  setTarget]  = useState('')
  const sb = createClient()

  useEffect(() => { load() }, [action, target])

  async function load() {
    setLoading(true)
    try {
      let q = (sb.from('audit_logs') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (action) q = q.eq('action', action)
      if (target) q = q.eq('target_type', target)

      const { data } = await q
      setLogs(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = logs.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      l.target_name?.toLowerCase().includes(q) ||
      l.actor_email?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Shield size={20} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 className="text-[20px] font-medium text-primary">Audit Logs</h1>
          <p className="text-[12px] text-muted mt-0.5">{filtered.length} รายการ</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-[200px]"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Search size={13} className="text-muted shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, email..."
            className="bg-transparent text-[13px] text-primary outline-none w-full placeholder:text-muted" />
          {search && <button onClick={() => setSearch('')}><X size={12} className="text-muted" /></button>}
        </div>

        {/* Action filter */}
        <select value={action} onChange={e => setAction(e.target.value)}
          className="text-[12px] rounded-xl px-3 py-2 outline-none"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <option value="">ทุก Action</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Target filter */}
        <select value={target} onChange={e => setTarget(e.target.value)}
          className="text-[12px] rounded-xl px-3 py-2 outline-none"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <option value="">ทุก Type</option>
          {Object.entries(TARGET_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={22} className="animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Shield size={32} className="mx-auto mb-3 text-muted" />
          <p className="text-[14px] font-medium text-primary">ไม่พบ Log</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {filtered.map((log, i) => {
            const a = ACTION_LABELS[log.action] ?? { label: log.action, color: 'var(--text-muted)', bg: 'var(--surface-2)' }
            return (
              <div key={log.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  background: 'var(--surface-1)',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                }}>

                {/* Action badge */}
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: a.bg, color: a.color }}>
                  {a.label}
                </span>

                {/* Target */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted">
                      {TARGET_LABELS[log.target_type] ?? log.target_type}
                    </span>
                    <span className="text-[13px] font-medium text-primary truncate">
                      {log.target_name ?? log.target_id?.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted truncate">{log.actor_email}</p>
                </div>

                {/* Time */}
                <div className="text-[11px] text-muted shrink-0 text-right">
                  {format(parseISO(log.created_at), 'd MMM yy HH:mm', { locale: th })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
