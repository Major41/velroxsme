"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, X, Package,
  CreditCard, Banknote, Smartphone, Building2, CheckCircle2,
  User as UserIcon, Printer, Percent,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";
import { SaleReceipt } from "@/components/dashboard/SaleReceipt";
import { ReceiptPDFButton } from "@/components/dashboard/ReceiptPDF";
import { ThermalPrinterButton } from "@/components/dashboard/ThermalPrinterButton";

interface POSProduct {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  selling_price: number;
  cost_price: number;
  stock_quantity: number;
  track_stock: boolean;
  is_service: boolean;
  status: "active" | "inactive";
  is_for_sale: boolean;
  product_categories?: { name: string } | null;
  units_of_measure?: { name: string; abbreviation: string } | null;
}

interface CartLine {
  product: POSProduct;
  quantity: number;
  unit_price: number; // can be overridden at POS
}

export default function POSPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [products, setProducts] = useState<POSProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
  });

  // Payment
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [amountPaid, setAmountPaid] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Receipt
  const [lastSale, setLastSale] = useState<any | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptSize, setReceiptSize] = useState<"a4" | "thermal">("thermal");

  const searchRef = useRef<HTMLInputElement>(null);

  /* ---------------- Load products ---------------- */

  useEffect(() => {
    if (business?.id) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  const fetchProducts = async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, sku, category_id, selling_price, cost_price, stock_quantity, track_stock, is_service, status, is_for_sale, product_categories(name), units_of_measure(name, abbreviation)",
        )
        .eq("business_id", business.id)
        .eq("status", "active")
        .eq("is_for_sale", true)
        .order("name");

      if (error) throw error;
      setProducts((data as any) || []);
    } catch (err: any) {
      console.error("Failed to load products:", err);
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // Focus the search field on mount and after each sale
  useEffect(() => {
    searchRef.current?.focus();
  }, [lastSale]);

  /* ---------------- Filtering ---------------- */

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const p of products) {
      if (p.category_id && p.product_categories?.name) {
        map.set(p.category_id, {
          id: p.category_id,
          name: p.product_categories.name,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== "all" && p.category_id !== selectedCategory)
        return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q)
      );
    });
  }, [products, search, selectedCategory]);

  /* ---------------- Cart operations ---------------- */

  const addToCart = (product: POSProduct) => {
    // Guard: no stock left
    if (
      !product.is_service &&
      product.track_stock &&
      product.stock_quantity <= 0
    ) {
      setError(`${product.name} is out of stock`);
      setTimeout(() => setError(""), 2500);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        // Guard: cannot exceed available stock
        if (
          !product.is_service &&
          product.track_stock &&
          existing.quantity + 1 > product.stock_quantity
        ) {
          setError(
            `Only ${product.stock_quantity} of ${product.name} available`,
          );
          setTimeout(() => setError(""), 2500);
          return prev;
        }
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [
        ...prev,
        { product, quantity: 1, unit_price: product.selling_price },
      ];
    });

    setSearch("");
    searchRef.current?.focus();
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.product.id !== productId) return l;
          const nextQty = l.quantity + delta;
          if (nextQty <= 0) return null;
          if (
            !l.product.is_service &&
            l.product.track_stock &&
            nextQty > l.product.stock_quantity
          ) {
            setError(
              `Only ${l.product.stock_quantity} of ${l.product.name} available`,
            );
            setTimeout(() => setError(""), 2500);
            return l;
          }
          return { ...l, quantity: nextQty };
        })
        .filter((l): l is CartLine => l !== null),
    );
  };

  const updatePrice = (productId: string, price: number) => {
    setCart((prev) =>
      prev.map((l) =>
        l.product.id === productId ? { ...l, unit_price: price } : l,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (!confirm("Clear the cart?")) return;
    setCart([]);
    setCustomer({ name: "", phone: "" });
  };

  /* ---------------- Totals ---------------- */

  const subtotal = cart.reduce(
    (s, l) => s + l.quantity * l.unit_price,
    0,
  );
  const totalItems = cart.reduce((s, l) => s + l.quantity, 0);
  const total = subtotal; // no tax by default — extend later

  /* ---------------- Checkout ---------------- */

  const openPaymentDialog = () => {
    if (cart.length === 0) return;
    setAmountPaid(total.toString());
    setPaymentMethod("Cash");
    setPaymentStatus("paid");
    setShowPaymentDialog(true);
  };

  const handleCheckout = async () => {
    if (!business?.id || cart.length === 0) return;
    setCheckoutLoading(true);
    setError("");

    try {
      const res = await fetch("/api/business/sales/create-with-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          customer_name: customer.name || "Walk-in Customer",
          customer_phone: customer.phone,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          status: "completed",
          notes: "",
          items: cart.map((l) => ({
            product_id: l.product.id,
            product_name: l.product.name,
            category:
              l.product.product_categories?.name || "POS",
            quantity: l.quantity,
            unit_price: l.unit_price,
            is_service: l.product.is_service,
            track_stock: l.product.track_stock,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      // Use the first sale as the receipt (single-receipt view)
      const first = data.sales?.[0];

      // Build a receipt-friendly object that matches SaleReceipt's shape
      const receiptSale = {
        id: first?.id || crypto.randomUUID(),
        date: new Date().toISOString().split("T")[0],
        product_name:
          cart.length === 1
            ? cart[0].product.name
            : `${cart.length} items`,
        category:
          cart.length === 1
            ? cart[0].product.product_categories?.name || "POS"
            : "POS",
        customer_name: customer.name || "Walk-in Customer",
        customer_phone: customer.phone,
        quantity: totalItems,
        unit_price: cart.length === 1 ? cart[0].unit_price : subtotal,
        amount: subtotal,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        status: "completed",
        notes: "",
      };

      setLastSale(receiptSale);
      setShowPaymentDialog(false);
      setShowReceiptDialog(true);
      setCart([]);
      setCustomer({ name: "", phone: "" });
      setSuccess(`Sale completed — KSh ${total.toLocaleString()}`);
      setTimeout(() => setSuccess(""), 4000);

      // Refresh products so stock reflects the sale
      fetchProducts();
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* LEFT — Product grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search + filters */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              ref={searchRef}
              placeholder="Search products or scan barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredProducts.length > 0) {
                  addToCart(filteredProducts[0]);
                }
              }}
              className="pl-9 bg-slate-800 border-slate-700 text-white h-11"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === "all"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              All ({products.length})
            </button>
            {categories.map((c) => {
              const count = products.filter(
                (p) => p.category_id === c.id,
              ).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === c.id
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {c.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">
                {products.length === 0
                  ? "No products available for sale. Add products in Products → Items and mark them as 'For Sale'."
                  : "No products match your search."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((l) => l.product.id === p.id);
                const remaining = p.is_service
                  ? Infinity
                  : p.track_stock
                    ? p.stock_quantity - (inCart?.quantity || 0)
                    : Infinity;
                const outOfStock = remaining <= 0;

                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                    className={`relative text-left p-3 rounded-xl border transition-all ${
                      outOfStock
                        ? "bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed"
                        : inCart
                          ? "bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/15"
                          : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-blue-500/40"
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1.5">
                        {inCart.quantity}
                      </span>
                    )}

                    <div className="mb-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>

                    <p className="text-sm font-medium text-slate-100 line-clamp-2 mb-1 min-h-[2.5rem]">
                      {p.name}
                    </p>

                    <p className="text-base font-bold text-emerald-300">
                      KSh {p.selling_price.toLocaleString()}
                    </p>

                    {!p.is_service && p.track_stock && (
                      <p
                        className={`text-[10px] mt-1 ${
                          remaining <= 0
                            ? "text-red-400"
                            : remaining <= 5
                              ? "text-amber-400"
                              : "text-slate-500"
                        }`}
                      >
                        {remaining <= 0
                          ? "Out of stock"
                          : `${remaining} in stock`}
                      </p>
                    )}
                    {p.is_service && (
                      <p className="text-[10px] mt-1 text-purple-400">
                        Service
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Cart */}
      <div className="w-96 xl:w-[420px] flex-shrink-0 border-l border-slate-800 bg-slate-900/60 flex flex-col">
        {/* Cart header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-white">
              Cart ({cart.length})
            </h2>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Customer info (compact) */}
        <div className="p-3 border-b border-slate-800 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Customer name"
              value={customer.name}
              onChange={(e) =>
                setCustomer({ ...customer, name: e.target.value })
              }
              className="bg-slate-800 border-slate-700 text-white text-sm h-9"
            />
            <Input
              placeholder="Phone"
              value={customer.phone}
              onChange={(e) =>
                setCustomer({ ...customer, phone: e.target.value })
              }
              className="bg-slate-800 border-slate-700 text-white text-sm h-9"
            />
          </div>
        </div>

        {/* Cart lines */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center py-12 px-6">
              <ShoppingCart className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">
                Cart is empty. Tap products to add them.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {cart.map((line) => (
                <div key={line.product.id} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {line.product.name}
                      </p>
                      {line.product.sku && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          {line.product.sku}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(line.product.id)}
                      className="p-1 hover:bg-slate-800 rounded flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Qty stepper */}
                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(line.product.id, -1)}
                        className="p-1 hover:bg-slate-700 rounded"
                      >
                        <Minus className="w-3.5 h-3.5 text-slate-300" />
                      </button>
                      <span className="text-sm font-semibold text-white min-w-8 text-center">
                        {line.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(line.product.id, 1)}
                        className="p-1 hover:bg-slate-700 rounded"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-300" />
                      </button>
                    </div>

                    {/* Price (editable) */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">KSh</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) =>
                          updatePrice(
                            line.product.id,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-24 h-8 bg-slate-800 border-slate-700 text-white text-sm text-right"
                      />
                    </div>

                    <p className="text-sm font-semibold text-emerald-300 min-w-20 text-right">
                      {(line.quantity * line.unit_price).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + checkout */}
        <div className="border-t border-slate-800 p-4 space-y-3">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Items</span>
            <span className="text-slate-200">{totalItems}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-400">
            <span>Subtotal</span>
            <span className="text-slate-200">
              KSh {subtotal.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-slate-800">
            <span>Total</span>
            <span className="text-emerald-400">
              KSh {total.toLocaleString()}
            </span>
          </div>

          <Button
            onClick={openPaymentDialog}
            disabled={cart.length === 0}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold"
          >
            Charge KSh {total.toLocaleString()}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/30 backdrop-blur rounded-lg px-4 py-3 max-w-md">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/10 border border-emerald-500/30 backdrop-blur rounded-lg px-4 py-3 max-w-md">
          <p className="text-emerald-200 text-sm">{success}</p>
        </div>
      )}

      {/* Payment dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription className="text-slate-400">
              Total due: KSh {total.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Payment method buttons */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Payment method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "Cash", icon: <Banknote className="w-4 h-4" /> },
                  {
                    key: "M-Pesa",
                    icon: <Smartphone className="w-4 h-4" />,
                  },
                  {
                    key: "Card",
                    icon: <CreditCard className="w-4 h-4" />,
                  },
                  {
                    key: "Bank Transfer",
                    icon: <Building2 className="w-4 h-4" />,
                  },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setPaymentMethod(m.key)}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      paymentMethod === m.key
                        ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-200"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {m.icon}
                    <span className="text-sm font-medium">{m.key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment status */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Payment status
              </label>
              <Select
                value={paymentStatus}
                onValueChange={setPaymentStatus}
              >
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="paid">Paid in full</SelectItem>
                  <SelectItem value="pending">Pending payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount paid (for cash) */}
            {paymentMethod === "Cash" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Amount received (KSh)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-lg h-12"
                />
                {parseFloat(amountPaid) >= total && (
                  <div className="mt-2 flex items-center justify-between text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2">
                    <span className="text-emerald-200">Change due</span>
                    <span className="font-bold text-emerald-300">
                      KSh{" "}
                      {(parseFloat(amountPaid) - total).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={checkoutLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {checkoutLoading ? (
                "Processing..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Sale Completed
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Print or download the receipt for the customer.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-3">
            <Button
              variant={receiptSize === "thermal" ? "default" : "outline"}
              onClick={() => setReceiptSize("thermal")}
              className={
                receiptSize === "thermal"
                  ? "bg-blue-600 text-white"
                  : "border-slate-600 text-slate-300"
              }
            >
              Xprinter (58mm)
            </Button>
            <Button
              variant={receiptSize === "a4" ? "default" : "outline"}
              onClick={() => setReceiptSize("a4")}
              className={
                receiptSize === "a4"
                  ? "bg-blue-600 text-white"
                  : "border-slate-600 text-slate-300"
              }
            >
              A4 Printer
            </Button>
          </div>

          <div className="bg-white rounded-lg p-4 overflow-x-auto">
            {lastSale && <SaleReceipt sale={lastSale} size={receiptSize} />}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReceiptDialog(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Close
            </Button>

            {lastSale && receiptSize === "a4" && (
              <ReceiptPDFButton sale={lastSale} business={business ?? {}} />
            )}
            {lastSale && receiptSize === "thermal" && (
              <ThermalPrinterButton
                sale={lastSale}
                business={business ?? {}}
              />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}