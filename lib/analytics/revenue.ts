import type { SaleRow } from "./types";
import { num } from "./dates";

export interface RevenueBreakdown {
  name: string;
  revenue: number;
  units: number;
  transactions: number;
}

export const getTotalRevenue = (sales: SaleRow[]) =>
  sales.reduce((s, r) => s + num(r.amount), 0);

export const getRevenueByDate = (sales: SaleRow[]) => {
  const grouped: Record<string, { date: string; revenue: number; count: number }> = {};
  for (const s of sales) {
    if (!grouped[s.date]) grouped[s.date] = { date: s.date, revenue: 0, count: 0 };
    grouped[s.date].revenue += num(s.amount);
    grouped[s.date].count += 1;
  }
  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
};

const groupRevenue = (
  sales: SaleRow[],
  keyFn: (r: SaleRow) => string,
): RevenueBreakdown[] => {
  const grouped: Record<string, RevenueBreakdown> = {};
  for (const s of sales) {
    const key = keyFn(s) || "(Unknown)";
    if (!grouped[key]) {
      grouped[key] = { name: key, revenue: 0, units: 0, transactions: 0 };
    }
    grouped[key].revenue += num(s.amount);
    grouped[key].units += s.quantity || 0;
    grouped[key].transactions += 1;
  }
  return Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
};

export const getRevenueByProduct = (sales: SaleRow[]) =>
  groupRevenue(sales, (r) => r.product_name);

export const getRevenueByCategory = (sales: SaleRow[]) =>
  groupRevenue(sales, (r) => r.category);

export const getRevenueByCustomer = (sales: SaleRow[]) =>
  groupRevenue(sales, (r) => r.customer_name);

export const getRevenueByPaymentMethod = (sales: SaleRow[]) =>
  groupRevenue(sales, (r) => r.payment_method);

export const getRevenueByEmployee = (sales: SaleRow[]) =>
  groupRevenue(sales, (r) => r.salesperson_name || "(Unassigned)");

/** Products are anything not flagged as a service. We treat service as a category named "Service" */
export const getRevenueByService = (sales: SaleRow[]) => {
  const services = sales.filter(
    (s) => (s.category || "").toLowerCase() === "service",
  );
  return getRevenueByCategory(services);
};

export const getRevenueGrowth = (current: number, previous: number) =>
  previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / Math.abs(previous)) * 100;

export const getAverageOrderValue = (sales: SaleRow[]) =>
  sales.length === 0 ? 0 : getTotalRevenue(sales) / sales.length;

export const getUnitsSold = (sales: SaleRow[]) =>
  sales.reduce((s, r) => s + (r.quantity || 0), 0);

export const getCOGS = (sales: SaleRow[]) =>
  sales.reduce((s, r) => s + num(r.cost_price) * (r.quantity || 0), 0);

export const getDiscountsGiven = (sales: SaleRow[]) =>
  sales.reduce((s, r) => s + num(r.discount_amount), 0);

export const getTaxCollected = (sales: SaleRow[]) =>
  sales.reduce((s, r) => s + num(r.tax_amount), 0);

export const getGrossProfit = (sales: SaleRow[]) =>
  getTotalRevenue(sales) - getCOGS(sales);

export const getGrossMargin = (sales: SaleRow[]) => {
  const revenue = getTotalRevenue(sales);
  if (revenue === 0) return 0;
  return (getGrossProfit(sales) / revenue) * 100;
};