"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  User,
  Package,
  Receipt,
  Save,
  X,
  Calendar,
} from "lucide-react";

export interface InvoiceItemRow {
  _key: string;
  id?: string;
  position: number;
  product_name: string;
  description: string;
  category: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
}

interface InitialInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  tax_rate: number | string;
  discount_amount: number | string;
  amount_paid: number | string;
  payment_method: string | null;
  terms: string;
  notes: string;
  items?: Array<{
    id?: string;
    position: number;
    product_name: string;
    description: string;
    category: string;
    quantity: number | string;
    unit_price: number | string;
    discount_amount: number | string;
  }>;
}

interface Props {
  businessId: string;
  initialInvoice: InitialInvoice | null;
  onClose: () => void;
  onSaved: () => void;
}

const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();
const num = (v: string | number) =>
  typeof v === "number" ? v : parseFloat(v) || 0;
const fmt = (n: number) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const newRow = (position: number): InvoiceItemRow => ({
  _key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  position,
  product_name: "",
  description: "",
  category: "",
  quantity: "1",
  unit_price: "",
  discount_amount: "0",
});

export function InvoiceForm({
  businessId,
  initialInvoice,
  onClose,
  onSaved,
}: Props) {
  const supabase = createClient();
  const isEdit = !!initialInvoice;

  const [header, setHeader] = useState({
    customer_name: initialInvoice?.customer_name || "",
    customer_phone: initialInvoice?.customer_phone || "",
    customer_email: initialInvoice?.customer_email || "",
    customer_address: initialInvoice?.customer_address || "",
    invoice_date:
      initialInvoice?.invoice_date?.split("T")[0] ||
      new Date().toISOString().split("T")[0],
    due_date: initialInvoice?.due_date
      ? initialInvoice.due_date.split("T")[0]
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
    status: initialInvoice?.status || "draft",
    tax_rate: String(initialInvoice?.tax_rate ?? 0),
    discount_amount: String(initialInvoice?.discount_amount ?? 0),
    amount_paid: String(initialInvoice?.amount_paid ?? 0),
    payment_method: initialInvoice?.payment_method || "M-Pesa",
    terms:
      initialInvoice?.terms ||
      "1. Payment is due by the date shown above.\n2. Please quote the invoice number on all payments.",
    notes: initialInvoice?.notes || "",
  });

  const [items, setItems] = useState<InvoiceItemRow[]>(() => {
    if (initialInvoice?.items && initialInvoice.items.length > 0) {
      return initialInvoice.items.map((it) => ({
        _key: it.id || `row-${Math.random().toString(36).slice(2, 7)}`,
        id: it.id,
        position: it.position,
        product_name: it.product_name || "",
        description: it.description || "",
        category: it.category || "",
        quantity: String(it.quantity ?? "1"),
        unit_price: String(it.unit_price ?? ""),
        discount_amount: String(it.discount_amount ?? "0"),
      }));
    }
    return [newRow(1)];
  });

  const [historyInvoices, setHistoryInvoices] = useState<any[]>([]);
  const [productHistory, setProductHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const [{ data: hist }, { data: qItems }, { data: sales }] =
        await Promise.all([
          supabase
            .from("invoices")
            .select(
              "customer_name, customer_phone, customer_email, customer_address",
            )
            .eq("business_id", businessId)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("invoice_items")
            .select("product_name, category, unit_price")
            .limit(500),
          supabase
            .from("sales")
            .select("product_name, category, unit_price")
            .eq("business_id", businessId)
            .limit(500),
        ]);
      setHistoryInvoices(hist || []);
      setProductHistory([...(qItems || []), ...(sales || [])]);
    })();
  }, [businessId]);

  const customerSuggestions = useMemo(() => {
    const map = new Map<string, any>();
    for (const q of historyInvoices) {
      const raw = q.customer_name || "";
      const key = norm(raw);
      if (!key) continue;
      const ex = map.get(key);
      if (ex) ex.count += 1;
      else map.set(key, { key, label: raw.trim(), source: q, count: 1 });
    }
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    );
  }, [historyInvoices]);

  const productSuggestions = useMemo(() => {
    const map = new Map<string, { label: string; item: any; count: number }>();
    for (const p of productHistory) {
      const raw = p.product_name || "";
      const key = norm(raw);
      if (!key) continue;
      const ex = map.get(key);
      if (ex) ex.count += 1;
      else map.set(key, { label: raw.trim(), item: p, count: 1 });
    }
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    );
  }, [productHistory]);

  const findProduct = (value: string) => {
    const k = norm(value);
    if (!k) return undefined;
    return productSuggestions.find((s) => norm(s.label) === k);
  };

  const handleCustomerNameChange = (value: string) => {
    const match = customerSuggestions.find((s) => s.key === norm(value));
    setHeader((prev) => ({
      ...prev,
      customer_name: match ? match.label : value,
      customer_phone:
        match && !prev.customer_phone.trim()
          ? match.source.customer_phone || prev.customer_phone
          : prev.customer_phone,
      customer_email:
        match && !prev.customer_email.trim()
          ? match.source.customer_email || prev.customer_email
          : prev.customer_email,
      customer_address:
        match && !prev.customer_address.trim()
          ? match.source.customer_address || prev.customer_address
          : prev.customer_address,
    }));
  };

  const updateItem = (key: string, patch: Partial<InvoiceItemRow>) =>
    setItems((prev) =>
      prev.map((it) => (it._key === key ? { ...it, ...patch } : it)),
    );

  const handleProductChange = (key: string, value: string) => {
    const match = findProduct(value);
    if (match) {
      updateItem(key, {
        product_name: match.label,
        category: match.item.category || "",
        unit_price: match.item.unit_price
          ? String(match.item.unit_price)
          : undefined,
      });
    } else {
      updateItem(key, { product_name: value });
    }
  };

  const addRow = () => setItems((p) => [...p, newRow(p.length + 1)]);
  const removeRow = (key: string) => {
    if (items.length === 1) return;
    setItems((prev) =>
      prev
        .filter((it) => it._key !== key)
        .map((it, i) => ({ ...it, position: i + 1 })),
    );
  };

  const lineTotal = (it: InvoiceItemRow) =>
    Math.max(0, num(it.quantity) * num(it.unit_price) - num(it.discount_amount));

  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const discount = num(header.discount_amount);
  const taxRate = num(header.tax_rate);
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * taxRate) / 100;
  const total = taxable + tax;
  const paid = num(header.amount_paid);
  const balance = Math.max(0, total - paid);

  const handleSave = async (overrideStatus?: string) => {
    if (!businessId) return;
    setSaving(true);
    setError("");

    try {
      if (!header.customer_name.trim()) throw new Error("Customer name is required");
      const validItems = items.filter(
        (it) => it.product_name.trim() && num(it.quantity) > 0,
      );
      if (validItems.length === 0)
        throw new Error("Add at least one item");

      const statusToSave = overrideStatus || header.status;

      // Auto-derive paid/partially_paid if amount matches
      let finalStatus = statusToSave;
      if (paid >= total && total > 0) finalStatus = "paid";
      else if (paid > 0 && paid < total) finalStatus = "partially_paid";

      if (!isEdit) {
        const { data: numberData, error: numErr } = await supabase.rpc(
          "generate_invoice_number",
          { p_business_id: businessId },
        );
        if (numErr) throw numErr;

        const { data: created, error: insErr } = await supabase
          .from("invoices")
          .insert([
            {
              business_id: businessId,
              invoice_number: numberData,
              customer_name: header.customer_name.trim(),
              customer_phone: header.customer_phone.trim(),
              customer_email: header.customer_email.trim(),
              customer_address: header.customer_address.trim(),
              invoice_date: header.invoice_date,
              due_date: header.due_date || null,
              status: finalStatus,
              subtotal,
              discount_amount: discount,
              tax_rate: taxRate,
              tax_amount: tax,
              total_amount: total,
              amount_paid: paid,
              balance_due: balance,
              payment_method: paid > 0 ? header.payment_method : null,
              paid_at: finalStatus === "paid" ? new Date().toISOString() : null,
              terms: header.terms,
              notes: header.notes,
            },
          ])
          .select()
          .single();
        if (insErr) throw insErr;

        const { error: itemErr } = await supabase
          .from("invoice_items")
          .insert(
            validItems.map((it, i) => ({
              invoice_id: created.id,
              position: i + 1,
              product_name: it.product_name.trim(),
              description: it.description.trim(),
              category: it.category.trim(),
              quantity: num(it.quantity),
              unit_price: num(it.unit_price),
              discount_amount: num(it.discount_amount),
              line_total: lineTotal(it),
            })),
          );
        if (itemErr) throw itemErr;
      } else {
        const { error: updErr } = await supabase
          .from("invoices")
          .update({
            customer_name: header.customer_name.trim(),
            customer_phone: header.customer_phone.trim(),
            customer_email: header.customer_email.trim(),
            customer_address: header.customer_address.trim(),
            invoice_date: header.invoice_date,
            due_date: header.due_date || null,
            status: finalStatus,
            subtotal,
            discount_amount: discount,
            tax_rate: taxRate,
            tax_amount: tax,
            total_amount: total,
            amount_paid: paid,
            balance_due: balance,
            payment_method: paid > 0 ? header.payment_method : null,
            paid_at: finalStatus === "paid" ? new Date().toISOString() : null,
            terms: header.terms,
            notes: header.notes,
          })
          .eq("id", initialInvoice!.id);
        if (updErr) throw updErr;

        await supabase
          .from("invoice_items")
          .delete()
          .eq("invoice_id", initialInvoice!.id);

        const { error: insErr } = await supabase
          .from("invoice_items")
          .insert(
            validItems.map((it, i) => ({
              invoice_id: initialInvoice!.id,
              position: i + 1,
              product_name: it.product_name.trim(),
              description: it.description.trim(),
              category: it.category.trim(),
              quantity: num(it.quantity),
              unit_price: num(it.unit_price),
              discount_amount: num(it.discount_amount),
              line_total: lineTotal(it),
            })),
          );
        if (insErr) throw insErr;
      }

      onSaved();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Receipt className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEdit ? "Edit Invoice" : "New Invoice"}
              </h2>
              {isEdit && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {initialInvoice!.invoice_number}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Customer */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" /> Customer
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Name *
                </label>
                <Input
                  list="inv-customer-names"
                  value={header.customer_name}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white"
                  autoComplete="off"
                />
                <datalist id="inv-customer-names">
                  {customerSuggestions.map((s) => (
                    <option key={s.key} value={s.label} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Phone
                </label>
                <Input
                  value={header.customer_phone}
                  onChange={(e) =>
                    setHeader({ ...header, customer_phone: e.target.value })
                  }
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={header.customer_email}
                  onChange={(e) =>
                    setHeader({ ...header, customer_email: e.target.value })
                  }
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Address
                </label>
                <Input
                  value={header.customer_address}
                  onChange={(e) =>
                    setHeader({ ...header, customer_address: e.target.value })
                  }
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Dates & status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Invoice Date
              </label>
              <Input
                type="date"
                value={header.invoice_date}
                onChange={(e) =>
                  setHeader({ ...header, invoice_date: e.target.value })
                }
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due Date
              </label>
              <Input
                type="date"
                value={header.due_date}
                onChange={(e) =>
                  setHeader({ ...header, due_date: e.target.value })
                }
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1">Status</label>
              <Select
                value={header.status}
                onValueChange={(v) => setHeader({ ...header, status: v })}
              >
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1">Tax Rate (%)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={header.tax_rate}
                onChange={(e) =>
                  setHeader({ ...header, tax_rate: e.target.value })
                }
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" /> Items
              </h3>
              <Button
                type="button"
                onClick={addRow}
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 px-1 font-medium">Product *</th>
                    <th className="text-left py-2 px-1 font-medium">Category</th>
                    <th className="text-right py-2 px-1 font-medium w-20">Qty</th>
                    <th className="text-right py-2 px-1 font-medium w-28">Unit Price</th>
                    <th className="text-right py-2 px-1 font-medium w-24">Discount</th>
                    <th className="text-right py-2 px-1 font-medium w-28">Line Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it._key} className="border-b border-slate-800/60">
                      <td className="py-2 px-1">
                        <Input
                          list="inv-product-names"
                          value={it.product_name}
                          onChange={(e) => handleProductChange(it._key, e.target.value)}
                          className="bg-slate-950 border-slate-700 text-white text-sm"
                          autoComplete="off"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input
                          value={it.category}
                          onChange={(e) =>
                            updateItem(it._key, { category: e.target.value })
                          }
                          className="bg-slate-950 border-slate-700 text-white text-sm"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(it._key, { quantity: e.target.value })
                          }
                          className="bg-slate-950 border-slate-700 text-white text-sm text-right"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.unit_price}
                          onChange={(e) =>
                            updateItem(it._key, { unit_price: e.target.value })
                          }
                          className="bg-slate-950 border-slate-700 text-white text-sm text-right"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.discount_amount}
                          onChange={(e) =>
                            updateItem(it._key, {
                              discount_amount: e.target.value,
                            })
                          }
                          className="bg-slate-950 border-slate-700 text-white text-sm text-right"
                        />
                      </td>
                      <td className="py-2 px-1 text-right text-slate-200 font-medium whitespace-nowrap">
                        KSh {fmt(lineTotal(it))}
                      </td>
                      <td className="py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(it._key)}
                          disabled={items.length === 1}
                          className="p-1 hover:bg-slate-800 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="inv-product-names">
                {productSuggestions.map((s) => (
                  <option key={s.label} value={s.label} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Totals + payment */}
          <div className="flex flex-col md:flex-row md:justify-between gap-4 pt-3 border-t border-slate-800">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Header Discount (KSh)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={header.discount_amount}
                  onChange={(e) =>
                    setHeader({ ...header, discount_amount: e.target.value })
                  }
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Amount Paid (KSh)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={header.amount_paid}
                  onChange={(e) =>
                    setHeader({ ...header, amount_paid: e.target.value })
                  }
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Payment Method
                </label>
                <Select
                  value={header.payment_method}
                  onValueChange={(v) =>
                    setHeader({ ...header, payment_method: v })
                  }
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="w-full md:w-72 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span>KSh {fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Discount</span>
                <span>- KSh {fmt(discount)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Tax ({taxRate}%)</span>
                <span>KSh {fmt(tax)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-slate-700">
                <span>Total</span>
                <span>KSh {fmt(total)}</span>
              </div>
              <div className="flex justify-between text-emerald-300">
                <span>Amount Paid</span>
                <span>KSh {fmt(paid)}</span>
              </div>
              <div className="flex justify-between text-amber-300 font-bold">
                <span>Balance Due</span>
                <span>KSh {fmt(balance)}</span>
              </div>
            </div>
          </div>

          {/* Terms & notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Terms & Conditions
              </label>
              <Textarea
                value={header.terms}
                onChange={(e) =>
                  setHeader({ ...header, terms: e.target.value })
                }
                rows={4}
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Internal Notes
              </label>
              <Textarea
                value={header.notes}
                onChange={(e) =>
                  setHeader({ ...header, notes: e.target.value })
                }
                rows={4}
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end p-5 border-t border-slate-800">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSave("draft")}
            disabled={saving}
            variant="outline"
            className="border-blue-600 text-blue-300 hover:bg-blue-950"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            onClick={() => handleSave("sent")}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : isEdit ? "Update Invoice" : "Save & Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}