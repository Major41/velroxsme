import type { QuotationRow } from "./types";
import { num } from "./dates";

export const getQuotationCount = (quotations: QuotationRow[]) => quotations.length;

export const getQuotationValue = (quotations: QuotationRow[]) =>
  quotations.reduce((s, q) => s + num(q.total_amount), 0);

export const getAcceptedQuotations = (quotations: QuotationRow[]) =>
  quotations.filter((q) =>
    ["accepted", "converted"].includes(q.effective_status || q.status),
  ).length;

export const getRejectedQuotations = (quotations: QuotationRow[]) =>
  quotations.filter((q) =>
    ["rejected", "expired"].includes(q.effective_status || q.status),
  ).length;

export const getConvertedQuotations = (quotations: QuotationRow[]) =>
  quotations.filter((q) => (q.effective_status || q.status) === "converted").length;

export const getQuotationConversionRate = (quotations: QuotationRow[]) => {
  const decided = quotations.filter((q) =>
    ["accepted", "converted", "rejected", "expired"].includes(
      q.effective_status || q.status,
    ),
  );
  if (decided.length === 0) return 0;
  const won = decided.filter((q) =>
    ["accepted", "converted"].includes(q.effective_status || q.status),
  ).length;
  return (won / decided.length) * 100;
};

export const getAverageQuotationValue = (quotations: QuotationRow[]) =>
  quotations.length === 0 ? 0 : getQuotationValue(quotations) / quotations.length;

export const getPendingPipelineValue = (quotations: QuotationRow[]) =>
  quotations
    .filter((q) => ["draft", "sent"].includes(q.effective_status || q.status))
    .reduce((s, q) => s + num(q.total_amount), 0);