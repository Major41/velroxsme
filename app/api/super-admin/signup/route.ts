// app/api/super-admin/signup/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';
import { signToken } from '@/lib/jwt';
import { setAuthCookie, SUPER_ADMIN_COOKIE } from '@/lib/cookies';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    // --- Validation ---
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = await createClient();

    // --- Enforce single super admin ---
    const { count, error: countError } = await supabase
      .from('super_admins')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'A super admin account already exists. Only one is allowed.' },
        { status: 403 }
      );
    }

    // --- Also check that email isn't taken ---
    const { data: existing } = await supabase
      .from('super_admins')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // --- Hash password and insert ---
    const password_hash = await bcrypt.hash(password, 10);

    const { data: admin, error: insertError } = await supabase
      .from('super_admins')
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        password_hash,
      })
      .select('*')
      .single();

    if (insertError || !admin) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create super admin account' },
        { status: 500 }
      );
    }

    // --- Sign JWT and set cookie ---
    const token = await signToken({
      sub: admin.id,
      email: admin.email,
      role: 'super_admin',
    });

    await setAuthCookie(SUPER_ADMIN_COOKIE, token);

    const { password_hash: _ph, ...safe } = admin;
    return NextResponse.json({ admin: safe }, { status: 201 });
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}