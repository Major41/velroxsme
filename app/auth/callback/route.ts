// app/auth/callback/route.ts

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    // await supabase.auth.exchangeCodeForSession(code);
  }

  // After verification, redirect to the main page
  // You can change this to any page you want
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/`;

  // Or redirect to the business login page
  // const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/business/login`;

  // Or redirect to a custom success page
  // const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/verification-success`;

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
