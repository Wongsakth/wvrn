'use client'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldOff } from 'lucide-react'

interface Props {
  children: React.ReactNode
  require?: 'isAdmin' | 'super_admin'
}

export default function AdminGuard({ children, require = 'isAdmin' }: Props) {
  const { user, role, isAdmin, loading } = useAuth()
  const router = useRouter()

  const allowed = !loading && user && (
    require === 'super_admin' ? role === 'super_admin' : isAdmin
  )

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-muted" />
    </div>
  )

  if (!allowed) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(226,75,74,.08)' }}>
        <ShieldOff size={24} style={{ color: '#E24B4A' }} />
      </div>
      <p className="text-[15px] font-medium text-primary">ไม่มีสิทธิ์เข้าถึง</p>
      <p className="text-[12px] text-muted">
        {require === 'super_admin' ? 'เฉพาะ Super Admin เท่านั้น' : 'ต้องมีสิทธิ์ Admin หรือสูงกว่า'}
      </p>
      <button onClick={() => router.push('/')} className="btn-ghost text-[13px] py-2 px-4 mt-2">
        กลับหน้าหลัก
      </button>
    </div>
  )

  return <>{children}</>
}
