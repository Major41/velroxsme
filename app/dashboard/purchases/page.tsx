"use client";

import { useState, useEffect, useMemo } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DataTable } from "@/components/dashboard/DataTable";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  ShoppingCart,
  TrendingDown,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";
import { Printer } from "lucide-react"; // add Printer to the existing lucide import
import { PurchaseReceipt } from "@/components/dashboard/PurchaseReceipt";
import { PurchaseReceiptPDFButton } from "@/components/dashboard/PurchaseReceiptPDF";
import { ThermalPurchasePrinterButton } from "@/components/dashboard/ThermalPurchasePrinterButton";

/**
 * Reconciles stock for a purchase.
 *
 * Called after create/update. It compares the stock impact this purchase
 * *should* have (based on the current form data) with what's already been
 * recorded in stock_movements (keyed by reference = PUR-<id>).
 *
 * If different, it applies the difference via the restock API.
 *
 * - Only affects stock when the purchase status is 'delivered'
 * - Editing a purchase adjusts the delta (no duplicate movements)
 * - Setting status to 'cancelled' or reverting to 'pending' removes the
 *   previously-added stock
 */
async function reconcilePurchaseStock(params: {
  purchaseId: string;
  businessId: string;
  productId: string | null;
  quantity: number;
  unitCost: number;
  vendorName: string;
  date: string;
  status: string;
}) {
  const {
    purchaseId,
    businessId,
    productId,
    quantity,
    unitCost,
    vendorName,
    date,
    status,
  } = params;

  // Only tracked-stock products can be reconciled
  if (!productId) return;

  const reference = `PUR-${purchaseId}`;

  // 1. What has already been recorded for this purchase?
  const res = await fetch("/api/business/products/purchase-movement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "reconcile",
      business_id: businessId,
      purchase_id: purchaseId,
      reference,
      product_id: productId,
      target_quantity: status === "delivered" ? quantity : 0,
      unit_cost: unitCost,
      supplier: vendorName,
      movement_date: date,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update stock");
  }
}

interface Purchase {
  id: string;
  date: string;
  product_id: string | null;
  vendor_name: string;
  category: string;
  description: string;
  quantity: number;
  unit_price: number | string;
  total_amount: number | string;
  payment_method: string;
  status: "delivered" | "pending" | "cancelled";
  delivery_date: string | null;
  notes: string;
  created_at: string;
}

/** Normalized suggestion entry derived from historical purchases */
interface Suggestion {
  /** Lowercase key used for matching/dedup */
  key: string;
  /** The display label (most recently used casing) */
  label: string;
  /** Most recent row where this appeared - used to auto-fill companions */
  source: Purchase;
  /** How many times it appeared - used for sorting */
  count: number;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];
interface ProductOption {
  id: string;
  name: string;
  sku: string | null;
  cost_price: number;
  category_id: string | null;
  product_categories?: { name: string } | null;
  units_of_measure?: { name: string; abbreviation: string } | null;
}

const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();

