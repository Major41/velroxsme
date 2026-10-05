"use client";

import { useState, useEffect, useMemo } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DataTable } from "@/components/dashboard/DataTable";
import {
  LineChart,
  Line,
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
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  X,
  ShoppingCart,
  AlertTriangle,
  Info,
  Package,
  Truck,
  DollarSign,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";

/* ==================================================================== */
/*  TYPES                                                               */
/* ==================================================================== */

interface Purchase {
  id: string;
  date: string;
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
  // Optional - used if the columns exist
  amount_paid?: number | string | null;
  balance_due?: number | string | null;
  due_date?: string | null;
  discount_amount?: number | string | null;
  tax_amount?: number | string | null;
  supplier_id?: string | null;
}

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

const num = (v: number | string | null | undefined) =>
  typeof v === "number" ? v : parseFloat(String(v ?? 0)) || 0;

const fmt = (n: number) =>
  n.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
const fmtMoney = (n: number) => `KSh ${fmt(n)}`;
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

/* ==================================================================== */
/*  DATE RANGE UTILITIES                                                */
/* ==================================================================== */

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

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const startOfWeek = (d: Date) => {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const res = new Date(d);
  res.setDate(d.getDate() - diff);
  res.setHours(0, 0, 0, 0);
  return res;
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const startOfQuarter = (d: Date) => {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
};
const endOfQuarter = (d: Date) => {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3 + 3, 0);
};

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
      const s = startOfWeek(today);
      const from = new Date(s);
      from.setDate(from.getDate() - 7);
      const to = new Date(s);
      to.setDate(to.getDate() - 1);
      return { from: toISODate(from), to: toISODate(to) };
    }
    case "this_month":
      return {
        from: toISODate(startOfMonth(today)),
        to: toISODate(endOfMonth(today)),
      };
    case "last_month": {
      const from = new Date(y, m - 1, 1);
      return { from: toISODate(from), to: toISODate(endOfMonth(from)) };
    }
    case "this_quarter":
      return {
        from: toISODate(startOfQuarter(today)),
        to: toISODate(endOfQuarter(today)),
      };
    case "last_quarter": {
      const from = new Date(y, m - 3, 1);
      const qs = startOfQuarter(from);
      return { from: toISODate(qs), to: toISODate(endOfQuarter(qs)) };
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
    default:
      return null;
  }
};

const getPreviousRange = (
  key: DateRangeKey,
  from: string,
  to: string,
): { from: string; to: string } | null => {
  const fromD = new Date(from);
  const toD = new Date(to);
  const spanDays = Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1;

  switch (key) {
    case "today":
    case "yesterday": {
      const d = new Date(fromD);
      d.setDate(d.getDate() - 1);
      return { from: toISODate(d), to: toISODate(d) };
    }
    case "custom":
    case "this_week":
    case "last_week":
    case "this_month":
    case "last_month":
    case "this_quarter":
    case "last_quarter":
    case "this_year":
    case "last_year": {
      const prevTo = new Date(fromD);
      prevTo.setDate(prevTo.getDate() - 1);
      const prevFrom = new Date(prevTo);
      prevFrom.setDate(prevFrom.getDate() - spanDays + 1);
      return { from: toISODate(prevFrom), to: toISODate(prevTo) };
    }
    default:
      return null;
  }
};

/* ==================================================================== */
/*  PAGE                                                                */
/* ==================================================================== */

