import type { SaleRow, ExpenseRow, PurchaseRow, PayrollRow } from "./types";
import { num } from "./dates";
import { getTotalRevenue, getCOGS, getGrossProfit } from "./revenue";
import { getTotalExpenses } from "./expenses";
import { getTotalPurchases } from "./purchases";

export interface ProfitBreakdown {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  purchases: number;
  payroll: number;
  totalOperatingCosts: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
}

export const getTotalPayroll = (payroll: PayrollRow[]) =>
  payroll.reduce((s, r) => s + num(r.amount), 0);

/**
 * Full P&L for a period.
 *
 * NOTE: In an ideal accounting model, purchases feed into COGS, not both.
 * Since your purchases table tracks inventory buys and your sales track
 * unit cost, we treat them as separate streams:
 *   COGS = sales.cost_price × quantity (what actually left inventory)
 *   Purchases = what was bought (reported separately for cash flow)
 *
 * This avoids double counting and matches how SMEs see their money.
 */
export const computeProfit = (
  sales: SaleRow[],
  expenses: ExpenseRow[],
  purchases: PurchaseRow[],
  payroll: PayrollRow[],
): ProfitBreakdown => {
  const revenue = getTotalRevenue(sales);
  const cogs = getCOGS(sales);
  const grossProfit = revenue - cogs;
  const expenseTotal = getTotalExpenses(expenses);
  const purchaseTotal = getTotalPurchases(purchases);
  const payrollTotal = getTotalPayroll(payroll);

  const totalOperatingCosts = expenseTotal + payrollTotal;
  const netProfit = grossProfit - totalOperatingCosts;

  const grossMargin = revenue === 0 ? 0 : (grossProfit / revenue) * 100;
  const netMargin = revenue === 0 ? 0 : (netProfit / revenue) * 100;

  return {
    revenue,
    cogs,
    grossProfit,
    expenses: expenseTotal,
    purchases: purchaseTotal,
    payroll: payrollTotal,
    totalOperatingCosts,
    netProfit,
    grossMargin,
    netMargin,
  };
};

export const getProfitGrowth = (current: number, previous: number) =>
  previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / Math.abs(previous)) * 100;