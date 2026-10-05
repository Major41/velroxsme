import type { InvoiceRow } from "./types";
import { num } from "./dates";

export const getTotalInvoiced = (invoices: InvoiceRow[]) =>
  invoices.reduce((s, r) => s + num(r.total_amount), 0);

export const getTotalPaid = (invoices: InvoiceRow[]) =>
  invoices.reduce((s, r) => s + num(r.amount_paid), 0);

export const getTotalOutstanding = (invoices: InvoiceRow[]) =>
  invoices.reduce((s, r) => s + num(r.balance_due), 0);

export const getTotalOverdue = (invoices: InvoiceRow[]) => {
  const today = new Date(new Date().toDateString());
  return invoices
    .filter(
      (r) =>
        r.due_date &&
        num(r.balance_due) > 0 &&
        new Date(r.due_date) < today,
    )
    .reduce((s, r) => s + num(r.balance_due), 0);
};

export const getAverageInvoiceValue = (invoices: InvoiceRow[]) =>
  invoices.length === 0 ? 0 : getTotalInvoiced(invoices) / invoices.length;

export const getAveragePaymentTime = (invoices: InvoiceRow[]) => {
  const paid = invoices.filter((r) => r.paid_at && r.invoice_date);
  if (paid.length === 0) return null;
  const totalDays = paid.reduce((s, r) => {
    const start = new Date(r.invoice_date).getTime();
    const end = new Date(r.paid_at as string).getTime();
    return s + Math.max(0, Math.round((end - start) / 86400000));
  }, 0);
  return totalDays / paid.length;
};

export const getInvoiceConversionRate = (invoices: InvoiceRow[]) => {
  const decided = invoices.filter((i) =>
    ["paid", "partially_paid", "overdue", "sent"].includes(
      i.effective_status || i.status,
    ),
  );
  const paid = invoices.filter(
    (i) => (i.effective_status || i.status) === "paid",
  );
  if (decided.length === 0) return 0;
  return (paid.length / decided.length) * 100;
};