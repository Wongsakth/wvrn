'use client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Shield } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-24 md:pb-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,.1)' }}>
            <Shield size={20} style={{ color: '#10B981' }} />
          </div>
          <div>
            <h1 className="text-[20px] font-medium text-primary">นโยบายความเป็นส่วนตัว</h1>
            <p className="text-[12px] text-muted">Privacy Policy — อัปเดตล่าสุด มกราคม 2569</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">

          {/* Intro */}
          <div className="rounded-xl p-5" style={{
            background: 'rgba(16,185,129,.05)',
            border: '1px solid rgba(16,185,129,.2)'
          }}>
            <p className="text-[13px] text-secondary leading-relaxed">
              WVRN ("เรา") ให้ความสำคัญกับความเป็นส่วนตัวของคุณอย่างจริงจัง
              นโยบายนี้อธิบายว่าเราเก็บรวบรวม ใช้ และปกป้องข้อมูลส่วนบุคคลของคุณอย่างไร
              ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
            </p>
          </div>

          <Section title="1. ข้อมูลที่เราเก็บรวบรวม">
            เราเก็บรวบรวมข้อมูลส่วนบุคคลเท่าที่จำเป็นสำหรับการให้บริการเท่านั้น ได้แก่
            <ul className="mt-2 ml-4 flex flex-col gap-1.5">
              <li>• <strong className="text-primary">Email address</strong> — สำหรับการสมัครสมาชิกและยืนยันตัวตน</li>
              <li>• <strong className="text-primary">ชื่อผู้ใช้ (Display Name)</strong> — ที่คุณตั้งในโปรไฟล์</li>
              <li>• <strong className="text-primary">จังหวัด</strong> — เพื่อแสดง Concert ใกล้บ้านคุณ</li>
              <li>• <strong className="text-primary">LINE User ID</strong> — สำหรับส่งการแจ้งเตือนผ่าน LINE (ถ้าคุณเลือกเชื่อมต่อ)</li>
              <li>• <strong className="text-primary">ศิลปินและสถานที่ที่ติดตาม</strong> — เพื่อแสดงเนื้อหาที่เกี่ยวข้อง</li>
              <li>• <strong className="text-primary">การกดสนใจ/จะไป</strong> — เพื่อแสดงสถิติและแจ้งเตือน</li>
              <li>• <strong className="text-primary">รูปภาพที่อัปโหลด</strong> — ถ้าคุณส่งรูปในฟีเจอร์รูปภาพงาน</li>
              <li>• <strong className="text-primary">ข้อมูลการใช้งาน</strong> — เช่น หน้าที่เข้าชม เวลาใช้งาน (anonymized)</li>
            </ul>
          </Section>

          <Section title="2. วัตถุประสงค์การใช้ข้อมูล">
            เราใช้ข้อมูลของคุณเพื่อวัตถุประสงค์ดังต่อไปนี้เท่านั้น
            <ul className="mt-2 ml-4 flex flex-col gap-1.5">
              <li>• ให้บริการ WVRN และปรับปรุงประสบการณ์การใช้งาน</li>
              <li>• ส่งการแจ้งเตือน Concert จากศิลปินที่คุณติดตาม</li>
              <li>• แสดงเนื้อหาและ Concert ที่เกี่ยวข้องกับความสนใจของคุณ</li>
              <li>• ป้องกันการใช้งานในทางที่ผิดและรักษาความปลอดภัย</li>
              <li>• วิเคราะห์การใช้งานเพื่อพัฒนาแพลตฟอร์ม (ข้อมูล anonymous)</li>
            </ul>
          </Section>

          <Section title="3. การเปิดเผยข้อมูลแก่บุคคลที่สาม">
            เรา<strong className="text-primary">ไม่ขาย ไม่ให้เช่า และไม่เปิดเผย</strong>ข้อมูลส่วนบุคคลของคุณแก่บุคคลภายนอกเพื่อวัตถุประสงค์ทางการค้า
            <br /><br />
            เราอาจแบ่งปันข้อมูลในกรณีต่อไปนี้เท่านั้น
            <ul className="mt-2 ml-4 flex flex-col gap-1.5">
              <li>• <strong className="text-primary">ผู้ให้บริการโครงสร้างพื้นฐาน</strong> เช่น Supabase (ฐานข้อมูล), Vercel (hosting), LINE (การแจ้งเตือน) ซึ่งผูกพันด้วยสัญญาการปกป้องข้อมูล</li>
              <li>• <strong className="text-primary">กรณีที่กฎหมายกำหนด</strong> เช่น คำสั่งศาลหรือหน่วยงานรัฐ</li>
              <li>• <strong className="text-primary">ได้รับความยินยอมจากคุณ</strong>อย่างชัดเจน</li>
            </ul>
          </Section>

          <Section title="4. ระยะเวลาในการเก็บข้อมูล">
            เราเก็บข้อมูลส่วนบุคคลของคุณตลอดระยะเวลาที่คุณมีบัญชีกับ WVRN
            เมื่อคุณลบบัญชี เราจะลบข้อมูลส่วนบุคคลภายใน <strong className="text-primary">30 วัน</strong>
            ยกเว้นข้อมูลที่กฎหมายกำหนดให้เก็บรักษาไว้
          </Section>

          <Section title="5. ความปลอดภัยของข้อมูล">
            เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสม ได้แก่
            <ul className="mt-2 ml-4 flex flex-col gap-1.5">
              <li>• การเข้ารหัส SSL/TLS สำหรับข้อมูลทุกการรับส่ง</li>
              <li>• Row Level Security (RLS) ใน Supabase — user เห็นเฉพาะข้อมูลของตนเอง</li>
              <li>• ไม่เก็บรหัสผ่านในรูปแบบ plain text</li>
              <li>• API keys และ secrets เก็บใน environment variables ไม่ public</li>
            </ul>
          </Section>

          <Section title="6. สิทธิ์ของคุณตาม PDPA">
            ในฐานะเจ้าของข้อมูล คุณมีสิทธิ์ดังต่อไปนี้
            <ul className="mt-2 ml-4 flex flex-col gap-1.5">
              <li>• <strong className="text-primary">สิทธิ์เข้าถึง</strong> — ขอดูข้อมูลส่วนบุคคลที่เราเก็บ</li>
              <li>• <strong className="text-primary">สิทธิ์แก้ไข</strong> — ขอให้แก้ไขข้อมูลที่ไม่ถูกต้อง</li>
              <li>• <strong className="text-primary">สิทธิ์ลบ</strong> — ขอให้ลบข้อมูลส่วนบุคคล</li>
              <li>• <strong className="text-primary">สิทธิ์ถอนความยินยอม</strong> — ถอนความยินยอมได้ตลอดเวลา</li>
              <li>• <strong className="text-primary">สิทธิ์ระงับการใช้</strong> — ขอให้ระงับการประมวลผลข้อมูล</li>
              <li>• <strong className="text-primary">สิทธิ์โอนย้ายข้อมูล</strong> — ขอรับข้อมูลในรูปแบบที่อ่านได้</li>
            </ul>
            <br />
            ใช้สิทธิ์ได้โดยติดต่อผ่านหน้า <Link href="/report" style={{ color: 'var(--accent)' }} className="underline">แจ้งปัญหา</Link>
          </Section>

          <Section title="7. คุกกี้ (Cookies)">
            WVRN ใช้คุกกี้เท่าที่จำเป็นสำหรับ
            <ul className="mt-2 ml-4 flex flex-col gap-1.5">
              <li>• <strong className="text-primary">Authentication</strong> — เพื่อรักษาสถานะการ login</li>
              <li>• <strong className="text-primary">Preferences</strong> — เช่น theme ที่คุณเลือก</li>
            </ul>
            <br />
            เราไม่ใช้คุกกี้เพื่อติดตามพฤติกรรมการท่องเว็บนอก WVRN
          </Section>

          <Section title="8. การเปลี่ยนแปลงนโยบาย">
            เราอาจปรับปรุงนโยบายความเป็นส่วนตัวเป็นครั้งคราว
            หากมีการเปลี่ยนแปลงสำคัญ เราจะแจ้งให้ทราบผ่านหน้าเว็บหรือ Email
            การใช้งาน WVRN ต่อไปหลังจากวันที่มีผลบังคับใช้ถือว่ายอมรับนโยบายฉบับใหม่
          </Section>

          {/* Contact */}
          <div className="rounded-xl p-5" style={{
            background: 'rgba(16,185,129,.06)',
            border: '1px solid rgba(16,185,129,.2)'
          }}>
            <h2 className="text-[14px] font-medium mb-2" style={{ color: '#10B981' }}>
              ติดต่อเรื่องความเป็นส่วนตัว
            </h2>
            <p className="text-[13px] text-secondary leading-relaxed mb-3">
              หากมีข้อสงสัยหรือต้องการใช้สิทธิ์ตาม PDPA สามารถติดต่อทีมงาน WVRN ได้ผ่านช่องทางแจ้งปัญหา
              เราจะตอบกลับภายใน 30 วันทำการ
            </p>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-80"
              style={{ background: '#10B981', color: '#fff' }}
            >
              📩 ติดต่อเรื่องความเป็นส่วนตัว
            </Link>
          </div>

          {/* Related */}
          <div className="flex gap-3">
            <Link href="/terms"
              className="flex-1 rounded-xl p-4 text-center transition-colors hover:opacity-80"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p className="text-[13px] font-medium text-primary">📋 เงื่อนไขการใช้งาน</p>
              <p className="text-[11px] text-muted mt-1">Terms of Service</p>
            </Link>
            <Link href="/disclaimer"
              className="flex-1 rounded-xl p-4 text-center transition-colors hover:opacity-80"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p className="text-[13px] font-medium text-primary">⚠️ ข้อจำกัดความรับผิดชอบ</p>
              <p className="text-[11px] text-muted mt-1">Disclaimer</p>
            </Link>
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
