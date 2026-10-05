import { createClient } from "@/lib/supabase/client";
import { getDateRangeBounds, getPreviousRange } from "@/lib/analytics/dates";
import { buildBundle, type AnalyticsBundle } from "@/lib/analytics/kpi-engine";
import type {
  SaleRow,
  ExpenseRow,
  PurchaseRow,
  InvoiceRow,
  QuotationRow,
  PayrollRow,
  CustomerRow,
  DateRangeKey,
  DateBounds,
} from "@/lib/analytics/types";

export interface FetchAnalyticsParams {
  businessId: string;
  filterPeriod: DateRangeKey;
  customFrom?: string;
  customTo?: string;
}

async function fetchPeriod(businessId: string, bounds: DateBounds | null) {
  const supabase = createClient();

  // -------- SALES --------
  let salesQ = supabase.from("sales").select("*").eq("business_id", businessId);
  if (bounds) salesQ = salesQ.gte("date", bounds.from).lte("date", bounds.to);
  const { data: sales } = await salesQ;

  // -------- EXPENSES --------
  let expQ = supabase
    .from("expenses")
    .select("*")
    .eq("business_id", businessId);
  if (bounds) expQ = expQ.gte("date", bounds.from).lte("date", bounds.to);
  const { data: expenses } = await expQ;

  // -------- PURCHASES --------
  let purQ = supabase
    .from("purchases")
    .select("*")
    .eq("business_id", businessId);
  if (bounds) purQ = purQ.gte("date", bounds.from).lte("date", bounds.to);
  const { data: purchases } = await purQ;

  // -------- INVOICES --------
  let invQ = supabase
    .from("invoices_with_status")
    .select("*")
    .eq("business_id", businessId);
  if (bounds)
    invQ = invQ.gte("invoice_date", bounds.from).lte("invoice_date", bounds.to);
  const { data: invoices } = await invQ;

  // -------- QUOTATIONS --------
  let quoQ = supabase
    .from("quotations_with_status")
    .select("*")
    .eq("business_id", businessId);
  if (bounds)
    quoQ = quoQ
      .gte("quotation_date", bounds.from)
      .lte("quotation_date", bounds.to);
  const { data: quotations } = await quoQ;

  // -------- PAYROLL --------
  let payQ = supabase.from("payroll").select("*").eq("business_id", businessId);
  if (bounds)
    payQ = payQ.gte("payment_date", bounds.from).lte("payment_date", bounds.to);
  const { data: payroll } = await payQ;

  // -------- CUSTOMERS --------
  // Customers are a current-state snapshot, so we don't filter by period -
  // we just read the full roster. Growth is computed via created_at.
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId);

  return {
    sales: (sales || []) as SaleRow[],
    expenses: (expenses || []) as ExpenseRow[],
    purchases: (purchases || []) as PurchaseRow[],
    invoices: (invoices || []) as InvoiceRow[],
    quotations: (quotations || []) as QuotationRow[],
    payroll: (payroll || []) as PayrollRow[],
    customers: (customers || []) as CustomerRow[],
  };
}

export async function fetchAnalyticsBundle({
  businessId,
  filterPeriod,
  customFrom,
  customTo,
}: FetchAnalyticsParams): Promise<AnalyticsBundle> {
  // Resolve current bounds
  let bounds: DateBounds | null = null;
  if (filterPeriod === "custom" && customFrom && customTo) {
    bounds = { from: customFrom, to: customTo };
  } else if (filterPeriod !== "all") {
    bounds = getDateRangeBounds(filterPeriod);
  }

  // Fetch current period
  const currentData = await fetchPeriod(businessId, bounds);

  // Fetch previous period (same length, shifted back)
  let previousData = {
    sales: [],
    expenses: [],
    purchases: [],
    invoices: [],
    quotations: [],
    payroll: [],
    customers: [],
  } as typeof currentData;

  if (bounds) {
    const prev = getPreviousRange(filterPeriod, bounds.from, bounds.to);
    if (prev) {
      previousData = await fetchPeriod(businessId, prev);
    }
  }

  return buildBundle(currentData, previousData);
}
