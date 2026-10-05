import type {
  SaleRow, ExpenseRow, PurchaseRow, InvoiceRow, QuotationRow,
  PayrollRow, CustomerRow,
} from "./types";
import { num, pctChange } from "./dates";

import {
  getTotalRevenue, getCOGS, getGrossProfit, getGrossMargin,
  getAverageOrderValue, getUnitsSold, getDiscountsGiven, getTaxCollected,
  getRevenueByProduct, getRevenueByCategory, getRevenueByCustomer,
  getRevenueByPaymentMethod, getRevenueByEmployee,
  getRevenueByDate,
} from "./revenue";

import {
  getTotalExpenses, getExpensesByCategory, getRecurringExpenses,
  getOneOffExpenses, getExpenseRatio,
} from "./expenses";

import {
  getTotalPurchases, getPurchasesBySupplier, getOutstandingPayables,
  getAveragePurchaseCost,
} from "./purchases";

import {
  getTotalInvoiced, getTotalPaid, getTotalOutstanding, getTotalOverdue,
  getAverageInvoiceValue, getAveragePaymentTime,
} from "./invoices";

import {
  getQuotationCount, getQuotationValue, getAcceptedQuotations,
  getRejectedQuotations, getConvertedQuotations, getQuotationConversionRate,
  getPendingPipelineValue,
} from "./quotations";

import {
  getTotalPayroll, getPayrollByDepartment, getEmployeeCost,
  getPayrollPercentageOfRevenue,
} from "./payroll";

import {
  getCustomerCount, getActiveCustomers, getInactiveCustomers,
  getNewCustomers, getReturningCustomers, getCustomerLifetimeValue,
  getAverageCustomerValue, getCustomerRetention,
} from "./customers";

export interface BusinessPerformance {
  // Revenue
  revenue: number;
  grossSales: number;
  netSales: number;
  discountsGiven: number;
  taxCollected: number;
  averageOrderValue: number;
  unitsSold: number;

  // Cost & profit
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  expenses: number;
  purchases: number;
  payroll: number;
  netProfit: number;
  netMargin: number;

  // Receivables
  totalInvoiced: number;
  totalPaid: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  averageInvoiceValue: number;
  averagePaymentTime: number | null;

  // Pipeline
  quotationCount: number;
  quotationValue: number;
  acceptedQuotations: number;
  rejectedQuotations: number;
  convertedQuotations: number;
  quotationConversionRate: number;
  pendingPipelineValue: number;

  // Customers
  customerCount: number;
  activeCustomers: number;
  inactiveCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerLifetimeValue: number;
  averageCustomerValue: number;
  customerRetention: number;

  // Ratios
  payrollPercentageOfRevenue: number;
  expenseRatio: number;
}

