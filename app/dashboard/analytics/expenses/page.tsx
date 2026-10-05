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
  CreditCard,
  AlertTriangle,
  Repeat,
  TrendingUpIcon,
  Zap,
  Info,
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

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number | string;
  payment_method: string;
  status: "paid" | "pending";
  created_at: string;
  // Optional - used if present
  supplier?: string | null;
  employee_responsible?: string | null;
  tax_amount?: number | string | null;
  receipt_url?: string | null;
  is_recurring?: boolean | null;
  recurring_frequency?: string | null;
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
    case "all":
    case "custom":
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

export default function ExpensesAnalyticsPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [previousExpenses, setPreviousExpenses] = useState<Expense[]>([]);
  const [revenueInPeriod, setRevenueInPeriod] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterPeriod, setFilterPeriod] = useState<DateRangeKey>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  /* ---------------------------------------------------------------- */
  /*  FETCH                                                           */
  /* ---------------------------------------------------------------- */

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

      // Current period expenses
      let q = supabase
        .from("expenses")
        .select("*")
        .eq("business_id", business.id)
        .order("date", { ascending: true });
      if (bounds) q = q.gte("date", bounds.from).lte("date", bounds.to);
      const { data: current, error: cErr } = await q;
      if (cErr) throw cErr;
      setExpenses(current || []);

      // Previous period expenses
      if (bounds) {
        const prev = getPreviousRange(filterPeriod, bounds.from, bounds.to);
        if (prev) {
          const { data: prevData, error: pErr } = await supabase
            .from("expenses")
            .select("*")
            .eq("business_id", business.id)
            .gte("date", prev.from)
            .lte("date", prev.to);
          if (pErr) throw pErr;
          setPreviousExpenses(prevData || []);
        } else {
          setPreviousExpenses([]);
        }
      }

      // Revenue in the same window (for expense-as-%-of-revenue)
      if (bounds) {
        const { data: revData } = await supabase
          .from("sales")
          .select("amount")
          .eq("business_id", business.id)
          .gte("date", bounds.from)
          .lte("date", bounds.to);
        const total = (revData || []).reduce(
          (s, r) => s + num((r as any).amount),
          0,
        );
        setRevenueInPeriod(total);
      } else {
        setRevenueInPeriod(0);
      }
    } catch (err: any) {
      console.error("Expense analytics fetch error:", err);
      setError("Failed to load expense analytics");
    } finally {
      setLoading(false);
    }
  };

  /* ================================================================ */
  /*  CALCULATIONS                                                    */
  /* ================================================================ */

  const calc = (rows: Expense[]) => {
    const total = rows.reduce((s, r) => s + num(r.amount), 0);
    const count = rows.length;
    const avg = count > 0 ? total / count : 0;
    const paid = rows
      .filter((r) => r.status === "paid")
      .reduce((s, r) => s + num(r.amount), 0);
    const pending = rows
      .filter((r) => r.status === "pending")
      .reduce((s, r) => s + num(r.amount), 0);
    const tax = rows.reduce((s, r) => s + num(r.tax_amount), 0);

    const recurring = rows
      .filter((r) => r.is_recurring)
      .reduce((s, r) => s + num(r.amount), 0);
    const oneOff = total - recurring;

    return { total, count, avg, paid, pending, tax, recurring, oneOff };
  };

  const current = useMemo(() => calc(expenses), [expenses]);
  const previous = useMemo(() => calc(previousExpenses), [previousExpenses]);

  const pctChange = (c: number, p: number) => {
    if (p === 0) return c > 0 ? 100 : 0;
    return ((c - p) / Math.abs(p)) * 100;
  };

  const groupBy = <K extends string>(
    rows: Expense[],
    keyFn: (r: Expense) => K,
  ): Record<K, Expense[]> =>
    rows.reduce(
      (acc, r) => {
        const k = keyFn(r);
        if (!acc[k]) acc[k] = [];
        acc[k].push(r);
        return acc;
      },
      {} as Record<K, Expense[]>,
    );

  /* ---------------- Breakdowns ---------------- */

  const categoryBreakdown = useMemo(() => {
    const grouped = groupBy(expenses, (r) => r.category || "(Uncategorized)");
    return Object.entries(grouped)
      .map(([name, rows]) => ({
        name,
        value: rows.reduce((s, r) => s + num(r.amount), 0),
        count: rows.length,
        avg:
          rows.length > 0
            ? rows.reduce((s, r) => s + num(r.amount), 0) / rows.length
            : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const supplierBreakdown = useMemo(() => {
    const grouped = groupBy(expenses, (r) => r.supplier || "(Unassigned)");
    return Object.entries(grouped)
      .map(([name, rows]) => ({
        name,
        value: rows.reduce((s, r) => s + num(r.amount), 0),
        count: rows.length,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [expenses]);

  const employeeBreakdown = useMemo(() => {
    const grouped = groupBy(
      expenses,
      (r) => r.employee_responsible || "(Unassigned)",
    );
    return Object.entries(grouped)
      .map(([name, rows]) => ({
        name,
        value: rows.reduce((s, r) => s + num(r.amount), 0),
        count: rows.length,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const paymentBreakdown = useMemo(() => {
    const grouped = groupBy(expenses, (r) => r.payment_method || "Unknown");
    return Object.entries(grouped)
      .map(([name, rows]) => ({
        name,
        value: rows.reduce((s, r) => s + num(r.amount), 0),
        count: rows.length,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  /* ---------------- Time series ---------------- */

  const monthlyTrend = useMemo(() => {
    const grouped = groupBy(expenses, (r) => r.date.substring(0, 7));
    return Object.entries(grouped)
      .map(([month, rows]) => ({
        month,
        total: rows.reduce((s, r) => s + num(r.amount), 0),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [expenses]);

  const dailyTrend = useMemo(() => {
    const grouped = groupBy(expenses, (r) => r.date);
    return Object.entries(grouped)
      .map(([date, rows]) => ({
        date,
        total: rows.reduce((s, r) => s + num(r.amount), 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [expenses]);

  /* ================================================================ */
  /*  INTELLIGENCE                                                    */
  /* ================================================================ */

  const intelligence = useMemo(() => {
    const flags: Array<{
      type: "info" | "warning" | "success" | "critical";
      title: string;
      detail: string;
    }> = [];

    if (expenses.length === 0) return flags;

    /* --- 1. Largest expense category --- */
    if (categoryBreakdown.length > 0) {
      const top = categoryBreakdown[0];
      const pct = current.total > 0 ? (top.value / current.total) * 100 : 0;
      flags.push({
        type: "info",
        title: `Largest category: ${top.name}`,
        detail: `${fmtMoney(top.value)} across ${top.count} expense${
          top.count === 1 ? "" : "s"
        } - ${pct.toFixed(1)}% of total.`,
      });
    }

    /* --- 2. Fastest-growing expense category --- */
    if (previousExpenses.length > 0) {
      const currByCat = groupBy(expenses, (r) => r.category);
      const prevByCat = groupBy(previousExpenses, (r) => r.category);

      let fastest: {
        name: string;
        growth: number;
        from: number;
        to: number;
      } | null = null;
      for (const [cat, currRows] of Object.entries(currByCat)) {
        const currSum = currRows.reduce((s, r) => s + num(r.amount), 0);
        const prevRows = prevByCat[cat] || [];
        const prevSum = prevRows.reduce((s, r) => s + num(r.amount), 0);
        if (prevSum < 100) continue; // ignore tiny bases
        const growth = ((currSum - prevSum) / prevSum) * 100;
        if (!fastest || growth > fastest.growth) {
          fastest = { name: cat, growth, from: prevSum, to: currSum };
        }
      }
      if (fastest && fastest.growth > 20) {
        flags.push({
          type: "warning",
          title: `Fastest-growing category: ${fastest.name}`,
          detail: `Up ${fastest.growth.toFixed(1)}% - from ${fmtMoney(
            fastest.from,
          )} to ${fmtMoney(fastest.to)}.`,
        });
      }
    }

    /* --- 3. Month-over-month change --- */
    if (monthlyTrend.length >= 2) {
      const last = monthlyTrend[monthlyTrend.length - 1];
      const prev = monthlyTrend[monthlyTrend.length - 2];
      const change = pctChange(last.total, prev.total);
      if (Math.abs(change) > 10) {
        flags.push({
          type: change > 0 ? "warning" : "success",
          title: `Month-over-month ${
            change > 0 ? "increase" : "decrease"
          }: ${fmtPct(change)}`,
          detail: `${prev.month}: ${fmtMoney(prev.total)} → ${
            last.month
          }: ${fmtMoney(last.total)}.`,
        });
      }
    }

    /* --- 4. Unusual (outlier) expenses --- */
    if (expenses.length >= 5) {
      // Simple z-score outlier detection on amount
      const amounts = expenses.map((e) => num(e.amount));
      const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const variance =
        amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
      const std = Math.sqrt(variance);

      const outliers = expenses.filter(
        (e) => Math.abs(num(e.amount) - mean) > 2.5 * std,
      );
      if (outliers.length > 0) {
        const biggest = outliers.sort(
          (a, b) => num(b.amount) - num(a.amount),
        )[0];
        flags.push({
          type: "warning",
          title: `Unusual expense detected`,
          detail: `${fmtMoney(num(biggest.amount))} on ${biggest.date} - "${
            biggest.description || biggest.category
          }" is ${((num(biggest.amount) - mean) / (std || 1)).toFixed(
            1,
          )}σ above average.`,
        });
      }
    }

    /* --- 5. Repeated expenses (same supplier + similar amount, multiple times) --- */
    const repeatMap = new Map<string, number>();
    for (const e of expenses) {
      const key = `${(e.supplier || e.category || "").toLowerCase()}|${Math.round(
        num(e.amount) / 100,
      )}`;
      repeatMap.set(key, (repeatMap.get(key) || 0) + 1);
    }
    const repeats = Array.from(repeatMap.entries()).filter(([, c]) => c >= 3);
    if (repeats.length > 0) {
      flags.push({
        type: "info",
        title: `${repeats.length} repeated expense pattern${
          repeats.length === 1 ? "" : "s"
        }`,
        detail: `Same supplier and amount appearing 3+ times. Consider marking these as recurring.`,
      });
    }

    /* --- 6. Recurring expense summary --- */
    const recurringCount = expenses.filter((e) => e.is_recurring).length;
    if (recurringCount > 0) {
      flags.push({
        type: "info",
        title: `${recurringCount} recurring expense${
          recurringCount === 1 ? "" : "s"
        }`,
        detail: `${fmtMoney(current.recurring)} recurring (${(
          (current.recurring / (current.total || 1)) *
          100
        ).toFixed(1)}% of total), ${fmtMoney(current.oneOff)} one-off.`,
      });
    }

    /* --- 7. Categories exceeding previous averages --- */
    if (previousExpenses.length > 0) {
      const currByCat = groupBy(expenses, (r) => r.category);
      const prevByCat = groupBy(previousExpenses, (r) => r.category);
      const exceeding: string[] = [];
      for (const [cat, currRows] of Object.entries(currByCat)) {
        const currSum = currRows.reduce((s, r) => s + num(r.amount), 0);
        const prevRows = prevByCat[cat] || [];
        if (prevRows.length === 0) continue;
        const prevSum = prevRows.reduce((s, r) => s + num(r.amount), 0);
        if (currSum > prevSum * 1.3 && currSum - prevSum > 500) {
          exceeding.push(cat);
        }
      }
      if (exceeding.length > 0) {
        flags.push({
          type: "warning",
          title: `${exceeding.length} categories exceeded previous averages by 30%+`,
          detail:
            exceeding.slice(0, 3).join(", ") +
            (exceeding.length > 3 ? ` and ${exceeding.length - 3} more.` : "."),
        });
      }
    }

    /* --- 8. Expense as % of revenue --- */
    if (revenueInPeriod > 0) {
      const ratio = (current.total / revenueInPeriod) * 100;
      flags.push({
        type: ratio > 70 ? "critical" : ratio > 50 ? "warning" : "success",
        title: `Expenses are ${ratio.toFixed(1)}% of revenue`,
        detail: `${fmtMoney(current.total)} spent against ${fmtMoney(
          revenueInPeriod,
        )} earned in this period.`,
      });
    }

    return flags;
  }, [
    expenses,
    previousExpenses,
    categoryBreakdown,
    monthlyTrend,
    current,
    revenueInPeriod,
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
      revenue: revenueInPeriod,
      expenseToRevenueRatio:
        revenueInPeriod > 0 ? (current.total / revenueInPeriod) * 100 : null,
      byCategory: categoryBreakdown,
      bySupplier: supplierBreakdown,
      byEmployee: employeeBreakdown,
      byPaymentMethod: paymentBreakdown,
      monthlyTrend,
      intelligence,
    }),
    [
      current,
      previous,
      categoryBreakdown,
      supplierBreakdown,
      employeeBreakdown,
      paymentBreakdown,
      monthlyTrend,
      intelligence,
      revenueInPeriod,
      filterPeriod,
      customFrom,
      customTo,
    ],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__expenseAnalytics = aiSummary;
    }
  }, [aiSummary]);

  /* ================================================================ */
  /*  RENDER HELPERS                                                  */
  /* ================================================================ */

  const renderDelta = (c: number, p: number, invert = false) => {
    const pct = pctChange(c, p);
    const isUp = pct > 0;
    const isFlat = Math.abs(pct) < 0.01;
    if (isFlat)
      return <span className="text-xs text-slate-400">No change</span>;

    // For expenses, "up" is often bad. invert=true flips the coloring.
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
        <h1 className="text-3xl font-bold text-white">Expense Analytics</h1>
        <p className="text-slate-400 mt-2">
          Understand where money goes - categories, suppliers, growth, and
          anomalies.
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
              title="Total Expenses"
              value={fmtMoney(current.total)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.total, previous.total, true)} vs prev
                </span>
              }
              icon={<CreditCard className="w-4 h-4" />}
            />
            <StatCard
              title="Expense Count"
              value={fmt(current.count)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.count, previous.count, true)} vs prev
                </span>
              }
            />
            <StatCard
              title="Avg Expense"
              value={fmtMoney(current.avg)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.avg, previous.avg, true)} vs prev
                </span>
              }
            />
            <StatCard
              title="Expense / Revenue"
              value={
                revenueInPeriod > 0
                  ? `${((current.total / revenueInPeriod) * 100).toFixed(1)}%`
                  : "-"
              }
              subtitle={
                revenueInPeriod > 0
                  ? `Against ${fmtMoney(revenueInPeriod)} earned`
                  : "No revenue in period"
              }
            />
          </div>

          {/* ============ INTELLIGENCE FLAGS ============ */}
          {intelligence.length > 0 && (
            <ChartCard
              title="Expense intelligence"
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
                    ["Total expenses", current.total, previous.total],
                    ["Expense count", current.count, previous.count],
                    ["Average expense", current.avg, previous.avg],
                    ["Paid", current.paid, previous.paid],
                    ["Pending", current.pending, previous.pending],
                    ["Tax paid", current.tax, previous.tax],
                    [
                      "Recurring expenses",
                      current.recurring,
                      previous.recurring,
                    ],
                    ["One-off expenses", current.oneOff, previous.oneOff],
                  ].map(([label, c, p]) => {
                    const cn = c as number;
                    const pn = p as number;
                    const isMoney =
                      typeof label === "string" && !label.includes("count");
                    return (
                      <tr
                        key={label as string}
                        className="border-b border-slate-800/50"
                      >
                        <td className="py-2.5 px-3">{label}</td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {isMoney ? fmtMoney(cn) : cn.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {isMoney ? fmtMoney(pn) : pn.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {renderDelta(cn, pn, true)}
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
            <ChartCard title="Daily expenses" description="Spend per day">
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
                    formatter={(v: number) => [fmtMoney(v), "Expenses"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Monthly expenses" description="Total per month">
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
                  <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ============ BREAKDOWNS ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="By category" description="Top spend drivers">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={categoryBreakdown}
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
                    {categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="By payment method" description="How you pay">
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

          {/* ============ SUPPLIER + EMPLOYEE ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top suppliers" description="By spend, top 10">
              {supplierBreakdown.length === 0 ||
              (supplierBreakdown.length === 1 &&
                supplierBreakdown[0].name === "(Unassigned)") ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No supplier recorded yet.
                  <br />
                  Add a <code className="text-slate-400">supplier</code> column
                  value to unlock this breakdown.
                </div>
              ) : (
                <DataTable
                  data={supplierBreakdown}
                  columns={[
                    { key: "name" as const, label: "Supplier" },
                    {
                      key: "value" as const,
                      label: "Spend",
                      render: (v: number) => fmtMoney(v),
                    },
                    { key: "count" as const, label: "Expenses" },
                  ]}
                />
              )}
            </ChartCard>

            <ChartCard
              title="By employee"
              description="Spend attributed to each team member"
            >
              {employeeBreakdown.length === 0 ||
              (employeeBreakdown.length === 1 &&
                employeeBreakdown[0].name === "(Unassigned)") ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No employee attribution yet.
                  <br />
                  Add an{" "}
                  <code className="text-slate-400">
                    employee_responsible
                  </code>{" "}
                  column value to unlock this breakdown.
                </div>
              ) : (
                <DataTable
                  data={employeeBreakdown}
                  columns={[
                    { key: "name" as const, label: "Employee" },
                    {
                      key: "value" as const,
                      label: "Spend",
                      render: (v: number) => fmtMoney(v),
                    },
                    { key: "count" as const, label: "Expenses" },
                  ]}
                />
              )}
            </ChartCard>
          </div>

          {/* ============ CATEGORY SUMMARY CARDS ============ */}
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
                      {c.count} expense{c.count === 1 ? "" : "s"} · avg{" "}
                      {fmtMoney(c.avg)}
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
