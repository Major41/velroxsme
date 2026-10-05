"use client";

import { useState, useEffect, useMemo } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DataTable } from "@/components/dashboard/DataTable";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import {
  TrendingUp, TrendingDown, Filter, Calendar, X, FileText,
  CheckCircle, XCircle, Clock, Send, RefreshCw, AlertTriangle,
  Info, Target, DollarSign, Percent,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";

/* ==================================================================== */
/*  TYPES                                                               */
/* ==================================================================== */

interface Quotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  quotation_date: string;
  expiry_date: string | null;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
  effective_status?: string | null;
  total_amount: number | string;
  subtotal: number | string;
  tax_amount: number | string;
  discount_amount: number | string;
  converted_at: string | null;
  converted_invoice_id: string | null;
  created_at: string;
  days_to_expiry?: number | null;
}

type DateRangeKey =
  | "today" | "yesterday" | "this_week" | "last_week"
  | "this_month" | "last_month" | "this_quarter" | "last_quarter"
  | "this_year" | "last_year" | "custom" | "all";

interface DateRange { key: DateRangeKey; label: string }

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

const num = (v: number | string | null | undefined) =>
  typeof v === "number" ? v : parseFloat(String(v ?? 0)) || 0;

const fmt = (n: number) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtMoney = (n: number) => `KSh ${fmt(n)}`;
const fmtPct = (n: number, decimals = 1) =>
  `${n >= 0 ? "" : ""}${n.toFixed(decimals)}%`;

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
      return { from: toISODate(startOfMonth(today)), to: toISODate(endOfMonth(today)) };
    case "last_month": {
      const from = new Date(y, m - 1, 1);
      return { from: toISODate(from), to: toISODate(endOfMonth(from)) };
    }
    case "this_quarter":
      return { from: toISODate(startOfQuarter(today)), to: toISODate(endOfQuarter(today)) };
    case "last_quarter": {
      const from = new Date(y, m - 3, 1);
      const qs = startOfQuarter(from);
      return { from: toISODate(qs), to: toISODate(endOfQuarter(qs)) };
    }
    case "this_year":
      return { from: toISODate(new Date(y, 0, 1)), to: toISODate(new Date(y, 11, 31)) };
    case "last_year":
      return { from: toISODate(new Date(y - 1, 0, 1)), to: toISODate(new Date(y - 1, 11, 31)) };
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

