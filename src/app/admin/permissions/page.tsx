// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Loader2, Save, Lock, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

type Role = 'super_admin' | 'admin' | 'editor' | 'artist_manager' | 'venue_manager' | 'user'

interface Permission {
  id: string
  permission: string
  category: string
  super_admin: boolean
  admin: boolean
  editor: boolean
  artist_manager: boolean
  venue_manager: boolean
  user: boolean
  is_locked: boolean
  description: string
}

const ROLES: { key: Role; label: string; color: string; bg: string }[] = [
  { key: 'super_admin',    label: 'Super Admin',   color: '#791F1F', bg: '#FCEBEB' },
  { key: 'admin',          label: 'Admin',          color: '#633806', bg: '#FAEEDA' },
  { key: 'editor',         label: 'Editor',         color: '#085041', bg: '#E1F5EE' },
  { key: 'artist_manager', label: 'Artist Mgr',    color: '#0C447C', bg: '#E6F1FB' },
  { key: 'venue_manager',  label: 'Venue Mgr',     color: '#3C3489', bg: '#EEEDFE' },
  { key: 'user',           label: 'User',           color: '#444441', bg: '#F1EFE8' },
]

const CATEGORY_LABEL: Record<string, string> = {
  events:  'Events',
  artists: 'Artists & Venues',
  venues:  'Artists & Venues',
  system:  'Users & System',
}

export default function PermissionsPage() {
  const [perms,   setPerms]   = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [changed, setChanged] = useState<Set<string>>(new Set())
  const { role, loading: authLoading } = useAuth()
  const router = useRouter()
  const sb = createClient()

  useEffect(() => {
    if (!authLoading && role !== 'super_admin') {
      router.replace('/admin')
    }
  }, [role, authLoading])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('permission_matrix')
      .select('*').order('category').order('permission')
    setPerms(data || [])
    setLoading(false)
  }

  function toggle(permId: string, roleKey: Role) {
    setPerms(prev => prev.map(p => {
      if (p.id !== permId || p.is_locked) return p
      if (roleKey === 'super_admin') return p // super_admin always true
      return { ...p, [roleKey]: !p[roleKey] }
    }))
    setChanged(prev => new Set(prev).add(permId))
  }

  async function saveAll() {
    setSaving(true)
    try {
      const toSave = perms.filter(p => changed.has(p.id))
      for (const p of toSave) {
        const { error } = await sb.from('permission_matrix').update({
          admin:          p.admin,
          editor:         p.editor,
          artist_manager: p.artist_manager,
          venue_manager:  p.venue_manager,
          user:           p.user,
          updated_at:     new Date().toISOString(),
        }).eq('id', p.id)
        if (error) throw error
      }
      setChanged(new Set())
      toast.success(`บันทึก ${toSave.length} รายการ`)
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  // Group by category
  const grouped = perms.reduce((acc, p) => {
    const cat = CATEGORY_LABEL[p.category] ?? p.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<string, Permission[]>)

  if (authLoading) return null
  if (role !== 'super_admin') return null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium text-primary flex items-center gap-2">
            <Shield size={20} style={{ color: 'var(--accent)' }} />
            Permission Matrix
          </h1>
          <p className="text-[12px] text-muted mt-0.5">
            กำหนดสิทธิ์แต่ละ role — เฉพาะ Super Admin เท่านั้น
          </p>
        </div>
        {changed.size > 0 && (
          <button onClick={saveAll} disabled={saving}
            className="btn-accent flex items-center gap-2 py-2 px-5 text-[13px]">
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> บันทึก...</>
              : <><Save size={14} /> บันทึก ({changed.size} รายการ)</>
            }
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 text-[12px] text-muted flex-wrap">
        <span className="flex items-center gap-1.5">
          <Lock size={12} style={{ color: 'var(--accent)' }} />
          lock = กำหนดถาวร เปลี่ยนไม่ได้
        </span>
        <span>☑ = toggle ได้</span>
        <span style={{ opacity: .5 }}>— = ไม่มีสิทธิ์</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 700 }}>
              <colgroup>
                <col style={{ width: '220px' }} />
                {ROLES.map(r => <col key={r.key} style={{ width: '100px' }} />)}
              </colgroup>

              {/* Role header */}
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', background: 'var(--surface-2)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    สิทธิ์
                  </th>
                  {ROLES.map(r => (
                    <th key={r.key} style={{ padding: '10px 8px', textAlign: 'center', background: r.bg, fontSize: 11, fontWeight: 500, color: r.color }}>
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {Object.entries(grouped).map(([cat, items]) => (
                  <>
                    {/* Category header */}
                    <tr key={`cat-${cat}`} style={{ background: 'var(--surface-2)' }}>
                      <td colSpan={7} style={{ padding: '6px 16px', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                        {cat}
                      </td>
                    </tr>

                    {/* Permission rows */}
                    {items.map((p, i) => (
                      <tr key={p.id}
                        style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', background: changed.has(p.id) ? 'var(--accent-muted)' : 'var(--surface-1)', transition: 'background .15s' }}>
                        <td style={{ padding: '11px 16px' }}>
                          <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>{p.description}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0', fontFamily: 'monospace' }}>{p.permission}</p>
                        </td>
                        {ROLES.map(r => {
                          const val      = p[r.key]
                          const isLocked = p.is_locked || r.key === 'super_admin'
                          return (
                            <td key={r.key} style={{ textAlign: 'center', padding: '11px 8px' }}>
                              {isLocked ? (
                                val
                                  ? <span style={{ color: '#1D9E75', fontSize: 16 }}>✓</span>
                                  : <span style={{ color: 'var(--text-muted)', fontSize: 14, opacity: .4 }}>—</span>
                              ) : (
                                <button
                                  onClick={() => toggle(p.id, r.key)}
                                  style={{
                                    width: 28, height: 28, borderRadius: 8,
                                    border: `1.5px solid ${val ? r.color + '60' : 'var(--border)'}`,
                                    background: val ? r.bg : 'transparent',
                                    cursor: 'pointer', display: 'inline-flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    transition: 'all .15s',
                                  }}>
                                  {val && <span style={{ fontSize: 13, color: r.color }}>✓</span>}
                                </button>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

