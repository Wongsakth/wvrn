import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Rate Limiter (in-memory) ──────────────────────────
// key: IP, value: { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true // allowed
  }

  if (entry.count >= limit) return false // blocked

  entry.count++
  return true // allowed
}

// cleanup เป็นระยะ ป้องกัน memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key)
  }
}, 60_000)

// ── Middleware ────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // ── Rate limit: /api/line/* ──
  // max 10 requests / 1 minute per IP
  if (pathname.startsWith('/api/line/')) {
    const allowed = rateLimit(`line:${ip}`, 10, 60_000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: 60 },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
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

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

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
  matcher: ['/admin/:path*', '/api/line/:path*'],
}
