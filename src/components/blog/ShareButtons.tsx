'use client'
import { Share2, Link2, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface Props {
  title: string
  slug:  string
}

export default function ShareButtons({ title, slug }: Props) {
  const [copied, setCopied] = useState(false)
  const url = `https://www.wvrn.app/blog/${slug}`

  function copyLink() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('คัดลอกลิงก์แล้ว')
    setTimeout(() => setCopied(false), 2000)
  }

  function shareNative() {
    if (navigator.share) {
      navigator.share({ title, url })
    } else {
      copyLink()
    }
  }

  function shareLine() {
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`, '_blank')
  }

  function shareFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[12px] text-muted">แชร์:</span>

      {/* LINE */}
      <button onClick={shareLine}
        className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
        style={{ background: '#06C755', color: 'white' }}>
        <MessageCircle size={13} /> LINE
      </button>

      {/* Facebook */}
      <button onClick={shareFacebook}
        className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
        style={{ background: '#1877F2', color: 'white' }}>
        <Share2 size={13} /> Facebook
      </button>

      {/* Copy link */}
      <button onClick={copyLink}
        className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg font-medium transition-all"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: copied ? 'var(--accent)' : 'var(--text-secondary)' }}>
        <Link2 size={13} /> {copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
      </button>

      {/* Native share (mobile) */}
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button onClick={shareNative}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg font-medium transition-all md:hidden"
          style={{ background: 'var(--accent-muted)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
          <Share2 size={13} /> แชร์
        </button>
      )}
    </div>
  )
}
