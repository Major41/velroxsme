// app/api/business/create-user/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone, role, businessId } = await request.json();

    if (!email || !password || !name || !role || !businessId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Only allow manager and staff roles
    if (!['manager', 'staff'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Only manager and staff are allowed' },
        { status: 400 }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for business users
      user_metadata: {
        name,
        role,
        business_id: businessId,
        user_type: 'business_user',
      },
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // Set permissions based on role
    let permissions = [];
    if (role === 'manager') {
      permissions = ['view_all', 'edit_sales', 'edit_customers', 'view_reports'];
    } else if (role === 'staff') {
      permissions = ['view_sales', 'view_customers', 'add_reminders'];
    }

    // Insert into business_users table
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: userData, error: insertError } = await supabase
      .from('business_users')
      .insert({
        business_id: businessId,
        auth_id: authData.user.id,
        name,
        email,
        phone,
        role,
        status: 'active',
        permissions,
      })
      .select()
      .single();

    if (insertError) {
      // Rollback - delete the auth user if business_users insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create user record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: userData,
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}