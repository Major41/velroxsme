// lib/supabase/proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/settings',
  '/profile',
  '/super-admin', // but NOT /super-admin/login
]

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/super-admin/login',
  '/auth',
]

function isProtected(pathname: string) {
  // Explicit public paths always win
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return false
  }
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() refreshes the token if expired and writes new
  // cookies via setAll above. Do not skip this.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (isProtected(pathname) && !user) {
    const url = request.nextUrl.clone()
    // Send users to the right login page depending on section
    url.pathname = pathname.startsWith('/super-admin')
      ? '/super-admin/login'
      : '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}