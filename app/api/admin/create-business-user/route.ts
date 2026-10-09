// app/api/admin/create-business-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getAuthCookie, SUPER_ADMIN_COOKIE } from "@/lib/cookies";
import { verifyToken } from "@/lib/jwt";
import { getMailer, getSenderAddress } from "@/lib/email/mailer";
import { renderBusinessVerificationEmail } from "@/lib/email/templates";

const TOKEN_TTL_HOURS = 24;

export async function POST(request: NextRequest) {
  try {
    /* -------- Auth -------- */
    const token = await getAuthCookie(SUPER_ADMIN_COOKIE);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const claims = await verifyToken(token);
    if (!claims || claims.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* -------- Body -------- */
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

    /* -------- Validation -------- */
    if (
      !business_name ||
      !location ||
      !contact_person_name ||
      !contact_phone ||
      !contact_email ||
      subscription_amount == null
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    if (!admin_username || !admin_password) {
      return NextResponse.json(
        { error: "Admin username and password are required" },
        { status: 400 },
      );
    }
    if (admin_password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const normalizedEmail = contact_email.trim().toLowerCase();

    /* -------- Uniqueness -------- */
    const { data: existing } = await supabase
      .from("businesses")
      .select("id")
      .eq("contact_email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A business with this email already exists" },
        { status: 409 },
      );
    }

    /* -------- Create business -------- */
    const password_hash = await bcrypt.hash(admin_password, 10);

    const { data: business, error: insertError } = await supabase
      .from("businesses")
      .insert({
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
        subscription_status: "active",
        admin_username,
        password_hash,
        email_verified: false, // ← must verify before login
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to create business" },
        { status: 500 },
      );
    }

    /* -------- Generate verification token -------- */
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

    if (tokenError) {
      console.error("Token insert error:", tokenError);
      // Business was created; the user can request a resend from login page
      return NextResponse.json(
        {
          business: stripSensitive(business),
          warning:
            "Business created, but the verification email could not be queued. Please use Resend.",
        },
        { status: 201 },
      );
    }

    /* -------- Send email -------- */
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${baseUrl}/verify-email?token=${rawToken}`;

    const { html, text } = renderBusinessVerificationEmail({
      businessName: business_name,
      contactPersonName: contact_person_name,
      verificationUrl,
      expiresInHours: TOKEN_TTL_HOURS,
    });

    let emailSent = true;
    try {
      const mailer = getMailer();
      await mailer.sendMail({
        from: getSenderAddress(),
        to: normalizedEmail,
        subject: `Verify your Velrox account for ${business_name}`,
        text,
        html,
      });
    } catch (mailErr: any) {
      emailSent = false;
      console.error("Failed to send verification email:", mailErr);
    }

    return NextResponse.json(
      {
        business: stripSensitive(business),
        emailSent,
        message: emailSent
          ? `Verification email sent to ${normalizedEmail}`
          : "Business created, but the verification email failed to send. Please use Resend.",
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("Create business error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}

function stripSensitive(business: any) {
  const { password_hash, admin_password, ...safe } = business || {};
  return safe;
}