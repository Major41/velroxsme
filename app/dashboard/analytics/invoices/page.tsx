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
  Receipt,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
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

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  due_date: string | null;
  status:
    | "draft"
    | "sent"
    | "paid"
    | "partially_paid"
    | "overdue"
    | "cancelled";
  effective_status?: string | null;
  total_amount: number | string;
  amount_paid: number | string;
  balance_due: number | string;
  paid_at?: string | null;
  days_to_due?: number | null;
  created_at: string;
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
/*  AGING BUCKETS                                                       */
/* ==================================================================== */

type AgingBucket = {
  name: string;
  minDays: number;
  maxDays: number;
  color: string;
};

const AGING_BUCKETS: AgingBucket[] = [
  { name: "Current (not due)", minDays: -99999, maxDays: 0, color: "#10b981" },
  { name: "1–30 days", minDays: 1, maxDays: 30, color: "#3b82f6" },
  { name: "31–60 days", minDays: 31, maxDays: 60, color: "#f59e0b" },
  { name: "61–90 days", minDays: 61, maxDays: 90, color: "#ef4444" },
  { name: "90+ days", minDays: 91, maxDays: 99999, color: "#7f1d1d" },
];

/** Days an invoice has been outstanding (from due date if past) */
const daysOverdue = (inv: Invoice): number => {
  if (!inv.due_date) return 0;
  const due = new Date(inv.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
  return Math.max(0, diff);
};

const bucketFor = (inv: Invoice): AgingBucket => {
  const days = daysOverdue(inv);
  return (
    AGING_BUCKETS.find((b) => days >= b.minDays && days <= b.maxDays) ||
    AGING_BUCKETS[AGING_BUCKETS.length - 1]
  );
};

/* ==================================================================== */
/*  PAGE                                                                */
/* ==================================================================== */

export default function InvoiceAnalyticsPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]); // for aging snapshot
  const [previousInvoices, setPreviousInvoices] = useState<Invoice[]>([]);
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
        .from("invoices_with_status")
        .select("*")
        .eq("business_id", business.id)
        .order("invoice_date", { ascending: true });
      if (bounds)
        q = q.gte("invoice_date", bounds.from).lte("invoice_date", bounds.to);
      const { data: current, error: cErr } = await q;
      if (cErr) throw cErr;
      setInvoices(current || []);

      // All invoices (for aging snapshot - aging is "as of today", not period-bound)
      const { data: all } = await supabase
        .from("invoices_with_status")
        .select("*")
        .eq("business_id", business.id);
      setAllInvoices(all || []);

      // Previous period
      if (bounds) {
        const prev = getPreviousRange(filterPeriod, bounds.from, bounds.to);
        if (prev) {
          const { data: prevData, error: pErr } = await supabase
            .from("invoices_with_status")
            .select("*")
            .eq("business_id", business.id)
            .gte("invoice_date", prev.from)
            .lte("invoice_date", prev.to);
          if (pErr) throw pErr;
          setPreviousInvoices(prevData || []);
        } else {
          setPreviousInvoices([]);
        }
      } else {
        setPreviousInvoices([]);
      }
    } catch (err: any) {
      console.error("Invoice analytics fetch error:", err);
      setError("Failed to load invoice analytics");
    } finally {
      setLoading(false);
    }
  };

  /* ================================================================ */
  /*  CALCULATIONS                                                    */
  /* ================================================================ */

  const calc = (rows: Invoice[]) => {
    const invoiced = rows.reduce((s, r) => s + num(r.total_amount), 0);
    const paid = rows.reduce((s, r) => s + num(r.amount_paid), 0);
    const unpaid = rows.reduce((s, r) => s + num(r.balance_due), 0);
    const count = rows.length;
    const avg = count > 0 ? invoiced / count : 0;

    const fullyPaidCount = rows.filter(
      (r) => num(r.balance_due) <= 0 && num(r.amount_paid) > 0,
    ).length;
    const partiallyPaidCount = rows.filter(
      (r) => num(r.amount_paid) > 0 && num(r.balance_due) > 0,
    ).length;
    const unpaidCount = rows.filter((r) => num(r.amount_paid) === 0).length;

    const overdueRows = rows.filter(
      (r) => num(r.balance_due) > 0 && daysOverdue(r) > 0,
    );
    const overdue = overdueRows.reduce((s, r) => s + num(r.balance_due), 0);

    // Average payment time (days from invoice_date to paid_at) for fully paid
    const paidWithTimestamps = rows.filter(
      (r) => num(r.balance_due) <= 0 && r.paid_at && r.invoice_date,
    );
    const avgPaymentDays =
      paidWithTimestamps.length > 0
        ? paidWithTimestamps.reduce((s, r) => {
            const start = new Date(r.invoice_date).getTime();
            const end = new Date(r.paid_at as string).getTime();
            return s + Math.max(0, Math.round((end - start) / 86400000));
          }, 0) / paidWithTimestamps.length
        : null;

    return {
      invoiced,
      paid,
      unpaid,
      overdue,
      count,
      avg,
      fullyPaidCount,
      partiallyPaidCount,
      unpaidCount,
      overdueCount: overdueRows.length,
      avgPaymentDays,
    };
  };

  const current = useMemo(() => calc(invoices), [invoices]);
  const previous = useMemo(() => calc(previousInvoices), [previousInvoices]);

  const pctChange = (c: number, p: number) => {
    if (p === 0) return c > 0 ? 100 : 0;
    return ((c - p) / Math.abs(p)) * 100;
  };

  /* ---------------- Collection rate ---------------- */

  const collectionRate =
    current.invoiced > 0 ? (current.paid / current.invoiced) * 100 : 0;
  const previousCollectionRate =
    previous.invoiced > 0 ? (previous.paid / previous.invoiced) * 100 : 0;

  /* ---------------- Aging analysis (all invoices, current snapshot) ---------------- */

  const agingAnalysis = useMemo(() => {
    const open = allInvoices.filter((i) => num(i.balance_due) > 0);
    const buckets = AGING_BUCKETS.map((b) => {
      const rows = open.filter((i) => bucketFor(i).name === b.name);
      return {
        name: b.name,
        color: b.color,
        count: rows.length,
        amount: rows.reduce((s, r) => s + num(r.balance_due), 0),
      };
    });
    const total = buckets.reduce((s, b) => s + b.amount, 0);
    return { buckets, total, openCount: open.length };
  }, [allInvoices]);

  /* ---------------- Aging table (top open invoices) ---------------- */

  const agingTable = useMemo(() => {
    return allInvoices
      .filter((i) => num(i.balance_due) > 0)
      .map((i) => ({
        invoice_number: i.invoice_number,
        customer_name: i.customer_name,
        invoice_date: i.invoice_date,
        due_date: i.due_date || "-",
        days_outstanding: daysOverdue(i),
        balance_due: num(i.balance_due),
        bucket: bucketFor(i).name,
      }))
      .sort((a, b) => b.days_outstanding - a.days_outstanding);
  }, [allInvoices]);

  /* ---------------- Status breakdown ---------------- */

  const statusBreakdown = useMemo(() => {
    const effective = (inv: Invoice) => {
      if (inv.effective_status) return inv.effective_status;
      if (
        ["draft", "sent", "partially_paid"].includes(inv.status) &&
        inv.due_date &&
        new Date(inv.due_date) < new Date(new Date().toDateString())
      ) {
        return "overdue";
      }
      return inv.status;
    };

    const grouped: Record<string, { count: number; amount: number }> = {};
    for (const inv of invoices) {
      const st = effective(inv);
      if (!grouped[st]) grouped[st] = { count: 0, amount: 0 };
      grouped[st].count += 1;
      grouped[st].amount += num(inv.total_amount);
    }

    const palette: Record<string, string> = {
      draft: "#64748b",
      sent: "#3b82f6",
      paid: "#10b981",
      partially_paid: "#f59e0b",
      overdue: "#ef4444",
      cancelled: "#475569",
    };

    return Object.entries(grouped).map(([name, v]) => ({
      name,
      count: v.count,
      value: v.amount,
      fill: palette[name] || "#64748b",
    }));
  }, [invoices]);

  /* ---------------- Time series ---------------- */

  const monthlyTrend = useMemo(() => {
    const grouped: Record<
      string,
      { month: string; invoiced: number; paid: number; unpaid: number }
    > = {};
    for (const inv of invoices) {
      const month = inv.invoice_date.substring(0, 7);
      if (!grouped[month])
        grouped[month] = { month, invoiced: 0, paid: 0, unpaid: 0 };
      grouped[month].invoiced += num(inv.total_amount);
      grouped[month].paid += num(inv.amount_paid);
      grouped[month].unpaid += num(inv.balance_due);
    }
    return Object.values(grouped).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }, [invoices]);

  /* ---------------- Top overdue customers ---------------- */

  const topOverdue = useMemo(() => {
    const grouped: Record<
      string,
      { name: string; balance: number; count: number }
    > = {};
    for (const inv of allInvoices) {
      if (num(inv.balance_due) <= 0 || daysOverdue(inv) <= 0) continue;
      const key = inv.customer_name || "(Unknown)";
      if (!grouped[key]) grouped[key] = { name: key, balance: 0, count: 0 };
      grouped[key].balance += num(inv.balance_due);
      grouped[key].count += 1;
    }
    return Object.values(grouped)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);
  }, [allInvoices]);

  /* ================================================================ */
  /*  INTELLIGENCE                                                    */
  /* ================================================================ */

  const intelligence = useMemo(() => {
    const flags: Array<{
      type: "info" | "warning" | "success" | "critical";
      title: string;
      detail: string;
    }> = [];

    if (allInvoices.length === 0) return flags;

    /* 1. Overall collection rate */
    if (current.invoiced > 0) {
      flags.push({
        type:
          collectionRate > 80
            ? "success"
            : collectionRate > 50
              ? "info"
              : "warning",
        title: `Collection rate: ${collectionRate.toFixed(1)}%`,
        detail: `${fmtMoney(current.paid)} collected out of ${fmtMoney(
          current.invoiced,
        )} invoiced in this period.`,
      });
    }

    /* 2. Aging alert */
    const overdueBucket = agingAnalysis.buckets.filter((b) =>
      ["31–60 days", "61–90 days", "90+ days"].includes(b.name),
    );
    const seriouslyOverdue = overdueBucket.reduce((s, b) => s + b.amount, 0);
    if (seriouslyOverdue > 0) {
      flags.push({
        type:
          seriouslyOverdue > agingAnalysis.total * 0.3 ? "critical" : "warning",
        title: `${fmtMoney(seriouslyOverdue)} seriously overdue`,
        detail: `Invoices 31+ days past due. Consider escalating collection on these.`,
      });
    }

    /* 3. Average payment time */
    if (current.avgPaymentDays !== null) {
      flags.push({
        type:
          current.avgPaymentDays <= 15
            ? "success"
            : current.avgPaymentDays <= 30
              ? "info"
              : "warning",
        title: `Average payment time: ${current.avgPaymentDays.toFixed(0)} days`,
        detail:
          current.avgPaymentDays <= 30
            ? "Customers pay within your standard terms."
            : "Payments are taking longer than 30 days - consider stricter terms or follow-ups.",
      });
    }

    /* 4. Top overdue customer */
    if (topOverdue.length > 0 && topOverdue[0].balance > 0) {
      const top = topOverdue[0];
      flags.push({
        type: "warning",
        title: `Top overdue: ${top.name}`,
        detail: `${fmtMoney(top.balance)} across ${top.count} invoice${
          top.count === 1 ? "" : "s"
        }.`,
      });
    }

    /* 5. Growth in invoicing */
    if (previousInvoices.length > 0) {
      const change = pctChange(current.invoiced, previous.invoiced);
      if (Math.abs(change) > 15) {
        flags.push({
          type: change > 0 ? "info" : "warning",
          title: `Invoicing ${change > 0 ? "grew" : "declined"} ${fmtPct(change)} vs prev`,
          detail: `${fmtMoney(previous.invoiced)} → ${fmtMoney(current.invoiced)}.`,
        });
      }
    }

    return flags;
  }, [
    allInvoices,
    current,
    previousInvoices,
    collectionRate,
    agingAnalysis,
    topOverdue,
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
        invoicedPct: pctChange(current.invoiced, previous.invoiced),
        paidPct: pctChange(current.paid, previous.paid),
        unpaidPct: pctChange(current.unpaid, previous.unpaid),
        avgPct: pctChange(current.avg, previous.avg),
      },
      collectionRate,
      previousCollectionRate,
      agingAnalysis,
      agingTable: agingTable.slice(0, 20),
      statusBreakdown,
      monthlyTrend,
      topOverdue,
      intelligence,
    }),
    [
      current,
      previous,
      collectionRate,
      previousCollectionRate,
      agingAnalysis,
      agingTable,
      statusBreakdown,
      monthlyTrend,
      topOverdue,
      intelligence,
      filterPeriod,
      customFrom,
      customTo,
    ],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__invoiceAnalytics = aiSummary;
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
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
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
        <h1 className="text-3xl font-bold text-white">Invoice Analytics</h1>
        <p className="text-slate-400 mt-2">
          Track what you've invoiced, what's been collected, and what's still
          outstanding.
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
              title="Total Invoiced"
              value={fmtMoney(current.invoiced)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.invoiced, previous.invoiced)} vs prev
                </span>
              }
              icon={<Receipt className="w-4 h-4" />}
            />
            <StatCard
              title="Total Collected"
              value={fmtMoney(current.paid)}
              subtitle={`${collectionRate.toFixed(1)}% collection rate`}
              icon={<CheckCircle className="w-4 h-4" />}
            />
            <StatCard
              title="Total Outstanding"
              value={fmtMoney(current.unpaid)}
              subtitle={`${current.count - current.fullyPaidCount} open invoice${
                current.count - current.fullyPaidCount === 1 ? "" : "s"
              }`}
              icon={<Clock className="w-4 h-4" />}
            />
            <StatCard
              title="Avg Invoice Value"
              value={fmtMoney(current.avg)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.avg, previous.avg)} vs prev
                </span>
              }
              icon={<DollarSign className="w-4 h-4" />}
            />
          </div>

          {/* ============ SECONDARY METRICS ============ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Overdue Amount"
              value={fmtMoney(current.overdue)}
              subtitle={`${current.overdueCount} invoice${
                current.overdueCount === 1 ? "" : "s"
              } past due`}
            />
            <StatCard
              title="Avg Payment Time"
              value={
                current.avgPaymentDays !== null
                  ? `${current.avgPaymentDays.toFixed(0)} days`
                  : "-"
              }
              subtitle={
                current.avgPaymentDays !== null
                  ? "From invoice to payment"
                  : "No paid invoices with timestamps"
              }
            />
            <StatCard
              title="Fully Paid"
              value={`${current.fullyPaidCount}`}
              subtitle={`${current.partiallyPaidCount} partial · ${current.unpaidCount} unpaid`}
            />
            <StatCard
              title="Collection Rate"
              value={`${collectionRate.toFixed(1)}%`}
              subtitle={
                previousCollectionRate > 0
                  ? `Prev: ${previousCollectionRate.toFixed(1)}%`
                  : "All invoiced"
              }
            />
          </div>

          {/* ============ INTELLIGENCE ============ */}
          {intelligence.length > 0 && (
            <ChartCard
              title="Invoice intelligence"
              description="Automatic signals from your receivables"
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

          {/* ============ FULL BREAKDOWN ============ */}
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
                    [
                      "Total invoiced",
                      current.invoiced,
                      previous.invoiced,
                      "money",
                    ],
                    ["Total collected", current.paid, previous.paid, "money"],
                    [
                      "Total outstanding",
                      current.unpaid,
                      previous.unpaid,
                      "money",
                    ],
                    [
                      "Overdue balance",
                      current.overdue,
                      previous.overdue,
                      "money",
                    ],
                    ["Invoice count", current.count, previous.count, "count"],
                    ["Avg invoice value", current.avg, previous.avg, "money"],
                    [
                      "Fully paid invoices",
                      current.fullyPaidCount,
                      previous.fullyPaidCount,
                      "count",
                    ],
                    [
                      "Partially paid",
                      current.partiallyPaidCount,
                      previous.partiallyPaidCount,
                      "count",
                    ],
                    [
                      "Unpaid invoices",
                      current.unpaidCount,
                      previous.unpaidCount,
                      "count",
                    ],
                    [
                      "Overdue invoices",
                      current.overdueCount,
                      previous.overdueCount,
                      "count",
                    ],
                  ].map(([label, c, p, kind]) => {
                    const cn = c as number;
                    const pn = p as number;
                    return (
                      <tr
                        key={label as string}
                        className="border-b border-slate-800/50"
                      >
                        <td className="py-2.5 px-3">{label}</td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {kind === "money"
                            ? fmtMoney(cn)
                            : cn.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {kind === "money"
                            ? fmtMoney(pn)
                            : pn.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {renderDelta(
                            cn,
                            pn,
                            label === "Total outstanding" ||
                              label === "Overdue balance",
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-slate-700">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Avg payment time
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-white">
                      {current.avgPaymentDays !== null
                        ? `${current.avgPaymentDays.toFixed(0)} days`
                        : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {previous.avgPaymentDays !== null
                        ? `${previous.avgPaymentDays.toFixed(0)} days`
                        : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {current.avgPaymentDays !== null &&
                      previous.avgPaymentDays !== null
                        ? renderDelta(
                            current.avgPaymentDays,
                            previous.avgPaymentDays,
                            true,
                          )
                        : "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* ============ AGING ANALYSIS ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Invoice aging"
              description="Open balances by age (all invoices, as of today)"
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={agingAnalysis.buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
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
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {agingAnalysis.buckets.map((b, i) => (
                      <Cell key={i} fill={b.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                {agingAnalysis.buckets.map((b) => (
                  <div
                    key={b.name}
                    className="p-2 rounded-lg border"
                    style={{
                      backgroundColor: `${b.color}15`,
                      borderColor: `${b.color}40`,
                    }}
                  >
                    <p className="text-xs font-medium text-slate-300">
                      {b.name}
                    </p>
                    <p className="text-sm font-bold text-white">
                      {fmtMoney(b.amount)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {b.count} invoice{b.count === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard
              title="Status breakdown"
              description="Invoice totals by status"
            >
              {statusBreakdown.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No invoices in this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      dataKey="value"
                      label={(entry) =>
                        `${entry.name}: ${fmt(entry.value as number)}`
                      }
                    >
                      {statusBreakdown.map((s, i) => (
                        <Cell key={i} fill={s.fill} />
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
              )}
            </ChartCard>
          </div>

          {/* ============ MONTHLY TREND ============ */}
          <ChartCard
            title="Monthly invoicing and collection"
            description="Invoiced vs collected per month"
          >
            <ResponsiveContainer width="100%" height={320}>
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
                <Legend />
                <Bar
                  dataKey="invoiced"
                  fill="#3b82f6"
                  name="Invoiced"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="paid"
                  fill="#10b981"
                  name="Collected"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ============ TOP OVERDUE CUSTOMERS ============ */}
          {topOverdue.length > 0 && (
            <ChartCard
              title="Top overdue customers"
              description="Customers with the largest overdue balances"
            >
              <DataTable
                data={topOverdue}
                columns={[
                  { key: "name" as const, label: "Customer" },
                  {
                    key: "balance" as const,
                    label: "Overdue balance",
                    render: (v: number) => (
                      <span className="text-red-300 font-semibold">
                        {fmtMoney(v)}
                      </span>
                    ),
                  },
                  { key: "count" as const, label: "Invoice(s)" },
                ]}
              />
            </ChartCard>
          )}

          {/* ============ AGING DETAIL TABLE ============ */}
          {agingTable.length > 0 && (
            <ChartCard
              title="Outstanding invoices"
              description="Every open invoice, sorted by how long it's been overdue"
            >
              <DataTable
                data={agingTable}
                columns={[
                  { key: "invoice_number" as const, label: "Invoice #" },
                  { key: "customer_name" as const, label: "Customer" },
                  { key: "invoice_date" as const, label: "Issued" },
                  { key: "due_date" as const, label: "Due" },
                  {
                    key: "days_outstanding" as const,
                    label: "Days overdue",
                    render: (v: number) => (
                      <span
                        className={
                          v > 60
                            ? "text-red-400 font-semibold"
                            : v > 30
                              ? "text-amber-400 font-semibold"
                              : v > 0
                                ? "text-blue-300"
                                : "text-slate-400"
                        }
                      >
                        {v > 0 ? `${v} days` : "Not due"}
                      </span>
                    ),
                  },
                  {
                    key: "balance_due" as const,
                    label: "Balance",
                    render: (v: number) => fmtMoney(v),
                  },
                  { key: "bucket" as const, label: "Aging bucket" },
                ]}
              />
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}
