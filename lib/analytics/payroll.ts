import type { PayrollRow } from "./types";
import { num } from "./dates";

export const getTotalPayroll = (payroll: PayrollRow[]) =>
  payroll.reduce((s, r) => s + num(r.amount), 0);

export const getPayrollByDepartment = (payroll: PayrollRow[]) => {
  const grouped: Record<string, { name: string; total: number; count: number }> = {};
  for (const p of payroll) {
    const key = p.department || "(Unassigned)";
    if (!grouped[key]) grouped[key] = { name: key, total: 0, count: 0 };
    grouped[key].total += num(p.amount);
    grouped[key].count += 1;
  }
  return Object.values(grouped).sort((a, b) => b.total - a.total);
};

export const getPayrollByEmployee = (payroll: PayrollRow[]) => {
  const grouped: Record<string, { name: string; total: number; count: number }> = {};
  for (const p of payroll) {
    const key = p.employee_id || p.employee_name;
    if (!grouped[key]) {
      grouped[key] = { name: p.employee_name, total: 0, count: 0 };
    }
    grouped[key].total += num(p.amount);
    grouped[key].count += 1;
  }
  return Object.values(grouped).sort((a, b) => b.total - a.total);
};

export const getPayrollPercentageOfRevenue = (
  payroll: number,
  revenue: number,
) => (revenue === 0 ? 0 : (payroll / revenue) * 100);

export const getEmployeeCost = (payroll: PayrollRow[]) => {
  const unique = new Set(payroll.map((p) => p.employee_id)).size;
  return unique === 0 ? 0 : getTotalPayroll(payroll) / unique;
};

export const getPayrollGrowth = (current: number, previous: number) =>
  previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / Math.abs(previous)) * 100;