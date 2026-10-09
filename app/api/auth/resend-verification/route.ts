// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getMailer, getSenderAddress } from "@/lib/email/mailer";
import { renderBusinessVerificationEmail } from "@/lib/email/templates";

const TOKEN_TTL_HOURS = 24;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const supabase = await createClient();

    /* -------- Find business -------- */
    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("contact_email", normalizedEmail)
      .maybeSingle();

    // Always return success to prevent email enumeration
    if (!business || business.email_verified) {
      return NextResponse.json({ success: true });
    }

    /* -------- Invalidate old tokens -------- */
    await supabase
      .from("custom_email_verification")
      .delete()
      .eq("business_id", business.id);

    /* -------- Generate new token -------- */
    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );

    const { error: tokenError } = await supabase
      .from("custom_email_verification")
      .insert({
        business_id: business.id,
        email: normalizedEmail,
        token: rawToken,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) throw tokenError;

    /* -------- Send email -------- */
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${baseUrl}/verify-email?token=${rawToken}`;

    const { html, text } = renderBusinessVerificationEmail({
      businessName: business.business_name,
      contactPersonName: business.contact_person_name,
      verificationUrl,
      expiresInHours: TOKEN_TTL_HOURS,
    });

    const mailer = getMailer();
    await mailer.sendMail({
      from: getSenderAddress(),
      to: normalizedEmail,
      subject: `Verify your Velrox account for ${business.business_name}`,
      text,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Resend verification error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}