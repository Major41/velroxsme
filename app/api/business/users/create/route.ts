import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      business_id, name, email, phone, password, role_id, status,
    } = body;

    if (!business_id || !name || !email || !password || !role_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const normalizedEmail = email.trim().toLowerCase();

    // Uniqueness
    const { data: existing } = await supabase
      .from("business_users")
      .select("id")
      .eq("business_id", business_id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from("business_users")
      .insert({
        business_id,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone || null,
        password_hash,
        role_id,
        status: status || "active",
      })
      .select("*")
      .single();

    if (error) throw error;

    const { password_hash: _ph, ...safe } = user as any;
    return NextResponse.json({ user: safe }, { status: 201 });
  } catch (err: any) {
    console.error("Create user error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}