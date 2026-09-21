// app/api/business/logout/route.ts
import { NextResponse } from 'next/server';
import { clearAuthCookie, BUSINESS_COOKIE } from '@/lib/cookies';

export async function POST() {
  await clearAuthCookie(BUSINESS_COOKIE);
  return NextResponse.json({ ok: true });
}