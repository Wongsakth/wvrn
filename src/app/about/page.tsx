import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'เกี่ยวกับ WVRN | Never Miss a Show',
  description: 'WVRN รวมตารางคอนเสิร์ตและงานดนตรีสดทั่วไทยไว้ในที่เดียว ไม่พลาดทุก Show ของศิลปินที่ชอบ',
  alternates: { canonical: 'https://www.wvrn.app/about' },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-screen-sm mx-auto px-4 sm:px-6 py-12">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.png" alt="WVRN" className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <p className="text-[20px] font-medium tracking-[4px]" style={{ color: 'var(--accent)' }}>WVRN</p>
            <p className="text-[11px] text-muted">Wide Vibe Radar Network</p>
            <p className="text-[10px] text-muted tracking-widest opacity-60">NEVER MISS A SHOW</p>
          </div>
        </div>

        {/* Pain point → Solution */}
        <div className="flex flex-col gap-8">

          <div>
            <h1 className="text-[22px] font-medium text-primary mb-3 leading-tight">
              ไม่มีวันพลาดคอนเสิร์ตของศิลปินที่ชอบอีกต่อไป
            </h1>
            <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              เคยเจอไหม — รู้ทีหลังว่าศิลปินที่ชอบมาแสดงใกล้บ้าน แต่พลาดไปแล้ว
              เพราะข้อมูลกระจายอยู่ตามเพจ Facebook, Instagram, เว็บขายบัตร
              และกลุ่มต่างๆ นับสิบแห่ง
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              WVRN สร้างขึ้นเพื่อแก้ปัญหานี้ — รวบรวมคอนเสิร์ตและงานดนตรีสดทั่วไทย
              กว่า <span className="font-medium text-primary">1,200+ งาน</span> ครอบคลุม 77 จังหวัด ไว้ในที่เดียว
              อัปเดตทุกวัน ค้นหาได้ง่าย และแจ้งเตือนผ่าน LINE ก่อนที่บัตรจะหมด
            </p>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-3">
            {[
              { emoji: '🎵', title: 'รวมทุกงานไว้ที่เดียว', desc: 'Concert, Festival, Live ทั่วไทย อัปเดตทุกวัน' },
              { emoji: '🔔', title: 'แจ้งเตือนก่อนใคร', desc: 'รับ notification ทาง LINE เมื่อมีงานของศิลปินที่ติดตาม' },
              { emoji: '📍', title: 'ใกล้ฉันแค่ไหน', desc: 'ดูงานในจังหวัดหรือพื้นที่ใกล้บ้านได้ทันที' },
              { emoji: '🗺️', title: 'Concert Map', desc: 'ดูงานดนตรีทั่วประเทศบนแผนที่' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <span className="text-[20px] shrink-0">{f.emoji}</span>
                <div>
                  <p className="text-[13px] font-medium text-primary">{f.title}</p>
                  <p className="text-[12px] text-muted mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center pt-2">
            <Link href="/" className="btn-accent py-3 px-8 text-[14px] inline-block">
              เริ่มใช้งาน WVRN
            </Link>
            <p className="text-[11px] text-muted mt-4">
              พบปัญหาหรืออยากแนะนำ?{' '}
              <Link href="/report" className="underline hover:opacity-70" style={{ color: 'var(--accent)' }}>
                แจ้งเราได้เลย
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
