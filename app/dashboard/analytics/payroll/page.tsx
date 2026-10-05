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
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  X,
  Wallet,
  Users,
  DollarSign,
  AlertTriangle,
  Info,
  CheckCircle,
  Percent,
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

interface PayrollRecord {
  id: string;
  business_id: string;
  employee_id: string;
  employee_name: string;
  amount: number | string;
  payment_date: string;
  payment_month: string;
  notes: string | null;
  status: string;
  // Optional - used if the columns exist
  basic_salary?: number | string | null;
  allowances?: number | string | null;
  overtime?: number | string | null;
  bonuses?: number | string | null;
  commissions?: number | string | null;
  deductions?: number | string | null;
  employer_costs?: number | string | null;
  department?: string | null;
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
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

export default function PayrollAnalyticsPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [previousRecords, setPreviousRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [revenueInPeriod, setRevenueInPeriod] = useState(0);
  const [cogsInPeriod, setCogsInPeriod] = useState(0);
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

      // Payroll - current period
      let q = supabase
        .from("payroll")
        .select("*")
        .eq("business_id", business.id)
        .order("payment_date", { ascending: true });
      if (bounds)
        q = q.gte("payment_date", bounds.from).lte("payment_date", bounds.to);
      const { data: current, error: cErr } = await q;
      if (cErr) throw cErr;
      setRecords(current || []);

      // Employees (for headcount reference)
      const { data: emps } = await supabase
        .from("business_users")
        .select("id, name, email, role")
        .eq("business_id", business.id);
      setEmployees(emps || []);

      // Revenue in the same window (from sales)
      if (bounds) {
        const { data: revData } = await supabase
          .from("sales")
          .select("amount, cost_price, quantity")
          .eq("business_id", business.id)
          .gte("date", bounds.from)
          .lte("date", bounds.to);
        setRevenueInPeriod(
          (revData || []).reduce((s, r) => s + num((r as any).amount), 0),
        );
        setCogsInPeriod(
          (revData || []).reduce(
            (s, r) =>
              s + num((r as any).cost_price) * num((r as any).quantity || 0),
            0,
          ),
        );
      } else {
        setRevenueInPeriod(0);
        setCogsInPeriod(0);
      }

      // Previous period
      if (bounds) {
        const prev = getPreviousRange(filterPeriod, bounds.from, bounds.to);
        if (prev) {
          const { data: prevData, error: pErr } = await supabase
            .from("payroll")
            .select("*")
            .eq("business_id", business.id)
            .gte("payment_date", prev.from)
            .lte("payment_date", prev.to);
          if (pErr) throw pErr;
          setPreviousRecords(prevData || []);
        } else {
          setPreviousRecords([]);
        }
      } else {
        setPreviousRecords([]);
      }
    } catch (err: any) {
      console.error("Payroll analytics fetch error:", err);
      setError("Failed to load payroll analytics");
    } finally {
      setLoading(false);
    }
  };

  /* ================================================================ */
  /*  CALCULATIONS                                                    */
  /* ================================================================ */

  const calc = (rows: PayrollRecord[]) => {
    const total = rows.reduce((s, r) => s + num(r.amount), 0);
    const count = rows.length;

    const basic = rows.reduce((s, r) => s + num(r.basic_salary), 0);
    const allowances = rows.reduce((s, r) => s + num(r.allowances), 0);
    const overtime = rows.reduce((s, r) => s + num(r.overtime), 0);
    const bonuses = rows.reduce((s, r) => s + num(r.bonuses), 0);
    const commissions = rows.reduce((s, r) => s + num(r.commissions), 0);
    const deductions = rows.reduce((s, r) => s + num(r.deductions), 0);
    const employerCosts = rows.reduce((s, r) => s + num(r.employer_costs), 0);

    // Total employer spend = net salary + employer costs
    const totalEmployerCost = total + employerCosts;

    const uniqueEmployees = new Set(rows.map((r) => r.employee_id)).size;

    return {
      total,
      totalEmployerCost,
      count,
      basic,
      allowances,
      overtime,
      bonuses,
      commissions,
      deductions,
      employerCosts,
      uniqueEmployees,
      avgPerRecord: count > 0 ? total / count : 0,
      avgPerEmployee: uniqueEmployees > 0 ? total / uniqueEmployees : 0,
    };
  };

  const current = useMemo(() => calc(records), [records]);
  const previous = useMemo(() => calc(previousRecords), [previousRecords]);

  const pctChange = (c: number, p: number) => {
    if (p === 0) return c > 0 ? 100 : 0;
    return ((c - p) / Math.abs(p)) * 100;
  };

  /* ---------------- Payroll as % of revenue and gross profit ---------------- */

  const grossProfit = revenueInPeriod - cogsInPeriod;

  const payrollVsRevenue =
    revenueInPeriod > 0
      ? (current.totalEmployerCost / revenueInPeriod) * 100
      : null;

  const payrollVsGrossProfit =
    grossProfit > 0 ? (current.totalEmployerCost / grossProfit) * 100 : null;

  const previousPayrollVsRevenue = null; // computed with prev records if needed

  /* ---------------- By employee ---------------- */

  const byEmployee = useMemo(() => {
    const grouped: Record<
      string,
      {
        name: string;
        total: number;
        count: number;
        basic: number;
        allowances: number;
        overtime: number;
        bonuses: number;
        deductions: number;
        employerCosts: number;
      }
    > = {};

    for (const r of records) {
      const key = r.employee_id || r.employee_name || "(Unknown)";
      if (!grouped[key]) {
        grouped[key] = {
          name: r.employee_name || "(Unknown)",
          total: 0,
          count: 0,
          basic: 0,
          allowances: 0,
          overtime: 0,
          bonuses: 0,
          deductions: 0,
          employerCosts: 0,
        };
      }
      grouped[key].total += num(r.amount);
      grouped[key].count += 1;
      grouped[key].basic += num(r.basic_salary);
      grouped[key].allowances += num(r.allowances);
      grouped[key].overtime += num(r.overtime);
      grouped[key].bonuses += num(r.bonuses);
      grouped[key].deductions += num(r.deductions);
      grouped[key].employerCosts += num(r.employer_costs);
    }

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [records]);

  /* ---------------- By department ---------------- */

  const byDepartment = useMemo(() => {
    // Fall back to role from business_users if payroll.department is missing
    const employeeDepartment: Record<string, string> = {};
    for (const e of employees) {
      employeeDepartment[e.id] = e.role || "(Unassigned)";
    }

    const grouped: Record<
      string,
      { name: string; total: number; employeeSet: Set<string> }
    > = {};

    for (const r of records) {
      const dept =
        r.department || employeeDepartment[r.employee_id] || "(Unassigned)";
      if (!grouped[dept]) {
        grouped[dept] = {
          name: dept,
          total: 0,
          employeeSet: new Set<string>(),
        };
      }
      grouped[dept].total += num(r.amount);
      if (r.employee_id) grouped[dept].employeeSet.add(r.employee_id);
    }

    return Object.values(grouped)
      .map((g) => ({
        name: g.name,
        total: g.total,
        employeeCount: g.employeeSet.size,
      }))
      .sort((a, b) => b.total - a.total);
  }, [records, employees]);

  /* ---------------- Monthly trend ---------------- */

  const monthlyTrend = useMemo(() => {
    const grouped: Record<
      string,
      {
        month: string;
        total: number;
        basic: number;
        allowances: number;
        overtime: number;
        bonuses: number;
        deductions: number;
      }
    > = {};

    for (const r of records) {
      const month = r.payment_date.substring(0, 7);
      if (!grouped[month]) {
        grouped[month] = {
          month,
          total: 0,
          basic: 0,
          allowances: 0,
          overtime: 0,
          bonuses: 0,
          deductions: 0,
        };
      }
      grouped[month].total += num(r.amount);
      grouped[month].basic += num(r.basic_salary);
      grouped[month].allowances += num(r.allowances);
      grouped[month].overtime += num(r.overtime);
      grouped[month].bonuses += num(r.bonuses);
      grouped[month].deductions += num(r.deductions);
    }

    return Object.values(grouped).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }, [records]);

  /* ---------------- Composition ---------------- */

  const composition = useMemo(() => {
    const parts = [
      { name: "Basic salary", value: current.basic, fill: "#3b82f6" },
      { name: "Allowances", value: current.allowances, fill: "#10b981" },
      { name: "Overtime", value: current.overtime, fill: "#f59e0b" },
      { name: "Bonuses", value: current.bonuses, fill: "#8b5cf6" },
      { name: "Commissions", value: current.commissions, fill: "#06b6d4" },
    ].filter((p) => p.value > 0);

    // If we only have "amount" and none of the breakdown, show single slice
    if (parts.length === 0 && current.total > 0) {
      return [{ name: "Total salary", value: current.total, fill: "#3b82f6" }];
    }

    return parts;
  }, [current]);

  /* ================================================================ */
  /*  INTELLIGENCE                                                    */
  /* ================================================================ */

  const intelligence = useMemo(() => {
    const flags: Array<{
      type: "info" | "warning" | "success" | "critical";
      title: string;
      detail: string;
    }> = [];

    if (records.length === 0) return flags;

    /* 1. Payroll vs revenue */
    if (payrollVsRevenue !== null) {
      flags.push({
        type:
          payrollVsRevenue > 50
            ? "critical"
            : payrollVsRevenue > 35
              ? "warning"
              : payrollVsRevenue > 20
                ? "info"
                : "success",
        title: `Payroll is ${payrollVsRevenue.toFixed(1)}% of revenue`,
        detail: `${fmtMoney(current.totalEmployerCost)} in payroll against ${fmtMoney(
          revenueInPeriod,
        )} revenue. ${
          payrollVsRevenue > 35
            ? "This is on the high side - consider efficiency or pricing."
            : "Within a healthy range for most SMEs."
        }`,
      });
    }

    /* 2. Payroll vs gross profit */
    if (payrollVsGrossProfit !== null && grossProfit > 0) {
      flags.push({
        type:
          payrollVsGrossProfit > 60
            ? "warning"
            : payrollVsGrossProfit > 40
              ? "info"
              : "success",
        title: `Payroll is ${payrollVsGrossProfit.toFixed(1)}% of gross profit`,
        detail: `Gross profit was ${fmtMoney(grossProfit)} in the period. ${
          payrollVsGrossProfit > 60
            ? "Your staff cost is eating most of your margin."
            : "Leaves healthy room for other costs and profit."
        }`,
      });
    }

    /* 3. Payroll growth */
    if (previousRecords.length > 0) {
      const growth = pctChange(current.total, previous.total);
      if (Math.abs(growth) > 10) {
        flags.push({
          type: growth > 20 ? "warning" : "info",
          title: `Payroll ${growth > 0 ? "grew" : "shrank"} ${fmtPct(
            Math.abs(growth),
          )} vs previous period`,
          detail: `${fmtMoney(previous.total)} → ${fmtMoney(current.total)}.`,
        });
      }
    }

    /* 4. Employee count */
    if (current.uniqueEmployees > 0) {
      flags.push({
        type: "info",
        title: `Average cost per employee: ${fmtMoney(current.avgPerEmployee)}`,
        detail: `Across ${current.uniqueEmployees} employee${
          current.uniqueEmployees === 1 ? "" : "s"
        } in this period.`,
      });
    }

    /* 5. Overtime warning */
    if (current.overtime > 0 && current.total > 0) {
      const otPct = (current.overtime / current.total) * 100;
      if (otPct > 10) {
        flags.push({
          type: "warning",
          title: `Overtime is ${otPct.toFixed(1)}% of payroll`,
          detail: `${fmtMoney(
            current.overtime,
          )} paid as overtime. This may indicate understaffing or scheduling issues.`,
        });
      }
    }

    /* 6. Department concentration */
    if (byDepartment.length > 0 && current.total > 0) {
      const top = byDepartment[0];
      const share = (top.total / current.total) * 100;
      if (share > 50 && byDepartment.length > 1) {
        flags.push({
          type: "info",
          title: `Department concentration: ${top.name}`,
          detail: `${top.name} accounts for ${share.toFixed(
            0,
          )}% of payroll (${fmtMoney(top.total)}).`,
        });
      }
    }

    /* 7. Deductions visibility */
    if (current.deductions > 0) {
      const deductionRate =
        (current.deductions /
          (current.basic +
            current.allowances +
            current.overtime +
            current.bonuses +
            current.commissions)) *
        100;
      if (deductionRate > 25) {
        flags.push({
          type: "info",
          title: `High deduction rate: ${deductionRate.toFixed(1)}%`,
          detail: `${fmtMoney(
            current.deductions,
          )} deducted from gross pay. Common for statutory contributions.`,
        });
      }
    }

    return flags;
  }, [
    records,
    current,
    previousRecords,
    previous,
    payrollVsRevenue,
    payrollVsGrossProfit,
    revenueInPeriod,
    grossProfit,
    byDepartment,
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
        employeeCountPct: pctChange(
          current.uniqueEmployees,
          previous.uniqueEmployees,
        ),
        avgPerEmployeePct: pctChange(
          current.avgPerEmployee,
          previous.avgPerEmployee,
        ),
      },
      revenue: revenueInPeriod,
      cogs: cogsInPeriod,
      grossProfit,
      payrollVsRevenue,
      payrollVsGrossProfit,
      byEmployee,
      byDepartment,
      composition,
      monthlyTrend,
      intelligence,
    }),
    [
      current,
      previous,
      revenueInPeriod,
      cogsInPeriod,
      grossProfit,
      payrollVsRevenue,
      payrollVsGrossProfit,
      byEmployee,
      byDepartment,
      composition,
      monthlyTrend,
      intelligence,
      filterPeriod,
      customFrom,
      customTo,
    ],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__payrollAnalytics = aiSummary;
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
        <h1 className="text-3xl font-bold text-white">Payroll Analytics</h1>
        <p className="text-slate-400 mt-2">
          Understand staff costs - composition, per-employee, and how payroll
          relates to revenue and profit.
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
              title="Total Payroll"
              value={fmtMoney(current.totalEmployerCost)}
              subtitle={
                <span className="flex items-center gap-2">
                  {renderDelta(
                    current.totalEmployerCost,
                    previous.totalEmployerCost,
                  )}{" "}
                  vs prev
                </span>
              }
              icon={<Wallet className="w-4 h-4" />}
            />
            <StatCard
              title="Payroll / Revenue"
              value={
                payrollVsRevenue !== null
                  ? `${payrollVsRevenue.toFixed(1)}%`
                  : "-"
              }
              subtitle={
                payrollVsRevenue !== null
                  ? `Against ${fmtMoney(revenueInPeriod)}`
                  : "No revenue in period"
              }
              icon={<Percent className="w-4 h-4" />}
            />
            <StatCard
              title="Cost per Employee"
              value={fmtMoney(current.avgPerEmployee)}
              subtitle={`${current.uniqueEmployees} employee${
                current.uniqueEmployees === 1 ? "" : "s"
              }`}
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              title="Payroll / Gross Profit"
              value={
                payrollVsGrossProfit !== null
                  ? `${payrollVsGrossProfit.toFixed(1)}%`
                  : "-"
              }
              subtitle={
                payrollVsGrossProfit !== null
                  ? `Against ${fmtMoney(grossProfit)}`
                  : "No gross profit in period"
              }
              icon={<DollarSign className="w-4 h-4" />}
            />
          </div>

          {/* ============ INTELLIGENCE ============ */}
          {intelligence.length > 0 && (
            <ChartCard
              title="Payroll intelligence"
              description="Automatic signals from your payroll data"
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
                      "Total payroll (net)",
                      current.total,
                      previous.total,
                      "money",
                    ],
                    [
                      "Employer costs",
                      current.employerCosts,
                      previous.employerCosts,
                      "money",
                    ],
                    [
                      "Total employer cost",
                      current.totalEmployerCost,
                      previous.totalEmployerCost,
                      "money",
                    ],
                    ["Basic salary", current.basic, previous.basic, "money"],
                    [
                      "Allowances",
                      current.allowances,
                      previous.allowances,
                      "money",
                    ],
                    ["Overtime", current.overtime, previous.overtime, "money"],
                    ["Bonuses", current.bonuses, previous.bonuses, "money"],
                    [
                      "Commissions",
                      current.commissions,
                      previous.commissions,
                      "money",
                    ],
                    [
                      "Deductions",
                      current.deductions,
                      previous.deductions,
                      "money",
                    ],
                    ["Payment records", current.count, previous.count, "count"],
                    [
                      "Unique employees",
                      current.uniqueEmployees,
                      previous.uniqueEmployees,
                      "count",
                    ],
                    [
                      "Avg per record",
                      current.avgPerRecord,
                      previous.avgPerRecord,
                      "money",
                    ],
                    [
                      "Avg per employee",
                      current.avgPerEmployee,
                      previous.avgPerEmployee,
                      "money",
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
                          {renderDelta(cn, pn)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* ============ COMPOSITION + DEPARTMENT ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Salary composition"
              description="Where the payroll goes"
            >
              {composition.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No payroll data for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={composition}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      dataKey="value"
                      label={(entry) =>
                        `${entry.name}: ${fmt(entry.value as number)}`
                      }
                    >
                      {composition.map((c, i) => (
                        <Cell key={i} fill={c.fill} />
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
              title="Payroll by department"
              description="Cost distribution across teams"
            >
              {byDepartment.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No department attribution yet.
                  <br />
                  Add a <code className="text-slate-400">department</code>{" "}
                  column to payroll, or set roles on employees.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={byDepartment}
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
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {byDepartment.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* ============ MONTHLY TREND ============ */}
          <ChartCard
            title="Monthly payroll trend"
            description="How staff cost moves month over month"
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                    <stop
                      offset="100%"
                      stopColor="#3b82f6"
                      stopOpacity={0.05}
                    />
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
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#payrollGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ============ PAYROLL VS REVENUE (dual line) ============ */}
          {monthlyTrend.length > 0 && (
            <ChartCard
              title="Payroll vs revenue"
              description="Are staff costs growing faster than sales?"
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
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
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Payroll"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* ============ BY EMPLOYEE TABLE ============ */}
          <ChartCard
            title="Payroll by employee"
            description="Total cost per team member in the period"
          >
            {byEmployee.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No payroll records in this period.
              </div>
            ) : (
              <DataTable
                data={byEmployee}
                columns={[
                  { key: "name" as const, label: "Employee" },
                  {
                    key: "total" as const,
                    label: "Total",
                    render: (v: number) => (
                      <span className="font-semibold text-white">
                        {fmtMoney(v)}
                      </span>
                    ),
                  },
                  { key: "count" as const, label: "Payments" },
                  {
                    key: "basic" as const,
                    label: "Basic",
                    render: (v: number) => (v > 0 ? fmtMoney(v) : "-"),
                  },
                  {
                    key: "allowances" as const,
                    label: "Allowances",
                    render: (v: number) => (v > 0 ? fmtMoney(v) : "-"),
                  },
                  {
                    key: "overtime" as const,
                    label: "Overtime",
                    render: (v: number) => (v > 0 ? fmtMoney(v) : "-"),
                  },
                  {
                    key: "bonuses" as const,
                    label: "Bonuses",
                    render: (v: number) => (v > 0 ? fmtMoney(v) : "-"),
                  },
                  {
                    key: "deductions" as const,
                    label: "Deductions",
                    render: (v: number) => (v > 0 ? fmtMoney(v) : "-"),
                  },
                  {
                    key: "employerCosts" as const,
                    label: "Employer costs",
                    render: (v: number) => (v > 0 ? fmtMoney(v) : "-"),
                  },
                ]}
              />
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}
