"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PackagePlus, AlertCircle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";

interface RestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    stock_quantity: number;
    cost_price: number;
    units_of_measure?: { abbreviation: string; allow_decimals: boolean } | null;
  } | null;
  onSuccess: () => void;
}

export function RestockDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: RestockDialogProps) {
  const { business } = useBusiness();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    quantity: "",
    unit_cost: "",
    supplier: "",
    reference: "",
    batch_number: "",
    expiry_date: "",
    notes: "",
    movement_date: new Date().toISOString().split("T")[0],
  });

  const [pastSuppliers, setPastSuppliers] = useState<string[]>([]);

  /* -------- Load supplier suggestions -------- */
  useEffect(() => {
    if (!open || !business?.id) return;

    (async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select("supplier")
        .eq("business_id", business.id)
        .eq("type", "restock")
        .not("supplier", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      const unique = Array.from(
        new Set((data || []).map((d) => d.supplier).filter(Boolean)),
      );
      setPastSuppliers(unique as string[]);
    })();
  }, [open, business?.id, supabase]);

  /* -------- Reset form on open -------- */
  useEffect(() => {
    if (open && product) {
      setForm({
        quantity: "",
        unit_cost: String(product.cost_price || 0),
        supplier: "",
        reference: "",
        batch_number: "",
        expiry_date: "",
        notes: "",
        movement_date: new Date().toISOString().split("T")[0],
      });
      setError("");
      setSuccess(false);
    }
  }, [open, product]);

  const abbrev = product?.units_of_measure?.abbreviation || "units";
  const allowDecimals = product?.units_of_measure?.allow_decimals ?? true;
  const step = allowDecimals ? "0.001" : "1";

  const qty = parseFloat(form.quantity) || 0;
  const unitCost = parseFloat(form.unit_cost) || 0;
  const totalCost = qty * unitCost;
  const newStock = (product?.stock_quantity || 0) + qty;

  const handleSubmit = async () => {
    if (!product || !business?.id) return;
    setError("");

    if (!form.quantity || qty <= 0) {
      setError("Please enter a quantity greater than 0");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/business/products/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          business_id: business.id,
          quantity: qty,
          unit_cost: unitCost || null,
          supplier: form.supplier.trim() || null,
          reference: form.reference.trim() || null,
          batch_number: form.batch_number.trim() || null,
          expiry_date: form.expiry_date || null,
          notes: form.notes.trim() || null,
          movement_date: form.movement_date,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restock failed");

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 900);
    } catch (err: any) {
      console.error("Restock error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-400" />
            Restock Product
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Add stock to <strong className="text-slate-200">{product.name}</strong>.
            This creates a permanent restock record.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-emerald-200 font-medium">
              Stock updated successfully
            </p>
            <p className="text-xs text-slate-400 mt-1">
              New stock level: {newStock} {abbrev}
            </p>
          </div>
        ) : (
          <>
            {/* Stock preview */}
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                  Current stock
                </p>
                <p className="text-lg font-bold text-white">
                  {product.stock_quantity} {abbrev}
                </p>
              </div>
              <div className="text-slate-500">→</div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                  After restock
                </p>
                <p className="text-lg font-bold text-emerald-300">
                  {newStock} {abbrev}
                </p>
              </div>
            </div>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Quantity *{" "}
                    <span className="text-slate-500 font-normal">
                      ({abbrev})
                    </span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step={step}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    placeholder="0"
                    autoFocus
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Unit Cost (KSh)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unit_cost}
                    onChange={(e) =>
                      setForm({ ...form, unit_cost: e.target.value })
                    }
                    placeholder="0"
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
              </div>

              {qty > 0 && unitCost > 0 && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3 flex items-center justify-between">
                  <span className="text-xs text-blue-200">Total cost</span>
                  <span className="text-sm font-bold text-blue-100">
                    KSh {totalCost.toLocaleString()}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Supplier
                </label>
                <Input
                  list="supplier-suggestions"
                  value={form.supplier}
                  onChange={(e) =>
                    setForm({ ...form, supplier: e.target.value })
                  }
                  placeholder="Who supplied this stock?"
                  className="bg-slate-950 border-slate-700 text-white"
                />
                <datalist id="supplier-suggestions">
                  {pastSuppliers.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Reference / Invoice #
                  </label>
                  <Input
                    value={form.reference}
                    onChange={(e) =>
                      setForm({ ...form, reference: e.target.value })
                    }
                    placeholder="e.g. INV-001"
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Restock Date *
                  </label>
                  <Input
                    type="date"
                    value={form.movement_date}
                    onChange={(e) =>
                      setForm({ ...form, movement_date: e.target.value })
                    }
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Batch / Lot Number
                  </label>
                  <Input
                    value={form.batch_number}
                    onChange={(e) =>
                      setForm({ ...form, batch_number: e.target.value })
                    }
                    placeholder="Optional"
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Expiry Date
                  </label>
                  <Input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) =>
                      setForm({ ...form, expiry_date: e.target.value })
                    }
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notes
                </label>
                <Textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  placeholder="Any additional information..."
                  rows={2}
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200 text-xs">{error}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || qty <= 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? "Restocking..." : `Restock ${qty} ${abbrev}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}