// app/api/admin/update-business/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';
import { getAuthCookie, SUPER_ADMIN_COOKIE } from '@/lib/cookies';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  const token = await getAuthCookie(SUPER_ADMIN_COOKIE);
  const claims = token ? await verifyToken(token) : null;
  if (!claims || claims.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, ...fields } = await request.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = await createClient();
  const update: any = {
    business_name: fields.business_name,
    business_type: fields.business_type,
    location: fields.location,
    contact_person_name: fields.contact_person_name,
    contact_position: fields.contact_position,
    contact_phone: fields.contact_phone,
    contact_email: fields.contact_email?.trim().toLowerCase(),
    subscription_amount: Number(fields.subscription_amount),
    start_date: fields.start_date,
    subscription_tier: fields.business_type,
  };

  if (fields.admin_username) update.admin_username = fields.admin_username;
  if (fields.admin_password) {
    update.password_hash = await bcrypt.hash(fields.admin_password, 10);
    // Also clear legacy plaintext column if it exists
    update.admin_password = null;
  }

  const { data, error } = await supabase
    .from('businesses')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { password_hash: _ph, admin_password: _ap, ...safe } = data as any;
  return NextResponse.json({ business: safe });
}