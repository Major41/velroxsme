"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DataTable } from "@/components/dashboard/DataTable";
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Download,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  RefreshCw,
  Receipt,
  Calendar,
  Search,
  X,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";
import { QuotationForm } from "@/components/dashboard/QuotationForm";
import { QuotationPDFButton } from "@/components/dashboard/QuotationPDF";

/* ==================================================================== */
/*  TYPES                                                               */
/* ==================================================================== */

export interface QuotationItem {
  id?: string;
  position: number;
  product_name: string;
  description: string;
  category: string;
  quantity: number | string;
  unit_price: number | string;
  discount_amount: number | string;
  line_total: number | string;
}

export interface Quotation {
  id: string;
  business_id: string;
  quotation_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  quotation_date: string;
  expiry_date: string | null;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
  currency: string;
  subtotal: number | string;
  discount_amount: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  terms: string;
  notes: string;
  converted_invoice_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
  items?: QuotationItem[];
}

const num = (v: number | string) =>
  typeof v === "number" ? v : parseFloat(v) || 0;

/* ==================================================================== */
/*  STATUS CONFIG                                                       */
/* ==================================================================== */

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    color: "text-slate-300",
    bg: "bg-slate-500/20",
    icon: FileText,
  },
  sent: {
    label: "Sent",
    color: "text-blue-300",
    bg: "bg-blue-500/20",
    icon: Send,
  },
  accepted: {
    label: "Accepted",
    color: "text-emerald-300",
    bg: "bg-emerald-500/20",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-300",
    bg: "bg-red-500/20",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    color: "text-yellow-300",
    bg: "bg-yellow-500/20",
    icon: Clock,
  },
  converted: {
    label: "Converted",
    color: "text-purple-300",
    bg: "bg-purple-500/20",
    icon: RefreshCw,
  },
} as const;

/* ==================================================================== */
/*  PAGE                                                                */
/* ==================================================================== */

