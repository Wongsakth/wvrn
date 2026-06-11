import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Rate Limiter (in-memory) ──────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key)
  }
}, 60_000)

// ── Rate limit tiers ──────────────────────────────────
// key prefix : limit : window (ms) : หมายเหตุ
const RATE_RULES: [string, number, number][] = [
  ['/api/line/',   10,  60_000],   // LINE notif    — 10/min   keyed ด้วย cron secret
  ['/api/cron/',    5,  60_000],   // cron jobs     — 5/min    (มี CRON_SECRET อยู่แล้ว)
  ['/api/',        60,  60_000],   // API ทั่วไป    — 60/min per IP
]

// ── Middleware ────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // ── Rate limiting ────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const rule = RATE_RULES.find(([prefix]) => pathname.startsWith(prefix))
    if (rule) {
      const [prefix, limit, windowMs] = rule
      // LINE/cron ใช้ IP + path เป็น key, general ใช้แค่ IP
      const key = `${prefix}:${ip}`
      if (!rateLimit(key, limit, windowMs)) {
        return NextResponse.json(
          { error: 'Too many requests', retryAfter: Math.ceil(windowMs / 1000) },
          { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } }
        )
      }
    }
  }

  // ── Admin guard ──────────────────────────────────────
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const res = NextResponse.next()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        ),
      },
    }
  )

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const { data: profile } = await sb
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const adminRoles = ['admin', 'super_admin', 'editor']
  if (!profile || !adminRoles.includes(profile.role)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}
