'use client'
import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'
import {
  User, Heart, MapPin, Calendar, LogOut, Shield,
  ChevronRight, Music, Palette, Lock, Eye, EyeOff,
  CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react'
import { useTheme, THEMES } from '@/lib/theme'
import toast from 'react-hot-toast'

type Section = 'main' | 'theme' | 'password'

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  admin:  { label: 'Admin',  color: '#E8003A',        bg: 'rgba(232,0,58,.1)',   icon: 'A' },
  editor: { label: 'Editor', color: '#EF9F27',        bg: 'rgba(239,159,39,.1)', icon: 'E' },
  user:   { label: 'User',   color: 'var(--accent)',  bg: 'var(--accent-muted)', icon: 'U' },
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [stats,     setStats]     = useState({ artists: 0, venues: 0, going: 0, attended: 0 })
  const [section,   setSection]   = useState<Section>('main')
  const [role,      setRole]      = useState('user')
  const [pwForm,    setPwForm]    = useState({ next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [showPw,    setShowPw]    = useState({ next: false, confirm: false })
  const sb = createClient()
  const isEmailUser = !user?.app_metadata?.provider || user?.app_metadata?.provider === 'email'

  useEffect(() => {
    if (!user) return
    const r = user.user_metadata?.role ?? user.app_metadata?.role ?? 'user'
    setRole(r)

    const getVenueFollowsCount = async () => {
      try {
        return await sb.from('venue_follows').select('id', { count: 'exact' }).eq('user_id', user.id)
      } catch {
        return { count: 0 }
      }
    }

    Promise.all([
      sb.from('follows').select('id', { count: 'exact' }).eq('user_id', user.id),
      getVenueFollowsCount(),
      sb.from('event_attendance').select('id,status').eq('user_id', user.id),
    ]).then(([ar, vr, at]) => {
      const att = (at as any).data || []
      setStats({
        artists:  ar.count ?? 0,
        venues:   (vr as any).count ?? 0,
        going:    att.filter((a: any) => a.status === 'going').length,
        attended: att.filter((a: any) => a.status === 'attended').length,
      })
    })
  }, [user])

  async function handleChangePassword() {
    if (!pwForm.next || !pwForm.confirm)   { toast.error('กรุณากรอกรหัสผ่านให้ครบ'); return }
    if (pwForm.next !== pwForm.confirm)    { toast.error('รหัสผ่านใหม่ไม่ตรงกัน'); return }
    if (pwForm.next.length < 8)            { toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return }
    setPwLoading(true)
    try {
      const { error } = await sb.auth.updateUser({ password: pwForm.next })
      if (error) throw error
      toast.success('เปลี่ยนรหัสผ่านสำเร็จแล้ว')
      setPwForm({ next: '', confirm: '' })
      setSection('main')
    } catch (e: any) { toast.error(e.message || 'เกิดข้อผิดพลาด') }
    finally { setPwLoading(false) }
  }

  if (!user) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <User size={40} className="mx-auto mb-4 text-muted" />
        <p className="text-[15px] font-medium text-primary mb-4">Login เพื่อดูโปรไฟล์</p>
        <button onClick={() => window.location.href = '/login'} className="btn-accent py-2 px-6 text-[14px]">Login</button>
      </div>
    </div>
  )

  const roleConf = ROLE_CONFIG[role] ?? ROLE_CONFIG.user

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-screen-sm mx-auto px-4 py-6">

        {section !== 'main' && (
          <button onClick={() => setSection('main')}
            className="flex items-center gap-1 text-[13px] text-muted mb-4 hover:text-primary transition-colors">
            ← กลับ
          </button>
        )}

        {/* ── MAIN ── */}
        {section === 'main' && (
          <>
            {/* Profile card */}
            <div className="rounded-2xl p-6 mb-4 text-center"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt=""
                  className="w-20 h-20 rounded-full mx-auto mb-3 object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-[28px] font-medium"
                  style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                  {(user.email ?? 'U')[0].toUpperCase()}
                </div>
              )}
              <p className="text-[18px] font-medium text-primary mb-0.5">
                {user.user_metadata?.full_name ?? user.email?.split('@')[0]}
              </p>
              <p className="text-[12px] text-muted mb-3">{user.email}</p>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1 rounded-full"
                style={{ background: roleConf.bg, color: roleConf.color, border: `1px solid ${roleConf.color}30` }}>
                {roleConf.label}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'ศิลปิน',  value: stats.artists,  href: '/following'           },
                { label: 'สถานที่', value: stats.venues,   href: '/following?tab=venues' },
                { label: 'จะไป',   value: stats.going,    href: '/following?tab=going'  },
                { label: 'ไปแล้ว', value: stats.attended, href: '/following?tab=going'  },
              ].map(s => (
                <button key={s.label} onClick={() => window.location.href = s.href}
                  className="rounded-xl py-3 px-2 text-center transition-all"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  <p className="text-[20px] font-medium text-accent">{s.value}</p>
                  <p className="text-[10px] text-muted mt-0.5">{s.label}</p>
                </button>
              ))}
            </div>

            {/* Settings */}
            <div className="rounded-2xl overflow-hidden mb-4"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="text-[11px] font-medium text-muted uppercase tracking-wide">ตั้งค่า</p>
              </div>

              {/* Theme */}
              <button onClick={() => setSection('theme')}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--surface-2)] transition-colors"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--accent-muted)' }}>
                  <Palette size={15} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] text-primary">ธีม</p>
                  <p className="text-[11px] text-muted">
                    {THEMES.find(t => t.id === theme)?.emoji} {THEMES.find(t => t.id === theme)?.label}
                  </p>
                </div>
                <ChevronRight size={14} className="text-muted" />
              </button>

              {/* Password — email users only */}
              {isEmailUser && (
                <button onClick={() => setSection('password')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--surface-2)] transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--surface-2)' }}>
                    <Lock size={15} className="text-muted" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[14px] text-primary">เปลี่ยนรหัสผ่าน</p>
                    <p className="text-[11px] text-muted">อัปเดตรหัสผ่านของคุณ</p>
                  </div>
                  <ChevronRight size={14} className="text-muted" />
                </button>
              )}

              {/* Following */}
              <button onClick={() => window.location.href = '/following'}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--surface-2)] transition-colors"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--surface-2)' }}>
                  <Heart size={15} className="text-muted" />
                </div>
                <p className="text-[14px] text-primary flex-1 text-left">รายการที่ติดตาม</p>
                <ChevronRight size={14} className="text-muted" />
              </button>

              {/* Disclaimer */}
              <button onClick={() => window.location.href = '/disclaimer'}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--surface-2)] transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--surface-2)' }}>
                  <Shield size={15} className="text-muted" />
                </div>
                <p className="text-[14px] text-primary flex-1 text-left">ข้อจำกัดความรับผิดชอบ</p>
                <ChevronRight size={14} className="text-muted" />
              </button>
            </div>

            {/* Admin/Editor shortcut */}
            {(role === 'admin' || role === 'editor') && (
              <button onClick={() => window.location.href = '/admin'}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-medium mb-4 transition-all"
                style={{ background: 'rgba(232,0,58,.08)', border: '1px solid rgba(232,0,58,.2)', color: '#E8003A' }}>
                Admin Panel
              </button>
            )}

            {/* Logout */}
            <button onClick={signOut}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-medium"
              style={{ background: 'rgba(226,75,74,.06)', border: '1px solid rgba(226,75,74,.15)', color: '#E24B4A' }}>
              <LogOut size={16} /> ออกจากระบบ
            </button>
          </>
        )}

        {/* ── THEME ── */}
        {section === 'theme' && (
          <div>
            <h2 className="text-[18px] font-medium text-primary mb-5 flex items-center gap-2">
              <Palette size={18} style={{ color: 'var(--accent)' }} /> เลือกธีม
            </h2>
            <div className="flex flex-col gap-2">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all"
                  style={{
                    background: theme === t.id ? 'var(--accent-muted)' : 'var(--surface-1)',
                    border: `1.5px solid ${theme === t.id ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  <span className="text-[26px]">{t.emoji}</span>
                  <p className="text-[14px] font-medium flex-1"
                    style={{ color: theme === t.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {t.label}
                  </p>
                  {theme === t.id && <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PASSWORD ── */}
        {section === 'password' && (
          <div>
            <h2 className="text-[18px] font-medium text-primary mb-5 flex items-center gap-2">
              <Lock size={18} style={{ color: 'var(--accent)' }} /> เปลี่ยนรหัสผ่าน
            </h2>

            <div className="rounded-2xl p-5 mb-4 flex flex-col gap-5"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

              {/* New password */}
              <div>
                <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">
                  รหัสผ่านใหม่
                </label>
                <div className="relative">
                  <input
                    type={showPw.next ? 'text' : 'password'}
                    value={pwForm.next}
                    onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    className="input-theme text-[14px] w-full pr-10"
                  />
                  <button onClick={() => setShowPw(s => ({ ...s, next: !s.next }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                    {showPw.next ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwForm.next && (
                  <div className="flex gap-1 mt-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-colors"
                        style={{
                          background: pwForm.next.length >= i * 2
                            ? i <= 1 ? '#E24B4A' : i <= 2 ? '#EF9F27' : i <= 3 ? '#60a5fa' : '#1D9E75'
                            : 'var(--surface-3)'
                        }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <div className="relative">
                  <input
                    type={showPw.confirm ? 'text' : 'password'}
                    value={pwForm.confirm}
                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                    className="input-theme text-[14px] w-full pr-10"
                  />
                  <button onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                    {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                  <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#E24B4A' }}>
                    <AlertCircle size={11} /> รหัสผ่านไม่ตรงกัน
                  </p>
                )}
                {pwForm.confirm && pwForm.next === pwForm.confirm && pwForm.next.length >= 8 && (
                  <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#1D9E75' }}>
                    <CheckCircle2 size={11} /> รหัสผ่านตรงกัน
                  </p>
                )}
              </div>
            </div>

            <button onClick={handleChangePassword} disabled={pwLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-medium"
              style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}>
              {pwLoading
                ? <><Loader2 size={15} className="animate-spin" /> กำลังบันทึก...</>
                : <><Lock size={15} /> บันทึกรหัสผ่านใหม่</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
