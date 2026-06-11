'use client'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function Footer() {
  return (
    <footer
      className="hidden md:block mt-16 border-t"
      style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
    >
      <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">

          {/* Logo + tagline */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M3,20 L7,9 L12,17 L16,5 L20,21 L25,13 L29,20"
                  stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[16px] font-medium tracking-[3px]" style={{ color: 'var(--accent)' }}>WVRN</span>
            </div>
            <p className="text-[12px] text-muted">Never Miss a Show</p>
          </div>

          {/* Links */}
            <div className="flex gap-8 text-[12px]">
            <div className="flex flex-col gap-2">
              <span className="text-muted font-medium uppercase tracking-wide text-[10px]">ฟีเจอร์</span>
              <Link href="/blog" className="text-secondary hover:text-primary transition-colors">บทความ</Link>
              <Link href="/" className="text-secondary hover:text-primary transition-colors">ปฏิทิน</Link>
              <Link href="/events" className="text-secondary hover:text-primary transition-colors">งาน</Link>
              <Link href="/artists" className="text-secondary hover:text-primary transition-colors">ศิลปิน</Link>
              <Link href="/submit" className="text-secondary hover:text-primary transition-colors">แจ้งงาน</Link>
              <Link href="/report" className="text-secondary hover:text-primary transition-colors">แจ้งปัญหา</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-muted font-medium uppercase tracking-wide text-[10px]">ข้อกำหนด</span>
              <Link href="/privacy" className="text-secondary hover:text-primary transition-colors">นโยบายความเป็นส่วนตัว</Link>
              <Link href="/disclaimer" className="text-secondary hover:text-primary transition-colors">ข้อจำกัดความรับผิดชอบ</Link>
              <Link href="/terms" className="text-secondary hover:text-primary transition-colors">เงื่อนไขการใช้งาน</Link>
            </div>
          </div>
        </div>

        {/* Disclaimer banner */}
        <div
          className="mt-6 flex items-start gap-3 p-3 rounded-xl"
          style={{ background: 'rgba(186,117,23,.08)', border: '1px solid rgba(186,117,23,.2)' }}
        >
          <AlertCircle size={14} style={{ color: '#EF9F27', flexShrink: 0, marginTop: 1 }} />
          <p className="text-[11px] leading-relaxed" style={{ color: '#EF9F27' }}>
            ข้อมูลศิลปิน รายละเอียด Event ราคาบัตร และทุกข้อมูลบนแพลตฟอร์มนี้ จัดทำเพื่อการประชาสัมพันธ์เท่านั้น
            กรุณาตรวจสอบข้อมูลที่ถูกต้องจากต้นสังกัดศิลปินหรือผู้จัดงานโดยตรงก่อนตัดสินใจซื้อบัตร
            WVRN ไม่รับผิดชอบต่อความเสียหายใดๆ อันเกิดจากข้อมูลที่คลาดเคลื่อนบนแพลตฟอร์มนี้{' '}
            <Link href="/report" className="underline hover:opacity-70">แจ้งข้อมูลผิดพลาด</Link>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] text-muted">© 2026 WVRN. All rights reserved.</p>
          <p className="text-[11px] text-muted">Made with ♥ for music lovers in Thailand</p>
        </div>
      </div>
    </footer>
  )
}
