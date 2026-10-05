import type { PurchaseRow } from "./types";
import { num } from "./dates";

export interface PurchaseBreakdown {
  name: string;
  total: number;
  count: number;
  units: number;
}

export const getTotalPurchases = (purchases: PurchaseRow[]) =>
  purchases.reduce((s, p) => s + num(p.total_amount), 0);

const groupPurchases = (
  purchases: PurchaseRow[],
  keyFn: (r: PurchaseRow) => string,
): PurchaseBreakdown[] => {
  const grouped: Record<string, PurchaseBreakdown> = {};
  for (const p of purchases) {
    const key = keyFn(p) || "(Unknown)";
    if (!grouped[key]) grouped[key] = { name: key, total: 0, count: 0, units: 0 };
    grouped[key].total += num(p.total_amount);
    grouped[key].count += 1;
    grouped[key].units += p.quantity || 0;
  }
  return Object.values(grouped).sort((a, b) => b.total - a.total);
};

export const getPurchasesBySupplier = (purchases: PurchaseRow[]) =>
  groupPurchases(purchases, (r) => r.vendor_name);

export const getPurchasesByProduct = (purchases: PurchaseRow[]) =>
  groupPurchases(purchases, (r) => r.description);

export const getPurchasesByCategory = (purchases: PurchaseRow[]) =>
  groupPurchases(purchases, (r) => r.category);

export const getPurchaseGrowth = (current: number, previous: number) =>
  previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / Math.abs(previous)) * 100;

export const getAveragePurchaseCost = (purchases: PurchaseRow[]) =>
  purchases.length === 0 ? 0 : getTotalPurchases(purchases) / purchases.length;

export const getOutstandingPayables = (purchases: PurchaseRow[]) =>
  purchases.reduce((s, p) => s + num(p.balance_due), 0);