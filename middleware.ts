import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // เฉพาะ /admin routes เท่านั้น
  if (!req.nextUrl.pathname.startsWith('/admin')) return res

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

  // ไม่ได้ login → redirect login
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // เช็ค role ใน user_profiles
  const { data: profile } = await sb
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const adminRoles = ['admin', 'super_admin', 'editor']

  if (!profile || !adminRoles.includes(profile.role)) {
    // Login อยู่แต่ไม่ใช่ admin → redirect หน้าแรก
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}
