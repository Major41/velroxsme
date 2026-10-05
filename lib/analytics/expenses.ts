import type { ExpenseRow } from "./types";
import { num } from "./dates";

export interface ExpenseBreakdown {
  name: string;
  amount: number;
  count: number;
}

export const getTotalExpenses = (expenses: ExpenseRow[]) =>
  expenses.reduce((s, r) => s + num(r.amount), 0);

const groupExpenses = (
  expenses: ExpenseRow[],
  keyFn: (r: ExpenseRow) => string,
): ExpenseBreakdown[] => {
  const grouped: Record<string, ExpenseBreakdown> = {};
  for (const e of expenses) {
    const key = keyFn(e) || "(Uncategorized)";
    if (!grouped[key]) grouped[key] = { name: key, amount: 0, count: 0 };
    grouped[key].amount += num(e.amount);
    grouped[key].count += 1;
  }
  return Object.values(grouped).sort((a, b) => b.amount - a.amount);
};

export const getExpensesByCategory = (expenses: ExpenseRow[]) =>
  groupExpenses(expenses, (r) => r.category);

export const getExpensesBySupplier = (expenses: ExpenseRow[]) =>
  groupExpenses(expenses, (r) => r.supplier || "(Unassigned)");

export const getExpensesByEmployee = (expenses: ExpenseRow[]) =>
  groupExpenses(expenses, (r) => r.employee_responsible || "(Unassigned)");

export const getExpensesByPaymentMethod = (expenses: ExpenseRow[]) =>
  groupExpenses(expenses, (r) => r.payment_method);

export const getExpenseGrowth = (current: number, previous: number) =>
  previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / Math.abs(previous)) * 100;

export const getExpenseRatio = (expenses: number, revenue: number) =>
  revenue === 0 ? 0 : (expenses / revenue) * 100;

export const getRecurringExpenses = (expenses: ExpenseRow[]) =>
  expenses.filter((e) => e.is_recurring).reduce((s, r) => s + num(r.amount), 0);

export const getOneOffExpenses = (expenses: ExpenseRow[]) =>
  getTotalExpenses(expenses) - getRecurringExpenses(expenses);