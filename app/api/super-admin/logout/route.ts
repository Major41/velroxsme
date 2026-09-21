// app/api/super-admin/logout/route.ts
import { NextResponse } from 'next/server';
import { clearAuthCookie, SUPER_ADMIN_COOKIE } from '@/lib/cookies';

export async function POST() {
  await clearAuthCookie(SUPER_ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}