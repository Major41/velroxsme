export type DateRangeKey =
  | "today" | "yesterday" | "this_week" | "last_week"
  | "this_month" | "last_month" | "this_quarter" | "last_quarter"
  | "this_year" | "last_year" | "custom" | "all";

export interface DateBounds {
  from: string;
  to: string;
}

export interface SaleRow {
  id: string;
  date: string;
  product_name: string;
  category: string;
  customer_name: string;
  customer_phone: string;
  quantity: number;
  unit_price: number | string;
  amount: number | string;
  payment_method: string;
  payment_status: string;
  status: string;
  cost_price?: number | string | null;
  discount_amount?: number | string | null;
  tax_amount?: number | string | null;
  salesperson_name?: string | null;
  salesperson_id?: string | null;
}

export interface ExpenseRow {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number | string;
  payment_method: string;
  status: string;
  supplier?: string | null;
  employee_responsible?: string | null;
  tax_amount?: number | string | null;
  is_recurring?: boolean | null;
}

export interface PurchaseRow {
  id: string;
  date: string;
  vendor_name: string;
  category: string;
  description: string;
  quantity: number;
  unit_price: number | string;
  total_amount: number | string;
  payment_method: string;
  status: string;
  amount_paid?: number | string | null;
  balance_due?: number | string | null;
  due_date?: string | null;
  discount_amount?: number | string | null;
  tax_amount?: number | string | null;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  effective_status?: string | null;
  total_amount: number | string;
  amount_paid: number | string;
  balance_due: number | string;
  paid_at?: string | null;
}

export interface QuotationRow {
  id: string;
  quotation_number: string;
  customer_name: string;
  quotation_date: string;
  expiry_date: string | null;
  status: string;
  effective_status?: string | null;
  total_amount: number | string;
  converted_at?: string | null;
}

export interface PayrollRow {
  id: string;
  employee_id: string;
  employee_name: string;
  amount: number | string;
  payment_date: string;
  payment_month: string;
  department?: string | null;
  basic_salary?: number | string | null;
  allowances?: number | string | null;
  overtime?: number | string | null;
  bonuses?: number | string | null;
  commissions?: number | string | null;
  deductions?: number | string | null;
  employer_costs?: number | string | null;
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  total_spent: number | string;
  visit_count: number;
  last_purchase_date: string;
  first_purchase_date: string;
  status: "active" | "inactive";
  created_at: string;
}