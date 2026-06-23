// app/api/admin/create-business-user/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, userData } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create a regular Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Use regular signUp which automatically sends verification email
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          business_name: userData.business_name,
          admin_username: userData.admin_username,
          business_type: userData.business_type,
          role: 'business_admin',
        },
        // Use the production URL from environment variables
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // The user object might be in authData.user or we need to get it from session
    let userId = null;
    
    if (authData.user) {
      userId = authData.user.id;
    } else if (authData.session?.user) {
      userId = authData.session.user.id;
    }

    // If we don't have the user ID immediately, wait and fetch it
    if (!userId) {
      // Wait a moment for the user to be created
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to get the user by email using admin API
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
      
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const createdUser = users?.users.find((u: any) => u.email === email);
      
      if (createdUser) {
        userId = createdUser.id;
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email: email },
      message: 'User created successfully. Verification email sent.',
    });
  } catch (error) {
    console.error('Error creating business user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}