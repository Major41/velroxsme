// app/api/business/sales/create-with-stock/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthCookie, BUSINESS_COOKIE } from "@/lib/cookies";
import { verifyToken } from "@/lib/jwt";

interface CartItem {
  product_id: string;
  product_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  is_service: boolean;
  track_stock: boolean;
}

interface CreateSalePayload {
  business_id: string;
  customer_name?: string;
  customer_phone?: string;
  payment_method: string;
  payment_status: string;
  status: string;
  notes?: string;
  items: CartItem[];
}

export async function POST(req: Request) {
  try {
    const body: CreateSalePayload = await req.json();
    const {
      business_id,
      customer_name,
      customer_phone,
      payment_method,
      payment_status,
      status,
      notes,
      items,
    } = body;

    if (!business_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "business_id and items are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    /* -------- Identify who's selling -------- */
    const token = await getAuthCookie(BUSINESS_COOKIE);
    const claims = token ? await verifyToken(token) : null;
    const recordedBy =
      (claims as any)?.business_name || (claims as any)?.email || null;

    const date = new Date().toISOString().split("T")[0];
    const createdSales: any[] = [];

    /* -------- For each cart item, create a sale row -------- */
    for (const item of items) {
      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      const amount = qty * price;

      if (!Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity for ${item.product_name}` },
          { status: 400 },
        );
      }

      /* -------- Load product to check stock -------- */
      const { data: product } = await supabase
        .from("products")
        .select("id, name, stock_quantity, track_stock, is_service, business_id")
        .eq("id", item.product_id)
        .eq("business_id", business_id)
        .maybeSingle();

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.product_name}` },
          { status: 404 },
        );
      }

      // Block sales of tracked products with insufficient stock
      if (
        !product.is_service &&
        product.track_stock &&
        Number(product.stock_quantity) < qty
      ) {
        return NextResponse.json(
          {
            error: `Not enough stock for ${product.name}. Available: ${product.stock_quantity}, requested: ${qty}`,
          },
          { status: 409 },
        );
      }

      /* -------- Insert the sale -------- */
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          business_id,
          date,
          product_name: item.product_name,
          category: item.category || "POS",
          customer_name: customer_name || "Walk-in Customer",
          customer_phone: customer_phone || "",
          quantity: qty,
          unit_price: price,
          amount,
          payment_method,
          payment_status,
          status,
          notes: notes || "",
        })
        .select("*")
        .single();

      if (saleErr) throw saleErr;
      createdSales.push(sale);

      /* -------- Decrement stock + record movement -------- */
      if (!product.is_service && product.track_stock) {
        const currentStock = Number(product.stock_quantity) || 0;
        const stockAfter = currentStock - qty;

        // Record the movement
        const { error: moveErr } = await supabase
          .from("stock_movements")
          .insert({
            business_id,
            product_id: product.id,
            type: "sale",
            quantity: -qty, // negative: stock out
            unit_cost: price,
            total_cost: amount,
            reference: `SALE-${sale.id}`,
            notes: `Sold via POS to ${customer_name || "Walk-in"}`,
            stock_after: stockAfter,
            recorded_by: recordedBy,
            movement_date: date,
          });

        if (moveErr) {
          console.error("Failed to insert stock movement:", moveErr);
          // Continue — the sale is already saved
        }

        // Decrement the product
        const { error: updateErr } = await supabase
          .from("products")
          .update({
            stock_quantity: stockAfter,
            updated_at: new Date().toISOString(),
          })
          .eq("id", product.id);

        if (updateErr) {
          console.error("Failed to decrement stock:", updateErr);
        }
      }
    }

    return NextResponse.json(
      { success: true, sales: createdSales },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("POS sale error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}