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
  LineChart,
  Line,
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
  X,
  Users,
  UserPlus,
  UserMinus,
  Star,
  AlertTriangle,
  Info,
  CheckCircle,
  Crown,
  DollarSign,
  Calendar,
  Activity,
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

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  total_spent: number | string;
  visit_count: number;
  last_purchase_date: string;
  first_purchase_date: string;
  status: "active" | "inactive";
  created_at: string;
}

interface CustomerAggregates {
  // Sales
  salesCount: number;
  salesTotal: number;
  firstSaleDate: string | null;
  lastSaleDate: string | null;

  // Invoices
  invoiceCount: number;
  invoiceTotal: number;
  invoicePaid: number;
  invoiceOutstanding: number;
  invoiceOverdue: number;

  // Quotations
  quoteCount: number;
  quoteTotal: number;
  acceptedQuotes: number;
  rejectedQuotes: number;
  convertedQuotes: number;
  acceptedQuoteValue: number;
}

type SegmentKey =
  | "all"
  | "new"
  | "active"
  | "inactive"
  | "vip"
  | "high_value"
  | "low_value"
  | "returning"
  | "one_time"
  | "overdue"
  | "at_risk";

const SEGMENT_LABELS: Record<SegmentKey, string> = {
  all: "All Customers",
  new: "New (last 30 days)",
  active: "Active",
  inactive: "Inactive",
  vip: "VIP (top 10%)",
  high_value: "High Value",
  low_value: "Low Value",
  returning: "Returning (2+ purchases)",
  one_time: "One-Time Buyers",
  overdue: "With Overdue Balance",
  at_risk: "At Risk",
};

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

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

const daysSince = (dateStr: string | null) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d.getTime()) / 86400000);
};

/* ==================================================================== */
/*  PAGE                                                                */
/* ==================================================================== */

