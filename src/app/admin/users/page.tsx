// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, X, Loader2, Trash2, User, ChevronDown, History, Camera, Flag, Star, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'super_admin',    label: 'Super Admin',     color: '#A32D2D', bg: '#FCEBEB' },
  { value: 'admin',          label: 'Admin',            color: '#633806', bg: '#FAEEDA' },
  { value: 'editor',         label: 'Editor',           color: '#085041', bg: '#E1F5EE' },
  { value: 'artist_manager', label: 'Artist Manager',   color: '#0C447C', bg: '#E6F1FB' },
  { value: 'venue_manager',  label: 'Venue Manager',    color: '#3C3489', bg: '#EEEDFE' },
  { value: 'user',           label: 'User',             color: '#444441', bg: '#F1EFE8' },
]
const roleConf = (r: string) => ROLES.find(x => x.value === r) ?? ROLES[5]

export default function AdminUsersPage() {
  const [users,      setUsers]      = useState<any[]>([])
  const [artists,    setArtists]    = useState<any[]>([])
  const [venues,     setVenues]     = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [myRole,     setMyRole]     = useState('')
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [linking,     setLinking]     = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [userHistory,  setUserHistory]  = useState<any>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const sb = createClient()

  useEffect(() => { load() }, [])

  async function loadUserHistory(userId: string) {
    setLoadingHistory(true)
    try {
      const [photosRes, reportsRes, submissionsRes] = await Promise.all([
        sb.from('event_photos')
          .select('id, url, created_at, is_hidden, report_count, event:events(title, start_date)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        sb.from('event_photo_reports')
          .select('id, created_at, photo:event_photos(url, event:events(title))')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        sb.from('event_submissions')
          .select('id, title, status, created_at')
          .eq('submitted_by', userId)
          .order('created_at', { ascending: false })
          .limit(10),
      ])
      setUserHistory({
        photos: photosRes.data || [],
        reports: reportsRes.data || [],
        submissions: submissionsRes.data || [],
      })
    } catch (e: any) { console.error(e) }
    finally { setLoadingHistory(false) }
  }

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data: p } = await sb.from('user_profiles').select('role').eq('id', user.id).single()
        setMyRole(p?.role ?? 'user')
      }
      const [uRes, aRes, vRes, pRes] = await Promise.all([
        sb.from('user_profiles').select('*').order('created_at', { ascending: false }),
        sb.from('artists').select('id,name,name_en').order('name'),
        sb.from('venues').select('id,name').order('name'),
        sb.from('profiles').select('id,line_user_id'),
      ])
      // merge line_user_id จาก profiles table
      const profilesMap = new Map((pRes.data || []).map((p: any) => [p.id, p]))
      const merged = (uRes.data || []).map((u: any) => ({
        ...u,
        line_user_id: profilesMap.get(u.id)?.line_user_id ?? null,
      }))
      setUsers(merged)
      setArtists(aRes.data || [])
      setVenues(vRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function changeRole(userId: string, newRole: string) {
    try {
      const { error } = await sb.from('profiles').update({ role: newRole }).eq('id', userId)
      if (error) throw error
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success('อัปเดต role แล้ว')
    } catch (e: any) { toast.error(e.message) }
  }

  async function linkArtist(userId: string, artistId: string | null) {
    try {
      const { error } = await sb.from('profiles').update({ artist_id: artistId }).eq('id', userId)
      if (error) throw error
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, artist_id: artistId } : u))
      toast.success(artistId ? 'ผูกศิลปินแล้ว' : 'ยกเลิกการผูกแล้ว')
    } catch (e: any) { toast.error(e.message) }
  }

  async function linkVenue(userId: string, venueId: string | null) {
    try {
      const { error } = await sb.from('profiles').update({ venue_id: venueId }).eq('id', userId)
      if (error) throw error
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, venue_id: venueId } : u))
      toast.success(venueId ? 'ผูก venue แล้ว' : 'ยกเลิกการผูกแล้ว')
    } catch (e: any) { toast.error(e.message) }
  }

  async function deleteUser(userId: string) {
    try {
      const { error } = await sb.rpc('delete_user_data', { target_user_id: userId })
      if (error) throw error
      setUsers(prev => prev.filter(u => u.id !== userId))
      setDeleteId(null)
      toast.success('ลบ user แล้ว')
    } catch (e: any) { toast.error(e.message) }
  }

  const canManage = myRole === 'super_admin' || myRole === 'admin'

  const filtered = users.filter(u => {
    const email = u.email ?? ''
    const name  = u.full_name ?? ''
    if (roleFilter && u.role !== roleFilter) return false
    if (search && !email.toLowerCase().includes(search.toLowerCase()) &&
        !name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const todayStr = new Date().toISOString().slice(0, 10)
  const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const newToday = users.filter(u => u.created_at?.slice(0, 10) === todayStr).length
  const newWeek  = users.filter(u => u.created_at && new Date(u.created_at) >= weekAgo).length
  const lineConn = users.filter(u => u.line_user_id).length

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium text-primary">จัดการ Users</h1>
          <p className="text-[12px] text-muted mt-0.5">{users.length} users · role ของฉัน: <span className="font-medium" style={{ color: roleConf(myRole).color }}>{roleConf(myRole).label}</span></p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'ทั้งหมด',      value: users.length, color: 'var(--accent)' },
          { label: 'สมัครวันนี้',  value: newToday,     color: '#1D9E75' },
          { label: '7 วันล่าสุด',  value: newWeek,      color: '#3B82F6' },
          { label: 'เชื่อม LINE',  value: lineConn,     color: '#06C755' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <p className="text-[22px] font-medium" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 flex-1"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Search size={14} className="text-muted shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา email, ชื่อ..."
            className="bg-transparent text-[13px] text-primary outline-none w-full placeholder:text-muted" />
          {search && <button onClick={() => setSearch('')}><X size={13} className="text-muted" /></button>}
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="input-theme text-[13px]">
          <option value="">ทุก Role</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Role chips */}
      <div className="flex gap-2 flex-wrap mb-5">
        {ROLES.map(r => {
          const count = users.filter(u => u.role === r.value).length
          if (!count) return null
          return (
            <button key={r.value} onClick={() => setRoleFilter(roleFilter === r.value ? '' : r.value)}
              className="text-[11px] px-3 py-1.5 rounded-full font-medium transition-all"
              style={{
                background: roleFilter === r.value ? r.bg : 'var(--surface-2)',
                color:      roleFilter === r.value ? r.color : 'var(--text-muted)',
                border:     `1px solid ${roleFilter === r.value ? r.color + '40' : 'var(--border)'}`,
              }}>
              {r.label} <span className="opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(u => {
            const conf   = roleConf(u.role)
            const email  = u.email ?? '—'
            const name   = u.full_name ?? ''
            const avatar = u.avatar_url ?? ''
            const isExpanded = linking === u.id
            const linkedArtist = artists.find(a => a.id === u.artist_id)
            const linkedVenue  = venues.find(v => v.id === u.venue_id)

            return (
              <div key={u.id} className="rounded-xl overflow-hidden"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

                {/* Main row */}
                <div className="flex items-center gap-3 p-3">
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[12px] font-medium"
                      style={{ background: conf.bg, color: conf.color }}>
                      {email[0]?.toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {name && <p className="text-[13px] font-medium text-primary truncate">{name}</p>}
                    <p className="text-[11px] text-muted truncate">{email}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {u.created_at && (
                        <p className="text-[10px] text-muted">
                          สมัคร: {new Date(u.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </p>
                      )}
                      {u.line_user_id && (
                        <p className="text-[10px]" style={{ color: '#06C755' }}>● LINE</p>
                      )}
                      {u.province && (
                        <p className="text-[10px] text-muted">📍 {u.province}</p>
                      )}
                    </div>
                    {/* Linked info */}
                    {u.role === 'artist_manager' && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#0C447C' }}>
                        {linkedArtist ? `ศิลปิน: ${linkedArtist.name}` : 'ยังไม่ได้ผูกศิลปิน'}
                      </p>
                    )}
                    {u.role === 'venue_manager' && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#3C3489' }}>
                        {linkedVenue ? `Venue: ${linkedVenue.name}` : 'ยังไม่ได้ผูก venue'}
                      </p>
                    )}
                  </div>

                  {/* Role selector */}
                  {canManage ? (
                    <div className="relative shrink-0">
                      <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                        className="appearance-none text-[11px] font-medium px-3 py-1.5 rounded-full pr-7 cursor-pointer outline-none"
                        style={{ background: conf.bg, color: conf.color, border: `1px solid ${conf.color}30` }}>
                        {ROLES.map(r => (
                          myRole === 'super_admin' || r.value !== 'super_admin'
                            ? <option key={r.value} value={r.value}>{r.label}</option>
                            : null
                        ))}
                      </select>
                      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: conf.color }} />
                    </div>
                  ) : (
                    <span className="text-[11px] font-medium px-3 py-1.5 rounded-full shrink-0"
                      style={{ background: conf.bg, color: conf.color }}>
                      {conf.label}
                    </span>
                  )}

                  {/* Link button for artist/venue managers */}
                  {canManage && (u.role === 'artist_manager' || u.role === 'venue_manager') && (
                    <button onClick={() => setLinking(isExpanded ? null : u.id)}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg shrink-0 transition-colors"
                      style={{
                        background: isExpanded ? 'var(--accent-muted)' : 'var(--surface-2)',
                        color: isExpanded ? 'var(--accent)' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}>
                      ผูก {u.role === 'artist_manager' ? 'ศิลปิน' : 'venue'}
                    </button>
                  )}

                  {/* History */}
                  <button
                    onClick={() => {
                      if (selectedUser?.id === u.id) { setSelectedUser(null); setUserHistory(null) }
                      else { setSelectedUser(u); loadUserHistory(u.id) }
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors text-muted"
                    style={{ background: selectedUser?.id === u.id ? 'var(--accent-muted)' : 'var(--surface-2)', border: '1px solid var(--border)', color: selectedUser?.id === u.id ? 'var(--accent)' : undefined }}
                    title="ดูประวัติ">
                    <History size={13} />
                  </button>

                  {/* Delete */}
                  {myRole === 'super_admin' && (
                    <button onClick={() => setDeleteId(u.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:text-red-400 text-muted"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Link panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    {u.role === 'artist_manager' && (
                      <div>
                        <p className="text-[11px] text-muted mb-2">เลือกศิลปินที่จะผูก</p>
                        <div className="flex gap-2">
                          <select
                            value={u.artist_id ?? ''}
                            onChange={e => linkArtist(u.id, e.target.value || null)}
                            className="input-theme text-[12px] flex-1">
                            <option value="">— ไม่ผูก —</option>
                            {artists.map(a => (
                              <option key={a.id} value={a.id}>{a.name_en || a.name}</option>
                            ))}
                          </select>
                          <button onClick={() => setLinking(null)} className="btn-ghost text-[12px] px-3 py-2">เสร็จ</button>
                        </div>
                      </div>
                    )}
                    {u.role === 'venue_manager' && (
                      <div>
                        <p className="text-[11px] text-muted mb-2">เลือก venue ที่จะผูก</p>
                        <div className="flex gap-2">
                          <select
                            value={u.venue_id ?? ''}
                            onChange={e => linkVenue(u.id, e.target.value || null)}
                            className="input-theme text-[12px] flex-1">
                            <option value="">— ไม่ผูก —</option>
                            {venues.map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                          <button onClick={() => setLinking(null)} className="btn-ghost text-[12px] px-3 py-2">เสร็จ</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* History Panel */}
              {selectedUser?.id === u.id && (
                <div className="border-t border-[var(--border)] p-4" style={{ background: 'var(--surface-2)' }}>
                  {loadingHistory ? (
                    <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-muted" /></div>
                  ) : userHistory && (
                    <div className="flex flex-col gap-4">
                      <div className="flex gap-4 flex-wrap">
                        <div className="text-center">
                          <p className="text-[18px] font-medium text-primary">{u.score ?? 0}</p>
                          <p className="text-[10px] text-muted">คะแนน</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[18px] font-medium text-primary">{userHistory.photos.length}</p>
                          <p className="text-[10px] text-muted">รูปโพสต์</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[18px] font-medium text-primary">{userHistory.reports.length}</p>
                          <p className="text-[10px] text-muted">Report ที่ส่ง</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[18px] font-medium text-primary">{userHistory.submissions.length}</p>
                          <p className="text-[10px] text-muted">ส่ง Event</p>
                        </div>
                      </div>

                      {userHistory.photos.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-2">รูปที่โพสต์</p>
                          <div className="flex flex-col gap-1.5">
                            {userHistory.photos.map((p: any) => (
                              <div key={p.id} className="flex items-center gap-2 rounded-lg p-2"
                                style={{ background: 'var(--surface-1)' }}>
                                <img src={p.url} alt="" className="w-10 h-8 rounded object-cover shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-primary truncate">{p.event?.title ?? '-'}</p>
                                  <p className="text-[10px] text-muted">{p.created_at?.slice(0,10)}</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  {p.is_hidden && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(226,75,74,.1)', color: '#E24B4A' }}>ซ่อน</span>}
                                  {p.report_count > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,159,39,.1)', color: '#854F0B' }}>Report {p.report_count}</span>}
                                  {!p.is_hidden && p.report_count === 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(29,158,117,.1)', color: '#1D9E75' }}>ปกติ</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {userHistory.reports.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-2">Report ที่ส่ง</p>
                          <div className="flex flex-col gap-1.5">
                            {userHistory.reports.map((r: any) => (
                              <div key={r.id} className="flex items-center gap-2 rounded-lg p-2"
                                style={{ background: 'var(--surface-1)' }}>
                                {r.photo?.url && <img src={r.photo.url} alt="" className="w-10 h-8 rounded object-cover shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-primary truncate">{r.photo?.event?.title ?? '-'}</p>
                                  <p className="text-[10px] text-muted">{r.created_at?.slice(0,10)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {userHistory.submissions.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-2">Event ที่ส่ง</p>
                          <div className="flex flex-col gap-1">
                            {userHistory.submissions.map((s: any) => (
                              <div key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                                style={{ background: 'var(--surface-1)' }}>
                                <span className="flex-1 text-[11px] text-primary truncate">{s.title}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded"
                                  style={{
                                    background: s.status === 'approved' ? 'rgba(29,158,117,.1)' : s.status === 'rejected' ? 'rgba(226,75,74,.1)' : 'rgba(239,159,39,.1)',
                                    color: s.status === 'approved' ? '#1D9E75' : s.status === 'rejected' ? '#E24B4A' : '#854F0B'
                                  }}>
                                  {s.status === 'approved' ? 'อนุมัติ' : s.status === 'rejected' ? 'ปฏิเสธ' : 'รออนุมัติ'}
                                </span>
                                <span className="text-[10px] text-muted shrink-0">{s.created_at?.slice(0,10)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="rounded-xl p-10 text-center"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <User size={32} className="mx-auto mb-3 text-muted" />
              <p className="text-[13px] text-muted">ไม่พบ user ที่ตรงกัน</p>
            </div>
          )}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(226,75,74,.1)' }}>
              <Trash2 size={20} style={{ color: '#E24B4A' }} />
            </div>
            <h3 className="text-[15px] font-medium text-primary text-center mb-2">ลบ User นี้?</h3>
            <p className="text-[12px] text-muted text-center mb-5">
              ข้อมูลทั้งหมด (follows, attendance, profile) จะถูกลบถาวร ตาม PDPA
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1 py-2.5 text-[13px]">ยกเลิก</button>
              <button onClick={() => deleteUser(deleteId)}
                className="flex-1 py-2.5 text-[13px] rounded-xl font-medium"
                style={{ background: '#E24B4A', color: '#fff' }}>ลบเลย</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

