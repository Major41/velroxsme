import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id, business_id, name, email, phone, role_id, status, password,
    } = body;

    if (!id || !business_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const payload: any = {};

    if (name) payload.name = name.trim();
    if (email) payload.email = email.trim().toLowerCase();
    if (phone !== undefined) payload.phone = phone || null;
    if (role_id) payload.role_id = role_id;
    if (status) payload.status = status;
    payload.updated_at = new Date().toISOString();

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 },
        );
      }
      payload.password_hash = await bcrypt.hash(password, 10);
    }

    const { data: user, error } = await supabase
      .from("business_users")
      .update(payload)
      .eq("id", id)
      .eq("business_id", business_id)
      .select("*")
      .single();

    if (error) throw error;

    const { password_hash: _ph, ...safe } = user as any;
    return NextResponse.json({ user: safe });
  } catch (err: any) {
    console.error("Update user error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}