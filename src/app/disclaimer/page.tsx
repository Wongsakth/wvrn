'use client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { AlertCircle } from 'lucide-react'

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-24 md:pb-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(186,117,23,.1)' }}>
            <AlertCircle size={20} style={{ color: '#EF9F27' }} />
          </div>
          <div>
            <h1 className="text-[20px] font-medium text-primary">ข้อจำกัดความรับผิดชอบ</h1>
            <p className="text-[12px] text-muted">Disclaimer — อัปเดตล่าสุด มกราคม 2569</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-6">

          <Section title="1. วัตถุประสงค์ของแพลตฟอร์ม">
            WVRN เป็นแพลตฟอร์มรวบรวมข้อมูล Event ดนตรีในประเทศไทย เพื่อการประชาสัมพันธ์และอำนวยความสะดวกให้ผู้ใช้ติดตามข่าวสารคอนเสิร์ตเท่านั้น
            มิได้เป็นตัวแทนจำหน่ายบัตรหรือผู้จัดงานแต่อย่างใด
          </Section>

          <Section title="2. ความถูกต้องของข้อมูล">
            ข้อมูลทั้งหมดบนแพลตฟอร์มนี้ ไม่ว่าจะเป็นรายละเอียด Event วันเวลาสถานที่ ราคาบัตร
            ข้อมูลศิลปิน หรือข้อมูลอื่นใด อาจมีการเปลี่ยนแปลงโดยไม่แจ้งให้ทราบล่วงหน้า
            <br /><br />
            <strong className="text-primary">กรุณาตรวจสอบข้อมูลที่ถูกต้องและเป็นปัจจุบันจากแหล่งข้อมูลต้นฉบับเสมอ ได้แก่</strong>
            <ul className="mt-2 ml-4 flex flex-col gap-1">
              <li>• เว็บไซต์หรือ Social Media อย่างเป็นทางการของศิลปิน</li>
              <li>• เว็บไซต์หรือ Social Media ของผู้จัดงาน</li>
              <li>• แพลตฟอร์มจำหน่ายบัตรอย่างเป็นทางการ (เช่น Ticketmelon, Thai Ticket Major)</li>
            </ul>
          </Section>

          <Section title="3. การซื้อบัตร">
            WVRN ไม่ได้เป็นผู้ดำเนินการขายบัตรใดๆ ทั้งสิ้น หากมี link ไปยังแพลตฟอร์มจำหน่ายบัตร
            ถือเป็นเพียงการอำนวยความสะดวกเท่านั้น การซื้อขายบัตรทั้งหมดอยู่ภายใต้เงื่อนไขของผู้จำหน่ายบัตรนั้นๆ
          </Section>

          <Section title="4. การจำกัดความรับผิด">
            WVRN และผู้พัฒนาแพลตฟอร์มไม่รับผิดชอบต่อความเสียหาย การสูญเสีย หรือค่าใช้จ่ายใดๆ
            ที่เกิดขึ้นโดยตรงหรือโดยอ้อมจากการใช้ข้อมูลบนแพลตฟอร์มนี้ รวมถึงแต่ไม่จำกัดเพียง
            <ul className="mt-2 ml-4 flex flex-col gap-1">
              <li>• ข้อมูล Event ที่ผิดพลาดหรือไม่ครบถ้วน</li>
              <li>• การเปลี่ยนแปลง ยกเลิก หรือเลื่อน Event โดยผู้จัดงาน</li>
              <li>• ราคาบัตรที่เปลี่ยนแปลงจากที่แสดงบนแพลตฟอร์ม</li>
              <li>• ความสูญเสียทางการเงินจากการซื้อบัตรโดยอ้างอิงข้อมูลบนแพลตฟอร์มนี้</li>
            </ul>
          </Section>

          <Section title="5. การรายงานข้อมูลผิดพลาด">
            หากพบข้อมูลที่ไม่ถูกต้อง กรุณาแจ้งผ่านหน้า "แจ้งงาน" หรือติดต่อทีมงาน WVRN
            เพื่อให้เราปรับปรุงข้อมูลให้ถูกต้องโดยเร็วที่สุด
          </Section>

          {/* English version */}
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-3">English Version</p>
            <p className="text-[12px] text-secondary leading-relaxed">
              All information regarding artists, events, ticket prices, and any other content on this platform
              is provided for informational purposes only. Please verify all details directly with the artist's
              management or the official event organizer before making any purchase decision.
              WVRN shall not be held responsible for any damages, losses, or expenses arising directly or
              indirectly from inaccurate, incomplete, or outdated information displayed on this platform.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <h2 className="text-[14px] font-medium text-primary mb-3">{title}</h2>
      <p className="text-[13px] text-secondary leading-relaxed">{children}</p>
    </div>
  )
}
