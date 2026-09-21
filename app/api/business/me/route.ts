// app/api/business/me/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthCookie, BUSINESS_COOKIE } from '@/lib/cookies';
import { verifyToken } from '@/lib/jwt';

export async function GET() {
  const token = await getAuthCookie(BUSINESS_COOKIE);
  if (!token) return NextResponse.json({ business: null }, { status: 401 });

  const claims = await verifyToken(token);
  if (!claims || claims.role !== 'business') {
    return NextResponse.json({ business: null }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', claims.sub)
    .maybeSingle();

  if (!business) return NextResponse.json({ business: null }, { status: 401 });

  const { admin_password, admin_password_hash, ...safe } = business;
  return NextResponse.json({ business: safe });
}