export default function PurchasesPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(
    null,
  );
  const [receiptPurchase, setReceiptPurchase] = useState<Purchase | null>(null);
  const [receiptSize, setReceiptSize] = useState<"a4" | "thermal">("thermal");
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    product_id: "",
    vendor_name: "",
    category: "",
    description: "",
    quantity: "1",
    unit_price: "",
    total_amount: "",
    payment_method: "Bank Transfer",
    status: "pending",
    delivery_date: "",
    notes: "",
  });

  // Fetch purchases on mount
  useEffect(() => {
    if (business?.id) {
      fetchPurchases();
      fetchProducts();
    }
  }, [business]);

  const fetchPurchases = async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (err: any) {
      console.error("Error fetching purchases:", err);
      setError("Failed to load purchases data");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!business?.id) return;
    const { data } = await supabase
      .from("products")
      .select(
        "id, name, sku, cost_price, category_id, product_categories(name), units_of_measure(name, abbreviation)",
      )
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("name");
    setProducts(data || []);
  };

  /* ------------------------------------------------------------------ */
  /*  SUGGESTION BUILDERS  (derived from purchase history)              */
  /* ------------------------------------------------------------------ */

  /**
   * Group historical purchases by a normalized field and return the
   * most-recently-used casing as the label, plus a representative row.
   */
  const buildSuggestions = (
    field: "description" | "vendor_name" | "category",
  ): Suggestion[] => {
    const map = new Map<string, Suggestion>();
    // purchases is already sorted newest → oldest
    for (const p of purchases) {
      const raw = (p[field] as string | null) || "";
      const key = norm(raw);
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { key, label: raw.trim(), source: p, count: 1 });
      }
    }
    // Sort: most frequently used first, then alphabetically
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    );
  };

  const productSuggestions = useMemo(
    () => buildSuggestions("description"),
    [purchases],
  );
  const vendorSuggestions = useMemo(
    () => buildSuggestions("vendor_name"),
    [purchases],
  );
  const categorySuggestions = useMemo(
    () => buildSuggestions("category"),
    [purchases],
  );

  /** Given a typed product name, find the best matching historical entry */
  const findProductMatch = (value: string): Suggestion | undefined => {
    const k = norm(value);
    if (!k) return undefined;
    return productSuggestions.find((s) => s.key === k);
  };

  /** Given a typed vendor name, find the best matching historical entry */
  const findVendorMatch = (value: string): Suggestion | undefined => {
    const k = norm(value);
    if (!k) return undefined;
    return vendorSuggestions.find((s) => s.key === k);
  };

  /* ------------------------------------------------------------------ */
  /*  AUTO-FILL LOGIC                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Called when the product (description) input changes.
   * If the new value exactly matches a known product, auto-fill vendor,
   * category, and unit price from its most recent purchase.
   */
  const handleDescriptionChange = (value: string) => {
    const match = findProductMatch(value);

    if (match) {
      // Product recognized → hydrate companions
      const src = match.source;
      setFormData((prev) => {
        const qty = parseFloat(prev.quantity) || 0;
        const price = parseFloat(String(src.unit_price)) || 0;
        return {
          ...prev,
          description: match.label, // canonical casing
          vendor_name: src.vendor_name || prev.vendor_name,
          category: src.category || prev.category,
          unit_price: price ? String(price) : prev.unit_price,
          total_amount: String(qty * price),
        };
      });
    } else {
      // Just update text
      setFormData((prev) => ({ ...prev, description: value }));
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      setFormData((prev) => ({ ...prev, product_id: "", description: "" }));
      return;
    }

    setFormData((prev) => {
      const qty = parseFloat(prev.quantity) || 0;
      const price = Number(product.cost_price) || 0;
      return {
        ...prev,
        product_id: product.id,
        description: product.name, // denormalized for legacy compatibility
        category: product.product_categories?.name || prev.category,
        unit_price: price ? String(price) : prev.unit_price,
        total_amount: String(qty * price),
      };
    });
  };

  /**
   * Called when vendor input changes. If it matches a known vendor,
   * we don't necessarily want to overwrite the product - but we can
   * leave this open for future logic. For now just store the raw value.
   */
  const handleVendorChange = (value: string) => {
    const match = findVendorMatch(value);
    setFormData((prev) => ({
      ...prev,
      vendor_name: match ? match.label : value,
    }));
  };

  const handleCategoryChange = (value: string) => {
    const k = norm(value);
    const match = categorySuggestions.find((s) => s.key === k);
    setFormData((prev) => ({
      ...prev,
      category: match ? match.label : value,
    }));
  };

  const calculateTotalAmount = (quantity: number, unitPrice: number) =>
    quantity * unitPrice;

  const handleQuantityChange = (value: string) => {
    const quantity = parseFloat(value) || 0;
    const unitPrice = parseFloat(formData.unit_price) || 0;
    setFormData((prev) => ({
      ...prev,
      quantity: value,
      total_amount: String(calculateTotalAmount(quantity, unitPrice)),
    }));
  };

  const handleUnitPriceChange = (value: string) => {
    const unitPrice = parseFloat(value) || 0;
    const quantity = parseFloat(formData.quantity) || 0;
    setFormData((prev) => ({
      ...prev,
      unit_price: value,
      total_amount: String(calculateTotalAmount(quantity, unitPrice)),
    }));
  };

  /* ------------------------------------------------------------------ */
  /*  SUBMIT / DELETE / EDIT                                             */
  /* ------------------------------------------------------------------ */

  const handleSubmit = async () => {
    if (!business?.id) return;
    setSaving(true);
    setError("");

    try {
      if (!formData.product_id || !formData.quantity || !formData.unit_price) {
        setError("Please fill in Product, Quantity, and Unit Price");
        setSaving(false);
        return;
      }

      const purchaseData = {
        business_id: business.id,
        product_id: formData.product_id,
        date: formData.date,
        vendor_name: formData.vendor_name || "Unknown",
        category: formData.category || "Uncategorized",
        description: formData.description,
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        total_amount: parseFloat(formData.total_amount),
        payment_method: formData.payment_method,
        status: formData.status,
        delivery_date: formData.delivery_date || null,
        notes: formData.notes,
      };

      let savedPurchaseId: string;

      if (editingPurchase) {
        const { error } = await supabase
          .from("purchases")
          .update(purchaseData)
          .eq("id", editingPurchase.id);
        if (error) throw error;
        savedPurchaseId = editingPurchase.id;
        setSuccess("Purchase updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("purchases")
          .insert([purchaseData])
          .select("id")
          .single();
        if (error) throw error;
        savedPurchaseId = data.id;
        setSuccess("Purchase added successfully!");
      }

      // 👇 NEW: Reconcile stock via the dedicated endpoint
      try {
        await fetch("/api/business/products/purchase-movement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reconcile",
            business_id: business.id,
            purchase_id: savedPurchaseId,
            product_id: formData.product_id,
            target_quantity:
              formData.status === "delivered" ? parseInt(formData.quantity) : 0,
            unit_cost: parseFloat(formData.unit_price),
            supplier: formData.vendor_name,
            movement_date: formData.date,
          }),
        });
      } catch (stockErr) {
        console.error("Stock reconciliation failed:", stockErr);
        // Don't fail the whole save — the purchase is saved. Show a soft warning.
        setSuccess(
          "Purchase saved, but stock could not be updated. Check the Stock Movements page.",
        );
      }

      await fetchPurchases();
      resetForm();
      setShowAddForm(false);
      setEditingPurchase(null);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error("Error saving purchase:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!purchaseToDelete) return;
    setSaving(true);
    try {
      // 👇 NEW: Reverse any stock this purchase added
      if (purchaseToDelete.product_id && business?.id) {
        try {
          await fetch("/api/business/products/purchase-movement", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "reverse",
              business_id: business.id,
              purchase_id: purchaseToDelete.id,
              product_id: purchaseToDelete.product_id,
            }),
          });
        } catch (stockErr) {
          console.error("Stock reversal failed:", stockErr);
          // Continue deleting the purchase — the movement was already logged
        }
      }

      const { error } = await supabase
        .from("purchases")
        .delete()
        .eq("id", purchaseToDelete.id);
      if (error) throw error;

      setPurchases(purchases.filter((p) => p.id !== purchaseToDelete.id));
      setSuccess("Purchase deleted successfully!");
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error deleting purchase:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      date: purchase.date.split("T")[0],
      product_id: purchase.product_id || "",
      vendor_name: purchase.vendor_name || "",
      category: purchase.category || "",
      description: purchase.description || "",
      quantity: String(purchase.quantity),
      unit_price: String(purchase.unit_price),
      total_amount: String(purchase.total_amount),
      payment_method: purchase.payment_method,
      status: purchase.status,
      delivery_date: purchase.delivery_date
        ? purchase.delivery_date.split("T")[0]
        : "",
      notes: purchase.notes || "",
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      product_id: "",
      vendor_name: "",

      category: "",
      description: "",
      quantity: "1",
      unit_price: "",
      total_amount: "",
      payment_method: "Bank Transfer",
      status: "pending",
      delivery_date: "",
      notes: "",
    });
    setError("");
  };

  /* ------------------------------------------------------------------ */
  /*  STATISTICS & CHARTS                                                */
  /* ------------------------------------------------------------------ */

  const num = (v: number | string) =>
    typeof v === "number" ? v : parseFloat(v) || 0;

  const totalPurchases = purchases.reduce((s, p) => s + num(p.total_amount), 0);
  const deliveredPurchases = purchases
    .filter((p) => p.status === "delivered")
    .reduce((s, p) => s + num(p.total_amount), 0);
  const pendingPurchases = purchases
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + num(p.total_amount), 0);
  const avgPurchase =
    purchases.length > 0 ? Math.round(totalPurchases / purchases.length) : 0;

  const getUniqueCategories = () =>
    Array.from(
      new Set(purchases.map((p) => p.category).filter(Boolean)),
    ).sort();

  const categoryData = () => {
    const grouped = purchases.reduce((acc: Record<string, number>, p) => {
      acc[p.category] = (acc[p.category] || 0) + num(p.total_amount);
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value], i) => ({
      name,
      value,
      fill: COLORS[i % COLORS.length],
    }));
  };

  const statusData = [
    {
      name: "Delivered",
      value: purchases.filter((p) => p.status === "delivered").length,
      fill: "#10b981",
    },
    {
      name: "Pending",
      value: purchases.filter((p) => p.status === "pending").length,
      fill: "#f59e0b",
    },
    {
      name: "Cancelled",
      value: purchases.filter((p) => p.status === "cancelled").length,
      fill: "#ef4444",
    },
  ].filter((i) => i.value > 0);

  const monthlyTrendData = () => {
    const grouped = purchases.reduce(
      (acc: Record<string, { month: string; total: number }>, p) => {
        const month = p.date.substring(0, 7);
        acc[month] = acc[month] || { month, total: 0 };
        acc[month].total += num(p.total_amount);
        return acc;
      },
      {},
    );
    return Object.values(grouped).slice(-6);
  };

  const filteredPurchases = purchases.filter((p) => {
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    const matchesCategory =
      filterCategory === "all" || p.category === filterCategory;
    return matchesStatus && matchesCategory;
  });

  const columns = [
    { key: "date" as const, label: "Date" },
    { key: "vendor_name" as const, label: "Vendor" },
    { key: "category" as const, label: "Category" },
    { key: "description" as const, label: "Product" },
    { key: "quantity" as const, label: "Qty" },
    {
      key: "total_amount" as const,
      label: "Amount",
      render: (v: number | string) => `KSh ${num(v).toLocaleString()}`,
    },
    { key: "payment_method" as const, label: "Method" },
    {
      key: "status" as const,
      label: "Status",
      render: (value: string) => {
        const config = {
          delivered: {
            icon: CheckCircle,
            color: "text-emerald-400",
            bg: "bg-emerald-500/20",
            label: "Delivered",
          },
          pending: {
            icon: Clock,
            color: "text-yellow-400",
            bg: "bg-yellow-500/20",
            label: "Pending",
          },
          cancelled: {
            icon: XCircle,
            color: "text-red-400",
            bg: "bg-red-500/20",
            label: "Cancelled",
          },
        } as const;
        const c = config[value as keyof typeof config];
        if (!c) return value;
        const Icon = c.icon;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.color}`}
          >
            <Icon className="w-3 h-3" />
            {c.label}
          </span>
        );
      },
    },
    {
      key: "actions" as const,
      label: "Actions",
      render: (_: any, row: Purchase) => (
        <div className="flex gap-2">
          {/* NEW: Receipt button */}
          <button
            onClick={() => {
              setReceiptPurchase(row);
              setShowReceiptDialog(true);
            }}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Print receipt"
          >
            <Printer className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
          </button>

          <button
            onClick={() => handleEdit(row)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-400" />
          </button>
          <button
            onClick={() => {
              setPurchaseToDelete(row);
              setDeleteDialogOpen(true);
            }}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
          </button>
        </div>
      ),
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  RENDER                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Purchase Management</h1>
        <p className="text-slate-400 mt-2">
          Monitor all purchases and vendor transactions for your business.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
          <p className="text-emerald-200 text-sm">{success}</p>
        </div>
      )}

      {/* Filters & Add Button */}
      <div className="flex gap-2 flex-wrap justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-white">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-white">
              <SelectItem value="all">All Categories</SelectItem>
              {getUniqueCategories().map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setEditingPurchase(null);
            setShowAddForm(!showAddForm);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Purchase
        </Button>
      </div>

      {/* ===================== ADD / EDIT FORM ===================== */}
      {showAddForm && (
        <ChartCard
          title={editingPurchase ? "Edit Purchase" : "Record a Purchase"}
        >
          <div className="space-y-4">
            {/* Product first - this is the trigger for auto-fill */}
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                Product *
              </label>

              {/* Search box for filtering the list */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <Select
                value={formData.product_id || undefined}
                onValueChange={handleProductSelect}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-72">
                  {products.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-slate-500 text-center">
                      No products found. Add products first in{" "}
                      <span className="text-blue-400">Products → Items</span>.
                    </div>
                  ) : (
                    products
                      .filter((p) => {
                        if (!productSearch.trim()) return true;
                        const q = productSearch.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          (p.sku || "").toLowerCase().includes(q)
                        );
                      })
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center justify-between gap-4 w-full">
                            <span>{p.name}</span>
                            <span className="text-xs text-slate-400">
                              {p.sku ? `#${p.sku} · ` : ""}
                              KSh {Number(p.cost_price).toLocaleString()}
                            </span>
                          </span>
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>

              <p className="text-xs text-slate-400 mt-1">
                Only products added in Products → Items can be purchased. This
                keeps stock and reports accurate.
              </p>
            </div>

            {/* Auto-filled companion fields (still editable) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Vendor *
                </label>
                <Input
                  type="text"
                  list="vendor-suggestions"
                  placeholder="e.g., Printshop"
                  value={formData.vendor_name}
                  onChange={(e) => handleVendorChange(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  autoComplete="off"
                />
                <datalist id="vendor-suggestions">
                  {vendorSuggestions.map((s) => (
                    <option key={s.key} value={s.label} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Category *
                </label>
                <Input
                  type="text"
                  list="category-suggestions"
                  placeholder="e.g., Stationary"
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  autoComplete="off"
                />
                <datalist id="category-suggestions">
                  {categorySuggestions.map((s) => (
                    <option key={s.key} value={s.label} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Date *
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Quantity, unit price, total */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Quantity *
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Unit Price (KSh) *
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.unit_price}
                  onChange={(e) => handleUnitPriceChange(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Total (KSh)
                </label>
                <Input
                  type="number"
                  value={formData.total_amount}
                  disabled
                  className="bg-slate-800 border-slate-700 text-white cursor-not-allowed font-semibold"
                />
              </div>
            </div>

            {/* Payment / status / delivery */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Payment Method
                </label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(v) =>
                    setFormData({ ...formData, payment_method: v })
                  }
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Order Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Expected Delivery
                </label>
                <Input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) =>
                    setFormData({ ...formData, delivery_date: e.target.value })
                  }
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">
                Notes (Optional)
              </label>
              <Textarea
                placeholder="Additional notes about this purchase..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="bg-slate-900 border-slate-700 text-white"
                rows={2}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingPurchase(null);
                  resetForm();
                }}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving
                  ? "Saving..."
                  : editingPurchase
                    ? "Update Purchase"
                    : "Save Purchase"}
              </Button>
            </div>
          </div>
        </ChartCard>
      )}

      {/* ===================== STATS ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Purchases"
          value={`KSh ${totalPurchases.toLocaleString()}`}
          subtitle={`${purchases.length} orders`}
          icon={<ShoppingCart className="w-4 h-4" />}
        />
        <StatCard
          title="Delivered"
          value={`KSh ${deliveredPurchases.toLocaleString()}`}
          subtitle={`${purchases.filter((p) => p.status === "delivered").length} orders`}
        />
        <StatCard
          title="Pending"
          value={`KSh ${pendingPurchases.toLocaleString()}`}
          subtitle={`${purchases.filter((p) => p.status === "pending").length} orders`}
        />
        <StatCard
          title="Avg Purchase"
          value={`KSh ${avgPurchase.toLocaleString()}`}
          subtitle="Per transaction"
          icon={<TrendingDown className="w-4 h-4" />}
        />
      </div>

      <ChartCard title="Purchase Details">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <DataTable data={filteredPurchases} columns={columns} />
        )}
      </ChartCard>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Purchase</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this purchase? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ RECEIPT DIALOG ============ */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Purchase Receipt</DialogTitle>
            <DialogDescription className="text-slate-400">
              Choose a printer size, then click Print. Only the receipt will be
              printed.
            </DialogDescription>
          </DialogHeader>

          {/* Size picker */}
          <div className="flex gap-2 mb-4">
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

          {/* Live preview */}
          <div className="bg-white rounded-lg p-4 overflow-x-auto">
            {receiptPurchase && (
              <PurchaseReceipt purchase={receiptPurchase} size={receiptSize} />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReceiptDialog(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Close
            </Button>

            {receiptPurchase && receiptSize === "a4" && (
              <PurchaseReceiptPDFButton
                purchase={receiptPurchase}
                business={business ?? {}}
              />
            )}

            {receiptPurchase && receiptSize === "thermal" && (
              <ThermalPurchasePrinterButton
                purchase={receiptPurchase}
                business={business ?? {}}
              />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== CHARTS ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categoryData().length > 0 && (
          <ChartCard title="Purchases by Category">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={categoryData()}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  tickFormatter={(v) => `KSh ${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94a3b8"
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                  }}
                  formatter={(v: number) => [
                    `KSh ${v.toLocaleString()}`,
                    "Amount",
                  ]}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="value" name="Amount">
                  {categoryData().map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {statusData.length > 0 && (
          <ChartCard title="Status Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {monthlyTrendData().length > 0 && (
        <ChartCard title="Monthly Purchase Trend">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrendData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis
                stroke="#94a3b8"
                tickFormatter={(v) => `KSh ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                }}
                formatter={(v: number) => [
                  `KSh ${v.toLocaleString()}`,
                  "Total",
                ]}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
                name="Purchases"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {getUniqueCategories().length > 0 && (
        <ChartCard title="Category Summary">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {getUniqueCategories().map((category) => {
              const categoryTotal = purchases
                .filter((p) => p.category === category)
                .reduce((s, p) => s + num(p.total_amount), 0);
              const categoryCount = purchases.filter(
                (p) => p.category === category,
              ).length;
              return (
                <div
                  key={category}
                  className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50"
                >
                  <p className="text-sm font-medium text-slate-300">
                    {category}
                  </p>
                  <p className="text-lg font-bold text-white">
                    KSh {categoryTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">
                    {categoryCount} purchase(s)
                  </p>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}
    </div>
  );
}
