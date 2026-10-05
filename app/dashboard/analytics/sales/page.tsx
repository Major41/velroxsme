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
  Package,
  Users,
  CreditCard,
  DollarSign,
  ShoppingBag,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  // Optional - used if the columns exist in your table
  cost_price?: number | string | null;
  discount_amount?: number | string | null;
  tax_amount?: number | string | null;
  salesperson_id?: string | null;
  salesperson_name?: string | null;
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
/*  DATE RANGE UTILITIES (same as sales page)                           */
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
    case "all":
    case "custom":
    default:
      return null;
  }
};

/** Compute the matching "previous" range for comparison */
const getPreviousRange = (
  key: DateRangeKey,
  from: string,
  to: string,
): { from: string; to: string } | null => {
  const fromD = new Date(from);
  const toD = new Date(to);
  const spanDays = Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1;

  switch (key) {
    case "today": {
      const d = new Date(fromD);
      d.setDate(d.getDate() - 1);
      return { from: toISODate(d), to: toISODate(d) };
    }
    case "yesterday": {
      const d = new Date(fromD);
      d.setDate(d.getDate() - 1);
      return { from: toISODate(d), to: toISODate(d) };
    }
    case "this_week":
    case "last_week":
    case "this_month":
    case "last_month":
    case "this_quarter":
    case "last_quarter":
    case "this_year":
    case "last_year":
    case "custom": {
      // Shift the whole window back by its own length
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

export default function SalesAnalyticsPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [sales, setSales] = useState<Sale[]>([]);
  const [previousSales, setPreviousSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterPeriod, setFilterPeriod] = useState<DateRangeKey>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  /* ---------------- Fetch current + previous period ---------------- */

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
      // Resolve current window
      let bounds: { from: string; to: string } | null = null;
      if (filterPeriod === "custom" && customFrom && customTo) {
        bounds = { from: customFrom, to: customTo };
      } else if (filterPeriod !== "all") {
        bounds = getDateRangeBounds(filterPeriod);
      }

      // Fetch current
      let q = supabase
        .from("sales")
        .select("*")
        .eq("business_id", business.id)
        .order("date", { ascending: true });

      if (bounds) q = q.gte("date", bounds.from).lte("date", bounds.to);

      const { data: current, error: currentErr } = await q;
      if (currentErr) throw currentErr;
      setSales(current || []);

      // Fetch previous for comparison
      if (bounds) {
        const prev = getPreviousRange(filterPeriod, bounds.from, bounds.to);
        if (prev) {
          const { data: prevData, error: prevErr } = await supabase
            .from("sales")
            .select("*")
            .eq("business_id", business.id)
            .gte("date", prev.from)
            .lte("date", prev.to);
          if (prevErr) throw prevErr;
          setPreviousSales(prevData || []);
        } else {
          setPreviousSales([]);
        }
      } else {
        setPreviousSales([]);
      }
    } catch (err: any) {
      console.error("Analytics fetch error:", err);
      setError("Failed to load sales analytics");
    } finally {
      setLoading(false);
    }
  };

  /* ================================================================ */
  /*  CALCULATIONS - all metrics live in one place                    */
  /* ================================================================ */

  const calc = (rows: Sale[]) => {
    // Gross = sum of all sales before discounts (we use `amount` + discounts
    // to reconstruct what the customer would have paid without discounts)
    const grossSales = rows.reduce(
      (s, r) => s + num(r.amount) + num(r.discount_amount),
      0,
    );
    const netSales = rows.reduce((s, r) => s + num(r.amount), 0);
    const discounts = rows.reduce((s, r) => s + num(r.discount_amount), 0);
    const tax = rows.reduce((s, r) => s + num(r.tax_amount), 0);
    const cogs = rows.reduce(
      (s, r) => s + num(r.cost_price) * (r.quantity || 0),
      0,
    );
    const grossProfit = netSales - cogs;
    const margin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    const transactions = rows.length;
    const unitsSold = rows.reduce((s, r) => s + (r.quantity || 0), 0);
    const avgTxnValue = transactions > 0 ? netSales / transactions : 0;
    const avgItemsPerTxn = transactions > 0 ? unitsSold / transactions : 0;

    // Only "completed" counts toward paid revenue
    const paidSales = rows
      .filter((r) => r.payment_status === "paid")
      .reduce((s, r) => s + num(r.amount), 0);
    const pendingSales = rows
      .filter((r) => r.payment_status === "pending")
      .reduce((s, r) => s + num(r.amount), 0);

    return {
      grossSales,
      netSales,
      discounts,
      tax,
      cogs,
      grossProfit,
      margin,
      transactions,
      unitsSold,
      avgTxnValue,
      avgItemsPerTxn,
      paidSales,
      pendingSales,
    };
  };

  const current = useMemo(() => calc(sales), [sales]);
  const previous = useMemo(() => calc(previousSales), [previousSales]);

  /** Percentage change between two numbers */
  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  /* ---------------- Breakdown helpers ---------------- */

  const groupBy = <K extends string>(
    rows: Sale[],
    keyFn: (r: Sale) => K,
  ): Record<K, Sale[]> =>
    rows.reduce(
      (acc, r) => {
        const k = keyFn(r);
        if (!acc[k]) acc[k] = [];
        acc[k].push(r);
        return acc;
      },
      {} as Record<K, Sale[]>,
    );

  const productBreakdown = useMemo(() => {
    const grouped = groupBy(sales, (r) => r.product_name || "(Untitled)");
    return Object.entries(grouped)
      .map(([name, rows]) => ({
        name,
        revenue: rows.reduce((s, r) => s + num(r.amount), 0),
        units: rows.reduce((s, r) => s + (r.quantity || 0), 0),
        txns: rows.length,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [sales]);

  const categoryBreakdown = useMemo(() => {
    const grouped = groupBy(sales, (r) => r.category || "(Uncategorized)");
    return Object.entries(grouped)
      .map(([name, rows]) => ({
        name,
        revenue: rows.reduce((s, r) => s + num(r.amount), 0),
        units: rows.reduce((s, r) => s + (r.quantity || 0), 0),
        txns: rows.length,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const customerBreakdown = useMemo(() => {
    const grouped = groupBy(sales, (r) => r.customer_name || "(Walk-in)");
    return Object.entries(grouped)
      .map(([name, rows]) => ({
        name,
        revenue: rows.reduce((s, r) => s + num(r.amount), 0),
        txns: rows.length,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [sales]);

  const paymentBreakdown = useMemo(() => {
    const grouped = groupBy(sales, (r) => r.payment_method || "Unknown");
    return Object.entries(grouped)
      .map(([name, rows]) => ({
        name,
        value: rows.reduce((s, r) => s + num(r.amount), 0),
        count: rows.length,
      }))
      .sort((a, b) => b.value - a.value);
  }, [sales]);

  const salespersonBreakdown = useMemo(() => {
    const grouped = groupBy(sales, (r) => r.salesperson_name || "(Unassigned)");
    return Object.entries(grouped)
      .map(([name, rows]) => ({
        name,
        revenue: rows.reduce((s, r) => s + num(r.amount), 0),
        txns: rows.length,
        avgTxn:
          rows.length > 0
            ? rows.reduce((s, r) => s + num(r.amount), 0) / rows.length
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  /* ---------------- Time series ---------------- */

  const dailyTrend = useMemo(() => {
    const grouped = groupBy(sales, (r) => r.date);
    return Object.entries(grouped)
      .map(([date, rows]) => ({
        date,
        net: rows.reduce((s, r) => s + num(r.amount), 0),
        units: rows.reduce((s, r) => s + (r.quantity || 0), 0),
        txns: rows.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sales]);

  const monthlyTrend = useMemo(() => {
    const grouped = groupBy(sales, (r) => r.date.substring(0, 7));
    return Object.entries(grouped)
      .map(([month, rows]) => ({
        month,
        net: rows.reduce((s, r) => s + num(r.amount), 0),
        units: rows.reduce((s, r) => s + (r.quantity || 0), 0),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [sales]);

  /* ================================================================ */
  /*  AI-READY SUMMARY                                                */
  /*  This object is what we'll feed to OpenAI later. It contains     */
  /*  only precomputed numbers - no raw rows, no ambiguity.           */
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
        netSalesPct: pctChange(current.netSales, previous.netSales),
        netSalesAbs: current.netSales - previous.netSales,
        transactionsPct: pctChange(current.transactions, previous.transactions),
        unitsPct: pctChange(current.unitsSold, previous.unitsSold),
        avgTxnPct: pctChange(current.avgTxnValue, previous.avgTxnValue),
      },
      topProducts: productBreakdown.slice(0, 5),
      topCategories: categoryBreakdown.slice(0, 5),
      topCustomers: customerBreakdown.slice(0, 5),
      paymentMix: paymentBreakdown,
      salespeople: salespersonBreakdown,
    }),
    [
      current,
      previous,
      productBreakdown,
      categoryBreakdown,
      customerBreakdown,
      paymentBreakdown,
      salespersonBreakdown,
      filterPeriod,
      customFrom,
      customTo,
    ],
  );

  // Expose for future AI integration - harmless in prod, useful in dev
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__salesAnalytics = aiSummary;
    }
  }, [aiSummary]);

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  const renderDelta = (curr: number, prev: number) => {
    const pct = pctChange(curr, prev);
    const isUp = pct > 0;
    const isFlat = Math.abs(pct) < 0.01;
    if (isFlat) {
      return <span className="text-xs text-slate-400">No change</span>;
    }
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${
          isUp ? "text-emerald-400" : "text-red-400"
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Sales Analytics</h1>
        <p className="text-slate-400 mt-2">
          A complete picture of your revenue - trends, breakdowns,
          profitability, and growth.
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
          {/* ============== TOP-LINE METRICS ============== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Net Sales"
              value={fmtMoney(current.netSales)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.netSales, previous.netSales)} vs prev
                </span>
              }
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <StatCard
              title="Gross Profit"
              value={fmtMoney(current.grossProfit)}
              subtitle={`${current.margin.toFixed(1)}% margin`}
              icon={<DollarSign className="w-4 h-4" />}
            />
            <StatCard
              title="Transactions"
              value={fmt(current.transactions)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.transactions, previous.transactions)} vs
                  prev
                </span>
              }
              icon={<ShoppingBag className="w-4 h-4" />}
            />
            <StatCard
              title="Avg Transaction"
              value={fmtMoney(current.avgTxnValue)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.avgTxnValue, previous.avgTxnValue)} vs
                  prev
                </span>
              }
              icon={<Percent className="w-4 h-4" />}
            />
          </div>

          {/* ============== FULL METRIC TABLE ============== */}
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
                    ["Gross sales", current.grossSales, previous.grossSales],
                    ["Net sales", current.netSales, previous.netSales],
                    ["Discounts given", current.discounts, previous.discounts],
                    ["Tax collected", current.tax, previous.tax],
                    ["Cost of goods sold", current.cogs, previous.cogs],
                    ["Gross profit", current.grossProfit, previous.grossProfit],
                    [
                      "Transactions",
                      current.transactions,
                      previous.transactions,
                    ],
                    ["Units sold", current.unitsSold, previous.unitsSold],
                    [
                      "Avg transaction value",
                      current.avgTxnValue,
                      previous.avgTxnValue,
                    ],
                    [
                      "Avg items per transaction",
                      current.avgItemsPerTxn,
                      previous.avgItemsPerTxn,
                    ],
                    ["Paid revenue", current.paidSales, previous.paidSales],
                    [
                      "Pending revenue",
                      current.pendingSales,
                      previous.pendingSales,
                    ],
                  ].map(([label, curr, prev]) => {
                    const c = curr as number;
                    const p = prev as number;
                    const isMoney =
                      typeof label === "string" &&
                      !label.includes("Transactions") &&
                      !label.includes("Units") &&
                      !label.includes("Avg items");
                    return (
                      <tr
                        key={label as string}
                        className="border-b border-slate-800/50"
                      >
                        <td className="py-2.5 px-3">{label}</td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {isMoney ? fmtMoney(c) : c.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {isMoney ? fmtMoney(p) : p.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {renderDelta(c, p)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-slate-700">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Gross profit margin
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-white">
                      {current.margin.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {previous.margin.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {renderDelta(current.margin, previous.margin)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* ============== TREND CHARTS ============== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Daily sales trend"
              description="Net revenue per day"
            >
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
                    formatter={(v: number) => [fmtMoney(v), "Net sales"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Monthly performance"
              description="Net sales and units"
            >
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
                  <Bar dataKey="net" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ============== BREAKDOWNS ============== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top products" description="By revenue, top 10">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={productBreakdown}
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
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Payment method mix"
              description="Where the money came from"
            >
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    dataKey="value"
                    label={(entry) =>
                      `${entry.name}: ${fmt(entry.value as number)}`
                    }
                  >
                    {paymentBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                    }}
                    formatter={(v: number) => fmtMoney(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ============== CUSTOMER + SALESPERSON ============== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top customers" description="By revenue, top 10">
              <DataTable
                data={customerBreakdown}
                columns={[
                  { key: "name" as const, label: "Customer" },
                  {
                    key: "revenue" as const,
                    label: "Revenue",
                    render: (v: number) => fmtMoney(v),
                  },
                  { key: "txns" as const, label: "Transactions" },
                ]}
              />
            </ChartCard>

            <ChartCard
              title="Salesperson performance"
              description="Revenue per employee (if assigned)"
            >
              {salespersonBreakdown.length === 0 ||
              (salespersonBreakdown.length === 1 &&
                salespersonBreakdown[0].name === "(Unassigned)") ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No salesperson assigned to sales yet.
                  <br />
                  Add a <code className="text-slate-400">
                    salesperson_name
                  </code>{" "}
                  column value to start tracking this.
                </div>
              ) : (
                <DataTable
                  data={salespersonBreakdown}
                  columns={[
                    { key: "name" as const, label: "Salesperson" },
                    {
                      key: "revenue" as const,
                      label: "Revenue",
                      render: (v: number) => fmtMoney(v),
                    },
                    { key: "txns" as const, label: "Txns" },
                    {
                      key: "avgTxn" as const,
                      label: "Avg txn",
                      render: (v: number) => fmtMoney(v),
                    },
                  ]}
                />
              )}
            </ChartCard>
          </div>

          {/* ============== CATEGORY SUMMARY ============== */}
          {categoryBreakdown.length > 0 && (
            <ChartCard
              title="Category summary"
              description="Revenue by category"
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
                      {fmtMoney(c.revenue)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {c.units} units · {c.txns} transactions
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
