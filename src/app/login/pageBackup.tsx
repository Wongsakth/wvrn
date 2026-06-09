'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Mail, Lock, Eye, EyeOff, Loader2, Zap, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

type Mode = 'login' | 'register' | 'forgot'

export default function LoginPage() {
  const [mode,      setMode]      = useState<Mode>('login')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [showCf,    setShowCf]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const sb = createClient()

  const pwMatch   = confirm === password
  const pwStrong  = password.length >= 8
  const pwStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 8 ? 2 : password.length < 12 ? 3 : 4

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('กรุณากรอกให้ครบ'); return }
    if (mode === 'register') {
      if (password.length < 8) { toast.error('Password ต้องมีอย่างน้อย 8 ตัวอักษร'); return }
      if (password !== confirm) { toast.error('Password ไม่ตรงกัน'); return }
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('เข้าสู่ระบบสำเร็จ!')
        window.location.href = '/'
      } else {
        const { error } = await sb.auth.signUp({ email, password })
        if (error) throw error
        toast.success('สมัครสมาชิกสำเร็จ! เช็ค Email เพื่อยืนยันบัญชี')
        setMode('login')
      }
    } catch (err: any) {
      const msg = err.message
      if (msg.includes('Invalid login'))  toast.error('Email หรือ Password ไม่ถูกต้อง')
      else if (msg.includes('already'))   toast.error('Email นี้มีบัญชีอยู่แล้ว')
      else if (msg.includes('Password'))  toast.error('Password ต้องมีอย่างน้อย 8 ตัวอักษร')
      else toast.error(msg)
    } finally { setLoading(false) }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { toast.error('กรุณาใส่ Email'); return }
    setLoading(true)
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      toast.success('ส่ง link รีเซ็ต password ไปที่ Email แล้ว')
    } catch (err: any) {
      toast.error(err.message)
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setLoading(true)
    try {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  function switchMode(m: Mode) {
    setMode(m); setPassword(''); setConfirm(''); setShowPw(false); setShowCf(false)
  }

  const isLogin = mode === 'login', isRegister = mode === 'register', isForgot = mode === 'forgot'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--surface-0)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <img src="/logo.png" alt="WVRN" className="w-10 h-10 rounded-xl object-cover" />
            <span className="text-[22px] font-medium tracking-[4px]" style={{ color: 'var(--accent)' }}>WVRN</span>
          </div>
          <h1 className="text-[18px] font-medium text-primary">
            {isLogin ? 'เข้าสู่ระบบ' : isRegister ? 'สมัครสมาชิก' : 'รีเซ็ต Password'}
          </h1>
          <p className="text-[13px] text-muted mt-1">
            {isLogin ? 'ติดตามศิลปิน ไม่พลาดทุก Concert'
            : isRegister ? 'สร้างบัญชีเพื่อเริ่มติดตามศิลปิน'
            : 'ส่ง link รีเซ็ตไปยัง Email ของคุณ'}
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

          {/* Google */}
          {!isForgot && (
            <>
              <button onClick={handleGoogle} disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-[14px] font-medium transition-all mb-4"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {isLogin ? 'เข้าสู่ระบบด้วย Google' : 'สมัครด้วย Google'}
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-[11px] text-muted">หรือ</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={isForgot ? handleForgot : handleEmail}>
            <div className="flex flex-col gap-3">

              {/* Email */}
              <div>
                <label className="block text-[12px] text-muted mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com" required className="input-theme pl-9" />
                </div>
              </div>

              {/* Password */}
              {!isForgot && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12px] text-muted">Password</label>
                    {isLogin && (
                      <button type="button" onClick={() => switchMode('forgot')}
                        className="text-[11px]" style={{ color: 'var(--accent)' }}>
                        ลืม password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={isRegister ? 'อย่างน้อย 8 ตัวอักษร' : 'Password'}
                      required className="input-theme pl-9 pr-9" />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Strength bar — register only */}
                  {isRegister && password && (
                    <div className="mt-2 flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-colors"
                          style={{
                            background: pwStrength >= i
                              ? i === 1 ? '#E24B4A' : i === 2 ? '#EF9F27' : i === 3 ? '#60a5fa' : '#1D9E75'
                              : 'var(--surface-3)'
                          }} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password — register only */}
              {isRegister && (
                <div>
                  <label className="block text-[12px] text-muted mb-1.5">ยืนยัน Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input type={showCf ? 'text' : 'password'} value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="พิมพ์ password อีกครั้ง"
                      required className="input-theme pl-9 pr-9" />
                    <button type="button" onClick={() => setShowCf(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                      {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirm && (
                    <p className="text-[11px] mt-1.5 flex items-center gap-1"
                      style={{ color: pwMatch ? '#1D9E75' : '#E24B4A' }}>
                      {pwMatch
                        ? <><CheckCircle2 size={11} /> Password ตรงกัน</>
                        : <><AlertCircle size={11} /> Password ไม่ตรงกัน</>}
                    </p>
                  )}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading || (isRegister && (!pwMatch || !pwStrong))}
                className="btn-accent w-full py-2.5 flex items-center justify-center gap-2 mt-1 disabled:opacity-50">
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> กำลังดำเนินการ...</>
                  : isLogin    ? <><Zap size={15} /> เข้าสู่ระบบ</>
                  : isRegister ? 'สมัครสมาชิก'
                  :              'ส่ง link รีเซ็ต'}
              </button>
            </div>
          </form>

          {/* Apply editor link — register only */}
          {isRegister && (
            <p className="text-[11px] text-muted text-center mt-4">
              ต้องการเป็น Editor?{' '}
              <a href="/apply-editor" style={{ color: 'var(--accent)' }}>ยื่นคำขอหลัง สมัครสมาชิก →</a>
            </p>
          )}
        </div>

        {/* Switch */}
        <div className="text-center mt-4 text-[13px] text-muted">
          {isForgot ? (
            <button onClick={() => switchMode('login')} style={{ color: 'var(--accent)' }}>← กลับไปหน้า Login</button>
          ) : isLogin ? (
            <>ยังไม่มีบัญชี?{' '}<button onClick={() => switchMode('register')} style={{ color: 'var(--accent)' }}>สมัครสมาชิก</button></>
          ) : (
            <>มีบัญชีแล้ว?{' '}<button onClick={() => switchMode('login')} style={{ color: 'var(--accent)' }}>เข้าสู่ระบบ</button></>
          )}
        </div>
        <div className="text-center mt-3">
          <a href="/" className="text-[12px] text-muted hover:text-primary transition-colors">← กลับหน้าหลัก</a>
        </div>
      </div>
    </div>
  )
}
