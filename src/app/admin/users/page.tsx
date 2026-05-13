'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, X, Loader2, Shield, ChevronDown, Trash2, User } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: '#E8003A', bg: 'rgba(232,0,58,.1)'   },
  { value: 'admin',       label: 'Admin',        color: '#EF9F27', bg: 'rgba(239,159,39,.1)' },
  { value: 'editor',      label: 'Editor',       color: '#5DCAA5', bg: 'rgba(93,202,165,.1)' },
  { value: 'venue_admin', label: 'Venue Admin',  color: '#60a5fa', bg: 'rgba(96,165,250,.1)' },
  { value: 'user',        label: 'User',         color: '#94A3B8', bg: 'rgba(148,163,184,.1)' },
]

const roleConf = (r: string) => ROLES.find(x => x.value === r) ?? ROLES[4]

export default function AdminUsersPage() {
  const [users,      setUsers]      = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [myRole,     setMyRole]     = useState('')
  const sb = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data: p } = await sb.from('user_profiles').select('role').eq('id', user.id).single()
        setMyRole(p?.role ?? 'user')
      }
      const { data, error } = await sb.from('user_profiles')
        .select('id, role, created_at, email, full_name, avatar_url')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
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

  async function deleteUser(userId: string) {
    try {
      const { error } = await sb.rpc('delete_user_data', { target_user_id: userId })
      if (error) throw error
      setUsers(prev => prev.filter(u => u.id !== userId))
      setDeleteId(null)
      toast.success('ลบ user แล้ว')
    } catch (e: any) { toast.error(e.message) }
  }

  const isSuperAdmin = myRole === 'super_admin' || myRole === 'admin'

  const filtered = users.filter(u => {
    const email = u.email ?? ''
    const name  = u.full_name ?? ''
    if (roleFilter && u.role !== roleFilter) return false
    if (search && !email.toLowerCase().includes(search.toLowerCase()) &&
        !name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium text-primary">จัดการ Users</h1>
          <p className="text-[12px] text-muted mt-0.5">{users.length} users ทั้งหมด</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 flex-1"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Search size={14} className="text-muted shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา email, ชื่อ..."
            className="bg-transparent text-[13px] text-primary outline-none w-full placeholder:text-muted" />
          {search && <button onClick={() => setSearch('')}><X size={13} className="text-muted" /></button>}
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="input-theme text-[13px] pr-8">
          <option value="">ทุก Role</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Role summary chips */}
      <div className="flex gap-2 flex-wrap mb-5">
        {ROLES.map(r => {
          const count = users.filter(u => u.role === r.value).length
          if (!count) return null
          return (
            <button key={r.value} onClick={() => setRoleFilter(roleFilter === r.value ? '' : r.value)}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-medium transition-all"
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
            

            return (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

                {/* Avatar */}
                {avatar ? (
                  <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[12px] font-medium"
                    style={{ background: conf.bg, color: conf.color }}>
                    {email[0]?.toUpperCase()}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {name && <p className="text-[13px] font-medium text-primary truncate">{name}</p>}
                  <p className="text-[11px] text-muted truncate">{email}</p>
                  <p className="text-[10px] text-muted">{new Date(u.created_at).toLocaleDateString('th-TH')}</p>
                </div>

                {/* Role selector */}
                {isSuperAdmin ? (
                  <div className="relative shrink-0">
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="appearance-none text-[11px] font-medium px-3 py-1.5 rounded-full pr-7 cursor-pointer outline-none"
                      style={{ background: conf.bg, color: conf.color, border: `1px solid ${conf.color}30` }}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
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

                {/* Delete */}
                {isSuperAdmin && (
                  <button onClick={() => setDeleteId(u.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:text-red-400 text-muted"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <Trash2 size={13} />
                  </button>
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

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
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
                className="flex-1 py-2.5 text-[13px] rounded-lg font-medium"
                style={{ background: '#E24B4A', color: '#fff' }}>ลบเลย</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
