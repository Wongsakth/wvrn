'use client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

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
            WVRN เป็นแพลตฟอร์มรวบรวมและเผยแพร่ข้อมูล Event ดนตรีในประเทศไทย
            เพื่อวัตถุประสงค์ในการประชาสัมพันธ์และอำนวยความสะดวกแก่ผู้ใช้งานเท่านั้น
            WVRN มิได้เป็นตัวแทนจำหน่ายบัตร ผู้จัดงาน หรือมีส่วนเกี่ยวข้องกับการดำเนินงานของ Event ใดๆ ทั้งสิ้น
          </Section>

          <Section title="2. ข้อจำกัดความรับผิดชอบด้านข้อมูล">
            ข้อมูลทั้งหมดที่ปรากฏบนแพลตฟอร์ม WVRN ไม่ว่าจะเป็นข้อมูลศิลปิน ราคาบัตร
            วันเวลาและสถานที่จัดงาน รายละเอียด Event หรือข้อมูลอื่นใด จัดทำขึ้นเพื่อการประชาสัมพันธ์เท่านั้น
            และอาจมีความคลาดเคลื่อนหรือเปลี่ยนแปลงได้โดยไม่แจ้งให้ทราบล่วงหน้า
            <br /><br />
            <strong className="text-primary">
              WVRN ไม่รับผิดชอบต่อความเสียหายใดๆ ทั้งทางตรงและทางอ้อม
            </strong>{' '}
            อันเกิดจากการอ้างอิงหรือใช้ข้อมูลบนแพลตฟอร์มนี้ ครอบคลุมถึงแต่ไม่จำกัดเพียง
            <ul className="mt-2 ml-4 flex flex-col gap-1">
              <li>• ราคาบัตรที่คลาดเคลื่อนจากราคาจำหน่ายจริง</li>
              <li>• วันเวลาและสถานที่จัดงานที่เปลี่ยนแปลง เลื่อน หรือยกเลิก</li>
              <li>• ข้อมูลศิลปินที่ไม่ครบถ้วนหรือไม่เป็นปัจจุบัน</li>
              <li>• ความสูญเสียทางการเงินจากการตัดสินใจซื้อบัตรโดยอ้างอิงข้อมูลบนแพลตฟอร์มนี้</li>
              <li>• ความเสียหายอื่นใดอันเกิดจากข้อมูลที่ผิดพลาด ไม่ครบถ้วน หรือล้าสมัย</li>
            </ul>
          </Section>

          <Section title="3. คำแนะนำในการตรวจสอบข้อมูล">
            ก่อนการตัดสินใจซื้อบัตรหรือเดินทางเข้าร่วม Event ทุกครั้ง
            กรุณาตรวจสอบข้อมูลที่ถูกต้องและเป็นปัจจุบันโดยตรงจาก
            <ul className="mt-2 ml-4 flex flex-col gap-1">
              <li>• Social Media หรือเว็บไซต์อย่างเป็นทางการของศิลปิน</li>
              <li>• Social Media หรือเว็บไซต์ของผู้จัดงาน</li>
              <li>• แพลตฟอร์มจำหน่ายบัตรอย่างเป็นทางการ เช่น Ticketmelon, Thai Ticket Major หรือ Eventpop</li>
            </ul>
          </Section>

          <Section title="4. การซื้อบัตรและการเชื่อมโยงไปยังแหล่งภายนอก">
            WVRN ไม่ได้ดำเนินการจำหน่ายบัตรแต่อย่างใด หากมีลิงก์เชื่อมโยงไปยังแพลตฟอร์มจำหน่ายบัตร
            หรือเว็บไซต์ภายนอก ถือเป็นเพียงการอำนวยความสะดวกเท่านั้น
            การซื้อขายบัตรและข้อพิพาทใดๆ อยู่ภายใต้เงื่อนไขและความรับผิดชอบของผู้จำหน่ายบัตรนั้นๆ โดยตรง
          </Section>

          {/* แจ้งปัญหา — highlight box */}
          <div className="rounded-xl p-5" style={{
            background: 'rgba(186,117,23,.06)',
            border: '1px solid rgba(186,117,23,.25)'
          }}>
            <h2 className="text-[14px] font-medium mb-2" style={{ color: '#EF9F27' }}>
              5. พบข้อมูลผิดพลาด? แจ้งเราได้เลย
            </h2>
            <p className="text-[13px] text-secondary leading-relaxed mb-4">
              WVRN เปิดรับการแจ้งข้อมูลที่ไม่ถูกต้องหรือข้อมูลใหม่จากผู้ใช้งานทุกท่าน
              หากพบข้อมูลที่คลาดเคลื่อนประการใด ทีมงานจะดำเนินการตรวจสอบและปรับปรุงข้อมูลให้ถูกต้องโดยเร็วที่สุด
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-80"
              style={{ background: '#EF9F27', color: '#fff' }}
            >
              👉 แจ้งข้อมูลหรือรายงานปัญหา
            </Link>
          </div>

          {/* English version */}
          <div className="mt-2 p-4 rounded-xl" style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)'
          }}>
            <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-3">English Summary</p>
            <p className="text-[12px] text-secondary leading-relaxed">
              All content on WVRN — including artist information, ticket prices, event dates, venues,
              and any other details — is provided for informational and promotional purposes only.
              WVRN assumes no responsibility, directly or indirectly, for any damages, losses,
              or expenses arising from inaccurate, incomplete, or outdated information displayed on this platform,
              including but not limited to incorrect ticket prices, event cancellations or postponements,
              or any financial loss resulting from reliance on this information.
              Please verify all details directly with the official artist management or event organizer
              before making any purchase decision.
              To report incorrect information, please visit our{' '}
              <Link href="/submit" className="underline hover:opacity-70">report page</Link>.
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
    <div className="rounded-xl p-5" style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border)'
    }}>
      <h2 className="text-[14px] font-medium text-primary mb-3">{title}</h2>
      <p className="text-[13px] text-secondary leading-relaxed">{children}</p>
    </div>
  )
}
