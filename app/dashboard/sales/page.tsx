"use client";

import { useState, useEffect, useMemo } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DataTable } from "@/components/dashboard/DataTable";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  Plus,
  X,
  Edit2,
  Trash2,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  User,
  Calendar,
  Filter,
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
import { SaleReceipt } from "@/components/dashboard/SaleReceipt";
import { Printer } from "lucide-react";
import { ReceiptPDFButton } from "@/components/dashboard/ReceiptPDF";
import { ReceiptPrinter } from "@/components/dashboard/ReceiptPrinter";
import { ThermalPrinterButton } from "@/components/dashboard/ThermalPrinterButton";

interface Sale {
  id: string;
  date: string;
  product_name: string;
  category: string;
  customer_name: string;
  customer_phone: string;
  quantity: number;
  unit_price: number | string;
  amount: number | string;
  payment_method: string;
  payment_status: "paid" | "pending" | "failed" | "refunded";
  status: "completed" | "pending" | "cancelled";
  notes: string;
  created_at: string;
}

/** Normalized suggestion entry derived from historical sales */
interface Suggestion {
  key: string; // lowercase match key
  label: string; // most recent casing
  source: Sale; // most recent row (for companion auto-fill)
  count: number; // frequency (for sorting)
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

const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();
const num = (v: number | string) =>
  typeof v === "number" ? v : parseFloat(v) || 0;

export default function SalesPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<DateRangeKey>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [receiptSize, setReceiptSize] = useState<"a4" | "thermal">("thermal");
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    product_name: "",
    category: "",
    customer_name: "",
    customer_phone: "",
    quantity: "1",
    unit_price: "",
    amount: "",
    payment_method: "Cash",
    payment_status: "pending",
    status: "completed",
    notes: "",
  });

  useEffect(() => {
    if (!business?.id) return;
    // For custom range, wait until both dates are set
    if (filterPeriod === "custom" && (!customFrom || !customTo)) return;
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, filterPeriod, customFrom, customTo]);

  const fetchSales = async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from("sales")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      // Resolve the effective date range
      let bounds: { from: string; to: string } | null = null;

      if (filterPeriod === "custom") {
        if (customFrom && customTo) {
          bounds = { from: customFrom, to: customTo };
        }
        // If only one side is filled, we skip filtering (or you could
        // handle one-sided filters - for now we wait for both)
      } else if (filterPeriod !== "all") {
        bounds = getDateRangeBounds(filterPeriod);
      }

      if (bounds) {
        query = query.gte("date", bounds.from).lte("date", bounds.to);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSales(data || []);
    } catch (err: any) {
      console.error("Error fetching sales:", err);
      setError("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  DATE RANGE FILTER                                                  */
  /* ------------------------------------------------------------------ */

  type DateRangeKey =
    | "today"
    | "yesterday"
    | "this_week"
    | "last_week"
    | "this_month"
    | "last_month"
    | "this_quarter"
    | "last_quarter"
    | "this_year"
    | "last_year"
    | "custom"
    | "all";

  interface DateRange {
    key: DateRangeKey;
    label: string;
  }

  const DATE_RANGE_OPTIONS: DateRange[] = [
    { key: "all", label: "All Time" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "this_week", label: "This Week" },
    { key: "last_week", label: "Last Week" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "this_quarter", label: "This Quarter" },
    { key: "last_quarter", label: "Last Quarter" },
    { key: "this_year", label: "This Year" },
    { key: "last_year", label: "Last Year" },
    { key: "custom", label: "Custom Range" },
  ];

  /** Format a Date as YYYY-MM-DD for the `date` column */
  const toISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  /** Start of the week (Monday-based) */
  const startOfWeek = (d: Date) => {
    const day = d.getDay(); // 0=Sun ... 6=Sat
    const diff = (day + 6) % 7; // Monday-based
    const res = new Date(d);
    res.setDate(d.getDate() - diff);
    res.setHours(0, 0, 0, 0);
    return res;
  };

  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const startOfQuarter = (d: Date) => {
    const q = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), q * 3, 1);
  };
  const endOfQuarter = (d: Date) => {
    const q = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), q * 3 + 3, 0);
  };

  /**
   * Turn a preset key into a concrete { from, to } range.
   * Returns null for "all" or "custom" (custom is handled separately).
   */
  const getDateRangeBounds = (
    key: DateRangeKey,
  ): { from: string; to: string } | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const y = today.getFullYear();
    const m = today.getMonth();

    switch (key) {
      case "today":
        return { from: toISODate(today), to: toISODate(today) };

      case "yesterday": {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        return { from: toISODate(d), to: toISODate(d) };
      }

      case "this_week": {
        const from = startOfWeek(today);
        const to = new Date(from);
        to.setDate(from.getDate() + 6);
        return { from: toISODate(from), to: toISODate(to) };
      }

      case "last_week": {
        const thisWeekStart = startOfWeek(today);
        const from = new Date(thisWeekStart);
        from.setDate(from.getDate() - 7);
        const to = new Date(thisWeekStart);
        to.setDate(to.getDate() - 1);
        return { from: toISODate(from), to: toISODate(to) };
      }

      case "this_month": {
        const from = startOfMonth(today);
        const to = endOfMonth(today);
        return { from: toISODate(from), to: toISODate(to) };
      }

      case "last_month": {
        const from = new Date(y, m - 1, 1);
        const to = endOfMonth(from);
        return { from: toISODate(from), to: toISODate(to) };
      }

      case "this_quarter": {
        const from = startOfQuarter(today);
        const to = endOfQuarter(today);
        return { from: toISODate(from), to: toISODate(to) };
      }

      case "last_quarter": {
        const from = new Date(y, m - 3, 1);
        const lastQStart = startOfQuarter(from);
        const lastQEnd = endOfQuarter(lastQStart);
        return { from: toISODate(lastQStart), to: toISODate(lastQEnd) };
      }

      case "this_year":
        return {
          from: toISODate(new Date(y, 0, 1)),
          to: toISODate(new Date(y, 11, 31)),
        };

      case "last_year":
        return {
          from: toISODate(new Date(y - 1, 0, 1)),
          to: toISODate(new Date(y - 1, 11, 31)),
        };

      case "all":
      case "custom":
      default:
        return null;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  SUGGESTION BUILDERS  (derived from sales history)                 */
  /* ------------------------------------------------------------------ */

  const buildSuggestions = (
    field: "product_name" | "category" | "customer_name" | "customer_phone",
  ): Suggestion[] => {
    const map = new Map<string, Suggestion>();
    for (const s of sales) {
      const raw = (s[field] as string | null) || "";
      const key = norm(raw);
      if (!key) continue;
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { key, label: raw.trim(), source: s, count: 1 });
    }
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    );
  };

  const productSuggestions = useMemo(
    () => buildSuggestions("product_name"),
    [sales],
  );
  const categorySuggestions = useMemo(
    () => buildSuggestions("category"),
    [sales],
  );
  const customerSuggestions = useMemo(
    () => buildSuggestions("customer_name"),
    [sales],
  );
  const phoneSuggestions = useMemo(
    () => buildSuggestions("customer_phone"),
    [sales],
  );

  const findIn = (list: Suggestion[], value: string) => {
    const k = norm(value);
    if (!k) return undefined;
    return list.find((s) => s.key === k);
  };

  /* ------------------------------------------------------------------ */
  /*  AUTO-FILL HANDLERS                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Product changed → if it matches a known product, hydrate
   * category, unit price, and recalculate amount.
   */
  const handleProductChange = (value: string) => {
    const match = findIn(productSuggestions, value);

    if (match) {
      const src = match.source;
      setFormData((prev) => {
        const qty = parseFloat(prev.quantity) || 0;
        const price = num(src.unit_price);
        return {
          ...prev,
          product_name: match.label,
          category: src.category || prev.category,
          unit_price: price ? String(price) : prev.unit_price,
          amount: String(qty * price),
        };
      });
    } else {
      setFormData((prev) => ({ ...prev, product_name: value }));
    }
  };

  /**
   * Customer name changed → if known, fill phone.
   * (Keeps whatever phone is already typed if it's different.)
   */
  const handleCustomerNameChange = (value: string) => {
    const match = findIn(customerSuggestions, value);

    if (match) {
      const src = match.source;
      setFormData((prev) => ({
        ...prev,
        customer_name: match.label,
        // Only auto-fill phone if user hasn't typed one, OR it's the same person
        customer_phone: prev.customer_phone?.trim()
          ? prev.customer_phone
          : src.customer_phone || "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, customer_name: value }));
    }
  };

  /**
   * Customer phone changed → if known, fill name.
   */
  const handleCustomerPhoneChange = (value: string) => {
    const match = findIn(phoneSuggestions, value);

    if (match) {
      const src = match.source;
      setFormData((prev) => ({
        ...prev,
        customer_phone: match.label,
        customer_name: prev.customer_name?.trim()
          ? prev.customer_name
          : src.customer_name || "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, customer_phone: value }));
    }
  };

  const handleCategoryChange = (value: string) => {
    const match = findIn(categorySuggestions, value);
    setFormData((prev) => ({ ...prev, category: match ? match.label : value }));
  };

  const calculateAmount = (q: number, p: number) => q * p;

  const handleQuantityChange = (value: string) => {
    const qty = parseFloat(value) || 0;
    const price = parseFloat(formData.unit_price) || 0;
    setFormData((prev) => ({
      ...prev,
      quantity: value,
      amount: String(calculateAmount(qty, price)),
    }));
  };

  const handleUnitPriceChange = (value: string) => {
    const price = parseFloat(value) || 0;
    const qty = parseFloat(formData.quantity) || 0;
    setFormData((prev) => ({
      ...prev,
      unit_price: value,
      amount: String(calculateAmount(qty, price)),
    }));
  };

  /* ------------------------------------------------------------------ */
  /*  CUSTOMER UPSERT (existing logic, kept intact)                      */
  /* ------------------------------------------------------------------ */

  const updateOrCreateCustomer = async (saleData: any) => {
    if (!business?.id) return;
    if (!saleData.customer_phone && !saleData.customer_name) return;

    try {
      // Match on phone first (most reliable), fall back to name
      let existingCustomer: any = null;
      if (saleData.customer_phone) {
        const { data } = await supabase
          .from("customers")
          .select("*")
          .eq("business_id", business.id)
          .eq("phone", saleData.customer_phone)
          .maybeSingle();
        existingCustomer = data;
      }
      if (!existingCustomer && saleData.customer_name) {
        const { data } = await supabase
          .from("customers")
          .select("*")
          .eq("business_id", business.id)
          .eq("name", saleData.customer_name)
          .maybeSingle();
        existingCustomer = data;
      }

      if (existingCustomer) {
        await supabase
          .from("customers")
          .update({
            name: saleData.customer_name || existingCustomer.name,
            phone: saleData.customer_phone || existingCustomer.phone,
            total_spent:
              Number(existingCustomer.total_spent || 0) + saleData.amount,
            visit_count: (existingCustomer.visit_count || 0) + 1,
            last_purchase_date: saleData.date,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingCustomer.id);
      } else {
        await supabase.from("customers").insert({
          business_id: business.id,
          name: saleData.customer_name,
          phone: saleData.customer_phone,
          total_spent: saleData.amount,
          visit_count: 1,
          last_purchase_date: saleData.date,
          first_purchase_date: saleData.date,
          status: "active",
        });
      }
    } catch (err) {
      console.error("Error in updateOrCreateCustomer:", err);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  SUBMIT / DELETE / EDIT                                             */
  /* ------------------------------------------------------------------ */

  const handleSubmit = async () => {
    if (!business?.id) return;
    setSaving(true);
    setError("");

    try {
      if (
        !formData.product_name ||
        !formData.category ||
        !formData.customer_name ||
        !formData.quantity ||
        !formData.unit_price
      ) {
        setError("Please fill in all required fields");
        setSaving(false);
        return;
      }

      const saleData = {
        business_id: business.id,
        date: formData.date,
        product_name: formData.product_name,
        category: formData.category,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        status: formData.status,
        notes: formData.notes,
      };

      if (editingSale) {
        const { error } = await supabase
          .from("sales")
          .update(saleData)
          .eq("id", editingSale.id);
        if (error) throw error;
        setSuccess("Sale updated successfully!");
      } else {
        const { error } = await supabase.from("sales").insert([saleData]);
        if (error) throw error;
        setSuccess("Sale added successfully!");
        await updateOrCreateCustomer(saleData);
      }

      await fetchSales();
      resetForm();
      setShowAddForm(false);
      setEditingSale(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error saving sale:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!saleToDelete) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("sales")
        .delete()
        .eq("id", saleToDelete.id);
      if (error) throw error;
      setSales(sales.filter((s) => s.id !== saleToDelete.id));
      setSuccess("Sale deleted successfully!");
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error deleting sale:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      date: sale.date.split("T")[0],
      product_name: sale.product_name,
      category: sale.category,
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone || "",
      quantity: String(sale.quantity),
      unit_price: String(sale.unit_price),
      amount: String(sale.amount),
      payment_method: sale.payment_method,
      payment_status: sale.payment_status,
      status: sale.status,
      notes: sale.notes || "",
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      product_name: "",
      category: "",
      customer_name: "",
      customer_phone: "",
      quantity: "1",
      unit_price: "",
      amount: "",
      payment_method: "Cash",
      payment_status: "pending",
      status: "completed",
      notes: "",
    });
    setError("");
  };

  /* ------------------------------------------------------------------ */
  /*  STATS & CHARTS (existing logic, kept intact)                       */
  /* ------------------------------------------------------------------ */

  const totalSales = sales
    .filter((s) => s.payment_status === "paid")
    .reduce((sum, s) => sum + num(s.amount), 0);
  const pendingPayments = sales
    .filter((s) => s.payment_status === "pending")
    .reduce((sum, s) => sum + num(s.amount), 0);
  const completedTransactions = sales.filter(
    (s) => s.status === "completed",
  ).length;
  const avgOrderValue =
    completedTransactions > 0
      ? Math.round(totalSales / completedTransactions)
      : 0;

  const salesChartData = () => {
    const grouped = sales.reduce((acc: any, sale) => {
      const date = sale.date;
      if (!acc[date]) acc[date] = { date, sales: 0, paid: 0, pending: 0 };
      acc[date].sales += num(sale.amount);
      if (sale.payment_status === "paid") acc[date].paid += num(sale.amount);
      else if (sale.payment_status === "pending")
        acc[date].pending += num(sale.amount);
      return acc;
    }, {});
    return Object.values(grouped).slice(-30);
  };

  const getUniqueCategories = () =>
    Array.from(new Set(sales.map((s) => s.category).filter(Boolean))).sort();

  const categoryData = () => {
    const grouped = sales.reduce((acc: any, sale) => {
      if (sale.payment_status === "paid") {
        acc[sale.category] = (acc[sale.category] || 0) + num(sale.amount);
      }
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value], i) => ({
      name,
      value,
      fill: COLORS[i % COLORS.length],
    }));
  };

  const paymentStatusData = () => {
    const paid = sales
      .filter((s) => s.payment_status === "paid")
      .reduce((s2, s) => s2 + num(s.amount), 0);
    const pending = sales
      .filter((s) => s.payment_status === "pending")
      .reduce((s2, s) => s2 + num(s.amount), 0);
    const failed = sales
      .filter((s) => s.payment_status === "failed")
      .reduce((s2, s) => s2 + num(s.amount), 0);
    const refunded = sales
      .filter((s) => s.payment_status === "refunded")
      .reduce((s2, s) => s2 + num(s.amount), 0);
    return [
      { name: "Paid", value: paid, fill: "#10b981" },
      { name: "Pending", value: pending, fill: "#f59e0b" },
      { name: "Failed", value: failed, fill: "#ef4444" },
      { name: "Refunded", value: refunded, fill: "#8b5cf6" },
    ].filter((i) => i.value > 0);
  };

  const columns = [
    { key: "date" as const, label: "Date" },
    { key: "product_name" as const, label: "Product" },
    { key: "category" as const, label: "Category" },
    { key: "customer_name" as const, label: "Customer" },
    { key: "customer_phone" as const, label: "Phone" },
    { key: "quantity" as const, label: "Qty" },
    {
      key: "amount" as const,
      label: "Amount",
      render: (v: number | string) => `KSh ${num(v).toLocaleString()}`,
    },
    {
      key: "payment_status" as const,
      label: "Payment",
      render: (value: string) => {
        const config = {
          paid: {
            icon: CheckCircle,
            color: "text-emerald-400",
            bg: "bg-emerald-500/20",
            label: "Paid",
          },
          pending: {
            icon: Clock,
            color: "text-yellow-400",
            bg: "bg-yellow-500/20",
            label: "Pending",
          },
          failed: {
            icon: XCircle,
            color: "text-red-400",
            bg: "bg-red-500/20",
            label: "Failed",
          },
          refunded: {
            icon: CreditCard,
            color: "text-purple-400",
            bg: "bg-purple-500/20",
            label: "Refunded",
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
      key: "status" as const,
      label: "Status",
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            value === "completed"
              ? "bg-emerald-500/20 text-emerald-300"
              : value === "pending"
                ? "bg-yellow-500/20 text-yellow-300"
                : "bg-red-500/20 text-red-300"
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: "actions" as const,
      label: "Actions",
      render: (_: any, row: Sale) => (
        <div className="flex gap-2">
          {/* ⬇⬇ ADD THIS BLOCK ⬇⬇ */}
          <button
            onClick={() => openReceipt(row)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Generate receipt"
          >
            <Printer className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
          </button>
          {/* ⬆⬆ END ADD ⬆⬆ */}

          <button
            onClick={() => handleEdit(row)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Edit sale"
          >
            <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-400" />
          </button>
          <button
            onClick={() => {
              setSaleToDelete(row);
              setDeleteDialogOpen(true);
            }}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Delete sale"
          >
            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
          </button>
        </div>
      ),
    },
  ];

  const openReceipt = (sale: Sale) => {
    setReceiptSale(sale);
    setShowReceiptDialog(true);
  };

  const printReceipt = () => {
    // Small delay so the dialog's receipt is mounted before we print
    setTimeout(() => window.print(), 100);
  };

  /* ------------------------------------------------------------------ */
  /*  RENDER                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Sales Tracking</h1>
        <p className="text-slate-400 mt-2">
          Monitor your sales performance and track payment status.
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

      {/* Period Filter and Add Button */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Preset selector */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select
                value={filterPeriod}
                onValueChange={(v) => setFilterPeriod(v as DateRangeKey)}
              >
                <SelectTrigger className="w-52 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom range inputs */}
            {filterPeriod === "custom" && (
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-40 bg-slate-800 border-slate-700 text-white"
                />
                <span className="text-slate-400 text-sm">to</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-40 bg-slate-800 border-slate-700 text-white"
                />
                {(customFrom || customTo) && (
                  <button
                    onClick={() => {
                      setCustomFrom("");
                      setCustomTo("");
                    }}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Clear custom range"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
            )}

            {/* Active range indicator */}
            {filterPeriod !== "all" && (
              <span className="text-xs text-slate-500">
                {filterPeriod === "custom"
                  ? customFrom && customTo
                    ? `${customFrom} → ${customTo}`
                    : "Pick both dates"
                  : DATE_RANGE_OPTIONS.find((o) => o.key === filterPeriod)
                      ?.label}
              </span>
            )}
          </div>

          <Button
            onClick={() => {
              resetForm();
              setEditingSale(null);
              setShowAddForm(!showAddForm);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Sale
          </Button>
        </div>
      </div>

      {/* ===================== ADD / EDIT FORM ===================== */}
      {showAddForm && (
        <ChartCard title={editingSale ? "Edit Sale" : "Record a Sale"}>
          <div className="space-y-4">
            {/* Product first - triggers auto-fill of category + price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  Product Name *
                </label>
                <Input
                  type="text"
                  list="product-suggestions"
                  placeholder="Start typing a product (e.g., Laptop, Test)..."
                  value={formData.product_name}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  autoComplete="off"
                />
                <datalist id="product-suggestions">
                  {productSuggestions.map((s) => (
                    <option key={s.key} value={s.label} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-400 mt-1">
                  {productSuggestions.length > 0
                    ? `Autofills category & price from ${productSuggestions.length} known product${productSuggestions.length === 1 ? "" : "s"}. New products are allowed.`
                    : "No sales history yet - type any product name to create one."}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Category *
                </label>
                <Input
                  type="text"
                  list="category-suggestions"
                  placeholder="e.g., Electronics, Furniture..."
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
            </div>

            {/* Customer row - name & phone cross-fill each other */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  Customer Name *
                </label>
                <Input
                  type="text"
                  list="customer-suggestions"
                  placeholder="e.g., James"
                  value={formData.customer_name}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  autoComplete="off"
                />
                <datalist id="customer-suggestions">
                  {customerSuggestions.map((s) => (
                    <option key={s.key} value={s.label} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Customer Phone
                </label>
                <Input
                  type="tel"
                  list="phone-suggestions"
                  placeholder="+254 712 345 678"
                  value={formData.customer_phone}
                  onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  autoComplete="off"
                />
                <datalist id="phone-suggestions">
                  {phoneSuggestions.map((s) => (
                    <option key={s.key} value={s.label} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Date, qty, price, amount */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  value={formData.amount}
                  disabled
                  className="bg-slate-800 border-slate-700 text-white cursor-not-allowed font-semibold"
                />
              </div>
            </div>

            {/* Payment / statuses */}
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
                    <SelectItem value="Debit Card">Debit Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Payment Status
                </label>
                <Select
                  value={formData.payment_status}
                  onValueChange={(v) =>
                    setFormData({ ...formData, payment_status: v })
                  }
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
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
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">
                Notes (Optional)
              </label>
              <Textarea
                placeholder="Additional notes about this sale..."
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
                  setEditingSale(null);
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
                  : editingSale
                    ? "Update Sale"
                    : "Save Sale"}
              </Button>
            </div>
          </div>
        </ChartCard>
      )}

      {/* ===================== STATS ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sales (Paid)"
          value={`KSh ${totalSales.toLocaleString()}`}
          subtitle="From completed payments"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          title="Avg Order Value"
          value={`KSh ${avgOrderValue.toLocaleString()}`}
          subtitle="Per transaction"
        />
        <StatCard
          title="Total Orders"
          value={completedTransactions}
          subtitle="Completed orders"
        />
        <StatCard
          title="Pending Payments"
          value={`KSh ${pendingPayments.toLocaleString()}`}
          subtitle="Awaiting clearance"
        />
      </div>

      {/* ===================== CHARTS ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Sales Trend"
          description="Daily sales and payment status"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                }}
                formatter={(v: number) => [`KSh ${v.toLocaleString()}`, ""]}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="paid"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Paid"
              />
              <Line
                type="monotone"
                dataKey="pending"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Pending"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Payment Status"
          description="Revenue by payment status"
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentStatusData()}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label={(entry) =>
                  `${entry.name}: KSh ${entry.value.toLocaleString()}`
                }
              >
                {paymentStatusData().map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                }}
                formatter={(v: number) => [`KSh ${v.toLocaleString()}`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Sales Transactions">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <DataTable data={sales} columns={columns} />
        )}
      </ChartCard>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Sale</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this sale? This action cannot be
              undone.
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
            <DialogTitle>Generate Receipt</DialogTitle>
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

          {/* Live on-screen preview */}
          <div className="bg-white rounded-lg p-4 overflow-x-auto">
            {receiptSale && (
              <SaleReceipt sale={receiptSale} size={receiptSize} />
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

            {/* A4 PDF download - only show when A4 is selected */}
            {receiptSale && receiptSize === "a4" && (
              <ReceiptPDFButton sale={receiptSale} business={business ?? {}} />
            )}

            {/* Thermal print - keep your existing ReceiptPrinter for thermal */}
            {receiptSale && receiptSize === "thermal" && (
              <ThermalPrinterButton
                sale={receiptSale}
                business={business ?? {}}
              />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {categoryData().length > 0 && (
        <ChartCard
          title="Sales by Category"
          description="Revenue breakdown by product category"
        >
          <ResponsiveContainer width="100%" height={400}>
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
                  "Revenue",
                ]}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="value" name="Revenue">
                {categoryData().map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {getUniqueCategories().map((category) => {
              const categoryTotal = sales
                .filter(
                  (s) => s.category === category && s.payment_status === "paid",
                )
                .reduce((sum, s) => sum + num(s.amount), 0);
              return (
                <div
                  key={category}
                  className="flex justify-between items-center p-2 bg-slate-700/30 rounded-lg"
                >
                  <span className="text-sm text-slate-300">{category}</span>
                  <span className="text-sm font-semibold text-white">
                    KSh {categoryTotal.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}
    </div>
  );
}