export default function PurchasesAnalyticsPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]); // for supplier balances (unbounded)
  const [previousPurchases, setPreviousPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterPeriod, setFilterPeriod] = useState<DateRangeKey>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  /* ---------------- Fetch ---------------- */

  useEffect(() => {
    if (!business?.id) return;
    if (filterPeriod === "custom" && (!customFrom || !customTo)) return;
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, filterPeriod, customFrom, customTo]);

  const fetchAnalytics = async () => {
    if (!business?.id) return;
    setLoading(true);
    setError("");

    try {
      let bounds: { from: string; to: string } | null = null;
      if (filterPeriod === "custom" && customFrom && customTo) {
        bounds = { from: customFrom, to: customTo };
      } else if (filterPeriod !== "all") {
        bounds = getDateRangeBounds(filterPeriod);
      }

      // Current period
      let q = supabase
        .from("purchases")
        .select("*")
        .eq("business_id", business.id)
        .order("date", { ascending: true });
      if (bounds) q = q.gte("date", bounds.from).lte("date", bounds.to);
      const { data: current, error: cErr } = await q;
      if (cErr) throw cErr;
      setPurchases(current || []);

      // All purchases (for supplier balance snapshot - balances don't care about period)
      const { data: all } = await supabase
        .from("purchases")
        .select("*")
        .eq("business_id", business.id);
      setAllPurchases(all || []);

      // Previous period
      if (bounds) {
        const prev = getPreviousRange(filterPeriod, bounds.from, bounds.to);
        if (prev) {
          const { data: prevData, error: pErr } = await supabase
            .from("purchases")
            .select("*")
            .eq("business_id", business.id)
            .gte("date", prev.from)
            .lte("date", prev.to);
          if (pErr) throw pErr;
          setPreviousPurchases(prevData || []);
        } else {
          setPreviousPurchases([]);
        }
      } else {
        setPreviousPurchases([]);
      }
    } catch (err: any) {
      console.error("Purchase analytics fetch error:", err);
      setError("Failed to load purchase analytics");
    } finally {
      setLoading(false);
    }
  };

  /* ================================================================ */
  /*  CALCULATIONS                                                    */
  /* ================================================================ */

  const calc = (rows: Purchase[]) => {
    const total = rows.reduce((s, r) => s + num(r.total_amount), 0);
    const count = rows.length;
    const avg = count > 0 ? total / count : 0;
    const units = rows.reduce((s, r) => s + (r.quantity || 0), 0);
    const paid = rows.reduce((s, r) => s + num(r.amount_paid), 0);
    const balance = rows.reduce((s, r) => s + num(r.balance_due), 0);
    const discount = rows.reduce((s, r) => s + num(r.discount_amount), 0);
    const tax = rows.reduce((s, r) => s + num(r.tax_amount), 0);

    return { total, count, avg, units, paid, balance, discount, tax };
  };

  const current = useMemo(() => calc(purchases), [purchases]);
  const previous = useMemo(() => calc(previousPurchases), [previousPurchases]);

  const pctChange = (c: number, p: number) => {
    if (p === 0) return c > 0 ? 100 : 0;
    return ((c - p) / Math.abs(p)) * 100;
  };

  const groupBy = <K extends string>(
    rows: Purchase[],
    keyFn: (r: Purchase) => K,
  ): Record<K, Purchase[]> =>
    rows.reduce(
      (acc, r) => {
        const k = keyFn(r);
        if (!acc[k]) acc[k] = [];
        acc[k].push(r);
        return acc;
      },
      {} as Record<K, Purchase[]>,
    );

  /* ---------------- Breakdowns ---------------- */

  const supplierBreakdown = useMemo(() => {
    const grouped = groupBy(purchases, (r) => r.vendor_name || "(Unknown)");
    return Object.entries(grouped)
      .map(([name, rows]) => ({
        name,
        value: rows.reduce((s, r) => s + num(r.total_amount), 0),
        count: rows.length,
        avg:
          rows.length > 0
            ? rows.reduce((s, r) => s + num(r.total_amount), 0) / rows.length
            : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [purchases]);

  const productBreakdown = useMemo(() => {
    const grouped = groupBy(purchases, (r) => r.description || "(Untitled)");
    return Object.entries(grouped)
      .map(([name, rows]) => ({
        name,
        value: rows.reduce((s, r) => s + num(r.total_amount), 0),
        units: rows.reduce((s, r) => s + (r.quantity || 0), 0),
        count: rows.length,
        avgUnitCost:
          rows.reduce((s, r) => s + (r.quantity || 0), 0) > 0
            ? rows.reduce((s, r) => s + num(r.total_amount), 0) /
              rows.reduce((s, r) => s + (r.quantity || 0), 0)
            : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [purchases]);

  const categoryBreakdown = useMemo(() => {
    const grouped = groupBy(purchases, (r) => r.category || "(Uncategorized)");
    return Object.entries(grouped)
      .map(([name, rows]) => ({
        name,
        value: rows.reduce((s, r) => s + num(r.total_amount), 0),
        count: rows.length,
      }))
      .sort((a, b) => b.value - a.value);
  }, [purchases]);

  /* ---------------- Supplier balances (unbounded, current snapshot) ---------------- */

  const supplierBalances = useMemo(() => {
    const grouped = groupBy(allPurchases, (r) => r.vendor_name || "(Unknown)");
    return Object.entries(grouped)
      .map(([name, rows]) => {
        const total = rows.reduce((s, r) => s + num(r.total_amount), 0);
        const paid = rows.reduce((s, r) => s + num(r.amount_paid), 0);
        const balance = rows.reduce((s, r) => s + num(r.balance_due), 0);
        const openCount = rows.filter((r) => num(r.balance_due) > 0).length;

        // Last purchase date for this supplier
        const lastDate =
          rows
            .map((r) => r.date)
            .sort()
            .slice(-1)[0] || "";

        return {
          name,
          total,
          paid,
          balance,
          count: rows.length,
          openCount,
          lastDate,
        };
      })
      .filter((s) => s.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [allPurchases]);

  /* ---------------- Cost change over time (per product) ---------------- */

  const costTrends = useMemo(() => {
    // For each product (description), compute avg unit cost per month
    const byProduct: Record<
      string,
      Record<string, { sum: number; qty: number }>
    > = {};
    for (const p of purchases) {
      const product = p.description || "(Untitled)";
      const month = p.date.substring(0, 7);
      if (!byProduct[product]) byProduct[product] = {};
      if (!byProduct[product][month])
        byProduct[product][month] = { sum: 0, qty: 0 };
      byProduct[product][month].sum += num(p.total_amount);
      byProduct[product][month].qty += p.quantity || 0;
    }

    // Convert to a table where each row is a product and columns are months
    const result = Object.entries(byProduct).map(([product, months]) => {
      const monthlyCosts: Record<string, number> = {};
      for (const [month, { sum, qty }] of Object.entries(months)) {
        monthlyCosts[month] = qty > 0 ? sum / qty : 0;
      }
      const sortedMonths = Object.keys(monthlyCosts).sort();
      const first = monthlyCosts[sortedMonths[0]] || 0;
      const last = monthlyCosts[sortedMonths[sortedMonths.length - 1]] || 0;
      const change = first > 0 ? ((last - first) / first) * 100 : 0;
      return {
        product,
        firstCost: first,
        lastCost: last,
        change,
        monthsObserved: sortedMonths.length,
        monthlyCosts,
      };
    });

    // Only show products with multiple months and meaningful change
    return result
      .filter((r) => r.monthsObserved >= 2)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 8);
  }, [purchases]);

  /* ---------------- Payment status ---------------- */

  const paymentStatusBreakdown = useMemo(() => {
    const paid = allPurchases.filter((p) => num(p.balance_due) <= 0);
    const partial = allPurchases.filter(
      (p) => num(p.amount_paid) > 0 && num(p.balance_due) > 0,
    );
    const unpaid = allPurchases.filter((p) => num(p.amount_paid) === 0);

    return [
      {
        name: "Paid",
        value: paid.length,
        amount: paid.reduce((s, p) => s + num(p.total_amount), 0),
        fill: "#10b981",
      },
      {
        name: "Partially paid",
        value: partial.length,
        amount: partial.reduce((s, p) => s + num(p.total_amount), 0),
        fill: "#f59e0b",
      },
      {
        name: "Unpaid",
        value: unpaid.length,
        amount: unpaid.reduce((s, p) => s + num(p.total_amount), 0),
        fill: "#ef4444",
      },
    ].filter((s) => s.value > 0);
  }, [allPurchases]);

  /* ---------------- Time series ---------------- */

  const monthlyTrend = useMemo(() => {
    const grouped = groupBy(purchases, (r) => r.date.substring(0, 7));
    return Object.entries(grouped)
      .map(([month, rows]) => ({
        month,
        total: rows.reduce((s, r) => s + num(r.total_amount), 0),
        count: rows.length,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [purchases]);

  const dailyTrend = useMemo(() => {
    const grouped = groupBy(purchases, (r) => r.date);
    return Object.entries(grouped)
      .map(([date, rows]) => ({
        date,
        total: rows.reduce((s, r) => s + num(r.total_amount), 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [purchases]);

  /* ================================================================ */
  /*  INTELLIGENCE                                                    */
  /* ================================================================ */

  const intelligence = useMemo(() => {
    const flags: Array<{
      type: "info" | "warning" | "success" | "critical";
      title: string;
      detail: string;
    }> = [];

    if (purchases.length === 0 && allPurchases.length === 0) return flags;

    /* 1. Outstanding supplier balances */
    const totalOutstanding = allPurchases.reduce(
      (s, p) => s + num(p.balance_due),
      0,
    );
    if (totalOutstanding > 0) {
      const topSuppliers = supplierBalances.slice(0, 3);
      flags.push({
        type: totalOutstanding > current.total * 0.5 ? "warning" : "info",
        title: `${fmtMoney(totalOutstanding)} outstanding across suppliers`,
        detail:
          topSuppliers.length > 0
            ? `Largest balances: ${topSuppliers
                .map((s) => `${s.name} (${fmtMoney(s.balance)})`)
                .join(", ")}.`
            : "No individual supplier has a significant balance.",
      });
    }

    /* 2. Most frequently used supplier */
    if (supplierBreakdown.length > 0) {
      const mostFrequent = [...supplierBreakdown].sort(
        (a, b) => b.count - a.count,
      )[0];
      const topSpend = supplierBreakdown[0];
      if (mostFrequent.name !== topSpend.name) {
        flags.push({
          type: "info",
          title: `Most-used supplier: ${mostFrequent.name}`,
          detail: `${mostFrequent.count} purchases totalling ${fmtMoney(
            mostFrequent.value,
          )}. Top spend is with ${topSpend.name} at ${fmtMoney(topSpend.value)}.`,
        });
      } else {
        flags.push({
          type: "info",
          title: `Top supplier: ${topSpend.name}`,
          detail: `${topSpend.count} purchases, ${fmtMoney(
            topSpend.value,
          )} spent - ${((topSpend.value / (current.total || 1)) * 100).toFixed(
            1,
          )}% of period spend.`,
        });
      }
    }

    /* 3. Month-over-month change */
    if (monthlyTrend.length >= 2) {
      const last = monthlyTrend[monthlyTrend.length - 1];
      const prev = monthlyTrend[monthlyTrend.length - 2];
      const change = pctChange(last.total, prev.total);
      if (Math.abs(change) > 15) {
        flags.push({
          type: change > 0 ? "warning" : "success",
          title: `Purchases ${change > 0 ? "up" : "down"} ${fmtPct(change)} MoM`,
          detail: `${prev.month}: ${fmtMoney(prev.total)} → ${last.month}: ${fmtMoney(last.total)}.`,
        });
      }
    }

    /* 4. Cost increase per product */
    const risingCosts = costTrends.filter((c) => c.change > 15);
    if (risingCosts.length > 0) {
      const top = risingCosts[0];
      flags.push({
        type: "warning",
        title: `Cost increase: ${top.product}`,
        detail: `Unit cost rose ${top.change.toFixed(
          1,
        )}% - from ${fmtMoney(top.firstCost)} to ${fmtMoney(top.lastCost)}.`,
      });
    }

    /* 5. Unpaid / overdue */
    const overdueCount = allPurchases.filter((p) => {
      if (num(p.balance_due) <= 0) return false;
      if (!p.due_date) return false;
      return new Date(p.due_date) < new Date(new Date().toDateString());
    }).length;
    if (overdueCount > 0) {
      flags.push({
        type: "critical",
        title: `${overdueCount} overdue purchase${overdueCount === 1 ? "" : "s"}`,
        detail:
          "Balances past their due date. Follow up with suppliers to avoid late fees.",
      });
    }

    /* 6. Period growth rate */
    if (previousPurchases.length > 0) {
      const growth = pctChange(current.total, previous.total);
      if (Math.abs(growth) > 20) {
        flags.push({
          type: growth > 0 ? "info" : "success",
          title: `Purchase volume ${growth > 0 ? "grew" : "declined"} ${fmtPct(
            growth,
          )} vs previous period`,
          detail: `${fmtMoney(previous.total)} → ${fmtMoney(current.total)}.`,
        });
      }
    }

    return flags;
  }, [
    purchases,
    allPurchases,
    previousPurchases,
    supplierBreakdown,
    supplierBalances,
    costTrends,
    monthlyTrend,
    current,
    previous,
  ]);

  /* ================================================================ */
  /*  AI-READY SUMMARY                                                */
  /* ================================================================ */

  const aiSummary = useMemo(
    () => ({
      period: filterPeriod,
      range:
        filterPeriod === "custom"
          ? { from: customFrom, to: customTo }
          : getDateRangeBounds(filterPeriod),
      current,
      previous,
      change: {
        totalPct: pctChange(current.total, previous.total),
        totalAbs: current.total - previous.total,
        countPct: pctChange(current.count, previous.count),
        avgPct: pctChange(current.avg, previous.avg),
      },
      supplierBalances,
      supplierSpending: supplierBreakdown,
      topProducts: productBreakdown,
      categoryMix: categoryBreakdown,
      paymentStatus: paymentStatusBreakdown,
      monthlyTrend,
      costTrends,
      intelligence,
    }),
    [
      current,
      previous,
      supplierBalances,
      supplierBreakdown,
      productBreakdown,
      categoryBreakdown,
      paymentStatusBreakdown,
      monthlyTrend,
      costTrends,
      intelligence,
      filterPeriod,
      customFrom,
      customTo,
    ],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__purchaseAnalytics = aiSummary;
    }
  }, [aiSummary]);

  /* ================================================================ */
  /*  RENDER HELPERS                                                  */
  /* ================================================================ */

  const renderDelta = (c: number, p: number, invert = true) => {
    const pct = pctChange(c, p);
    const isUp = pct > 0;
    const isFlat = Math.abs(pct) < 0.01;
    if (isFlat)
      return <span className="text-xs text-slate-400">No change</span>;

    // For costs, "up" is usually bad. invert=true flips the coloring.
    const positive = invert ? !isUp : isUp;
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${
          positive ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {isUp ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        {fmtPct(pct)}
      </span>
    );
  };

  const flagIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "critical":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "success":
        return <TrendingDown className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };
  const flagBg = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-amber-500/10 border-amber-500/30";
      case "critical":
        return "bg-red-500/10 border-red-500/30";
      case "success":
        return "bg-emerald-500/10 border-emerald-500/30";
      default:
        return "bg-blue-500/10 border-blue-500/30";
    }
  };

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Purchase Analytics</h1>
        <p className="text-slate-400 mt-2">
          Understand supply costs, supplier relationships, and procurement
          trends.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Date range filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <Select
          value={filterPeriod}
          onValueChange={(v) => setFilterPeriod(v as DateRangeKey)}
        >
          <SelectTrigger className="w-52 bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            {DATE_RANGE_OPTIONS.map((o) => (
              <SelectItem key={o.key} value={o.key}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filterPeriod === "custom" && (
          <div className="flex items-center gap-2">
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
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          {/* ============ TOP-LINE METRICS ============ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Purchases"
              value={fmtMoney(current.total)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.total, previous.total)} vs prev
                </span>
              }
              icon={<ShoppingCart className="w-4 h-4" />}
            />
            <StatCard
              title="Purchase Orders"
              value={fmt(current.count)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.count, previous.count)} vs prev
                </span>
              }
              icon={<Package className="w-4 h-4" />}
            />
            <StatCard
              title="Avg Purchase"
              value={fmtMoney(current.avg)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.avg, previous.avg)} vs prev
                </span>
              }
              icon={<DollarSign className="w-4 h-4" />}
            />
            <StatCard
              title="Outstanding Balance"
              value={fmtMoney(
                allPurchases.reduce((s, p) => s + num(p.balance_due), 0),
              )}
              subtitle={`${supplierBalances.length} supplier${
                supplierBalances.length === 1 ? "" : "s"
              } with open balances`}
              icon={<Truck className="w-4 h-4" />}
            />
          </div>

          {/* ============ INTELLIGENCE ============ */}
          {intelligence.length > 0 && (
            <ChartCard
              title="Purchase intelligence"
              description="Automatic signals from your data"
            >
              <div className="space-y-3">
                {intelligence.map((flag, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${flagBg(
                      flag.type,
                    )}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {flagIcon(flag.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {flag.title}
                      </p>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {flag.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {/* ============ FULL BREAKDOWN TABLE ============ */}
          <ChartCard
            title="Full breakdown"
            description="Every metric at a glance"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 px-3 font-medium">Metric</th>
                    <th className="text-right py-2 px-3 font-medium">
                      Current
                    </th>
                    <th className="text-right py-2 px-3 font-medium">
                      Previous
                    </th>
                    <th className="text-right py-2 px-3 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {[
                    ["Total purchases", current.total, previous.total],
                    ["Purchase count", current.count, previous.count],
                    ["Average purchase", current.avg, previous.avg],
                    ["Units purchased", current.units, previous.units],
                    ["Amount paid", current.paid, previous.paid],
                    ["Balance owed", current.balance, previous.balance],
                    ["Discounts received", current.discount, previous.discount],
                    ["Tax paid", current.tax, previous.tax],
                  ].map(([label, c, p]) => {
                    const cn = c as number;
                    const pn = p as number;
                    const isCount =
                      typeof label === "string" && label.includes("count");
                    const isUnits =
                      typeof label === "string" && label.includes("Units");
                    return (
                      <tr
                        key={label as string}
                        className="border-b border-slate-800/50"
                      >
                        <td className="py-2.5 px-3">{label}</td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {isCount || isUnits
                            ? cn.toLocaleString()
                            : fmtMoney(cn)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {isCount || isUnits
                            ? pn.toLocaleString()
                            : fmtMoney(pn)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {renderDelta(cn, pn)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* ============ TRENDS ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Daily purchases" description="Spend per day">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                    }}
                    formatter={(v: number) => [fmtMoney(v), "Purchases"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Monthly purchases" description="Total per month">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                    }}
                    formatter={(v: number) => fmtMoney(v)}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ============ BREAKDOWNS ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top suppliers" description="By spend in period">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={supplierBreakdown.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    width={110}
                    fontSize={11}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                    }}
                    formatter={(v: number) => fmtMoney(v)}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {supplierBreakdown.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Payment status"
              description="Snapshot across all purchases"
            >
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={paymentStatusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {paymentStatusBreakdown.map((_, i) => (
                      <Cell key={i} fill={_.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                    }}
                    formatter={(v: number, name: string, props: any) => [
                      fmtMoney(props.payload.amount),
                      props.payload.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ============ OUTSTANDING SUPPLIER BALANCES ============ */}
          <ChartCard
            title="Outstanding supplier balances"
            description="Who you owe money to right now"
          >
            {supplierBalances.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No outstanding balances. All suppliers are paid up.
              </div>
            ) : (
              <DataTable
                data={supplierBalances}
                columns={[
                  { key: "name" as const, label: "Supplier" },
                  {
                    key: "total" as const,
                    label: "Total purchased",
                    render: (v: number) => fmtMoney(v),
                  },
                  {
                    key: "paid" as const,
                    label: "Paid",
                    render: (v: number) => fmtMoney(v),
                  },
                  {
                    key: "balance" as const,
                    label: "Balance",
                    render: (v: number) => (
                      <span className="text-amber-300 font-semibold">
                        {fmtMoney(v)}
                      </span>
                    ),
                  },
                  { key: "openCount" as const, label: "Open orders" },
                  { key: "lastDate" as const, label: "Last purchase" },
                ]}
              />
            )}
          </ChartCard>

          {/* ============ TOP PRODUCTS ============ */}
          <ChartCard title="Top products" description="By spend, top 10">
            <DataTable
              data={productBreakdown}
              columns={[
                { key: "name" as const, label: "Product" },
                {
                  key: "value" as const,
                  label: "Total spend",
                  render: (v: number) => fmtMoney(v),
                },
                { key: "units" as const, label: "Units" },
                { key: "count" as const, label: "Orders" },
                {
                  key: "avgUnitCost" as const,
                  label: "Avg unit cost",
                  render: (v: number) => fmtMoney(v),
                },
              ]}
            />
          </ChartCard>

          {/* ============ COST CHANGES ============ */}
          {costTrends.length > 0 && (
            <ChartCard
              title="Cost change over time"
              description="Products whose unit cost changed most since first purchase"
            >
              <DataTable
                data={costTrends}
                columns={[
                  { key: "product" as const, label: "Product" },
                  {
                    key: "firstCost" as const,
                    label: "First cost",
                    render: (v: number) => fmtMoney(v),
                  },
                  {
                    key: "lastCost" as const,
                    label: "Latest cost",
                    render: (v: number) => fmtMoney(v),
                  },
                  {
                    key: "change" as const,
                    label: "Change",
                    render: (v: number) => (
                      <span
                        className={
                          v > 0
                            ? "text-red-400 font-semibold"
                            : "text-emerald-400 font-semibold"
                        }
                      >
                        {fmtPct(v)}
                      </span>
                    ),
                  },
                  { key: "monthsObserved" as const, label: "Months tracked" },
                ]}
              />
            </ChartCard>
          )}

          {/* ============ CATEGORY SUMMARY ============ */}
          {categoryBreakdown.length > 0 && (
            <ChartCard
              title="Category summary"
              description="Spend per category"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryBreakdown.map((c, i) => (
                  <div
                    key={c.name}
                    className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-slate-300 truncate">
                        {c.name}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {fmtMoney(c.value)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {c.count} purchase(s)
                    </p>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}