export default function CustomerAnalyticsPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [aggregates, setAggregates] = useState<
    Record<string, CustomerAggregates>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [segment, setSegment] = useState<SegmentKey>("all");
  const [search, setSearch] = useState("");

  /* ---------------- Fetch everything ---------------- */

  useEffect(() => {
    if (!business?.id) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  const fetchAll = async () => {
    if (!business?.id) return;
    setLoading(true);
    setError("");

    try {
      // 1. Customers
      const { data: customersData, error: cErr } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", business.id);
      if (cErr) throw cErr;
      const custs = customersData || [];
      setCustomers(custs);

      // 2. Sales - one big query, group in JS
      const { data: salesData } = await supabase
        .from("sales")
        .select(
          "customer_name, customer_phone, amount, date, status, payment_status",
        )
        .eq("business_id", business.id);

      // 3. Invoices - one big query
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select(
          "customer_id, customer_name, customer_phone, total_amount, amount_paid, balance_due, invoice_date, due_date, status",
        )
        .eq("business_id", business.id);

      // 4. Quotations - one big query
      const { data: quotesData } = await supabase
        .from("quotations")
        .select(
          "customer_id, customer_name, customer_phone, total_amount, quotation_date, status",
        )
        .eq("business_id", business.id);

      /* ---------------- Aggregate per customer ---------------- */

      const agg: Record<string, CustomerAggregates> = {};

      const ensureAgg = (customerId: string): CustomerAggregates => {
        if (!agg[customerId]) {
          agg[customerId] = {
            salesCount: 0,
            salesTotal: 0,
            firstSaleDate: null,
            lastSaleDate: null,
            invoiceCount: 0,
            invoiceTotal: 0,
            invoicePaid: 0,
            invoiceOutstanding: 0,
            invoiceOverdue: 0,
            quoteCount: 0,
            quoteTotal: 0,
            acceptedQuotes: 0,
            rejectedQuotes: 0,
            convertedQuotes: 0,
            acceptedQuoteValue: 0,
          };
        }
        return agg[customerId];
      };

      // Build quick lookup: customer_id via phone OR name
      const byPhone = new Map<string, Customer>();
      const byName = new Map<string, Customer>();
      for (const c of custs) {
        if (c.phone) byPhone.set(c.phone.trim(), c);
        if (c.name) byName.set(c.name.trim().toLowerCase(), c);
      }

      const matchCustomer = (
        customerId: string | null,
        phone: string | null,
        name: string | null,
      ): Customer | null => {
        if (customerId) {
          const found = custs.find((c) => c.id === customerId);
          if (found) return found;
        }
        if (phone) {
          const found = byPhone.get(phone.trim());
          if (found) return found;
        }
        if (name) {
          const found = byName.get(name.trim().toLowerCase());
          if (found) return found;
        }
        return null;
      };

      // Sales
      for (const s of salesData || []) {
        const c = matchCustomer(
          null,
          (s as any).customer_phone,
          (s as any).customer_name,
        );
        if (!c) continue;
        const a = ensureAgg(c.id);
        a.salesCount += 1;
        a.salesTotal += num((s as any).amount);
        if (!a.firstSaleDate || (s as any).date < a.firstSaleDate) {
          a.firstSaleDate = (s as any).date;
        }
        if (!a.lastSaleDate || (s as any).date > a.lastSaleDate) {
          a.lastSaleDate = (s as any).date;
        }
      }

      // Invoices
      for (const inv of invoicesData || []) {
        const c = matchCustomer(
          (inv as any).customer_id,
          (inv as any).customer_phone,
          (inv as any).customer_name,
        );
        if (!c) continue;
        const a = ensureAgg(c.id);
        a.invoiceCount += 1;
        a.invoiceTotal += num((inv as any).total_amount);
        a.invoicePaid += num((inv as any).amount_paid);
        a.invoiceOutstanding += num((inv as any).balance_due);

        // Overdue
        const dueDate = (inv as any).due_date;
        const bal = num((inv as any).balance_due);
        if (
          dueDate &&
          bal > 0 &&
          new Date(dueDate) < new Date(new Date().toDateString())
        ) {
          a.invoiceOverdue += bal;
        }
      }

      // Quotations
      for (const q of quotesData || []) {
        const c = matchCustomer(
          (q as any).customer_id,
          (q as any).customer_phone,
          (q as any).customer_name,
        );
        if (!c) continue;
        const a = ensureAgg(c.id);
        a.quoteCount += 1;
        a.quoteTotal += num((q as any).total_amount);

        const st = (q as any).status;
        if (st === "accepted") {
          a.acceptedQuotes += 1;
          a.acceptedQuoteValue += num((q as any).total_amount);
        }
        if (st === "rejected" || st === "expired") {
          a.rejectedQuotes += 1;
        }
        if (st === "converted") {
          a.convertedQuotes += 1;
          a.acceptedQuoteValue += num((q as any).total_amount);
        }
      }

      setAggregates(agg);
    } catch (err: any) {
      console.error("Customer analytics fetch error:", err);
      setError("Failed to load customer analytics");
    } finally {
      setLoading(false);
    }
  };

  /* ================================================================ */
  /*  ENRICHED CUSTOMERS                                              */
  /* ================================================================ */

  interface EnrichedCustomer extends Customer {
    aggregates: CustomerAggregates;
    ltv: number;
    avgOrderValue: number;
    purchaseFrequency: number | null;
    daysSinceLastPurchase: number | null;
    customerLifespanDays: number | null;
    tier: "Platinum" | "Gold" | "Silver" | "Frequent" | "Standard";
    segment: Exclude<
      SegmentKey,
      | "all"
      | "vip"
      | "high_value"
      | "low_value"
      | "returning"
      | "one_time"
      | "overdue"
      | "at_risk"
    >;
  }

  const enriched: EnrichedCustomer[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Compute vip threshold: top 10% by LTV
    const ltvs = customers
      .map((c) => {
        const a = aggregates[c.id];
        return a ? a.salesTotal + a.invoicePaid : num(c.total_spent);
      })
      .filter((v) => v > 0)
      .sort((a, b) => b - a);

    const vipIndex = Math.floor(ltvs.length * 0.1);
    const vipThreshold = ltvs[vipIndex] || Infinity;

    return customers.map((c) => {
      const a = aggregates[c.id] || {
        salesCount: 0,
        salesTotal: 0,
        firstSaleDate: null,
        lastSaleDate: null,
        invoiceCount: 0,
        invoiceTotal: 0,
        invoicePaid: 0,
        invoiceOutstanding: 0,
        invoiceOverdue: 0,
        quoteCount: 0,
        quoteTotal: 0,
        acceptedQuotes: 0,
        rejectedQuotes: 0,
        convertedQuotes: 0,
        acceptedQuoteValue: 0,
      };

      // LTV - use sales + paid invoices, avoid double-counting
      const ltv = a.salesTotal + a.invoicePaid;

      const totalTxns = a.salesCount + a.invoiceCount;
      const avgOrderValue = totalTxns > 0 ? ltv / totalTxns : 0;

      const firstDate = a.firstSaleDate || c.first_purchase_date;
      const lastDate = a.lastSaleDate || c.last_purchase_date;

      // Purchase frequency: average days between transactions
      let purchaseFrequency: number | null = null;
      let customerLifespanDays: number | null = null;

      if (firstDate && lastDate && totalTxns > 1) {
        const span = daysBetween(firstDate, lastDate);
        customerLifespanDays = span;
        purchaseFrequency = span / (totalTxns - 1);
      } else if (firstDate && lastDate) {
        customerLifespanDays = daysBetween(firstDate, lastDate);
      }

      const dSince = daysSince(lastDate);

      // Tier based on LTV
      let tier: EnrichedCustomer["tier"] = "Standard";
      if (ltv >= 100000) tier = "Platinum";
      else if (ltv >= 50000) tier = "Gold";
      else if (ltv >= 25000) tier = "Silver";
      else if (totalTxns >= 5) tier = "Frequent";

      // Segment
      let seg: EnrichedCustomer["segment"];
      const firstDaysAgo = daysSince(firstDate);
      if (firstDaysAgo !== null && firstDaysAgo <= 30) {
        seg = "new";
      } else if (dSince !== null && dSince <= 30) {
        seg = "active";
      } else {
        seg = "inactive";
      }

      return {
        ...c,
        aggregates: a,
        ltv,
        avgOrderValue,
        purchaseFrequency,
        daysSinceLastPurchase: dSince,
        customerLifespanDays,
        tier,
        segment: seg,
      };
    });
  }, [customers, aggregates]);

  /* ---------------- VIP threshold for "vip" segment ---------------- */

  const vipThreshold = useMemo(() => {
    const ltvs = enriched
      .map((c) => c.ltv)
      .filter((v) => v > 0)
      .sort((a, b) => b - a);
    const idx = Math.floor(ltvs.length * 0.1);
    return ltvs[idx] || Infinity;
  }, [enriched]);

  /* ---------------- Segment filtering ---------------- */

  const inSegment = (c: EnrichedCustomer, seg: SegmentKey): boolean => {
    switch (seg) {
      case "all":
        return true;
      case "new":
        return c.segment === "new";
      case "active":
        return c.segment === "active";
      case "inactive":
        return c.segment === "inactive";
      case "vip":
        return c.ltv >= vipThreshold && c.ltv > 0;
      case "high_value":
        return c.ltv >= 50000;
      case "low_value":
        return c.ltv > 0 && c.ltv < 5000;
      case "returning":
        return c.aggregates.salesCount + c.aggregates.invoiceCount >= 2;
      case "one_time":
        return c.aggregates.salesCount + c.aggregates.invoiceCount === 1;
      case "overdue":
        return c.aggregates.invoiceOverdue > 0;
      case "at_risk":
        return (
          c.segment === "inactive" &&
          c.daysSinceLastPurchase !== null &&
          c.daysSinceLastPurchase >= 60 &&
          c.ltv >= 10000
        );
      default:
        return true;
    }
  };

  const segmentCounts = useMemo(() => {
    const counts: Partial<Record<SegmentKey, number>> = {};
    const keys: SegmentKey[] = [
      "all",
      "new",
      "active",
      "inactive",
      "vip",
      "high_value",
      "low_value",
      "returning",
      "one_time",
      "overdue",
      "at_risk",
    ];
    for (const k of keys) {
      counts[k] = enriched.filter((c) => inSegment(c, k)).length;
    }
    return counts;
  }, [enriched, vipThreshold]);

  const filtered = useMemo(() => {
    return enriched
      .filter((c) => inSegment(c, segment))
      .filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.ltv - a.ltv);
  }, [enriched, segment, search, vipThreshold]);

  /* ================================================================ */
  /*  METRICS                                                         */
  /* ================================================================ */

  const metrics = useMemo(() => {
    const total = enriched.length;
    if (total === 0) {
      return {
        total: 0,
        totalLTV: 0,
        avgLTV: 0,
        avgOrderValue: 0,
        newCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        vipCount: 0,
        overdueCount: 0,
        atRiskCount: 0,
        repeatCount: 0,
        oneTimeCount: 0,
        retentionRate: 0,
        repeatRate: 0,
        totalOutstanding: 0,
        totalOverdue: 0,
      };
    }

    const totalLTV = enriched.reduce((s, c) => s + c.ltv, 0);
    const avgLTV = totalLTV / total;

    const totalTxns = enriched.reduce(
      (s, c) => s + c.aggregates.salesCount + c.aggregates.invoiceCount,
      0,
    );
    const avgOrderValue = totalTxns > 0 ? totalLTV / totalTxns : 0;

    const newCount = enriched.filter((c) => c.segment === "new").length;
    const activeCount = enriched.filter((c) => c.segment === "active").length;
    const inactiveCount = enriched.filter(
      (c) => c.segment === "inactive",
    ).length;
    const vipCount = enriched.filter(
      (c) => c.ltv >= vipThreshold && c.ltv > 0,
    ).length;
    const overdueCount = enriched.filter(
      (c) => c.aggregates.invoiceOverdue > 0,
    ).length;
    const atRiskCount = enriched.filter(
      (c) =>
        c.segment === "inactive" &&
        c.daysSinceLastPurchase !== null &&
        c.daysSinceLastPurchase >= 60 &&
        c.ltv >= 10000,
    ).length;

    const repeatCount = enriched.filter(
      (c) => c.aggregates.salesCount + c.aggregates.invoiceCount >= 2,
    ).length;
    const oneTimeCount = enriched.filter(
      (c) => c.aggregates.salesCount + c.aggregates.invoiceCount === 1,
    ).length;

    const retentionRate =
      total > 0 ? ((activeCount + newCount) / total) * 100 : 0;
    const repeatRate = total > 0 ? (repeatCount / total) * 100 : 0;

    const totalOutstanding = enriched.reduce(
      (s, c) => s + c.aggregates.invoiceOutstanding,
      0,
    );
    const totalOverdue = enriched.reduce(
      (s, c) => s + c.aggregates.invoiceOverdue,
      0,
    );

    return {
      total,
      totalLTV,
      avgLTV,
      avgOrderValue,
      newCount,
      activeCount,
      inactiveCount,
      vipCount,
      overdueCount,
      atRiskCount,
      repeatCount,
      oneTimeCount,
      retentionRate,
      repeatRate,
      totalOutstanding,
      totalOverdue,
    };
  }, [enriched, vipThreshold]);

  /* ---------------- Tier distribution ---------------- */

  const tierDistribution = useMemo(() => {
    const counts = {
      Platinum: 0,
      Gold: 0,
      Silver: 0,
      Frequent: 0,
      Standard: 0,
    };
    for (const c of enriched) counts[c.tier] += 1;

    const palette: Record<string, string> = {
      Platinum: "#8b5cf6",
      Gold: "#f59e0b",
      Silver: "#94a3b8",
      Frequent: "#3b82f6",
      Standard: "#475569",
    };

    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value,
        fill: palette[name],
      }));
  }, [enriched]);

  /* ---------------- LTV distribution ---------------- */

  const ltvBuckets = useMemo(() => {
    const buckets = [
      { label: "KSh 0", min: 0, max: 0, count: 0 },
      { label: "1–5K", min: 1, max: 5000, count: 0 },
      { label: "5–25K", min: 5001, max: 25000, count: 0 },
      { label: "25–50K", min: 25001, max: 50000, count: 0 },
      { label: "50–100K", min: 50001, max: 100000, count: 0 },
      { label: "100K+", min: 100001, max: Infinity, count: 0 },
    ];
    for (const c of enriched) {
      const b = buckets.find((x) => c.ltv >= x.min && c.ltv <= x.max);
      if (b) b.count += 1;
    }
    return buckets;
  }, [enriched]);

  /* ---------------- Cohort chart: signups by month ---------------- */

  const acquisitionTrend = useMemo(() => {
    const grouped: Record<string, { month: string; count: number }> = {};
    for (const c of enriched) {
      const month = (c.first_purchase_date || c.created_at).substring(0, 7);
      if (!grouped[month]) grouped[month] = { month, count: 0 };
      grouped[month].count += 1;
    }
    return Object.values(grouped).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }, [enriched]);

  /* ================================================================ */
  /*  INTELLIGENCE                                                    */
  /* ================================================================ */

  const intelligence = useMemo(() => {
    const flags: Array<{
      type: "info" | "warning" | "success" | "critical";
      title: string;
      detail: string;
    }> = [];

    if (enriched.length === 0) return flags;

    /* 1. Top customer concentration */
    const sortedByLTV = [...enriched].sort((a, b) => b.ltv - a.ltv);
    const top10Count = Math.max(1, Math.ceil(enriched.length * 0.1));
    const top10LTV = sortedByLTV
      .slice(0, top10Count)
      .reduce((s, c) => s + c.ltv, 0);
    const concentration =
      metrics.totalLTV > 0 ? (top10LTV / metrics.totalLTV) * 100 : 0;
    if (concentration > 40) {
      flags.push({
        type: concentration > 60 ? "critical" : "warning",
        title: `Top 10% of customers drive ${concentration.toFixed(0)}% of revenue`,
        detail: `${top10Count} customers account for ${fmtMoney(top10LTV)}. Consider diversifying your customer base.`,
      });
    }

    /* 2. At-risk customers */
    if (metrics.atRiskCount > 0) {
      flags.push({
        type: "warning",
        title: `${metrics.atRiskCount} high-value customer${
          metrics.atRiskCount === 1 ? "" : "s"
        } at risk`,
        detail: `Previously spent ${fmtMoney(10000)}+ but no purchase in 60+ days. Consider re-engagement.`,
      });
    }

    /* 3. Overdue balances */
    if (metrics.totalOverdue > 0) {
      const percentOverdue =
        metrics.totalOutstanding > 0
          ? (metrics.totalOverdue / metrics.totalOutstanding) * 100
          : 0;
      flags.push({
        type: percentOverdue > 50 ? "critical" : "warning",
        title: `${fmtMoney(metrics.totalOverdue)} overdue across customers`,
        detail: `${percentOverdue.toFixed(0)}% of your total outstanding balance. Follow up with high-value debtors.`,
      });
    }

    /* 4. New customer momentum */
    if (metrics.newCount > 0 && metrics.total > 0) {
      const newPct = (metrics.newCount / metrics.total) * 100;
      flags.push({
        type: "success",
        title: `${metrics.newCount} new customer${
          metrics.newCount === 1 ? "" : "s"
        } in the last 30 days`,
        detail: `${newPct.toFixed(0)}% of your customer base. Acquisition is ${
          newPct > 15 ? "healthy" : "steady"
        }.`,
      });
    }

    /* 5. Inactive concern */
    if (metrics.inactiveCount > 0 && metrics.total > 0) {
      const inactivePct = (metrics.inactiveCount / metrics.total) * 100;
      if (inactivePct > 40) {
        flags.push({
          type: "warning",
          title: `${inactivePct.toFixed(0)}% of customers are inactive`,
          detail: `${metrics.inactiveCount} customers with no purchase in 30+ days. Consider a win-back campaign.`,
        });
      }
    }

    /* 6. Repeat purchase rate */
    if (metrics.repeatRate > 0) {
      flags.push({
        type: metrics.repeatRate >= 30 ? "success" : "info",
        title: `Repeat purchase rate: ${metrics.repeatRate.toFixed(0)}%`,
        detail: `${metrics.repeatCount} customers have bought 2+ times. ${
          metrics.repeatRate < 30
            ? "Nudge one-time buyers to return with a follow-up."
            : "Strong repeat base."
        }`,
      });
    }

    /* 7. Top customer */
    if (sortedByLTV[0] && sortedByLTV[0].ltv > 0) {
      const top = sortedByLTV[0];
      const share =
        metrics.totalLTV > 0 ? (top.ltv / metrics.totalLTV) * 100 : 0;
      flags.push({
        type: "info",
        title: `Top customer: ${top.name}`,
        detail: `${fmtMoney(top.ltv)} lifetime value (${share.toFixed(1)}% of total). ${
          top.aggregates.salesCount + top.aggregates.invoiceCount
        } purchases.`,
      });
    }

    return flags;
  }, [enriched, metrics]);

  /* ================================================================ */
  /*  AI-READY SUMMARY                                                */
  /* ================================================================ */

  const aiSummary = useMemo(() => {
    const top10 = [...enriched].sort((a, b) => b.ltv - a.ltv).slice(0, 10);

    return {
      metrics,
      segments: segmentCounts,
      tierDistribution,
      ltvBuckets,
      acquisitionTrend,
      top10Customers: top10.map((c) => ({
        name: c.name,
        ltv: c.ltv,
        tier: c.tier,
        segment: c.segment,
        transactions: c.aggregates.salesCount + c.aggregates.invoiceCount,
        avgOrderValue: c.avgOrderValue,
        daysSinceLastPurchase: c.daysSinceLastPurchase,
        outstanding: c.aggregates.invoiceOutstanding,
        overdue: c.aggregates.invoiceOverdue,
      })),
      intelligence,
    };
  }, [
    metrics,
    segmentCounts,
    tierDistribution,
    ltvBuckets,
    acquisitionTrend,
    enriched,
    intelligence,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__customerAnalytics = aiSummary;
    }
  }, [aiSummary]);

  /* ================================================================ */
  /*  RENDER HELPERS                                                  */
  /* ================================================================ */

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

  const tierColor = (tier: string) => {
    switch (tier) {
      case "Platinum":
        return "bg-purple-500/20 text-purple-300";
      case "Gold":
        return "bg-amber-500/20 text-amber-300";
      case "Silver":
        return "bg-slate-400/20 text-slate-300";
      case "Frequent":
        return "bg-blue-500/20 text-blue-300";
      default:
        return "bg-slate-600/20 text-slate-400";
    }
  };

  const segmentColor = (seg: string) => {
    switch (seg) {
      case "new":
        return "bg-emerald-500/20 text-emerald-300";
      case "active":
        return "bg-blue-500/20 text-blue-300";
      case "inactive":
        return "bg-slate-500/20 text-slate-300";
      default:
        return "bg-slate-600/20 text-slate-400";
    }
  };

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Customer Analytics</h1>
        <p className="text-slate-400 mt-2">
          Understand your customers - lifetime value, retention, and behavioral
          segments.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          {/* ============ PRIMARY METRICS ============ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Customers"
              value={fmt(metrics.total)}
              subtitle={`${metrics.newCount} new in last 30 days`}
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              title="Total Lifetime Value"
              value={fmtMoney(metrics.totalLTV)}
              subtitle={`Avg ${fmtMoney(metrics.avgLTV)} per customer`}
              icon={<DollarSign className="w-4 h-4" />}
            />
            <StatCard
              title="Avg Order Value"
              value={fmtMoney(metrics.avgOrderValue)}
              subtitle="Per transaction"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <StatCard
              title="Repeat Rate"
              value={`${metrics.repeatRate.toFixed(0)}%`}
              subtitle={`${metrics.repeatCount} returning customers`}
              icon={<Activity className="w-4 h-4" />}
            />
          </div>

          {/* ============ SECONDARY METRICS ============ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  New (30d)
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {metrics.newCount}
              </p>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-blue-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  Active (30d)
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {metrics.activeCount}
              </p>
            </div>

            <div className="p-4 bg-slate-500/10 border border-slate-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <UserMinus className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  Inactive
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {metrics.inactiveCount}
              </p>
            </div>

            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-purple-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  VIP (top 10%)
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {metrics.vipCount}
              </p>
            </div>
          </div>

          {/* ============ ALERTS ============ */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  At Risk
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {metrics.atRiskCount}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                High value + inactive
              </p>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  With Overdue
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {metrics.overdueCount}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {fmtMoney(metrics.totalOverdue)} overdue
              </p>
            </div>

            <div className="p-4 bg-slate-500/10 border border-slate-500/30 rounded-lg col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  Outstanding
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {fmtMoney(metrics.totalOutstanding)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Across all customers
              </p>
            </div>
          </div>

          {/* ============ INTELLIGENCE ============ */}
          {intelligence.length > 0 && (
            <ChartCard
              title="Customer intelligence"
              description="Signals from your customer base"
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

          {/* ============ TIER + LTV DISTRIBUTION ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Customer tiers"
              description="Distribution by lifetime value"
            >
              {tierDistribution.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No customer data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tierDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      dataKey="value"
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {tierDistribution.map((_, i) => (
                        <Cell key={i} fill={_.fill} />
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
              )}
            </ChartCard>

            <ChartCard
              title="LTV distribution"
              description="How customers are spread across spend bands"
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ltvBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                    }}
                    formatter={(v: number) => [`${v} customers`, "Count"]}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ============ ACQUISITION TREND ============ */}
          {acquisitionTrend.length > 0 && (
            <ChartCard
              title="Customer acquisition trend"
              description="New customers per month"
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={acquisitionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                    }}
                    formatter={(v: number) => [`${v} customers`, "New"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* ============ SEGMENT FILTERS ============ */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select
                value={segment}
                onValueChange={(v) => setSegment(v as SegmentKey)}
              >
                <SelectTrigger className="w-56 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {(Object.keys(SEGMENT_LABELS) as SegmentKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SEGMENT_LABELS[k]} ({segmentCounts[k] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Input
                  placeholder="Search customers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Segment summary line */}
            <p className="text-xs text-slate-500">
              Showing {filtered.length} of {enriched.length} customers
              {segment !== "all" && ` · ${SEGMENT_LABELS[segment]}`}
            </p>
          </div>

          {/* ============ FULL CUSTOMER TABLE ============ */}
          <ChartCard
            title="Customer detail"
            description="Every customer with lifetime value and engagement"
          >
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No customers match your filters.
              </div>
            ) : (
              <DataTable
                data={filtered}
                columns={[
                  {
                    key: "name" as const,
                    label: "Customer",
                    render: (_: any, row: EnrichedCustomer) => (
                      <div className="flex flex-col">
                        <span className="font-medium text-white">
                          {row.name}
                        </span>
                        {row.phone && (
                          <span className="text-xs text-slate-500">
                            {row.phone}
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "tier" as const,
                    label: "Tier",
                    render: (v: string) => (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${tierColor(
                          v,
                        )}`}
                      >
                        {v}
                      </span>
                    ),
                  },
                  {
                    key: "ltv" as const,
                    label: "Lifetime value",
                    render: (v: number) => (
                      <span className="font-semibold text-white">
                        {fmtMoney(v)}
                      </span>
                    ),
                  },
                  {
                    key: "avgOrderValue" as const,
                    label: "Avg order",
                    render: (v: number) => fmtMoney(v),
                  },
                  {
                    key: "visit_count" as const,
                    label: "Txns",
                    render: (_: any, row: EnrichedCustomer) =>
                      row.aggregates.salesCount + row.aggregates.invoiceCount,
                  },
                  {
                    key: "daysSinceLastPurchase" as const,
                    label: "Last purchase",
                    render: (v: number | null) => {
                      if (v === null) return "-";
                      if (v === 0) return "Today";
                      if (v === 1) return "Yesterday";
                      if (v < 30) return `${v}d ago`;
                      if (v < 90) return `${Math.round(v / 7)}w ago`;
                      return `${Math.round(v / 30)}mo ago`;
                    },
                  },
                  {
                    key: "invoiceOutstanding" as const,
                    label: "Outstanding",
                    render: (_: any, row: EnrichedCustomer) => {
                      const v = row.aggregates.invoiceOutstanding;
                      if (v === 0)
                        return <span className="text-slate-500">-</span>;
                      const overdue = row.aggregates.invoiceOverdue > 0;
                      return (
                        <span
                          className={
                            overdue
                              ? "text-red-300 font-semibold"
                              : "text-amber-300"
                          }
                        >
                          {fmtMoney(v)}
                        </span>
                      );
                    },
                  },
                  {
                    key: "status" as const,
                    label: "Status",
                    render: (_: any, row: EnrichedCustomer) => (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${segmentColor(
                          row.segment,
                        )}`}
                      >
                        {row.segment}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </ChartCard>

          {/* ============ TOP 10 CUSTOMERS ============ */}
          <ChartCard
            title="Top 10 customers by lifetime value"
            description="Your highest-value relationships"
          >
            <DataTable
              data={[...enriched].sort((a, b) => b.ltv - a.ltv).slice(0, 10)}
              columns={[
                {
                  key: "name" as const,
                  label: "Customer",
                  render: (_: any, row: EnrichedCustomer) => (
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span className="font-medium text-white">{row.name}</span>
                    </div>
                  ),
                },
                {
                  key: "ltv" as const,
                  label: "Lifetime value",
                  render: (v: number) => (
                    <span className="font-semibold text-white">
                      {fmtMoney(v)}
                    </span>
                  ),
                },
                {
                  key: "tier" as const,
                  label: "Tier",
                  render: (v: string) => (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${tierColor(
                        v,
                      )}`}
                    >
                      {v}
                    </span>
                  ),
                },
                {
                  key: "avgOrderValue" as const,
                  label: "Avg order",
                  render: (v: number) => fmtMoney(v),
                },
                {
                  key: "customerLifespanDays" as const,
                  label: "Lifespan",
                  render: (v: number | null) =>
                    v === null
                      ? "-"
                      : v < 30
                        ? `${v}d`
                        : v < 365
                          ? `${Math.round(v / 30)}mo`
                          : `${(v / 365).toFixed(1)}y`,
                },
                {
                  key: "visit_count" as const,
                  label: "Txns",
                  render: (_: any, row: EnrichedCustomer) =>
                    row.aggregates.salesCount + row.aggregates.invoiceCount,
                },
              ]}
            />
          </ChartCard>
        </>
      )}
    </div>
  );
}
