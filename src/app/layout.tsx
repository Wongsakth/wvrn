import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/lib/theme'
import { AuthProvider } from '@/lib/auth'
import { Toaster } from 'react-hot-toast'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://wvrn.vercel.app'),
  title: {
    default:  'WVRN — Never Miss a Show',
    template: '%s | WVRN',
  },
  description: 'ปฏิทินคอนเสิร์ตและงานดนตรีสด ค้นหา Concert, Live Show และงาน Festival ติดตามศิลปินที่คุณรัก รู้ก่อนใครเมื่อมีงานใหม่ ไม่พลาดทุก Show',
  keywords:    'concert, คอนเสิร์ต, ตารางคอนเสิร์ต, งานดนตรี, เทศกาลดนตรี, WVRN',
  authors:     [{ name: 'WVRN', url: 'https://wvrn.vercel.app' }],
  creator:     'WVRN',
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
    title:       'WVRN — Never Miss a Show',
    description: 'ปฏิทินคอนเสิร์ตและงานดนตรีสด ค้นหา Concert, Live Show และงาน Festival ติดตามศิลปินที่คุณรัก รู้ก่อนใครเมื่อมีงานใหม่ ไม่พลาดทุก Show',
    siteName:    'WVRN',
    locale:      'th_TH',
    type:        'website',
    url:         'https://wvrn.vercel.app',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'WVRN — Never Miss a Show' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'WVRN — Never Miss a Show',
    description: 'ติดตามทุก concert ทุกศิลปินที่คุณรัก ไม่มีวันพลาดอีก',
    images:      ['/logo.png'],
  },
  alternates: {
    canonical: 'https://wvrn.vercel.app',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
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
