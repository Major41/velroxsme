// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

const BUSINESS_COOKIE = 'business_token';
const SUPER_ADMIN_COOKIE = 'super_admin_token';

const PUBLIC_PATHS = [
  '/',
  '/super-admin/login',
  '/super-admin/signup',
  '/signup',
  '/auth',
  '/api/business/login',
  '/api/super-admin/login',
  '/api/business/me',
  '/api/super-admin/me',
  '/api/business/logout',
  '/api/super-admin/logout',
  '/api/super-admin/signup',
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  // Which guard applies?
  const needsSuperAdmin =
    pathname.startsWith('/super-admin') || pathname.startsWith('/api/super-admin');
  const needsBusiness =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/api/business');

  if (needsSuperAdmin) {
    const token = request.cookies.get(SUPER_ADMIN_COOKIE)?.value;
    const claims = token ? await verifyToken(token) : null;
    if (!claims || claims.role !== 'super_admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/super-admin/login';
      return NextResponse.redirect(url);
    }
  }

  if (needsBusiness) {
    const token = request.cookies.get(BUSINESS_COOKIE)?.value;
    const claims = token ? await verifyToken(token) : null;
    if (!claims || claims.role !== 'business') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};