// lib/auth/cookies.ts
import { cookies } from 'next/headers';

export const BUSINESS_COOKIE = 'business_token';
export const SUPER_ADMIN_COOKIE = 'super_admin_token';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

export async function setAuthCookie(name: string, token: string) {
  const store = await cookies();
  store.set(name, token, COOKIE_OPTIONS);
}

export async function clearAuthCookie(name: string) {
  const store = await cookies();
  store.set(name, '', { ...COOKIE_OPTIONS, maxAge: 0 });
}

export async function getAuthCookie(name: string) {
  const store = await cookies();
  return store.get(name)?.value;
}