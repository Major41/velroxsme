// app/api/business/login/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase/admin';
import { signToken } from '@/lib/jwt';
import { setAuthCookie, BUSINESS_COOKIE } from '@/lib/cookies';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createAdminClient(); // ← service role, bypasses RLS

    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('contact_email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Login lookup error:', error);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // --- Password check ---
    // Use password_hash (bcrypt). Fall back to legacy plaintext columns
    // only if they actually exist and are populated.
    const stored =
      business.password_hash ||
      business.admin_password_hash ||
      business.admin_password;

    if (!stored) {
      console.error('Business has no password hash:', business.id);
      return NextResponse.json(
        { error: 'Account misconfigured. Contact support.' },
        { status: 500 }
      );
    }

    const ok = stored.startsWith('$2')
      ? await bcrypt.compare(password, stored)
      : password === stored;

    if (!ok) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // --- Subscription gate ---
    if (
      business.subscription_status &&
      business.subscription_status !== 'active'
    ) {
      return NextResponse.json(
        { error: 'Your subscription is not active. Please contact support.' },
        { status: 403 }
      );
    }

    // --- Issue JWT + cookie ---
    const token = await signToken({
      sub: business.id,
      email: business.contact_email,
      business_name: business.business_name,
      role: 'business',
    });

    await setAuthCookie(BUSINESS_COOKIE, token);

    // Strip sensitive fields before returning
    const {
      password_hash: _ph,
      admin_password: _ap,
      admin_password_hash: _aph,
      ...safe
    } = business as any;

    return NextResponse.json({ business: safe });
  } catch (err: any) {
    console.error('Login route error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}