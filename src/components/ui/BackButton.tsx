'use client'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function BackButton({ label = 'กลับ' }: { label?: string }) {
  const router = useRouter()
  return (
    <div style={{ position: 'sticky', top: 52, zIndex: 40, paddingBottom: 8 }}>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5"
        style={{
          padding: '6px 14px',
          borderRadius: 10,
          background: 'var(--accent-muted)',
          border: '1px solid rgba(212,83,126,.3)',
          color: 'var(--accent)',
          fontSize: 13,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}>
        <ChevronLeft size={15} />
        {label}
      </button>
    </div>
  )
}