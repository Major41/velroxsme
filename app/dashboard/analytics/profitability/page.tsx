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
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  DollarSign,
  Wallet,
  Percent,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBusiness } from "@/context/BusinessContext";
import { fetchAnalyticsBundle } from "@/services/analytics";
import type {
  AnalyticsBundle,
  BusinessPerformance,
  BusinessTrends,
} from "@/lib/analytics/kpi-engine";
import type { DateRangeKey } from "@/lib/analytics/types";
import { getRevenueByCategory } from "@/lib/analytics/revenue";

/* ==================================================================== */
/*  CONSTANTS                                                           */
/* ==================================================================== */

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
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

const fmt = (n: number) =>
  n.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
const fmtMoney = (n: number) => `KSh ${fmt(n)}`;
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

/* ---------- Safe empty defaults so hooks work before data loads ---------- */

const EMPTY_PERFORMANCE: BusinessPerformance = {
  revenue: 0,
  grossSales: 0,
  netSales: 0,
  discountsGiven: 0,
  taxCollected: 0,
  averageOrderValue: 0,
  unitsSold: 0,
  cogs: 0,
  grossProfit: 0,
  grossMargin: 0,
  expenses: 0,
  purchases: 0,
  payroll: 0,
  netProfit: 0,
  netMargin: 0,
  totalInvoiced: 0,
  totalPaid: 0,
  outstandingInvoices: 0,
  overdueInvoices: 0,
  averageInvoiceValue: 0,
  averagePaymentTime: null,
  quotationCount: 0,
  quotationValue: 0,
  acceptedQuotations: 0,
  rejectedQuotations: 0,
  convertedQuotations: 0,
  quotationConversionRate: 0,
  pendingPipelineValue: 0,
  customerCount: 0,
  activeCustomers: 0,
  inactiveCustomers: 0,
  newCustomers: 0,
  returningCustomers: 0,
  customerLifetimeValue: 0,
  averageCustomerValue: 0,
  customerRetention: 0,
  payrollPercentageOfRevenue: 0,
  expenseRatio: 0,
};

const EMPTY_TRENDS: BusinessTrends = {
  revenueGrowth: 0,
  expenseGrowth: 0,
  purchaseGrowth: 0,
  payrollGrowth: 0,
  profitGrowth: 0,
  customerGrowth: 0,
  orderGrowth: 0,
  grossMarginChange: 0,
  netMarginChange: 0,
};

const EMPTY_RAW: AnalyticsBundle["raw"] = {
  sales: [],
  expenses: [],
  purchases: [],
  invoices: [],
  quotations: [],
  payroll: [],
  customers: [],
};

/* ==================================================================== */
/*  PAGE                                                                */
/* ==================================================================== */

