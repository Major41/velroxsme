"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";
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
  FileText,
  Save,
  X,
  Calendar,
} from "lucide-react";

/* ==================================================================== */
/*  TYPES                                                               */
/* ==================================================================== */

export interface QuotationItemRow {
  /** Used only for React keys; not persisted */
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

interface InitialQuotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  quotation_date: string;
  expiry_date: string | null;
  status: string;
  tax_rate: number | string;
  discount_amount: number | string;
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
  initialQuotation: InitialQuotation | null;
  onClose: () => void;
  onSaved: () => void;
}

interface Suggestion {
  key: string;
  label: string;
  source: any;
  count: number;
}

const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();
const num = (v: string | number) =>
  typeof v === "number" ? v : parseFloat(v) || 0;
const fmt = (n: number) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const newRow = (position: number): QuotationItemRow => ({
  _key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  position,
  product_name: "",
  description: "",
  category: "",
  quantity: "1",
  unit_price: "",
  discount_amount: "0",
});

/* ==================================================================== */
/*  COMPONENT                                                           */
/* ==================================================================== */

export function QuotationForm({
  businessId,
  initialQuotation,
  onClose,
  onSaved,
}: Props) {
  const { business } = useBusiness();
  const supabase = createClient();

  const isEdit = !!initialQuotation;

  /* ---------------------------------------------------------------- */
  /*  HEADER STATE                                                    */
  /* ---------------------------------------------------------------- */

  const [header, setHeader] = useState({
    customer_name: initialQuotation?.customer_name || "",
    customer_phone: initialQuotation?.customer_phone || "",
    customer_email: initialQuotation?.customer_email || "",
    customer_address: initialQuotation?.customer_address || "",
    quotation_date:
      initialQuotation?.quotation_date?.split("T")[0] ||
      new Date().toISOString().split("T")[0],
    expiry_date: initialQuotation?.expiry_date
      ? initialQuotation.expiry_date.split("T")[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
    status: initialQuotation?.status || "draft",
    tax_rate: String(initialQuotation?.tax_rate ?? 0),
    discount_amount: String(initialQuotation?.discount_amount ?? 0),
    terms:
      initialQuotation?.terms ||
      "1. Quotation valid until the expiry date shown above.\n2. Prices are subject to change after expiry.\n3. Payment terms to be agreed upon acceptance.",
    notes: initialQuotation?.notes || "",
  });

  /* ---------------------------------------------------------------- */
  /*  ITEMS STATE                                                     */
  /* ---------------------------------------------------------------- */

  const [items, setItems] = useState<QuotationItemRow[]>(() => {
    if (initialQuotation?.items && initialQuotation.items.length > 0) {
      return initialQuotation.items.map((it) => ({
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

  /* ---------------------------------------------------------------- */
  /*  HISTORY (for autocomplete)                                      */
  /* ---------------------------------------------------------------- */

  const [historyQuotes, setHistoryQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const { data } = await supabase
        .from("quotations")
        .select(
          "customer_name, customer_phone, customer_email, customer_address",
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(200);
      setHistoryQuotes(data || []);
    })();
  }, [businessId]);

  /* ---------------------------------------------------------------- */
  /*  BUILD SUGGESTIONS                                               */
  /* ---------------------------------------------------------------- */

  const buildSuggestions = (field: string): Suggestion[] => {
    const map = new Map<string, Suggestion>();
    for (const q of historyQuotes) {
      const raw = (q[field] as string) || "";
      const key = norm(raw);
      if (!key) continue;
      const ex = map.get(key);
      if (ex) ex.count += 1;
      else map.set(key, { key, label: raw.trim(), source: q, count: 1 });
    }
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    );
  };

  const customerSuggestions = useMemo(
    () => buildSuggestions("customer_name"),
    [historyQuotes],
  );
  const phoneSuggestions = useMemo(
    () => buildSuggestions("customer_phone"),
    [historyQuotes],
  );
  const emailSuggestions = useMemo(
    () => buildSuggestions("customer_email"),
    [historyQuotes],
  );

  /* Product suggestions come from past quotation items + past sales */
  const [productHistory, setProductHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const [{ data: qItems }, { data: sales }] = await Promise.all([
        supabase
          .from("quotation_items")
          .select("product_name, category, unit_price")
          .limit(500),
        supabase
          .from("sales")
          .select("product_name, category, unit_price")
          .eq("business_id", businessId)
          .limit(500),
      ]);
      setProductHistory([...(qItems || []), ...(sales || [])]);
    })();
  }, [businessId]);

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

  /* ---------------------------------------------------------------- */
  /*  CUSTOMER AUTO-FILL                                              */
  /* ---------------------------------------------------------------- */

  const handleCustomerNameChange = (value: string) => {
    const k = norm(value);
    const match = customerSuggestions.find((s) => s.key === k);
    setHeader((prev) => ({
      ...prev,
      customer_name: match ? match.label : value,
      customer_phone: match && !prev.customer_phone.trim()
        ? match.source.customer_phone || prev.customer_phone
        : prev.customer_phone,
      customer_email: match && !prev.customer_email.trim()
        ? match.source.customer_email || prev.customer_email
        : prev.customer_email,
      customer_address: match && !prev.customer_address.trim()
        ? match.source.customer_address || prev.customer_address
        : prev.customer_address,
    }));
  };

  const handleCustomerPhoneChange = (value: string) => {
    const k = norm(value);
    const match = phoneSuggestions.find((s) => s.key === k);
    setHeader((prev) => ({
      ...prev,
      customer_phone: match ? match.label : value,
      customer_name:
        match && !prev.customer_name.trim()
          ? match.source.customer_name || prev.customer_name
          : prev.customer_name,
    }));
  };

  /* ---------------------------------------------------------------- */
  /*  ITEM HANDLERS                                                    */
  /* ---------------------------------------------------------------- */

  const updateItem = (
    key: string,
    patch: Partial<QuotationItemRow>,
  ) => {
    setItems((prev) =>
      prev.map((it) => (it._key === key ? { ...it, ...patch } : it)),
    );
  };

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

  const addRow = () => {
    setItems((prev) => [...prev, newRow(prev.length + 1)]);
  };

  const removeRow = (key: string) => {
    if (items.length === 1) return;
    setItems((prev) =>
      prev
        .filter((it) => it._key !== key)
        .map((it, i) => ({ ...it, position: i + 1 })),
    );
  };

  /* ---------------------------------------------------------------- */
  /*  LIVE TOTALS                                                     */
  /* ---------------------------------------------------------------- */

  const lineTotal = (it: QuotationItemRow) =>
    Math.max(
      0,
      num(it.quantity) * num(it.unit_price) - num(it.discount_amount),
    );

  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const discount = num(header.discount_amount);
  const taxRate = num(header.tax_rate);
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * taxRate) / 100;
  const total = taxable + tax;

  /* ---------------------------------------------------------------- */
  /*  SAVE                                                            */
  /* ---------------------------------------------------------------- */

  const handleSave = async (saveStatus?: string) => {
    if (!businessId) return;
    setSaving(true);
    setError("");

    try {
      if (!header.customer_name.trim()) {
        throw new Error("Customer name is required");
      }
      const validItems = items.filter(
        (it) => it.product_name.trim() && num(it.quantity) > 0,
      );
      if (validItems.length === 0) {
        throw new Error("Add at least one item with a name and quantity");
      }

      const statusToSave = saveStatus || header.status;

      /* ---------- CREATE ---------- */
      if (!isEdit) {
        // Get number from RPC
        const { data: numberData, error: numberErr } = await supabase.rpc(
          "generate_quotation_number",
          { p_business_id: businessId },
        );
        if (numberErr) throw numberErr;

        const { data: created, error: insertErr } = await supabase
          .from("quotations")
          .insert([
            {
              business_id: businessId,
              quotation_number: numberData,
              customer_name: header.customer_name.trim(),
              customer_phone: header.customer_phone.trim(),
              customer_email: header.customer_email.trim(),
              customer_address: header.customer_address.trim(),
              quotation_date: header.quotation_date,
              expiry_date: header.expiry_date || null,
              status: statusToSave,
              subtotal,
              discount_amount: discount,
              tax_rate: taxRate,
              tax_amount: tax,
              total_amount: total,
              terms: header.terms,
              notes: header.notes,
            },
          ])
          .select()
          .single();
        if (insertErr) throw insertErr;

        const { error: itemErr } = await supabase
          .from("quotation_items")
          .insert(
            validItems.map((it, i) => ({
              quotation_id: created.id,
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
        /* ---------- UPDATE ---------- */
        const { error: updErr } = await supabase
          .from("quotations")
          .update({
            customer_name: header.customer_name.trim(),
            customer_phone: header.customer_phone.trim(),
            customer_email: header.customer_email.trim(),
            customer_address: header.customer_address.trim(),
            quotation_date: header.quotation_date,
            expiry_date: header.expiry_date || null,
            status: statusToSave,
            subtotal,
            discount_amount: discount,
            tax_rate: taxRate,
            tax_amount: tax,
            total_amount: total,
            terms: header.terms,
            notes: header.notes,
          })
          .eq("id", initialQuotation!.id);
        if (updErr) throw updErr;

        // Simplest strategy: delete all items, re-insert
        const { error: delErr } = await supabase
          .from("quotation_items")
          .delete()
          .eq("quotation_id", initialQuotation!.id);
        if (delErr) throw delErr;

        const { error: insErr } = await supabase
          .from("quotation_items")
          .insert(
            validItems.map((it, i) => ({
              quotation_id: initialQuotation!.id,
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
      console.error("Save error:", err);
      setError(err.message || "Failed to save quotation");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl my-8">
        {/* Header bar */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEdit ? "Edit Quotation" : "New Quotation"}
              </h2>
              {isEdit && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {initialQuotation!.quotation_number}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* ------- Customer ------- */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              Customer
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Name *
                </label>
                <Input
                  list="q-customer-names"
                  value={header.customer_name}
                  onChange={(e) =>
                    handleCustomerNameChange(e.target.value)
                  }
                  placeholder="Customer name"
                  className="bg-slate-950 border-slate-700 text-white"
                  autoComplete="off"
                />
                <datalist id="q-customer-names">
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
                  list="q-customer-phones"
                  value={header.customer_phone}
                  onChange={(e) =>
                    handleCustomerPhoneChange(e.target.value)
                  }
                  placeholder="+254 ..."
                  className="bg-slate-950 border-slate-700 text-white"
                  autoComplete="off"
                />
                <datalist id="q-customer-phones">
                  {phoneSuggestions.map((s) => (
                    <option key={s.key} value={s.label} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  list="q-customer-emails"
                  value={header.customer_email}
                  onChange={(e) =>
                    setHeader({ ...header, customer_email: e.target.value })
                  }
                  placeholder="customer@example.com"
                  className="bg-slate-950 border-slate-700 text-white"
                  autoComplete="off"
                />
                <datalist id="q-customer-emails">
                  {emailSuggestions.map((s) => (
                    <option key={s.key} value={s.label} />
                  ))}
                </datalist>
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
                  placeholder="Street, City"
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* ------- Dates & status ------- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Quote Date
              </label>
              <Input
                type="date"
                value={header.quotation_date}
                onChange={(e) =>
                  setHeader({ ...header, quotation_date: e.target.value })
                }
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Expiry Date
              </label>
              <Input
                type="date"
                value={header.expiry_date}
                onChange={(e) =>
                  setHeader({ ...header, expiry_date: e.target.value })
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
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1">
                Tax Rate (%)
              </label>
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

          {/* ------- Items ------- */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                Items
              </h3>
              <Button
                type="button"
                onClick={addRow}
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 px-1 font-medium">
                      Product *
                    </th>
                    <th className="text-left py-2 px-1 font-medium">
                      Category
                    </th>
                    <th className="text-right py-2 px-1 font-medium w-20">
                      Qty
                    </th>
                    <th className="text-right py-2 px-1 font-medium w-28">
                      Unit Price
                    </th>
                    <th className="text-right py-2 px-1 font-medium w-24">
                      Discount
                    </th>
                    <th className="text-right py-2 px-1 font-medium w-28">
                      Line Total
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr
                      key={it._key}
                      className="border-b border-slate-800/60"
                    >
                      <td className="py-2 px-1">
                        <Input
                          list="q-product-names"
                          value={it.product_name}
                          onChange={(e) =>
                            handleProductChange(it._key, e.target.value)
                          }
                          placeholder="Product or service"
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
                          placeholder="Category"
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
                            updateItem(it._key, {
                              unit_price: e.target.value,
                            })
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
                          className="p-1 hover:bg-slate-800 rounded"
                          disabled={items.length === 1}
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="q-product-names">
                {productSuggestions.map((s) => (
                  <option key={s.label} value={s.label} />
                ))}
              </datalist>
            </div>
          </div>

          {/* ------- Totals ------- */}
          <div className="flex flex-col md:flex-row md:justify-between gap-4 pt-3 border-t border-slate-800">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    setHeader({
                      ...header,
                      discount_amount: e.target.value,
                    })
                  }
                  className="bg-slate-950 border-slate-700 text-white"
                />
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
            </div>
          </div>

          {/* ------- Terms & notes ------- */}
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
                placeholder="Notes visible only to you..."
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap gap-2 justify-end p-5 border-t border-slate-800">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>

          {header.status === "draft" && (
            <Button
              onClick={() => handleSave("draft")}
              disabled={saving}
              variant="outline"
              className="border-blue-600 text-blue-300 hover:bg-blue-950"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Draft"}
            </Button>
          )}

          <Button
            onClick={() => handleSave("sent")}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving
              ? "Saving..."
              : isEdit
                ? "Update & Send"
                : "Save & Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}