export function analyzeBusinessPerformance(
  sales: SaleRow[],
  expenses: ExpenseRow[],
  purchases: PurchaseRow[],
  invoices: InvoiceRow[],
  quotations: QuotationRow[],
  payroll: PayrollRow[],
  customers: CustomerRow[],
): BusinessPerformance {
  const revenue = getTotalRevenue(sales);
  const cogs = getCOGS(sales);
  const grossProfit = revenue - cogs;
  const expenseTotal = getTotalExpenses(expenses);
  const purchaseTotal = getTotalPurchases(purchases);
  const payrollTotal = getTotalPayroll(payroll);
  const netProfit = grossProfit - (expenseTotal + payrollTotal);

  const grossMargin = revenue === 0 ? 0 : (grossProfit / revenue) * 100;
  const netMargin = revenue === 0 ? 0 : (netProfit / revenue) * 100;

  return {
    revenue,
    grossSales: revenue, // refine later if a separate gross field exists
    netSales: revenue,
    discountsGiven: getDiscountsGiven(sales),
    taxCollected: getTaxCollected(sales),
    averageOrderValue: getAverageOrderValue(sales),
    unitsSold: getUnitsSold(sales),

    cogs,
    grossProfit,
    grossMargin,
    expenses: expenseTotal,
    purchases: purchaseTotal,
    payroll: payrollTotal,
    netProfit,
    netMargin,

    totalInvoiced: getTotalInvoiced(invoices),
    totalPaid: getTotalPaid(invoices),
    outstandingInvoices: getTotalOutstanding(invoices),
    overdueInvoices: getTotalOverdue(invoices),
    averageInvoiceValue: getAverageInvoiceValue(invoices),
    averagePaymentTime: getAveragePaymentTime(invoices),

    quotationCount: getQuotationCount(quotations),
    quotationValue: getQuotationValue(quotations),
    acceptedQuotations: getAcceptedQuotations(quotations),
    rejectedQuotations: getRejectedQuotations(quotations),
    convertedQuotations: getConvertedQuotations(quotations),
    quotationConversionRate: getQuotationConversionRate(quotations),
    pendingPipelineValue: getPendingPipelineValue(quotations),

    customerCount: getCustomerCount(customers),
    activeCustomers: getActiveCustomers(customers),
    inactiveCustomers: getInactiveCustomers(customers),
    newCustomers: getNewCustomers(customers),
    returningCustomers: getReturningCustomers(customers),
    customerLifetimeValue: getCustomerLifetimeValue(customers),
    averageCustomerValue: getAverageCustomerValue(customers),
    customerRetention: getCustomerRetention(customers),

    payrollPercentageOfRevenue: getPayrollPercentageOfRevenue(payrollTotal, revenue),
    expenseRatio: getExpenseRatio(expenseTotal, revenue),
  };
}

export interface BusinessTrends {
  revenueGrowth: number;
  expenseGrowth: number;
  purchaseGrowth: number;
  payrollGrowth: number;
  profitGrowth: number;
  customerGrowth: number;
  orderGrowth: number;
  grossMarginChange: number;
  netMarginChange: number;
}

export function analyzeBusinessTrends(
  current: BusinessPerformance,
  previous: BusinessPerformance,
): BusinessTrends {
  return {
    revenueGrowth: pctChange(current.revenue, previous.revenue),
    expenseGrowth: pctChange(current.expenses, previous.expenses),
    purchaseGrowth: pctChange(current.purchases, previous.purchases),
    payrollGrowth: pctChange(current.payroll, previous.payroll),
    profitGrowth: pctChange(current.netProfit, previous.netProfit),
    customerGrowth: pctChange(current.customerCount, previous.customerCount),
    orderGrowth: pctChange(current.unitsSold, previous.unitsSold),
    grossMarginChange: current.grossMargin - previous.grossMargin,
    netMarginChange: current.netMargin - previous.netMargin,
  };
}

/** A single container that pages consume directly */
export interface AnalyticsBundle {
  current: BusinessPerformance;
  previous: BusinessPerformance;
  trends: BusinessTrends;
  raw: {
    sales: SaleRow[];
    expenses: ExpenseRow[];
    purchases: PurchaseRow[];
    invoices: InvoiceRow[];
    quotations: QuotationRow[];
    payroll: PayrollRow[];
    customers: CustomerRow[];
  };
}

export function buildBundle(
  currentData: {
    sales: SaleRow[]; expenses: ExpenseRow[]; purchases: PurchaseRow[];
    invoices: InvoiceRow[]; quotations: QuotationRow[];
    payroll: PayrollRow[]; customers: CustomerRow[];
  },
  previousData: {
    sales: SaleRow[]; expenses: ExpenseRow[]; purchases: PurchaseRow[];
    invoices: InvoiceRow[]; quotations: QuotationRow[];
    payroll: PayrollRow[]; customers: CustomerRow[];
  },
): AnalyticsBundle {
  const current = analyzeBusinessPerformance(
    currentData.sales, currentData.expenses, currentData.purchases,
    currentData.invoices, currentData.quotations, currentData.payroll,
    currentData.customers,
  );
  const previous = analyzeBusinessPerformance(
    previousData.sales, previousData.expenses, previousData.purchases,
    previousData.invoices, previousData.quotations, previousData.payroll,
    previousData.customers,
  );
  const trends = analyzeBusinessTrends(current, previous);

  return { current, previous, trends, raw: currentData };
}