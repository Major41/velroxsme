// app/api/business/products/restock/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthCookie, BUSINESS_COOKIE } from "@/lib/cookies";
import { verifyToken } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      product_id,
      business_id,
      quantity,
      unit_cost,
      supplier,
      reference,
      batch_number,
      expiry_date,
      notes,
      movement_date,
    } = body;

    if (!product_id || !business_id || !quantity) {
      return NextResponse.json(
        { error: "product_id, business_id, and quantity are required" },
        { status: 400 },
      );
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    /* -------- Load the product -------- */
    const { data: product, error: loadErr } = await supabase
      .from("products")
      .select("id, name, stock_quantity, business_id")
      .eq("id", product_id)
      .eq("business_id", business_id)
      .maybeSingle();

    if (loadErr || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    const currentStock = Number(product.stock_quantity) || 0;
    const stockAfter = currentStock + qty;
    const unitCost = unit_cost != null ? Number(unit_cost) : null;
    const totalCost = unitCost != null ? unitCost * qty : null;

    /* -------- Who's doing this? -------- */
    const token = await getAuthCookie(BUSINESS_COOKIE);
    const claims = token ? await verifyToken(token) : null;
    const recordedBy =
      (claims as any)?.business_name || (claims as any)?.email || null;
    const recordedById = (claims as any)?.sub || null;

    /* -------- Insert movement row -------- */
    const { data: movement, error: moveErr } = await supabase
      .from("stock_movements")
      .insert({
        business_id,
        product_id,
        type: "restock",
        quantity: qty,
        unit_cost: unitCost,
        total_cost: totalCost,
        supplier: supplier || null,
        reference: reference || null,
        batch_number: batch_number || null,
        expiry_date: expiry_date || null,
        notes: notes || null,
        stock_after: stockAfter,
        recorded_by: recordedBy,
        recorded_by_id: recordedById,
        movement_date: movement_date || new Date().toISOString().split("T")[0],
      })
      .select("*")
      .single();

    if (moveErr) throw moveErr;

    /* -------- Update product stock -------- */
    const { error: updateErr } = await supabase
      .from("products")
      .update({
        stock_quantity: stockAfter,
        // Optionally update cost_price if a new cost was given
        ...(unitCost != null ? { cost_price: unitCost } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", product_id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ movement }, { status: 201 });
  } catch (err: any) {
    console.error("Restock error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}