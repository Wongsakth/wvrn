import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/lib/theme'
import { AuthProvider } from '@/lib/auth'
import { Toaster } from 'react-hot-toast'
import Footer from '@/components/layout/Footer'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.wvrn.app'),
  title: {
    default:  'WVRN — คอนเสิร์ตใกล้ฉัน Never Miss a Show',
    template: '%s | WVRN',
  },
  description: 'คอนเสิร์ตใกล้ฉัน รวมตารางคอนเสิร์ตและงานดนตรีสดทั่วไทย ค้นหา Concert, Live Show และงาน Festival ติดตามศิลปินที่ชอบ รับแจ้งเตือนก่อนใคร ไม่พลาดทุก Show',
  keywords:    'คอนเสิร์ตใกล้ฉัน, concert, คอนเสิร์ต, ตารางคอนเสิร์ต, งานดนตรี, เทศกาลดนตรี, คอนเสิร์ตไทย, WVRN, Never Miss a Show',
  authors:     [{ name: 'WVRN', url: 'https://www.wvrn.app' }],
  creator:     'WVRN',
  verification: {
    google: 'Kjt7GiONvrXbz5A5Huhs0PBTonfmx9QWfKhV340k-PI',
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon:  '/favicon.ico',
    apple: '/logo.png',
  },
  openGraph: {
    title:       'WVRN — คอนเสิร์ตใกล้ฉัน Never Miss a Show',
    description: 'คอนเสิร์ตใกล้ฉัน รวมตารางคอนเสิร์ตและงานดนตรีสดทั่วไทย ติดตามศิลปินที่ชอบ รับแจ้งเตือนก่อนใคร',
    siteName:    'WVRN',
    locale:      'th_TH',
    type:        'website',
    url:         'https://www.wvrn.app',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'WVRN — Never Miss a Show' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'WVRN — คอนเสิร์ตใกล้ฉัน Never Miss a Show',
    description: 'คอนเสิร์ตใกล้ฉัน ติดตามศิลปินที่ชอบ รับแจ้งเตือนก่อนใคร ไม่มีวันพลาดอีก',
    images:      ['/logo.png'],
  },
  alternates: {
    canonical: 'https://www.wvrn.app',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" data-theme="festival" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('wvrn-theme');var v=['festival','dark','pastel','vivid','earth','rock'];if(t&&v.indexOf(t)!==-1){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();` }} />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Footer />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'var(--surface-2)',
                  color:      'var(--text-primary)',
                  border:     '1px solid var(--border)',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
