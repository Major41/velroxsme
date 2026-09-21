// app/api/super-admin/me/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthCookie, SUPER_ADMIN_COOKIE } from '@/lib/cookies';
import { verifyToken } from '@/lib/jwt';

export async function GET() {
  const token = await getAuthCookie(SUPER_ADMIN_COOKIE);
  if (!token) return NextResponse.json({ admin: null }, { status: 401 });

  const claims = await verifyToken(token);
  if (!claims || claims.role !== 'super_admin') {
    return NextResponse.json({ admin: null }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: admin } = await supabase
    .from('super_admins')
    .select('*')
    .eq('id', claims.sub)
    .maybeSingle();

  if (!admin) return NextResponse.json({ admin: null }, { status: 401 });

  const { password, password_hash, ...safe } = admin;
  return NextResponse.json({ admin: safe });
}