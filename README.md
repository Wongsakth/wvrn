# WVRN — Never Miss a Show 🎵

> ตารางคอนเสิร์ตที่ทำให้คุณไม่พลาดทุก show และทุกศิลปินที่รัก

---

## Tech Stack

| Layer     | Tech                        |
|-----------|-----------------------------|
| Framework | Next.js 14 (App Router)     |
| Database  | Supabase (PostgreSQL)       |
| Auth      | Supabase Auth               |
| Styling   | Tailwind CSS + CSS Variables|
| Deploy    | Vercel                      |
| Notify    | LINE Notify (Phase 2)       |

---

## Quick Start

### 1. Clone & Install
```bash
git clone <repo>
cd wvrn
npm install
```

### 2. Setup Supabase
1. ไปที่ [supabase.com](https://supabase.com) → New Project
2. ไปที่ **SQL Editor** → วาง content จาก `supabase/schema.sql` → Run
3. คัดลอก Project URL และ anon key จาก **Project Settings > API**

### 3. Environment Variables
```bash
cp .env.example .env.local
# แก้ไขใส่ค่า Supabase URL และ keys
```

### 4. Run Development
```bash
npm run dev
# เปิด http://localhost:3000
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # หน้าหลัก (Calendar/List/Grid)
│   ├── events/[id]/      # หน้ารายละเอียด Event
│   ├── submit/           # User แจ้ง Event
│   ├── admin/            # Admin panel
│   ├── following/        # งานศิลปินที่ติดตาม
│   └── profile/          # โปรไฟล์ + ตั้งค่า
├── components/
│   ├── layout/Navbar     # Top nav + Mobile bottom nav
│   ├── events/EventCard  # Event card (list/grid/calendar)
│   ├── events/FilterBar  # Filter chips + expanded filters
│   └── calendar/CalendarView # Monthly calendar
├── lib/
│   ├── supabase.ts       # DB queries
│   ├── theme.tsx         # Theme context (6 themes)
│   └── utils.ts          # Helpers, calendar grid, formatters
├── types/index.ts        # TypeScript types ทั้งหมด
└── styles/globals.css    # Theme CSS variables
```

---

## Features — Phase 1

- [x] ดู Event แบบ Calendar / List / Grid
- [x] Filter ตาม จังหวัด / Genre / ประเภท / ฟรี / วันที่
- [x] Search ศิลปิน / ชื่องาน
- [x] Like / Bookmark Event
- [x] Add to Google Calendar
- [x] Share Event link
- [x] User Submit Event (รอ Admin อนุมัติ)
- [x] Admin Panel (อนุมัติ/ปฏิเสธ)
- [x] 6 Themes (Festival, Dark, Pastel, Vivid, Earth, Rock)
- [x] Responsive (Desktop 3-col + Mobile bottom nav)

## Roadmap — Phase 2

- [ ] Supabase Auth (Google / Email login)
- [ ] Follow Artist — แจ้งเตือนงานใหม่
- [ ] LINE Notify integration
- [ ] Artist Profile page
- [ ] Venue Profile page
- [ ] Import จาก Facebook Page (scraping)
- [ ] OCR จากรูป Poster

---

## Deploy to Vercel

```bash
# Push to GitHub แล้ว connect กับ Vercel
# ใส่ environment variables ใน Vercel Dashboard
vercel --prod
```

---

## Making a user Admin

```sql
-- Run in Supabase SQL Editor
UPDATE profiles SET role = 'admin' WHERE id = 'USER_UUID_HERE';
```
