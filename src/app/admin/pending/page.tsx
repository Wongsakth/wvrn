// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { CheckCircle2, XCircle, Loader2, Calendar, Music, MapPin, Clock, User, Edit3, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { logAudit } from '@/lib/audit'

interface Submission {
  id: string; title: string; artist_name: string | null; venue_name: string | null
  province: string | null; event_date: string; start_time: string | null
  ticket_price: number | null; ticket_url: string | null; description: string | null
  poster_url: string | null; status: string; submitted_by: string | null
  reviewer_note: string | null; created_at: string
}

interface EditorApp {
  id: string; user_id: string; reason: string; social_url: string | null
  sample_url: string | null; status: string; created_at: string
  reject_reason: string | null
}

export default function PendingPage() {
  const [tab,         setTab]         = useState<'events' | 'editors'>('events')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [editorApps,  setEditorApps]  = useState<EditorApp[]>([])
  const [loading,     setLoading]     = useState(true)
  const [notes,       setNotes]       = useState<Record<string, string>>({})
  const [processing,  setProcessing]  = useState<string | null>(null)
  const sb = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [subRes, edRes] = await Promise.all([
        sb.from('event_submissions').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
        sb.from('editor_applications').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
      ])
      setSubmissions(subRes.data || [])
      setEditorApps(edRes.data || [])
    } catch (e: any) { toast.error('โหลดไม่ได้: ' + e.message) }
    finally { setLoading(false) }
  }

  async function approveEditorApp(app: EditorApp) {
    setProcessing(app.id)
    try {
      const { data: { user } } = await sb.auth.getUser()
      await sb.from('editor_applications').update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', app.id)
      await sb.from('profiles').update({ role: 'editor' }).eq('id', app.user_id)
      // แจ้ง user
      await sb.from('notifications').insert({ user_id: app.user_id, type: 'approved', title: 'คำขอ Editor ได้รับการอนุมัติ', body: 'ยินดีด้วย! คุณเป็น Editor ของ WVRN แล้ว', link: '/profile' })
      toast.success('อนุมัติ Editor แล้ว')
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setProcessing(null) }
  }

  async function rejectEditorApp(app: EditorApp) {
    if (!notes[app.id]?.trim()) { toast.error('กรุณาใส่เหตุผลก่อน'); return }
    setProcessing(app.id)
    try {
      const { data: { user } } = await sb.auth.getUser()
      await sb.from('editor_applications').update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString(), reject_reason: notes[app.id] }).eq('id', app.id)
      await sb.from('notifications').insert({ user_id: app.user_id, type: 'rejected', title: 'คำขอ Editor ไม่ได้รับการอนุมัติ', body: notes[app.id], link: '/apply-editor' })
      toast.success('ปฏิเสธแล้ว')
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setProcessing(null) }
  }

  useEffect(() => { load() }, [])

  async function handleApprove(sub: Submission) {
    setProcessing(sub.id)
    try {
      // 1. สร้าง event จริง
      const { data: ev, error: evErr } = await sb.from('events').insert({
        title:            sub.title,
        description:      sub.description,
        start_date:       sub.event_date,
        start_time:       sub.start_time,
        is_free:          !sub.ticket_price,
        ticket_price_min: sub.ticket_price,
        ticket_url:       sub.ticket_url,
        event_type:       'concert',
        status:           'confirmed',
        province:         sub.province ?? 'กรุงเทพมหานคร',
      }).select().single()
      if (evErr) throw evErr

      // 2. หาศิลปินจาก artist_name (คั่นด้วย , หรือ / หรือ x)
      if (sub.artist_name && ev?.id) {
        const artistNames = (sub.artist_name ?? '')
          .split(/[,\/x&+]/)
          .map((s: string) => s.trim())
          .filter(Boolean)

        for (let i = 0; i < artistNames.length; i++) {
          const name = artistNames[i]
          // ค้นหาศิลปินที่ชื่อตรงหรือใกล้เคียง (ไทย/อังกฤษ)
          const { data: found } = await sb
            .from('artists')
            .select('id, name')
            .or(`name.ilike.%${name}%,name_en.ilike.%${name}%`)
            .limit(1)
            .single()

          if (found) {
            await sb.from('event_artists').upsert({
              event_id:     ev.id,
              artist_id:    found.id,
              sort_order:   i + 1,
              is_headliner: i === 0,
            }, { onConflict: 'event_id,artist_id', ignoreDuplicates: true })
          }
        }
      }

      // 3. อัปเดต submission status
      const { error: upErr } = await sb.from('event_submissions')
        .update({ status: 'approved', reviewer_note: notes[sub.id] || null })
        .eq('id', sub.id)
      if (upErr) throw upErr

      await logAudit({ action: 'approve', targetType: 'submission', targetId: sub.id, targetName: sub.title, metadata: { artist_name: sub.artist_name, venue_name: sub.venue_name } })

      toast.success(`อนุมัติ "${sub.title}" แล้ว — เชื่อมศิลปินสำเร็จ`)
      load()
    } catch (e: any) {
      toast.error('เกิดข้อผิดพลาด: ' + e.message)
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(sub: Submission) {
    if (!notes[sub.id]?.trim()) {
      toast.error('กรุณาใส่เหตุผลการปฏิเสธก่อน')
      return
    }
    setProcessing(sub.id)
    try {
      const { error } = await sb.from('event_submissions')
        .update({ status: 'rejected', reviewer_note: notes[sub.id] })
        .eq('id', sub.id)
      if (error) throw error
      toast.success(`ปฏิเสธ "${sub.title}" แล้ว`)
      load()
    } catch (e: any) {
      toast.error('เกิดข้อผิดพลาด: ' + e.message)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[20px] font-medium text-primary">รออนุมัติ</h1>
        <button onClick={load} className="btn-ghost text-[13px] py-2 px-3">รีเฟรช</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <button onClick={() => setTab('events')}
          className="flex items-center gap-2 flex-1 justify-center py-2 rounded-lg text-[13px] font-medium transition-all"
          style={{ background: tab === 'events' ? 'var(--accent)' : 'transparent', color: tab === 'events' ? 'var(--surface-0)' : 'var(--text-muted)' }}>
          <Calendar size={13} /> Events ({submissions.length})
        </button>
        <button onClick={() => setTab('editors')}
          className="flex items-center gap-2 flex-1 justify-center py-2 rounded-lg text-[13px] font-medium transition-all"
          style={{ background: tab === 'editors' ? 'var(--accent)' : 'transparent', color: tab === 'editors' ? 'var(--surface-0)' : 'var(--text-muted)' }}>
          <Edit3 size={13} /> ขอเป็น Editor ({editorApps.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      ) : tab === 'events' ? (
        <>
        {submissions.length === 0 ? (
        <div className="rounded-2xl p-16 text-center"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <CheckCircle2 size={40} className="mx-auto mb-4" style={{ color: '#1D9E75' }} />
          <p className="text-[16px] font-medium text-primary mb-1">ไม่มีรายการรออนุมัติ</p>
          <p className="text-[13px] text-muted">ทุก Event ได้รับการตรวจสอบแล้ว 🎉</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {submissions.map(sub => (
            <div key={sub.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

              {/* Status badge */}
              <div className="px-5 py-2.5 flex items-center gap-2"
                style={{ background: 'rgba(186,117,23,.08)', borderBottom: '1px solid var(--border)' }}>
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-[11px] font-medium" style={{ color: '#EF9F27' }}>รอตรวจสอบ</span>
                <span className="text-[11px] text-muted ml-auto">
                  แจ้งเมื่อ {format(parseISO(sub.created_at), 'd MMM yyyy HH:mm', { locale: th })} น.
                </span>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Event info */}
                  <div>
                    <h3 className="text-[16px] font-medium text-primary mb-3">{sub.title}</h3>
                    <div className="flex flex-col gap-2">
                      {sub.artist_name && (
                        <InfoRow icon={<Music size={13} />} label="ศิลปิน" value={sub.artist_name} />
                      )}
                      {sub.venue_name && (
                        <InfoRow icon={<MapPin size={13} />} label="สถานที่" value={sub.venue_name} />
                      )}
                      <InfoRow
                        icon={<Calendar size={13} />}
                        label="วันที่"
                        value={sub.event_date ? format(parseISO(sub.event_date), 'd MMMM yyyy', { locale: th }) : 'ไม่ระบุ'}
                      />
                      {sub.start_time && (
                        <InfoRow icon={<Clock size={13} />} label="เวลา" value={`${sub.start_time.slice(0,5)} น.`} />
                      )}
                      <InfoRow
                        icon={<span className="text-[11px]">฿</span>}
                        label="ราคา"
                        value={sub.ticket_price ? `฿${sub.ticket_price.toLocaleString()}` : 'ฟรี'}
                      />
                    </div>
                  </div>

                  {/* Description + contact */}
                  <div className="flex flex-col gap-3">
                    {sub.description && (
                      <div>
                        <p className="text-[11px] text-muted mb-1">รายละเอียด</p>
                        <p className="text-[13px] text-secondary leading-relaxed">{sub.description}</p>
                      </div>
                    )}
                    {sub.ticket_url && (
                      <div>
                        <p className="text-[11px] text-muted mb-1">ลิงก์บัตร</p>
                        <a href={sub.ticket_url} target="_blank" rel="noopener noreferrer"
                          className="text-[12px] underline truncate block"
                          style={{ color: 'var(--accent)' }}>
                          {sub.ticket_url}
                        </a>
                      </div>
                    )}
                    {sub.contact_info && (
                      <div>
                        <p className="text-[11px] text-muted mb-1 flex items-center gap-1">
                          <User size={11} /> ข้อมูลติดต่อ
                        </p>
                        <p className="text-[12px] text-secondary">{sub.contact_info}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Note / reason */}
                <div className="mb-4">
                  <label className="block text-[11px] text-muted mb-1.5">
                    หมายเหตุถึงผู้แจ้ง (ถ้ามี)
                    <span className="ml-1 opacity-70">— จำเป็นถ้าปฏิเสธ</span>
                  </label>
                  <textarea
                    value={notes[sub.id] || ''}
                    onChange={e => setNotes(n => ({ ...n, [sub.id]: e.target.value }))}
                    placeholder="เช่น ข้อมูลไม่ครบ / ซ้ำกับที่มีอยู่ / อนุมัติแล้ว..."
                    rows={2}
                    className="input-theme text-[13px] w-full resize-none"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReject(sub)}
                    disabled={!!processing}
                    className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                    style={{
                      background: 'rgba(226,75,74,.08)',
                      border: '1px solid rgba(226,75,74,.2)',
                      color: '#E24B4A',
                    }}>
                    {processing === sub.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <XCircle size={15} />}
                    ปฏิเสธ
                  </button>
                  <button
                    onClick={() => handleApprove(sub)}
                    disabled={!!processing}
                    className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                    style={{
                      background: 'rgba(29,158,117,.1)',
                      border: '1px solid rgba(29,158,117,.25)',
                      color: '#1D9E75',
                    }}>
                    {processing === sub.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <CheckCircle2 size={15} />}
                    อนุมัติ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      ) : (
        /* Editor Applications tab */
        editorApps.length === 0 ? (
          <div className="rounded-2xl p-16 text-center"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <Edit3 size={40} className="mx-auto mb-4 text-muted" />
            <p className="text-[15px] font-medium text-primary">ไม่มีคำขอ Editor รออนุมัติ</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {editorApps.map(app => (
              <div key={app.id} className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <div className="px-5 py-2.5 flex items-center gap-2"
                  style={{ background: 'rgba(124,58,237,.08)', borderBottom: '1px solid var(--border)' }}>
                  <Edit3 size={12} style={{ color: '#7C3AED' }} />
                  <span className="text-[11px] font-medium" style={{ color: '#7C3AED' }}>ขอเป็น Editor</span>
                  <span className="text-[11px] text-muted ml-auto">
                    {format(parseISO(app.created_at), 'd MMM yyyy HH:mm', { locale: th })} น.
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <User size={14} className="text-muted" />
                    <span className="text-[12px] text-muted font-mono">{app.user_id.slice(0,8)}...</span>
                    {(app as any).phone && (
                      <span className="text-[12px] text-muted">· 📞 {(app as any).phone}</span>
                    )}
                  </div>
                  {(app as any).apply_type?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(app as any).apply_type.map((t: string) => (
                        <span key={t} className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                          style={{ background: 'rgba(124,58,237,.1)', color: '#7C3AED' }}>
                          {t === 'event_owner'    ? 'เจ้าของงาน'
                          : t === 'venue_owner'   ? 'เจ้าของสถานที่'
                          : t === 'artist'        ? 'ศิลปิน/วง'
                          : t === 'artist_manager'? 'ผู้จัดการศิลปิน'
                          : t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mb-3 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                    <p className="text-[11px] text-muted mb-1">เหตุผล</p>
                    <p className="text-[13px] text-primary">{app.reason}</p>
                  </div>
                  {app.social_url && (
                    <a href={app.social_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[12px] mb-2"
                      style={{ color: 'var(--accent)' }}>
                      <ExternalLink size={12} /> Social: {app.social_url}
                    </a>
                  )}
                  {app.sample_url && (
                    <a href={app.sample_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[12px] mb-4"
                      style={{ color: 'var(--accent)' }}>
                      <ExternalLink size={12} /> Portfolio: {app.sample_url}
                    </a>
                  )}
                  <div className="mb-3">
                    <textarea
                      value={notes[app.id] ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                      placeholder="เหตุผล (ถ้าปฏิเสธ)"
                      rows={2}
                      className="input-theme text-[13px] resize-none w-full"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => approveEditorApp(app)} disabled={processing === app.id}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2"
                      style={{ background: '#1D9E75', color: 'white' }}>
                      {processing === app.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      อนุมัติ Editor
                    </button>
                    <button onClick={() => rejectEditorApp(app)} disabled={processing === app.id}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2"
                      style={{ background: 'rgba(226,75,74,.1)', color: '#E24B4A', border: '1px solid rgba(226,75,74,.2)' }}>
                      <XCircle size={14} /> ปฏิเสธ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted w-4 flex justify-center shrink-0">{icon}</span>
      <span className="text-[11px] text-muted w-14 shrink-0">{label}</span>
      <span className="text-[13px] text-primary">{value}</span>
    </div>
  )
}

