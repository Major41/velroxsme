// app/auth/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const supabase = await createClient();

    /* -------- Look up the token -------- */
    const { data: record, error: fetchErr } = await supabase
      .from("custom_email_verification")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (fetchErr || !record) {
      return NextResponse.json(
        { error: "Invalid or expired verification link" },
        { status: 400 },
      );
    }

    if (record.used_at) {
      return NextResponse.json(
        { error: "This verification link has already been used" },
        { status: 400 },
      );
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This verification link has expired" },
        { status: 400 },
      );
    }

    /* -------- Mark business verified -------- */
    const { error: bizErr } = await supabase
      .from("businesses")
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .eq("id", record.business_id);

    if (bizErr) throw bizErr;

    /* -------- Mark token used -------- */
    await supabase
      .from("custom_email_verification")
      .update({ used_at: new Date().toISOString() })
      .eq("id", record.id);

    /* -------- Fetch business for the welcome screen -------- */
    const { data: business } = await supabase
      .from("businesses")
      .select("business_name, contact_email")
      .eq("id", record.business_id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      businessName: business?.business_name || "",
      email: business?.contact_email || record.email,
    });
  } catch (err: any) {
    console.error("Verify email error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}