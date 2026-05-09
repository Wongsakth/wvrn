import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/lib/theme'
import { AuthProvider } from '@/lib/auth'
import { Toaster } from 'react-hot-toast'
import Footer from '@/components/layout/Footer'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title:       'WVRN — Never Miss a Show',
  description: 'ติดตามทุก concert ทุกศิลปินที่คุณรัก ไม่มีวันพลาดอีก',
  keywords:    'concert, เที่ยวคอนเสิร์ต, ตารางคอนเสิร์ต, WVRN',
  openGraph: {
    title:       'WVRN — Never Miss a Show',
    description: 'ติดตามทุก concert ทุกศิลปินที่คุณรัก',
    siteName:    'WVRN',
    type:        'website',
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
