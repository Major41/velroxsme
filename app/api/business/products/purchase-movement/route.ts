// app/api/business/products/purchase-movement/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reconciliation endpoint for a purchase's stock impact.
 *
 * Actions:
 *   - "reconcile": makes the recorded stock impact match the target
 *   - "reverse": removes all stock impact for this purchase (used on delete)
 *
 * All movements created are tagged with `reference = PUR-<purchaseId>` so
 * the same purchase can be reconciled repeatedly without creating duplicates.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, business_id, product_id, purchase_id } = body;

    if (!business_id || !product_id || !purchase_id) {
      return NextResponse.json(
        { error: "business_id, product_id, purchase_id are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const reference = `PUR-${purchase_id}`;

    /* -------- Load the product -------- */
    const { data: product, error: loadErr } = await supabase
      .from("products")
      .select("id, name, stock_quantity, track_stock, is_service, business_id")
      .eq("id", product_id)
      .eq("business_id", business_id)
      .maybeSingle();

    if (loadErr || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Services and untracked products don't affect stock
    if (product.is_service || !product.track_stock) {
      return NextResponse.json({ moved: 0, skipped: true });
    }

    /* -------- What's already recorded for this purchase? -------- */
    const { data: existing } = await supabase
      .from("stock_movements")
      .select("id, quantity")
      .eq("business_id", business_id)
      .eq("product_id", product_id)
      .eq("reference", reference);

    const alreadyRecorded = (existing || []).reduce(
      (sum, m) => sum + Number(m.quantity || 0),
      0,
    );

    /* -------- Determine target quantity -------- */
    let target = 0;

    if (action === "reverse") {
      target = 0;
    } else if (action === "reconcile") {
      target = Number(body.target_quantity) || 0;
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const delta = target - alreadyRecorded;

    /* -------- Nothing to do? -------- */
    if (Math.abs(delta) < 0.0001) {
      return NextResponse.json({ moved: 0, already_recorded: alreadyRecorded });
    }

    /* -------- Remove old movements if we're adjusting downward -------- */
    if (delta < 0 && existing && existing.length > 0) {
      // Delete prior movements for this purchase so we record a clean state
      const idsToDelete = existing.map((m) => m.id);
      await supabase.from("stock_movements").delete().in("id", idsToDelete);
    }

    /* -------- Apply the net adjustment -------- */
    const currentStock = Number(product.stock_quantity) || 0;
    const stockAfter = currentStock + delta;

    const { data: movement, error: moveErr } = await supabase
      .from("stock_movements")
      .insert({
        business_id,
        product_id,
        type: "restock",
        quantity: delta,
        unit_cost: Number(body.unit_cost) || null,
        total_cost:
          body.unit_cost != null ? Number(body.unit_cost) * delta : null,
        supplier: body.supplier || null,
        reference,
        notes:
          action === "reverse"
            ? "Purchase deleted — stock reversed"
            : "Stock added via purchase",
        stock_after: stockAfter,
        movement_date:
          body.movement_date || new Date().toISOString().split("T")[0],
      })
      .select("*")
      .single();

    if (moveErr) throw moveErr;

    /* -------- Update product stock -------- */
    const { error: updateErr } = await supabase
      .from("products")
      .update({
        stock_quantity: stockAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product_id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      moved: delta,
      stock_after: stockAfter,
      movement,
    });
  } catch (err: any) {
    console.error("Purchase movement error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}