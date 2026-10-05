"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
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
  DollarSign,
  Wallet,
  ShoppingCart,
  Users,
  FileText,
  Receipt,
  AlertTriangle,
  Info,
  CheckCircle,
  ArrowRight,
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
import type { AnalyticsBundle } from "@/lib/analytics/kpi-engine";
import type { DateRangeKey } from "@/lib/analytics/types";

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

export default function AnalyticsOverviewPage() {
  const { business } = useBusiness();
  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<DateRangeKey>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    if (!business?.id) return;
    if (filterPeriod === "custom" && (!customFrom || !customTo)) return;
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, filterPeriod, customFrom, customTo]);

  const loadAnalytics = async () => {
    if (!business?.id) return;
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
        (window as any).__analyticsBundle = b;
      }
    } catch (err: any) {
      console.error("Analytics overview error:", err);
      setError("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const renderDelta = (value: number, invert = false) => {
    const isUp = value > 0;
    const isFlat = Math.abs(value) < 0.05;
    if (isFlat) {
      return <span className="text-xs text-slate-400">No change</span>;
    }
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

  if (loading || !bundle) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const { current, previous, trends } = bundle;

  // Build chart-friendly slices
  const revenueVsCost = [
    { name: "Revenue", value: current.revenue, fill: "#3b82f6" },
    { name: "COGS", value: current.cogs, fill: "#f59e0b" },
    { name: "Expenses", value: current.expenses, fill: "#ef4444" },
    { name: "Payroll", value: current.payroll, fill: "#8b5cf6" },
  ];

  const growthSnapshot = [
    { name: "Revenue", value: trends.revenueGrowth },
    { name: "Expenses", value: trends.expenseGrowth },
    { name: "Purchases", value: trends.purchaseGrowth },
    { name: "Payroll", value: trends.payrollGrowth },
    { name: "Net profit", value: trends.profitGrowth },
    { name: "Customers", value: trends.customerGrowth },
  ];

  // Simple intelligence derived from the bundle
  const flags: Array<{ type: string; title: string; detail: string }> = [];

  if (current.netMargin < 10 && current.revenue > 0) {
    flags.push({
      type: "warning",
      title: `Net margin is only ${current.netMargin.toFixed(1)}%`,
      detail: "Tight margins - look at your largest cost categories.",
    });
  } else if (current.netMargin >= 20) {
    flags.push({
      type: "success",
      title: `Healthy net margin at ${current.netMargin.toFixed(1)}%`,
      detail: "You're keeping a good share of every shilling earned.",
    });
  }

  if (current.overdueInvoices > 0) {
    const overduePct =
      current.outstandingInvoices > 0
        ? (current.overdueInvoices / current.outstandingInvoices) * 100
        : 0;
    flags.push({
      type: overduePct > 40 ? "critical" : "warning",
      title: `${fmtMoney(current.overdueInvoices)} overdue`,
      detail: `${overduePct.toFixed(0)}% of your outstanding balance is past due.`,
    });
  }

  if (trends.revenueGrowth < -10) {
    flags.push({
      type: "warning",
      title: `Revenue declined ${fmtPct(Math.abs(trends.revenueGrowth))} vs previous period`,
      detail: `From ${fmtMoney(previous.revenue)} to ${fmtMoney(current.revenue)}.`,
    });
  }

  if (trends.profitGrowth < -20 && previous.netProfit > 0) {
    flags.push({
      type: "critical",
      title: `Net profit dropped ${fmtPct(Math.abs(trends.profitGrowth))}`,
      detail: `From ${fmtMoney(previous.netProfit)} to ${fmtMoney(current.netProfit)}. Check whether costs outpaced revenue.`,
    });
  }

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics Overview</h1>
        <p className="text-slate-400 mt-2">
          Everything about your business on one page - revenue, cost, profit,
          and customers.
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

      {/* ============ TOP-LEVEL NUMBERS ============ */}
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
          subtitle={`${current.netMargin.toFixed(1)}% margin`}
          icon={<Wallet className="w-4 h-4" />}
        />
        <StatCard
          title="Expenses + Payroll"
          value={fmtMoney(current.expenses + current.payroll)}
          subtitle={`${(current.expenseRatio + current.payrollPercentageOfRevenue).toFixed(1)}% of revenue`}
          icon={<ShoppingCart className="w-4 h-4" />}
        />
      </div>

      {/* ============ SECONDARY NUMBERS ============ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Receivables
          </p>
          <p className="text-xl font-bold text-white">
            {fmtMoney(current.outstandingInvoices)}
          </p>
          {current.overdueInvoices > 0 && (
            <p className="text-xs text-red-300 mt-1">
              {fmtMoney(current.overdueInvoices)} overdue
            </p>
          )}
        </div>
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Pipeline
          </p>
          <p className="text-xl font-bold text-white">
            {fmtMoney(current.pendingPipelineValue)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {current.quotationCount} quotes ·{" "}
            {current.quotationConversionRate.toFixed(0)}% win
          </p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Customers
          </p>
          <p className="text-xl font-bold text-white">
            {current.customerCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {current.activeCustomers} active · {current.newCustomers} new
          </p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Avg Order
          </p>
          <p className="text-xl font-bold text-white">
            {fmtMoney(current.averageOrderValue)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {current.unitsSold} units sold
          </p>
        </div>
      </div>

      {/* ============ INTELLIGENCE ============ */}
      {flags.length > 0 && (
        <ChartCard
          title="Business intelligence"
          description="Signals from your data"
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

      {/* ============ REVENUE VS COST ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue vs cost" description="Where the money goes">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueVsCost}>
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
                {revenueVsCost.map((_, i) => (
                  <Cell key={i} fill={_.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Growth vs previous period"
          description="What's moving"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={growthSnapshot}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
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
                formatter={(v: number) => `${v.toFixed(1)}%`}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {growthSnapshot.map((g, i) => (
                  <Cell key={i} fill={g.value >= 0 ? "#10b981" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ============ DRILLDOWN LINKS ============ */}
      <ChartCard
        title="Drill into a module"
        description="Full analytics for each area"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Sales",
              href: "/dashboard/analytics/sales",
              icon: TrendingUp,
            },
            {
              label: "Expenses",
              href: "/dashboard/analytics/expenses",
              icon: Wallet,
            },
            {
              label: "Purchases",
              href: "/dashboard/analytics/purchases",
              icon: ShoppingCart,
            },
            {
              label: "Customers",
              href: "/dashboard/analytics/customers",
              icon: Users,
            },
            {
              label: "Invoices",
              href: "/dashboard/analytics/invoices",
              icon: Receipt,
            },
            {
              label: "Quotations",
              href: "/dashboard/analytics/quotations",
              icon: FileText,
            },
            {
              label: "Payroll",
              href: "/dashboard/analytics/payroll",
              icon: Wallet,
            },
            {
              label: "Profitability",
              href: "/dashboard/analytics/profitability",
              icon: DollarSign,
            },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <div className="p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-blue-500/40 rounded-lg transition-all cursor-pointer group">
                  <Icon className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="text-sm font-medium text-white flex items-center justify-between">
                    {link.label}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}
