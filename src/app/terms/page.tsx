'use client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { FileText } from 'lucide-react'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-24 md:pb-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,.1)' }}>
            <FileText size={20} style={{ color: '#6366F1' }} />
          </div>
          <div>
            <h1 className="text-[20px] font-medium text-primary">เงื่อนไขการใช้งาน</h1>
            <p className="text-[12px] text-muted">Terms of Service — อัปเดตล่าสุด มกราคม 2569</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">

          <Section title="1. การยอมรับเงื่อนไข">
            การเข้าใช้งานหรือสมัครสมาชิก WVRN ถือว่าคุณได้อ่าน เข้าใจ และยอมรับเงื่อนไขการใช้งานฉบับนี้ทุกประการ
            หากคุณไม่ยอมรับเงื่อนไขส่วนใดส่วนหนึ่ง กรุณางดใช้บริการ
          </Section>

          <Section title="2. บริการของ WVRN">
            WVRN ให้บริการเป็นแพลตฟอร์มรวบรวมและเผยแพร่ข้อมูล Event ดนตรีในประเทศไทย
            เพื่อการประชาสัมพันธ์และอำนวยความสะดวกแก่ผู้ใช้งานเท่านั้น โดย WVRN ขอสงวนสิทธิ์ในการ
            <ul className="mt-2 ml-4 flex flex-col gap-1">
              <li>• เพิ่ม ลด หรือปรับเปลี่ยนฟีเจอร์ของแพลตฟอร์มได้ตลอดเวลา</li>
              <li>• ระงับหรือยกเลิกบัญชีที่ละเมิดเงื่อนไขโดยไม่ต้องแจ้งล่วงหน้า</li>
              <li>• แก้ไขเงื่อนไขการใช้งานได้ตลอดเวลา โดยจะแจ้งผ่านแพลตฟอร์ม</li>
            </ul>
          </Section>

          <Section title="3. บัญชีผู้ใช้">
            เมื่อสมัครสมาชิก คุณรับทราบและยินยอมว่า
            <ul className="mt-2 ml-4 flex flex-col gap-1">
              <li>• ข้อมูลที่ให้ไว้ต้องเป็นความจริงและเป็นปัจจุบัน</li>
              <li>• คุณต้องรับผิดชอบต่อการกระทำทั้งหมดที่เกิดขึ้นภายใต้บัญชีของคุณ</li>
              <li>• ห้ามแบ่งปัน login ให้ผู้อื่นใช้</li>
              <li>• แจ้ง WVRN ทันทีหากพบว่าบัญชีถูกใช้งานโดยไม่ได้รับอนุญาต</li>
            </ul>
          </Section>

          <Section title="4. การส่งข้อมูล Event">
            ผู้ใช้สามารถส่งข้อมูล Event เข้าระบบได้ โดยมีเงื่อนไขดังนี้
            <ul className="mt-2 ml-4 flex flex-col gap-1">
              <li>• ข้อมูลที่ส่งต้องเป็นความจริง ไม่บิดเบือน และไม่ละเมิดสิทธิ์ผู้อื่น</li>
              <li>• ห้ามส่งข้อมูลเท็จ spam หรือข้อมูลที่มีเจตนาทำให้ผู้อื่นเข้าใจผิด</li>
              <li>• WVRN ขอสงวนสิทธิ์ในการตรวจสอบและปฏิเสธข้อมูลที่ไม่เหมาะสม</li>
              <li>• การส่งข้อมูลถือว่าคุณอนุญาตให้ WVRN นำข้อมูลนั้นเผยแพร่บนแพลตฟอร์ม</li>
            </ul>
          </Section>

          <Section title="5. ทรัพย์สินทางปัญญา">
            เนื้อหา โลโก้ การออกแบบ และองค์ประกอบทั้งหมดของ WVRN เป็นทรัพย์สินของ WVRN
            ห้ามคัดลอก ดัดแปลง หรือนำไปใช้เพื่อวัตถุประสงค์เชิงพาณิชย์โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
            <br /><br />
            ข้อมูลศิลปินและ Event เป็นของเจ้าของลิขสิทธิ์ที่เกี่ยวข้อง WVRN เป็นเพียงช่องทางในการเผยแพร่ข้อมูลเท่านั้น
          </Section>

          <Section title="6. การเก็บและใช้ข้อมูลส่วนบุคคล">
            WVRN เก็บข้อมูลส่วนบุคคลขั้นต่ำที่จำเป็น ได้แก่ Email และข้อมูลโปรไฟล์ที่ผู้ใช้ให้ไว้
            เพื่อวัตถุประสงค์ในการให้บริการเท่านั้น WVRN ไม่ขายหรือเปิดเผยข้อมูลส่วนบุคคลแก่บุคคลภายนอก
            เว้นแต่ได้รับความยินยอมหรือเป็นไปตามที่กฎหมายกำหนด
          </Section>

          <Section title="7. พฤติกรรมที่ห้ามกระทำ">
            ผู้ใช้งานห้ามกระทำการดังต่อไปนี้บนแพลตฟอร์ม WVRN
            <ul className="mt-2 ml-4 flex flex-col gap-1">
              <li>• ส่งข้อมูลเท็จ หลอกลวง หรือมีเจตนาทำให้ผู้อื่นเสียหาย</li>
              <li>• ใช้ระบบในทางที่ผิดกฎหมายหรือผิดศีลธรรม</li>
              <li>• พยายาม hack เข้าระบบหรือเข้าถึงข้อมูลที่ไม่ได้รับอนุญาต</li>
              <li>• สร้างบัญชีปลอมหรือแอบอ้างเป็นบุคคลอื่น</li>
              <li>• ส่ง spam หรือโฆษณาที่ไม่ได้รับอนุญาต</li>
            </ul>
          </Section>

          <Section title="8. การยกเลิกบัญชี">
            คุณสามารถยกเลิกบัญชีได้ตลอดเวลาโดยติดต่อทีมงาน WVRN
            WVRN ขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีที่ละเมิดเงื่อนไขนี้ โดยไม่ต้องแจ้งล่วงหน้าและไม่ต้องรับผิดชอบใดๆ
          </Section>

          <Section title="9. กฎหมายที่ใช้บังคับ">
            เงื่อนไขการใช้งานนี้อยู่ภายใต้กฎหมายไทย ข้อพิพาทใดๆ ที่เกิดขึ้นให้ใช้กฎหมายไทยในการตัดสิน
            และให้อยู่ในเขตอำนาจศาลไทย
          </Section>

          {/* Contact */}
          <div className="rounded-xl p-5" style={{
            background: 'rgba(99,102,241,.06)',
            border: '1px solid rgba(99,102,241,.2)'
          }}>
            <h2 className="text-[14px] font-medium mb-2" style={{ color: '#6366F1' }}>
              มีคำถามเกี่ยวกับเงื่อนไข?
            </h2>
            <p className="text-[13px] text-secondary leading-relaxed mb-3">
              หากมีข้อสงสัยหรือต้องการข้อมูลเพิ่มเติมเกี่ยวกับเงื่อนไขการใช้งาน
              สามารถติดต่อทีมงาน WVRN ได้ผ่านช่องทางแจ้งปัญหา
            </p>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-80"
              style={{ background: '#6366F1', color: '#fff' }}
            >
              💬 ติดต่อทีมงาน
            </Link>
          </div>

          {/* Related */}
          <div className="flex gap-3">
            <Link href="/disclaimer"
              className="flex-1 rounded-xl p-4 text-center transition-colors hover:opacity-80"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p className="text-[13px] font-medium text-primary">📋 ข้อจำกัดความรับผิดชอบ</p>
              <p className="text-[11px] text-muted mt-1">Disclaimer</p>
            </Link>
            <Link href="/report"
              className="flex-1 rounded-xl p-4 text-center transition-colors hover:opacity-80"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p className="text-[13px] font-medium text-primary">🚨 แจ้งปัญหา</p>
              <p className="text-[11px] text-muted mt-1">Report Issue</p>
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
