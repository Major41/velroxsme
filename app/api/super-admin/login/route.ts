// app/api/super-admin/login/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';
import { signToken } from '@/lib/jwt';
import { setAuthCookie, SUPER_ADMIN_COOKIE } from '@/lib/cookies';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: admin, error } = await supabase
    .from('super_admins')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (error || !admin) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const stored = admin.password_hash || admin.password;
  const ok = stored?.startsWith('$2')
    ? await bcrypt.compare(password, stored)
    : password === stored;

  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await signToken({
    sub: admin.id,
    email: admin.email,
    role: 'super_admin',
  });

  await setAuthCookie(SUPER_ADMIN_COOKIE, token);

  const { password: _p, password_hash: _h, ...safe } = admin;
  return NextResponse.json({ admin: safe });
}