export default function QuotationAnalyticsPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [previousQuotations, setPreviousQuotations] = useState<Quotation[]>([]);
  const [allQuotations, setAllQuotations] = useState<Quotation[]>([]);
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
        .from("quotations_with_status")
        .select("*")
        .eq("business_id", business.id)
        .order("quotation_date", { ascending: true });
      if (bounds) q = q.gte("quotation_date", bounds.from).lte("quotation_date", bounds.to);
      const { data: current, error: cErr } = await q;
      if (cErr) throw cErr;
      setQuotations(current || []);

      // All quotations - for pipeline snapshot (pending value doesn't care about period)
      const { data: all } = await supabase
        .from("quotations_with_status")
        .select("*")
        .eq("business_id", business.id);
      setAllQuotations(all || []);

      // Previous period
      if (bounds) {
        const prev = getPreviousRange(filterPeriod, bounds.from, bounds.to);
        if (prev) {
          const { data: prevData, error: pErr } = await supabase
            .from("quotations_with_status")
            .select("*")
            .eq("business_id", business.id)
            .gte("quotation_date", prev.from)
            .lte("quotation_date", prev.to);
          if (pErr) throw pErr;
          setPreviousQuotations(prevData || []);
        } else {
          setPreviousQuotations([]);
        }
      } else {
        setPreviousQuotations([]);
      }
    } catch (err: any) {
      console.error("Quotation analytics fetch error:", err);
      setError("Failed to load quotation analytics");
    } finally {
      setLoading(false);
    }
  };

  /* ================================================================ */
  /*  STATUS HELPERS                                                  */
  /* ================================================================ */

  const effectiveStatus = (q: Quotation): string => {
    if (q.effective_status) return q.effective_status;
    if (
      ["draft", "sent", "accepted"].includes(q.status) &&
      q.expiry_date &&
      new Date(q.expiry_date) < new Date(new Date().toDateString())
    ) {
      return "expired";
    }
    return q.status;
  };

  /* ================================================================ */
  /*  CALCULATIONS                                                    */
  /* ================================================================ */

  const calc = (rows: Quotation[]) => {
    const total = rows.length;
    const totalValue = rows.reduce((s, r) => s + num(r.total_amount), 0);
    const avgValue = total > 0 ? totalValue / total : 0;

    // Counts by effective status
    let draft = 0, sent = 0, accepted = 0, rejected = 0, expired = 0, converted = 0;
    let acceptedValue = 0, rejectedValue = 0, expiredValue = 0, convertedValue = 0, pendingValue = 0;

    for (const q of rows) {
      const status = effectiveStatus(q);
      const value = num(q.total_amount);
      switch (status) {
        case "draft": draft++; pendingValue += value; break;
        case "sent": sent++; pendingValue += value; break;
        case "accepted": accepted++; acceptedValue += value; break;
        case "rejected": rejected++; rejectedValue += value; break;
        case "expired": expired++; expiredValue += value; break;
        case "converted": converted++; convertedValue += value; break;
      }
    }

    // Conversion rate: converted / (converted + accepted + rejected + expired)
    // Drafts and sent are still open and shouldn't count against you.
    const decided = accepted + rejected + expired + converted;
    const conversionRate = decided > 0 ? (converted + accepted) / decided * 100 : 0;

    // Strict conversion rate: only converted (converted to invoice)
    const strictConversionRate = decided > 0 ? converted / decided * 100 : 0;

    // Loss rate: rejected + expired (never got a yes, never will)
    const lossRate = decided > 0 ? (rejected + expired) / decided * 100 : 0;

    // Average time to convert (days from quotation_date to converted_at)
    const convertedWithTimestamps = rows.filter(
      (r) => r.converted_at && r.quotation_date,
    );
    const avgConversionDays =
      convertedWithTimestamps.length > 0
        ? convertedWithTimestamps.reduce((s, r) => {
            const start = new Date(r.quotation_date).getTime();
            const end = new Date(r.converted_at as string).getTime();
            return s + Math.max(0, Math.round((end - start) / 86400000));
          }, 0) / convertedWithTimestamps.length
        : null;

    return {
      total,
      totalValue,
      avgValue,
      draft, sent, accepted, rejected, expired, converted,
      acceptedValue, rejectedValue, expiredValue, convertedValue, pendingValue,
      decided,
      conversionRate,
      strictConversionRate,
      lossRate,
      avgConversionDays,
    };
  };

  const current = useMemo(() => calc(quotations), [quotations]);
  const previous = useMemo(() => calc(previousQuotations), [previousQuotations]);

  const pctChange = (c: number, p: number) => {
    if (p === 0) return c > 0 ? 100 : 0;
    return ((c - p) / Math.abs(p)) * 100;
  };

  /* ---------------- Status breakdown ---------------- */

  const statusBreakdown = useMemo(() => {
    const palette: Record<string, string> = {
      draft: "#64748b",
      sent: "#3b82f6",
      accepted: "#10b981",
      rejected: "#ef4444",
      expired: "#f59e0b",
      converted: "#8b5cf6",
    };
    const grouped: Record<string, { count: number; value: number }> = {};
    for (const q of quotations) {
      const st = effectiveStatus(q);
      if (!grouped[st]) grouped[st] = { count: 0, value: 0 };
      grouped[st].count += 1;
      grouped[st].value += num(q.total_amount);
    }
    return Object.entries(grouped).map(([name, v]) => ({
      name,
      count: v.count,
      value: v.value,
      fill: palette[name] || "#64748b",
    }));
  }, [quotations]);

  /* ---------------- Monthly trend ---------------- */

  const monthlyTrend = useMemo(() => {
    const grouped: Record<
      string,
      {
        month: string;
        total: number;
        count: number;
        accepted: number;
        converted: number;
        rejected: number;
      }
    > = {};

    for (const q of quotations) {
      const month = q.quotation_date.substring(0, 7);
      if (!grouped[month])
        grouped[month] = {
          month,
          total: 0,
          count: 0,
          accepted: 0,
          converted: 0,
          rejected: 0,
        };
      grouped[month].total += num(q.total_amount);
      grouped[month].count += 1;

      const st = effectiveStatus(q);
      if (st === "accepted") grouped[month].accepted += 1;
      if (st === "converted") grouped[month].converted += 1;
      if (st === "rejected" || st === "expired") grouped[month].rejected += 1;
    }

    return Object.values(grouped)
      .map((r) => ({
        ...r,
        decided: r.accepted + r.converted + r.rejected,
        conversionRate:
          r.accepted + r.converted + r.rejected > 0
            ? ((r.accepted + r.converted) / (r.accepted + r.converted + r.rejected)) * 100
            : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [quotations]);

  /* ---------------- Top won/lost customers ---------------- */

  const topWon = useMemo(() => {
    const grouped: Record<string, { name: string; value: number; count: number }> = {};
    for (const q of quotations) {
      const st = effectiveStatus(q);
      if (st !== "converted" && st !== "accepted") continue;
      const key = q.customer_name || "(Unknown)";
      if (!grouped[key]) grouped[key] = { name: key, value: 0, count: 0 };
      grouped[key].value += num(q.total_amount);
      grouped[key].count += 1;
    }
    return Object.values(grouped)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [quotations]);

  const topLost = useMemo(() => {
    const grouped: Record<string, { name: string; value: number; count: number }> = {};
    for (const q of quotations) {
      const st = effectiveStatus(q);
      if (st !== "rejected" && st !== "expired") continue;
      const key = q.customer_name || "(Unknown)";
      if (!grouped[key]) grouped[key] = { name: key, value: 0, count: 0 };
      grouped[key].value += num(q.total_amount);
      grouped[key].count += 1;
    }
    return Object.values(grouped)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [quotations]);

  /* ---------------- Pending pipeline (all time, not period-bound) ---------------- */

  const pendingPipeline = useMemo(() => {
    const pending = allQuotations.filter((q) => {
      const st = effectiveStatus(q);
      return st === "draft" || st === "sent";
    });

    // Expiring soon - sent quotes with expiry within 7 days
    const today = new Date(new Date().toDateString()).getTime();
    const expiringSoon = pending
      .filter((q) => q.expiry_date)
      .map((q) => ({
        ...q,
        daysLeft: Math.round(
          (new Date(q.expiry_date as string).getTime() - today) / 86400000,
        ),
      }))
      .filter((q) => q.daysLeft >= 0 && q.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return {
      count: pending.length,
      value: pending.reduce((s, q) => s + num(q.total_amount), 0),
      expiringSoon,
    };
  }, [allQuotations]);

  /* ================================================================ */
  /*  INTELLIGENCE                                                    */
  /* ================================================================ */

  const intelligence = useMemo(() => {
    const flags: Array<{
      type: "info" | "warning" | "success" | "critical";
      title: string;
      detail: string;
    }> = [];

    if (quotations.length === 0 && allQuotations.length === 0) return flags;

    /* 1. Conversion rate comparison */
    if (current.decided >= 3 && previous.decided >= 3) {
      const change = current.conversionRate - previous.conversionRate;
      const direction = change > 0 ? "up" : "down";
      flags.push({
        type:
          Math.abs(change) < 3
            ? "info"
            : change > 0
              ? "success"
              : "warning",
        title: `Conversion rate ${direction} from ${previous.conversionRate.toFixed(0)}% to ${current.conversionRate.toFixed(0)}%`,
        detail: `Across ${current.decided} decided quotation${
          current.decided === 1 ? "" : "s"
        } this period vs ${previous.decided} last period.`,
      });
    } else if (current.decided > 0) {
      flags.push({
        type: "info",
        title: `Current conversion rate: ${current.conversionRate.toFixed(0)}%`,
        detail: `${current.accepted + current.converted} of ${current.decided} decided quotations moved forward.`,
      });
    }

    /* 2. Lost value alert */
    if (current.rejectedValue + current.expiredValue > 0) {
      const lostTotal = current.rejectedValue + current.expiredValue;
      flags.push({
        type: lostTotal > current.totalValue * 0.4 ? "warning" : "info",
        title: `${fmtMoney(lostTotal)} in lost quotations`,
        detail: `${current.rejected} rejected (${fmtMoney(
          current.rejectedValue,
        )}) and ${current.expired} expired (${fmtMoney(current.expiredValue)}) in this period.`,
      });
    }

    /* 3. Pending pipeline */
    if (pendingPipeline.count > 0) {
      flags.push({
        type: "info",
        title: `${fmtMoney(pendingPipeline.value)} in open pipeline`,
        detail: `${pendingPipeline.count} quotation${
          pendingPipeline.count === 1 ? "" : "s"
        } still awaiting a decision across all time.`,
      });
    }

    /* 4. Quotes expiring soon */
    if (pendingPipeline.expiringSoon.length > 0) {
      const next = pendingPipeline.expiringSoon[0];
      flags.push({
        type: "warning",
        title: `${pendingPipeline.expiringSoon.length} quotation${
          pendingPipeline.expiringSoon.length === 1 ? "" : "s"
        } expiring within 7 days`,
        detail: `Nearest: ${next.quotation_number} for ${
          next.customer_name
        } expires in ${next.daysLeft} day${next.daysLeft === 1 ? "" : "s"} (${fmtMoney(
          num(next.total_amount),
        )}).`,
      });
    }

    /* 5. Average conversion time */
    if (current.avgConversionDays !== null) {
      flags.push({
        type:
          current.avgConversionDays <= 7
            ? "success"
            : current.avgConversionDays <= 21
              ? "info"
              : "warning",
        title: `Average time to close: ${current.avgConversionDays.toFixed(0)} days`,
        detail:
          current.avgConversionDays <= 14
            ? "Your quotes move quickly to invoices."
            : "Consider following up sooner - quotes that sit too long often go cold.",
      });
    }

    /* 6. Volume growth */
    if (previousQuotations.length > 0) {
      const change = pctChange(current.total, previous.total);
      if (Math.abs(change) > 20) {
        flags.push({
          type: change > 0 ? "info" : "warning",
          title: `Quotation volume ${change > 0 ? "grew" : "declined"} ${fmtPct(
            Math.abs(change),
          )} vs previous period`,
          detail: `${previous.total} → ${current.total} quotes issued.`,
        });
      }
    }

    return flags;
  }, [
    quotations, allQuotations, current, previous, previousQuotations,
    pendingPipeline,
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
        totalValuePct: pctChange(current.totalValue, previous.totalValue),
        conversionRateAbs: current.conversionRate - previous.conversionRate,
        conversionRatePct: pctChange(current.conversionRate, previous.conversionRate),
      },
      statusBreakdown,
      monthlyTrend,
      topWon,
      topLost,
      pendingPipeline: {
        count: pendingPipeline.count,
        value: pendingPipeline.value,
        expiringSoonCount: pendingPipeline.expiringSoon.length,
      },
      intelligence,
    }),
    [
      current, previous, statusBreakdown, monthlyTrend, topWon,
      topLost, pendingPipeline, intelligence, filterPeriod,
      customFrom, customTo,
    ],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__quotationAnalytics = aiSummary;
    }
  }, [aiSummary]);

  /* ================================================================ */
  /*  RENDER HELPERS                                                  */
  /* ================================================================ */

  const renderDelta = (c: number, p: number, invert = false) => {
    const pct = pctChange(c, p);
    const isUp = pct > 0;
    const isFlat = Math.abs(pct) < 0.01;
    if (isFlat) return <span className="text-xs text-slate-400">No change</span>;
    const positive = invert ? !isUp : isUp;
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${
          positive ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {fmtPct(Math.abs(pct))}
      </span>
    );
  };

  const renderRateDelta = (c: number, p: number) => {
    const diff = c - p;
    if (Math.abs(diff) < 0.1) {
      return <span className="text-xs text-slate-400">No change</span>;
    }
    const isUp = diff > 0;
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${
          isUp ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {diff > 0 ? "+" : ""}{diff.toFixed(1)} pp
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
        <h1 className="text-3xl font-bold text-white">Quotation Analytics</h1>
        <p className="text-slate-400 mt-2">
          Track your sales pipeline - how quotes convert, where value leaks, and what's expiring next.
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
              title="Total Quotations"
              value={fmt(current.total)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.total, previous.total)} vs prev
                </span>
              }
              icon={<FileText className="w-4 h-4" />}
            />
            <StatCard
              title="Total Value"
              value={fmtMoney(current.totalValue)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.totalValue, previous.totalValue)} vs prev
                </span>
              }
              icon={<DollarSign className="w-4 h-4" />}
            />
            <StatCard
              title="Conversion Rate"
              value={`${current.conversionRate.toFixed(1)}%`}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderRateDelta(current.conversionRate, previous.conversionRate)} vs prev
                </span>
              }
              icon={<Percent className="w-4 h-4" />}
            />
            <StatCard
              title="Avg Quotation Value"
              value={fmtMoney(current.avgValue)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(current.avgValue, previous.avgValue)} vs prev
                </span>
              }
              icon={<Target className="w-4 h-4" />}
            />
          </div>

          {/* ============ STATUS BREAKDOWN METRICS ============ */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Draft", count: current.draft, value: current.pendingValue, color: "text-slate-300" },
              { label: "Sent", count: current.sent, value: 0, color: "text-blue-300" },
              { label: "Accepted", count: current.accepted, value: current.acceptedValue, color: "text-emerald-300" },
              { label: "Converted", count: current.converted, value: current.convertedValue, color: "text-purple-300" },
              { label: "Rejected", count: current.rejected, value: current.rejectedValue, color: "text-red-300" },
              { label: "Expired", count: current.expired, value: current.expiredValue, color: "text-amber-300" },
            ].map((s) => (
              <div
                key={s.label}
                className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50"
              >
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                  {s.label}
                </p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                {s.value > 0 && (
                  <p className="text-xs text-slate-500 mt-1">{fmtMoney(s.value)}</p>
                )}
              </div>
            ))}
          </div>

          {/* ============ INTELLIGENCE ============ */}
          {intelligence.length > 0 && (
            <ChartCard
              title="Pipeline intelligence"
              description="Automatic signals from your quotations"
            >
              <div className="space-y-3">
                {intelligence.map((flag, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${flagBg(
                      flag.type,
                    )}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">{flagIcon(flag.type)}</div>
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
          <ChartCard title="Full breakdown" description="Every metric at a glance">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 px-3 font-medium">Metric</th>
                    <th className="text-right py-2 px-3 font-medium">Current</th>
                    <th className="text-right py-2 px-3 font-medium">Previous</th>
                    <th className="text-right py-2 px-3 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {[
                    ["Total quotations", current.total, previous.total, "count"],
                    ["Total value", current.totalValue, previous.totalValue, "money"],
                    ["Avg quotation value", current.avgValue, previous.avgValue, "money"],
                    ["Accepted", current.accepted, previous.accepted, "count"],
                    ["Converted to invoice", current.converted, previous.converted, "count"],
                    ["Rejected", current.rejected, previous.rejected, "count"],
                    ["Expired", current.expired, previous.expired, "count"],
                    ["Open (draft + sent)", current.draft + current.sent, previous.draft + previous.sent, "count"],
                    ["Accepted value", current.acceptedValue, previous.acceptedValue, "money"],
                    ["Converted value", current.convertedValue, previous.convertedValue, "money"],
                    ["Lost value (rejected + expired)", current.rejectedValue + current.expiredValue, previous.rejectedValue + previous.expiredValue, "money"],
                  ].map(([label, c, p, kind]) => {
                    const cn = c as number;
                    const pn = p as number;
                    return (
                      <tr key={label as string} className="border-b border-slate-800/50">
                        <td className="py-2.5 px-3">{label}</td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {kind === "money" ? fmtMoney(cn) : cn.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {kind === "money" ? fmtMoney(pn) : pn.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {renderDelta(cn, pn, label === "Lost value (rejected + expired)" || label === "Rejected" || label === "Expired")}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-slate-700">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Conversion rate
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-white">
                      {current.conversionRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {previous.conversionRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {renderRateDelta(current.conversionRate, previous.conversionRate)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Loss rate
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-white">
                      {current.lossRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {previous.lossRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {renderRateDelta(previous.lossRate, current.lossRate)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Avg time to close
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-white">
                      {current.avgConversionDays !== null
                        ? `${current.avgConversionDays.toFixed(0)} days`
                        : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {previous.avgConversionDays !== null
                        ? `${previous.avgConversionDays.toFixed(0)} days`
                        : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {current.avgConversionDays !== null &&
                      previous.avgConversionDays !== null
                        ? renderDelta(
                            current.avgConversionDays,
                            previous.avgConversionDays,
                            true,
                          )
                        : "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* ============ TREND CHARTS ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Monthly quotation flow"
              description="Volume and conversion over time"
            >
              <ResponsiveContainer width="100%" height={300}>
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
                    dataKey="total"
                    fill="#3b82f6"
                    name="Total quoted"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="accepted"
                    fill="#10b981"
                    name="Accepted value"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Conversion rate trend"
              description="How your close rate moves over time"
            >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                    }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, "Conversion rate"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="conversionRate"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#convGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ============ STATUS PIE ============ */}
          {statusBreakdown.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title="Status distribution"
                description="Where quotations currently sit"
              >
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      dataKey="count"
                      label={(entry) =>
                        `${entry.name}: ${entry.count}`
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
                      formatter={(v: number, name: string, props: any) => [
                        `${v} quotes · ${fmtMoney(props.payload.value)}`,
                        props.payload.name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Pending pipeline"
                description="Open quotes and value at stake"
              >
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-5 bg-slate-700/30 rounded-lg border border-slate-600/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <p className="text-sm text-slate-300">Open quotations</p>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {pendingPipeline.count}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Worth {fmtMoney(pendingPipeline.value)}
                    </p>
                  </div>

                  <div className="p-5 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <p className="text-sm text-slate-300">Expiring within 7 days</p>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {pendingPipeline.expiringSoon.length}
                    </p>
                    {pendingPipeline.expiringSoon.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        Closest: {pendingPipeline.expiringSoon[0].daysLeft} days
                        left
                      </p>
                    )}
                  </div>
                </div>
              </ChartCard>
            </div>
          )}

          {/* ============ WON / LOST CUSTOMERS ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Top accepted quotations"
              description="Highest-value wins"
            >
              {topWon.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No accepted quotations in this period yet.
                </div>
              ) : (
                <DataTable
                  data={topWon}
                  columns={[
                    { key: "name" as const, label: "Customer" },
                    {
                      key: "value" as const,
                      label: "Value",
                      render: (v: number) => (
                        <span className="text-emerald-300 font-semibold">
                          {fmtMoney(v)}
                        </span>
                      ),
                    },
                    { key: "count" as const, label: "Quotes" },
                  ]}
                />
              )}
            </ChartCard>

            <ChartCard
              title="Top lost quotations"
              description="Highest-value rejections & expiries"
            >
              {topLost.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No rejected or expired quotations in this period.
                </div>
              ) : (
                <DataTable
                  data={topLost}
                  columns={[
                    { key: "name" as const, label: "Customer" },
                    {
                      key: "value" as const,
                      label: "Lost value",
                      render: (v: number) => (
                        <span className="text-red-300 font-semibold">
                          {fmtMoney(v)}
                        </span>
                      ),
                    },
                    { key: "count" as const, label: "Quotes" },
                  ]}
                />
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}