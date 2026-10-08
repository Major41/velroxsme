import type { AnalyticsBundle } from "./kpi-engine";
import { getRevenueByProduct, getRevenueByCategory } from "./revenue";
import { getExpensesByCategory } from "./expenses";
import { getPurchasesBySupplier, getPurchasesByProduct } from "./purchases";

/**
 * Compact, AI-friendly context built from the full analytics bundle.
 * Contains only computed numbers — no raw rows, no ambiguity.
 */
export function buildAIContext(bundle: AnalyticsBundle) {
  const { current, previous, trends, raw } = bundle;

  // Top-N lists — trimmed to keep the prompt small
  const topProducts = getRevenueByProduct(raw.sales).slice(0, 10);
  const topCategories = getRevenueByCategory(raw.sales).slice(0, 10);
  const topSuppliers = getPurchasesBySupplier(raw.purchases).slice(0, 10);
  const topPurchaseProducts = getPurchasesByProduct(raw.purchases).slice(0, 10);
  const topExpenseCategories = getExpensesByCategory(raw.expenses).slice(0, 10);

  // Day-of-week sales
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayGrouped: Record<string, { day: string; revenue: number; count: number }> = {};
  for (const s of raw.sales) {
    const d = new Date(s.date).getDay();
    const key = days[d];
    if (!dayGrouped[key]) dayGrouped[key] = { day: key, revenue: 0, count: 0 };
    dayGrouped[key].revenue += num(s.amount);
    dayGrouped[key].count += 1;
  }
  const byDayOfWeek = Object.values(dayGrouped).sort(
    (a, b) => b.revenue - a.revenue,
  );

  // Salesperson performance
  const salesGrouped: Record<string, { name: string; revenue: number; count: number }> = {};
  for (const s of raw.sales) {
    const key = s.salesperson_name || "(Unassigned)";
    if (!salesGrouped[key]) salesGrouped[key] = { name: key, revenue: 0, count: 0 };
    salesGrouped[key].revenue += num(s.amount);
    salesGrouped[key].count += 1;
  }
  const salespeople = Object.values(salesGrouped).sort(
    (a, b) => b.revenue - a.revenue,
  );

  // Top customers by LTV
  const custGrouped: Record<string, { name: string; revenue: number; count: number }> = {};
  for (const s of raw.sales) {
    const key = s.customer_name || "(Walk-in)";
    if (!custGrouped[key]) custGrouped[key] = { name: key, revenue: 0, count: 0 };
    custGrouped[key].revenue += num(s.amount);
    custGrouped[key].count += 1;
  }
  const topCustomers = Object.values(custGrouped)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Customers with overdue balances
  const custOverdue: Record<string, { name: string; overdue: number; outstanding: number }> = {};
  const today = new Date(new Date().toDateString());
  for (const inv of raw.invoices) {
    const bal = num((inv as any).balance_due);
    if (bal <= 0) continue;
    const due = (inv as any).due_date;
    const isOverdue = due && new Date(due) < today;
    const key = (inv as any).customer_name || "(Unknown)";
    if (!custOverdue[key]) custOverdue[key] = { name: key, overdue: 0, outstanding: 0 };
    custOverdue[key].outstanding += bal;
    if (isOverdue) custOverdue[key].overdue += bal;
  }
  const topOverdueCustomers = Object.values(custOverdue)
    .filter((c) => c.overdue > 0)
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, 10);

  // Suppliers with outstanding balances
  const suppBalances: Record<string, { name: string; balance: number }> = {};
  for (const p of raw.purchases) {
    const bal = num((p as any).balance_due);
    if (bal <= 0) continue;
    const key = p.vendor_name || "(Unknown)";
    if (!suppBalances[key]) suppBalances[key] = { name: key, balance: 0 };
    suppBalances[key].balance += bal;
  }
  const supplierBalances = Object.values(suppBalances).sort(
    (a, b) => b.balance - a.balance,
  );

  return {
    period: {
      currentRange: (bundle as any).range ?? null,
      note: "All figures below are for the selected period unless stated otherwise.",
    },

    /* ---------- Money ---------- */
    money: {
      revenue: current.revenue,
      expenses: current.expenses,
      purchases: current.purchases,
      payroll: current.payroll,
      cogs: current.cogs,
      grossProfit: current.grossProfit,
      netProfit: current.netProfit,
      grossMarginPct: round(current.grossMargin),
      netMarginPct: round(current.netMargin),
      expenseRatioPct: round(current.expenseRatio),
      payrollPctOfRevenue: round(current.payrollPercentageOfRevenue),
      discountsGiven: current.discountsGiven,
      taxCollected: current.taxCollected,
    },

    /* ---------- Trends ---------- */
    trends: {
      revenueGrowthPct: round(trends.revenueGrowth),
      expenseGrowthPct: round(trends.expenseGrowth),
      purchaseGrowthPct: round(trends.purchaseGrowth),
      payrollGrowthPct: round(trends.payrollGrowth),
      profitGrowthPct: round(trends.profitGrowth),
      customerGrowthPct: round(trends.customerGrowth),
      orderGrowthPct: round(trends.orderGrowth),
    },

    /* ---------- Sales ---------- */
    sales: {
      averageTransactionValue: round(current.averageOrderValue),
      unitsSold: current.unitsSold,
      topProducts,
      topCategories,
      salespeople,
      byDayOfWeek,
    },

    /* ---------- Customers ---------- */
    customers: {
      total: current.customerCount,
      active: current.activeCustomers,
      inactive: current.inactiveCustomers,
      new: current.newCustomers,
      returning: current.returningCustomers,
      averageLifetimeValue: round(current.averageCustomerValue),
      retentionRatePct: round(current.customerRetention),
      topCustomers,
      topOverdueCustomers,
    },

    /* ---------- Expenses ---------- */
    expenses: {
      total: current.expenses,
      topCategories: topExpenseCategories,
    },

    /* ---------- Purchases ---------- */
    purchases: {
      total: current.purchases,
      topSuppliers,
      topProducts: topPurchaseProducts,
      supplierBalances,
    },

    /* ---------- Invoices ---------- */
    invoices: {
      totalInvoiced: current.totalInvoiced,
      totalPaid: current.totalPaid,
      outstanding: current.outstandingInvoices,
      overdue: current.overdueInvoices,
      averageInvoiceValue: round(current.averageInvoiceValue),
      averagePaymentTimeDays:
        current.averagePaymentTime !== null
          ? round(current.averagePaymentTime)
          : null,
    },

    /* ---------- Quotations ---------- */
    quotations: {
      totalIssued: current.quotationCount,
      totalValue: current.quotationValue,
      accepted: current.acceptedQuotations,
      converted: current.convertedQuotations,
      rejected: current.rejectedQuotations,
      conversionRatePct: round(current.quotationConversionRate),
      pendingPipelineValue: current.pendingPipelineValue,
    },

    /* ---------- Previous period ---------- */
    previousPeriod: {
      revenue: previous.revenue,
      expenses: previous.expenses,
      purchases: previous.purchases,
      payroll: previous.payroll,
      grossProfit: previous.grossProfit,
      netProfit: previous.netProfit,
      netMarginPct: round(previous.netMargin),
    },
  };
}

/* ---------------- helpers ---------------- */

const num = (v: number | string | null | undefined) =>
  typeof v === "number" ? v : parseFloat(String(v ?? 0)) || 0;

const round = (n: number, decimals = 2) =>
  Math.round(n * 10 ** decimals) / 10 ** decimals;

export type AIContext = ReturnType<typeof buildAIContext>;