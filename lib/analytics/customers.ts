import type { CustomerRow, SaleRow } from "./types";
import { num, daysSince } from "./dates";

export const getCustomerCount = (customers: CustomerRow[]) => customers.length;

export const getActiveCustomers = (customers: CustomerRow[], days = 30) =>
  customers.filter((c) => {
    const d = daysSince(c.last_purchase_date);
    return d !== null && d <= days;
  }).length;

export const getInactiveCustomers = (customers: CustomerRow[], days = 30) =>
  customers.filter((c) => {
    const d = daysSince(c.last_purchase_date);
    return d !== null && d > days;
  }).length;

export const getNewCustomers = (customers: CustomerRow[], days = 30) =>
  customers.filter((c) => {
    const d = daysSince(c.created_at);
    return d !== null && d <= days;
  }).length;

export const getReturningCustomers = (customers: CustomerRow[]) =>
  customers.filter((c) => (c.visit_count || 0) >= 2).length;

export const getCustomerLifetimeValue = (customers: CustomerRow[]) =>
  customers.reduce((s, c) => s + num(c.total_spent), 0);

export const getAverageCustomerValue = (customers: CustomerRow[]) =>
  customers.length === 0
    ? 0
    : getCustomerLifetimeValue(customers) / customers.length;

export const getCustomerRetention = (customers: CustomerRow[], days = 30) => {
  const active = getActiveCustomers(customers, days);
  const total = customers.length;
  return total === 0 ? 0 : (active / total) * 100;
};

export const getCustomerGrowth = (current: number, previous: number) =>
  previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / Math.abs(previous)) * 100;