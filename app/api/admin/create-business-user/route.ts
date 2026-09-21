// app/api/admin/create-business-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';
import { getAuthCookie, SUPER_ADMIN_COOKIE } from '@/lib/cookies';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    console.log('Create business request received');
    const token = await getAuthCookie(SUPER_ADMIN_COOKIE);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const claims = await verifyToken(token);
    if (!claims || claims.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      business_name,
      business_type,
      location,
      contact_person_name,
      contact_position,
      contact_phone,
      contact_email,
      subscription_amount,
      start_date,
      admin_username,
      admin_password,
    } = body;

    // --- Validation ---
    if (
      !business_name ||
      !location ||
      !contact_person_name ||
      !contact_phone ||
      !contact_email ||
      subscription_amount == null
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    if (!admin_username || !admin_password) {
      return NextResponse.json(
        { error: 'Admin username and password are required' },
        { status: 400 }
      );
    }
    if (admin_password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const normalizedEmail = contact_email.trim().toLowerCase();

    // --- Ensure email is unique ---
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('contact_email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A business with this email already exists' },
        { status: 409 }
      );
    }

    // --- Hash password and insert ---
    const password_hash = await bcrypt.hash(admin_password, 10);

    const { data: business, error: insertError } = await supabase
      .from('businesses')
      .insert({
       // id of the super admin creating it
        business_name,
        business_type,
        location,
        contact_person_name,
        contact_position,
        contact_phone,
        contact_email: normalizedEmail,
        subscription_amount: Number(subscription_amount),
        start_date,
        subscription_tier: business_type,
        subscription_status: 'active',
        admin_username,
        password_hash,                     // ← hashed
        email_verified: true,              // you own creation; trust it
        // Do NOT set admin_password (plaintext) or auth_id anymore
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to create business' },
        { status: 500 }
      );
    }

    // Strip sensitive fields
    const { password_hash: _ph, admin_password: _ap, ...safe } = business as any;

    return NextResponse.json({ business: safe }, { status: 201 });
  } catch (err: any) {
    console.error('Create business error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}