export default function ProfitabilityPage() {
  const { business } = useBusiness();

  /* ---------------- State ---------------- */

  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<DateRangeKey>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  /* ---------------- Fetch ---------------- */

  useEffect(() => {
    if (!business?.id) return;
    if (filterPeriod === "custom" && (!customFrom || !customTo)) return;

    const loadAnalytics = async () => {
      setLoading(true);
      setError("");
      try {
        const b = await fetchAnalyticsBundle({
          businessId: business.id,
          filterPeriod,
          customFrom,
          customTo,
        });
        setBundle(b);
        if (typeof window !== "undefined") {
          (window as any).__profitabilityBundle = b;
        }
      } catch (err: any) {
        console.error("Profitability error:", err);
        setError("Failed to load profitability data");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, filterPeriod, customFrom, customTo]);

  /* ---------------- Null-safe derived values ---------------- */

  const current = bundle?.current ?? EMPTY_PERFORMANCE;
  const previous = bundle?.previous ?? EMPTY_PERFORMANCE;
  const trends = bundle?.trends ?? EMPTY_TRENDS;
  const raw = bundle?.raw ?? EMPTY_RAW;

  /* ---------------- Hooks (must run on every render) ---------------- */

  const categoryProfit = useMemo(() => {
    const revenueByCategory = getRevenueByCategory(raw.sales);
    return revenueByCategory.map((cat) => {
      const catSales = raw.sales.filter((s) => s.category === cat.name);
      const catCogs = catSales.reduce(
        (sum, s) =>
          sum +
          (typeof s.cost_price === "number"
            ? s.cost_price
            : parseFloat(String(s.cost_price ?? 0)) || 0) *
            (s.quantity || 0),
        0,
      );
      const grossProfit = cat.revenue - catCogs;
      const margin = cat.revenue === 0 ? 0 : (grossProfit / cat.revenue) * 100;
      return {
        name: cat.name,
        revenue: cat.revenue,
        cogs: catCogs,
        grossProfit,
        margin,
      };
    });
  }, [raw.sales]);

  const monthlyPL = useMemo(() => {
    const grouped: Record<
      string,
      {
        month: string;
        revenue: number;
        cogs: number;
        expenses: number;
        payroll: number;
        grossProfit: number;
        netProfit: number;
      }
    > = {};

    for (const s of raw.sales) {
      const month = s.date.substring(0, 7);
      if (!grouped[month]) {
        grouped[month] = {
          month,
          revenue: 0,
          cogs: 0,
          expenses: 0,
          payroll: 0,
          grossProfit: 0,
          netProfit: 0,
        };
      }
      grouped[month].revenue +=
        typeof s.amount === "number"
          ? s.amount
          : parseFloat(String(s.amount)) || 0;
      grouped[month].cogs +=
        (typeof s.cost_price === "number"
          ? s.cost_price
          : parseFloat(String(s.cost_price ?? 0)) || 0) * (s.quantity || 0);
    }

    for (const e of raw.expenses) {
      const month = e.date.substring(0, 7);
      if (!grouped[month]) {
        grouped[month] = {
          month,
          revenue: 0,
          cogs: 0,
          expenses: 0,
          payroll: 0,
          grossProfit: 0,
          netProfit: 0,
        };
      }
      grouped[month].expenses +=
        typeof e.amount === "number"
          ? e.amount
          : parseFloat(String(e.amount)) || 0;
    }

    for (const p of raw.payroll) {
      const month = p.payment_date.substring(0, 7);
      if (!grouped[month]) {
        grouped[month] = {
          month,
          revenue: 0,
          cogs: 0,
          expenses: 0,
          payroll: 0,
          grossProfit: 0,
          netProfit: 0,
        };
      }
      grouped[month].payroll +=
        typeof p.amount === "number"
          ? p.amount
          : parseFloat(String(p.amount)) || 0;
    }

    return Object.values(grouped)
      .map((m) => {
        const grossProfit = m.revenue - m.cogs;
        const netProfit = grossProfit - m.expenses - m.payroll;
        return {
          ...m,
          grossProfit,
          netProfit,
          grossMargin: m.revenue === 0 ? 0 : (grossProfit / m.revenue) * 100,
          netMargin: m.revenue === 0 ? 0 : (netProfit / m.revenue) * 100,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [raw]);

  const plWaterfall = useMemo(
    () => [
      { name: "Revenue", value: current.revenue, fill: "#3b82f6" },
      { name: "COGS", value: -current.cogs, fill: "#f59e0b" },
      { name: "Gross Profit", value: current.grossProfit, fill: "#10b981" },
      { name: "Expenses", value: -current.expenses, fill: "#ef4444" },
      { name: "Payroll", value: -current.payroll, fill: "#8b5cf6" },
      {
        name: "Net Profit",
        value: current.netProfit,
        fill: current.netProfit >= 0 ? "#10b981" : "#dc2626",
      },
    ],
    [current],
  );

  const costStack = useMemo(
    () =>
      [
        { name: "COGS", value: current.cogs, fill: "#f59e0b" },
        { name: "Expenses", value: current.expenses, fill: "#ef4444" },
        { name: "Payroll", value: current.payroll, fill: "#8b5cf6" },
      ].filter((c) => c.value > 0),
    [current],
  );

  const flags = useMemo(() => {
    const result: Array<{ type: string; title: string; detail: string }> = [];

    if (current.netMargin >= 20) {
      result.push({
        type: "success",
        title: `Net margin: ${current.netMargin.toFixed(1)}%`,
        detail: `Keeping ${fmtMoney(current.netProfit)} from ${fmtMoney(current.revenue)} in revenue.`,
      });
    } else if (current.netMargin > 0) {
      result.push({
        type: "info",
        title: `Net margin: ${current.netMargin.toFixed(1)}%`,
        detail: "Thin but positive. Look for the largest cost lever to pull.",
      });
    } else if (current.revenue > 0) {
      result.push({
        type: "critical",
        title: `Operating at a loss: ${fmtMoney(current.netProfit)}`,
        detail:
          "Costs exceeded revenue for the period. Prioritise by biggest cost category.",
      });
    }

    if (trends.profitGrowth < -10) {
      result.push({
        type: "warning",
        title: `Profit declined ${fmtPct(Math.abs(trends.profitGrowth))} vs previous period`,
        detail: `${fmtMoney(previous.netProfit)} → ${fmtMoney(current.netProfit)}.`,
      });
    } else if (trends.profitGrowth > 10) {
      result.push({
        type: "success",
        title: `Profit grew ${fmtPct(trends.profitGrowth)} vs previous period`,
        detail: `${fmtMoney(previous.netProfit)} → ${fmtMoney(current.netProfit)}.`,
      });
    }

    if (current.cogs > current.revenue * 0.7 && current.revenue > 0) {
      result.push({
        type: "warning",
        title: `COGS is ${((current.cogs / current.revenue) * 100).toFixed(0)}% of revenue`,
        detail:
          "High cost of goods leaves little room for operating costs and profit.",
      });
    }

    if (
      current.payroll > current.grossProfit * 0.6 &&
      current.grossProfit > 0
    ) {
      result.push({
        type: "warning",
        title: `Payroll is ${((current.payroll / current.grossProfit) * 100).toFixed(0)}% of gross profit`,
        detail: "Staff costs are consuming most of your margin.",
      });
    }

    return result;
  }, [current, previous, trends]);

  /* ---------------- Render helpers (not hooks) ---------------- */

  const renderDelta = (value: number, invert = false) => {
    const isUp = value > 0;
    const isFlat = Math.abs(value) < 0.05;
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
        {fmtPct(value)}
      </span>
    );
  };

  const flagIcon = (t: string) => {
    if (t === "critical" || t === "warning")
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    if (t === "success")
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    return <Info className="w-4 h-4 text-blue-400" />;
  };

  const flagBg = (t: string) => {
    if (t === "critical") return "bg-red-500/10 border-red-500/30";
    if (t === "warning") return "bg-amber-500/10 border-amber-500/30";
    if (t === "success") return "bg-emerald-500/10 border-emerald-500/30";
    return "bg-blue-500/10 border-blue-500/30";
  };

  /* ---------------- Early return BELOW all hooks ---------------- */

  if (loading || !bundle) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Profitability</h1>
        <p className="text-slate-400 mt-2">
          From revenue to net profit - every cost line, every margin, every
          trend.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

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
          </div>
        )}
      </div>

      {/* ============ TOP METRICS ============ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue"
          value={fmtMoney(current.revenue)}
          subtitle={
            <span className="flex items-center gap-2">
              {renderDelta(trends.revenueGrowth)} vs prev
            </span>
          }
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          title="Gross Profit"
          value={fmtMoney(current.grossProfit)}
          subtitle={`${current.grossMargin.toFixed(1)}% margin`}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          title="Net Profit"
          value={fmtMoney(current.netProfit)}
          subtitle={
            <span className="flex items-center gap-2">
              {renderDelta(trends.profitGrowth)} vs prev
            </span>
          }
          icon={<Wallet className="w-4 h-4" />}
        />
        <StatCard
          title="Net Margin"
          value={`${current.netMargin.toFixed(1)}%`}
          subtitle={`Prev: ${previous.netMargin.toFixed(1)}%`}
          icon={<Percent className="w-4 h-4" />}
        />
      </div>

      {/* ============ INTELLIGENCE ============ */}
      {flags.length > 0 && (
        <ChartCard
          title="Profitability signals"
          description="Interpretation of your P&L"
        >
          <div className="space-y-3">
            {flags.map((flag, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-lg border ${flagBg(flag.type)}`}
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

      {/* ============ P&L WATERFALL ============ */}
      <ChartCard
        title="Profit & loss breakdown"
        description="Revenue → Gross profit → Net profit"
      >
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={plWaterfall}>
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
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {plWaterfall.map((_, i) => (
                <Cell key={i} fill={_.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ============ COST STACK + MARGIN ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Cost structure" description="Where your money goes">
          {costStack.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No costs recorded in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costStack}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  dataKey="value"
                  label={(entry) =>
                    `${entry.name}: ${fmt(entry.value as number)}`
                  }
                >
                  {costStack.map((_, i) => (
                    <Cell key={i} fill={_.fill} />
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

        <ChartCard
          title="Margin comparison"
          description="Gross vs net margin over the period"
        >
          <div className="space-y-6 py-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-300">Gross margin</span>
                <span className="text-white font-semibold">
                  {current.grossMargin.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.min(100, current.grossMargin)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Previous: {previous.grossMargin.toFixed(1)}%
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-300">Net margin</span>
                <span className="text-white font-semibold">
                  {current.netMargin.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${current.netMargin >= 0 ? "bg-blue-500" : "bg-red-500"}`}
                  style={{
                    width: `${Math.min(100, Math.abs(current.netMargin))}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Previous: {previous.netMargin.toFixed(1)}%
              </p>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-400">Cost of doing business</p>
              <p className="text-2xl font-bold text-white mt-1">
                {fmtMoney(current.cogs + current.expenses + current.payroll)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ={" "}
                {(
                  ((current.cogs + current.expenses + current.payroll) /
                    (current.revenue || 1)) *
                  100
                ).toFixed(1)}
                % of revenue
              </p>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ============ MONTHLY P&L TREND ============ */}
      {monthlyPL.length > 0 && (
        <ChartCard
          title="Monthly P&L trend"
          description="Revenue, gross profit, and net profit over time"
        >
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyPL}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#revGrad)"
                name="Revenue"
              />
              <Area
                type="monotone"
                dataKey="grossProfit"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="none"
                name="Gross profit"
              />
              <Area
                type="monotone"
                dataKey="netProfit"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#netGrad)"
                name="Net profit"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ============ CATEGORY PROFITABILITY ============ */}
      {categoryProfit.length > 0 && (
        <ChartCard
          title="Profitability by category"
          description="Which product categories actually make money"
        >
          <DataTable
            data={categoryProfit}
            columns={[
              { key: "name" as const, label: "Category" },
              {
                key: "revenue" as const,
                label: "Revenue",
                render: (v: number) => fmtMoney(v),
              },
              {
                key: "cogs" as const,
                label: "COGS",
                render: (v: number) => fmtMoney(v),
              },
              {
                key: "grossProfit" as const,
                label: "Gross profit",
                render: (v: number) => (
                  <span
                    className={v >= 0 ? "text-emerald-300" : "text-red-300"}
                  >
                    {fmtMoney(v)}
                  </span>
                ),
              },
              {
                key: "margin" as const,
                label: "Margin",
                render: (v: number) => (
                  <span
                    className={
                      v >= 30
                        ? "text-emerald-300"
                        : v >= 10
                          ? "text-amber-300"
                          : "text-red-300"
                    }
                  >
                    {v.toFixed(1)}%
                  </span>
                ),
              },
            ]}
          />
        </ChartCard>
      )}

      {/* ============ FULL P&L TABLE ============ */}
      <ChartCard
        title="Full P&L"
        description="Every line item, period vs previous"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-700">
                <th className="text-left py-2 px-3 font-medium">Line item</th>
                <th className="text-right py-2 px-3 font-medium">Current</th>
                <th className="text-right py-2 px-3 font-medium">Previous</th>
                <th className="text-right py-2 px-3 font-medium">Change</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {[
                ["Revenue", current.revenue, previous.revenue],
                ["Cost of goods sold", current.cogs, previous.cogs],
                ["Gross profit", current.grossProfit, previous.grossProfit],
                ["Operating expenses", current.expenses, previous.expenses],
                ["Payroll", current.payroll, previous.payroll],
                [
                  "Total operating costs",
                  current.expenses + current.payroll,
                  previous.expenses + previous.payroll,
                ],
                ["Net profit", current.netProfit, previous.netProfit],
              ].map(([label, c, p]) => {
                const cn = c as number;
                const pn = p as number;
                const isBold = ["Gross profit", "Net profit"].includes(
                  label as string,
                );
                return (
                  <tr
                    key={label as string}
                    className={`border-b border-slate-800/50 ${isBold ? "bg-slate-800/20" : ""}`}
                  >
                    <td
                      className={`py-2.5 px-3 ${isBold ? "font-semibold text-white" : ""}`}
                    >
                      {label}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right ${isBold ? "font-semibold text-white" : ""}`}
                    >
                      {fmtMoney(cn)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {fmtMoney(pn)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {renderDelta(
                        pn === 0 ? 0 : ((cn - pn) / Math.abs(pn)) * 100,
                        [
                          "Operating expenses",
                          "Payroll",
                          "Cost of goods sold",
                          "Total operating costs",
                        ].includes(label as string),
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