export default function QuotationsPage() {
  const { business } = useBusiness();
  const supabase = createClient();
  const router = useRouter();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(
    null,
  );
  const [pdfQuotation, setPdfQuotation] = useState<Quotation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(
    null,
  );
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [quotationToConvert, setQuotationToConvert] =
    useState<Quotation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ------------------------------------------------------------------ */
  /*  DATA FETCH                                                         */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (business?.id) fetchQuotations();
  }, [business]);

  const fetchQuotations = async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quotations_with_status")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (err: any) {
      console.error("Error fetching quotations:", err);
      setError("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  LIVE STATUS HELPERS                                                */
  /* ------------------------------------------------------------------ */

  const effectiveStatus = (q: Quotation): keyof typeof STATUS_CONFIG => {
    // If the view provides effective_status, use it
    const fromView = (q as any).effective_status as
      | keyof typeof STATUS_CONFIG
      | undefined;
    if (fromView) return fromView;

    // Fallback: compute on the fly
    if (
      ["draft", "sent", "accepted"].includes(q.status) &&
      q.expiry_date &&
      new Date(q.expiry_date) < new Date(new Date().toDateString())
    ) {
      return "expired";
    }
    return q.status as keyof typeof STATUS_CONFIG;
  };

  const daysToExpiry = (q: Quotation): number | null => {
    if (!q.expiry_date) return null;
    const expiry = new Date(q.expiry_date).getTime();
    const today = new Date(new Date().toDateString()).getTime();
    return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
  };

  /* ------------------------------------------------------------------ */
  /*  ACTIONS                                                            */
  /* ------------------------------------------------------------------ */

  const handleCreate = () => {
    setEditingQuotation(null);
    setShowForm(true);
  };

  const handleEdit = async (q: Quotation) => {
    // Fetch full quotation + items
    try {
      const { data: full, error: fetchErr } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", q.id)
        .single();
      if (fetchErr) throw fetchErr;

      const { data: items, error: itemsErr } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", q.id)
        .order("position", { ascending: true });
      if (itemsErr) throw itemsErr;

      setEditingQuotation({ ...(full as Quotation), items: items || [] });
      setShowForm(true);
    } catch (err: any) {
      console.error("Error loading quotation:", err);
      setError("Failed to load quotation details");
    }
  };

  const handleDuplicate = async (q: Quotation) => {
    if (!business?.id) return;
    setSaving(true);
    try {
      // Fetch items
      const { data: items } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", q.id)
        .order("position", { ascending: true });

      // Generate a new number
      const { data: numberData, error: numberErr } = await supabase.rpc(
        "generate_quotation_number",
        { p_business_id: business.id },
      );
      if (numberErr) throw numberErr;

      // Insert new header
      const { data: newQuote, error: insertErr } = await supabase
        .from("quotations")
        .insert([
          {
            business_id: business.id,
            quotation_number: numberData,
            customer_id: q.customer_id,
            customer_name: q.customer_name,
            customer_phone: q.customer_phone,
            customer_email: q.customer_email,
            customer_address: q.customer_address,
            quotation_date: new Date().toISOString().split("T")[0],
            expiry_date: q.expiry_date,
            status: "draft",
            currency: q.currency,
            discount_amount: q.discount_amount,
            tax_rate: q.tax_rate,
            terms: q.terms,
            notes: q.notes,
          },
        ])
        .select()
        .single();
      if (insertErr) throw insertErr;

      // Copy items
      if (items && items.length > 0) {
        const { error: itemsErr } = await supabase
          .from("quotation_items")
          .insert(
            items.map((it) => ({
              quotation_id: newQuote.id,
              position: it.position,
              product_name: it.product_name,
              description: it.description,
              category: it.category,
              quantity: it.quantity,
              unit_price: it.unit_price,
              discount_amount: it.discount_amount,
              line_total: it.line_total,
            })),
          );
        if (itemsErr) throw itemsErr;
      }

      // Recalc totals on the new quote
      await supabase.rpc("recalculate_quotation_totals", {
        p_quotation_id: newQuote.id,
      });

      setSuccess(`Duplicated as ${numberData}`);
      await fetchQuotations();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Duplicate error:", err);
      setError(err.message || "Failed to duplicate");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!quotationToDelete) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("quotations")
        .delete()
        .eq("id", quotationToDelete.id);
      if (error) throw error;

      setQuotations(quotations.filter((q) => q.id !== quotationToDelete.id));
      setSuccess("Quotation deleted");
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  CONVERT TO INVOICE                                                 */
  /* ------------------------------------------------------------------ */

  const handleConvert = async () => {
    if (!quotationToConvert || !business?.id) return;
    setSaving(true);
    try {
      // 1. Get items
      const { data: items } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotationToConvert.id)
        .order("position", { ascending: true });

      // 2. Generate invoice number (assumes generate_invoice_number RPC exists)
      const { data: invoiceNumber, error: numberErr } = await supabase.rpc(
        "generate_invoice_number",
        { p_business_id: business.id },
      );
      if (numberErr) throw numberErr;

      // 3. Insert invoice
      const { data: newInvoice, error: invoiceErr } = await supabase
        .from("invoices")
        .insert([
          {
            business_id: business.id,
            invoice_number: invoiceNumber,
            quotation_id: quotationToConvert.id,
            customer_id: quotationToConvert.customer_id,
            customer_name: quotationToConvert.customer_name,
            customer_phone: quotationToConvert.customer_phone,
            customer_email: quotationToConvert.customer_email,
            customer_address: quotationToConvert.customer_address,
            invoice_date: new Date().toISOString().split("T")[0],
            due_date: quotationToConvert.expiry_date,
            status: "draft",
            currency: quotationToConvert.currency,
            subtotal: quotationToConvert.subtotal,
            discount_amount: quotationToConvert.discount_amount,
            tax_rate: quotationToConvert.tax_rate,
            tax_amount: quotationToConvert.tax_amount,
            total_amount: quotationToConvert.total_amount,
            terms: quotationToConvert.terms,
            notes: quotationToConvert.notes,
          },
        ])
        .select()
        .single();
      if (invoiceErr) throw invoiceErr;

      // 4. Copy items to invoice_items
      if (items && items.length > 0) {
        const { error: itemsErr } = await supabase.from("invoice_items").insert(
          items.map((it) => ({
            invoice_id: newInvoice.id,
            position: it.position,
            product_name: it.product_name,
            description: it.description,
            category: it.category,
            quantity: it.quantity,
            unit_price: it.unit_price,
            discount_amount: it.discount_amount,
            line_total: it.line_total,
          })),
        );
        if (itemsErr) throw itemsErr;
      }

      // 5. Mark quotation as converted
      await supabase
        .from("quotations")
        .update({
          status: "converted",
          converted_invoice_id: newInvoice.id,
          converted_at: new Date().toISOString(),
        })
        .eq("id", quotationToConvert.id);

      setSuccess(`Converted to ${invoiceNumber}`);
      setConvertDialogOpen(false);
      setQuotationToConvert(null);
      await fetchQuotations();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Convert error:", err);
      setError(
        err.message ||
          "Failed to convert. Make sure invoices & invoice_items tables exist.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  FILTERS + STATS                                                    */
  /* ------------------------------------------------------------------ */

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const status = effectiveStatus(q);
      if (filterStatus !== "all" && status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q2 = searchQuery.toLowerCase();
        const haystack = [q.quotation_number, q.customer_name, q.customer_phone]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q2)) return false;
      }
      return true;
    });
  }, [quotations, filterStatus, searchQuery]);

  const totalValue = quotations
    .filter((q) => ["draft", "sent", "accepted"].includes(effectiveStatus(q)))
    .reduce((s, q) => s + num(q.total_amount), 0);
  const pendingCount = quotations.filter((q) =>
    ["draft", "sent"].includes(effectiveStatus(q)),
  ).length;
  const acceptedCount = quotations.filter(
    (q) => effectiveStatus(q) === "accepted",
  ).length;
  const expiredCount = quotations.filter(
    (q) => effectiveStatus(q) === "expired",
  ).length;

  /* ------------------------------------------------------------------ */
  /*  COLUMNS                                                            */
  /* ------------------------------------------------------------------ */

  const columns = [
    { key: "quotation_number" as const, label: "Quote #" },
    { key: "customer_name" as const, label: "Customer" },
    { key: "quotation_date" as const, label: "Date" },
    {
      key: "expiry_date" as const,
      label: "Expires",
      render: (v: string | null, row: Quotation) => {
        if (!v) return "-";
        const days = daysToExpiry(row);
        const isPast = days !== null && days < 0;
        return (
          <span className={isPast ? "text-red-400" : "text-slate-300"}>
            {v}
            {days !== null && !isPast && (
              <span className="text-xs text-slate-500 ml-1">({days}d)</span>
            )}
          </span>
        );
      },
    },
    {
      key: "total_amount" as const,
      label: "Total",
      render: (v: number | string) => `KSh ${num(v).toLocaleString()}`,
    },
    {
      key: "status" as const,
      label: "Status",
      render: (_: any, row: Quotation) => {
        const status = effectiveStatus(row);
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}
          >
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
        );
      },
    },
    {
      key: "actions" as const,
      label: "Actions",
      render: (_: any, row: Quotation) => {
        const status = effectiveStatus(row);
        const canConvert = ["accepted", "sent"].includes(status);
        const canDownload = status !== "converted";

        return (
          <div className="flex gap-1">
            {canDownload && (
              <button
                onClick={() => openPdfDialog(row)}
                title="Download PDF"
                className="p-1 hover:bg-slate-700 rounded"
              >
                <Download className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
              </button>
            )}

            <button
              onClick={() => handleEdit(row)}
              title="Edit"
              className="p-1 hover:bg-slate-700 rounded"
            >
              <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-400" />
            </button>

            <button
              onClick={() => handleDuplicate(row)}
              title="Duplicate"
              className="p-1 hover:bg-slate-700 rounded"
            >
              <Copy className="w-4 h-4 text-slate-400 hover:text-purple-400" />
            </button>

            {canConvert && (
              <button
                onClick={() => {
                  setQuotationToConvert(row);
                  setConvertDialogOpen(true);
                }}
                title="Convert to Invoice"
                className="p-1 hover:bg-slate-700 rounded"
              >
                <Receipt className="w-4 h-4 text-slate-400 hover:text-amber-400" />
              </button>
            )}

            <button
              onClick={() => {
                setQuotationToDelete(row);
                setDeleteDialogOpen(true);
              }}
              title="Delete"
              className="p-1 hover:bg-slate-700 rounded"
            >
              <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
            </button>
          </div>
        );
      },
    },
  ];

  const openPdfDialog = async (q: Quotation) => {
    try {
      const { data: items, error } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", q.id)
        .order("position", { ascending: true });

      if (error) throw error;

      setPdfQuotation({ ...q, items: items || [] } as any);
    } catch (err) {
      console.error("Failed to load quotation items:", err);
      setError("Failed to load quotation items");
    }
  };

  /* ------------------------------------------------------------------ */
  /*  RENDER                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">Quotations</h1>
          <p className="text-slate-400 mt-2">
            Create, manage, and convert quotations for your customers.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Quotation
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
          <p className="text-emerald-200 text-sm">{success}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Pipeline"
          value={`KSh ${totalValue.toLocaleString()}`}
          subtitle={`${pendingCount} pending`}
          icon={<FileText className="w-4 h-4" />}
        />
        <StatCard
          title="Accepted"
          value={acceptedCount}
          subtitle="Ready to invoice"
        />
        <StatCard
          title="Expired"
          value={expiredCount}
          subtitle="Past expiry date"
        />
        <StatCard
          title="Total Quotations"
          value={quotations.length}
          subtitle="All time"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by quote # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <ChartCard title="All Quotations">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">
              {quotations.length === 0
                ? "No quotations yet. Create your first one!"
                : "No quotations match your filters."}
            </p>
            {quotations.length === 0 && (
              <Button
                onClick={handleCreate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Quotation
              </Button>
            )}
          </div>
        ) : (
          <DataTable data={filtered} columns={columns} />
        )}
      </ChartCard>

      {/* Form (create / edit) */}
      {showForm && (
        <QuotationForm
          businessId={business?.id || ""}
          initialQuotation={editingQuotation}
          onClose={() => {
            setShowForm(false);
            setEditingQuotation(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingQuotation(null);
            setSuccess(
              editingQuotation ? "Quotation updated" : "Quotation created",
            );
            fetchQuotations();
            setTimeout(() => setSuccess(""), 3000);
          }}
        />
      )}

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Quotation</DialogTitle>
            <DialogDescription className="text-slate-400">
              Delete <strong>{quotationToDelete?.quotation_number}</strong>?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Convert to Invoice</DialogTitle>
            <DialogDescription className="text-slate-400">
              Convert <strong>{quotationToConvert?.quotation_number}</strong>{" "}
              into an invoice? The quotation will be marked as converted and the
              new invoice will be created.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConvertDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvert}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saving ? "Converting..." : "Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {pdfQuotation && (
        <Dialog
          open={!!pdfQuotation}
          onOpenChange={(o) => !o && setPdfQuotation(null)}
        >
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
            <DialogHeader>
              <DialogTitle>
                Quotation {pdfQuotation.quotation_number}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Download or print the quotation as an A4 PDF.
              </DialogDescription>
            </DialogHeader>
            <QuotationPDFButton
              quotation={pdfQuotation as any}
              business={business ?? {}}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
