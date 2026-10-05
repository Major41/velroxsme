"use client";

import { useState, useEffect, useMemo } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DataTable } from "@/components/dashboard/DataTable";
import {
  Plus,
  Edit2,
  Trash2,
  Download,
  Receipt,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Calendar,
  Search,
  DollarSign,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { InvoiceForm } from "@/components/dashboard/InvoiceForm";
import { InvoicePDFButton } from "@/components/dashboard/InvoicePDF";

export interface Invoice {
  id: string;
  business_id: string;
  invoice_number: string;
  quotation_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  invoice_date: string;
  due_date: string | null;
  status:
    | "draft"
    | "sent"
    | "paid"
    | "partially_paid"
    | "overdue"
    | "cancelled";
  currency: string;
  subtotal: number | string;
  discount_amount: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  amount_paid: number | string;
  balance_due: number | string;
  payment_method: string | null;
  terms: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const num = (v: number | string) =>
  typeof v === "number" ? v : parseFloat(v) || 0;
const fmt = (n: number) =>
  n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
  paid: {
    label: "Paid",
    color: "text-emerald-300",
    bg: "bg-emerald-500/20",
    icon: CheckCircle,
  },
  partially_paid: {
    label: "Partial",
    color: "text-amber-300",
    bg: "bg-amber-500/20",
    icon: DollarSign,
  },
  overdue: {
    label: "Overdue",
    color: "text-red-300",
    bg: "bg-red-500/20",
    icon: Clock,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-slate-400",
    bg: "bg-slate-600/20",
    icon: XCircle,
  },
} as const;

export default function InvoicesPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [pdfInvoice, setPdfInvoice] = useState<Invoice | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (business?.id) fetchInvoices();
  }, [business]);

  const fetchInvoices = async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices_with_status")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err: any) {
      console.error("Error fetching invoices:", err);
      setError("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const effectiveStatus = (inv: Invoice): keyof typeof STATUS_CONFIG => {
    const fromView = (inv as any).effective_status;
    if (fromView) return fromView;
    if (
      ["draft", "sent", "partially_paid"].includes(inv.status) &&
      inv.due_date &&
      new Date(inv.due_date) < new Date(new Date().toDateString())
    ) {
      return "overdue";
    }
    return inv.status as keyof typeof STATUS_CONFIG;
  };

  const handleCreate = () => {
    setEditingInvoice(null);
    setShowForm(true);
  };

  const handleEdit = async (inv: Invoice) => {
    try {
      const { data: full } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", inv.id)
        .single();
      const { data: items } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", inv.id)
        .order("position", { ascending: true });
      setEditingInvoice({
        ...(full as Invoice),
        items: (items as any) || [],
      } as any);
      setShowForm(true);
    } catch (err) {
      console.error(err);
      setError("Failed to load invoice");
    }
  };

  const handleDelete = async () => {
    if (!invoiceToDelete) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceToDelete.id);
      if (error) throw error;
      setInvoices(invoices.filter((i) => i.id !== invoiceToDelete.id));
      setSuccess("Invoice deleted");
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openPaymentDialog = (inv: Invoice) => {
    setInvoiceToPay(inv);
    setPaymentAmount(String(Math.max(0, num(inv.balance_due))));
    setPayDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!invoiceToPay) return;
    const add = num(paymentAmount);
    if (add <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const newPaid = num(invoiceToPay.amount_paid) + add;
      const total = num(invoiceToPay.total_amount);
      const newBalance = Math.max(0, total - newPaid);
      const newStatus = newBalance === 0 ? "paid" : "partially_paid";

      const { error } = await supabase
        .from("invoices")
        .update({
          amount_paid: newPaid,
          balance_due: newBalance,
          status: newStatus,
          payment_method: invoiceToPay.payment_method || "M-Pesa",
          paid_at: newStatus === "paid" ? new Date().toISOString() : null,
        })
        .eq("id", invoiceToPay.id);
      if (error) throw error;

      setSuccess(`Payment recorded: KSh ${fmt(add)}`);
      setPayDialogOpen(false);
      setInvoiceToPay(null);
      await fetchInvoices();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const st = effectiveStatus(inv);
      if (filterStatus !== "all" && st !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = [inv.invoice_number, inv.customer_name, inv.customer_phone]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, filterStatus, searchQuery]);

  const totalOutstanding = invoices
    .filter((i) =>
      ["sent", "partially_paid", "overdue"].includes(effectiveStatus(i)),
    )
    .reduce((s, i) => s + num(i.balance_due), 0);
  const totalPaid = invoices.reduce((s, i) => s + num(i.amount_paid), 0);
  const overdueCount = invoices.filter(
    (i) => effectiveStatus(i) === "overdue",
  ).length;
  const paidCount = invoices.filter(
    (i) => effectiveStatus(i) === "paid",
  ).length;

  const columns = [
    { key: "invoice_number" as const, label: "Invoice #" },
    { key: "customer_name" as const, label: "Customer" },
    { key: "invoice_date" as const, label: "Date" },
    {
      key: "due_date" as const,
      label: "Due",
      render: (v: string | null, row: Invoice) => {
        if (!v) return "-";
        const days = (row as any).days_to_due ?? null;
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
      render: (v: number | string) => `KSh ${fmt(num(v))}`,
    },
    {
      key: "balance_due" as const,
      label: "Balance",
      render: (v: number | string) => {
        const n = num(v);
        return (
          <span
            className={
              n > 0 ? "text-amber-300 font-medium" : "text-emerald-400"
            }
          >
            KSh {fmt(n)}
          </span>
        );
      },
    },
    {
      key: "status" as const,
      label: "Status",
      render: (_: any, row: Invoice) => {
        const st = effectiveStatus(row);
        const cfg = STATUS_CONFIG[st];
        const Icon = cfg.icon;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}
          >
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: "actions" as const,
      label: "Actions",
      render: (_: any, row: Invoice) => {
        const st = effectiveStatus(row);
        const canPay = ["sent", "partially_paid", "overdue"].includes(st);
        return (
          <div className="flex gap-1">
            <button
              onClick={() => openPdfDialog(row)}
              title="Download PDF"
              className="p-1 hover:bg-slate-700 rounded"
            >
              <Download className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
            </button>
            {canPay && (
              <button
                onClick={() => openPaymentDialog(row)}
                title="Record Payment"
                className="p-1 hover:bg-slate-700 rounded"
              >
                <DollarSign className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
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
              onClick={() => {
                setInvoiceToDelete(row);
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

  const openPdfDialog = async (inv: Invoice) => {
    try {
      const { data: items, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", inv.id)
        .order("position", { ascending: true });

      if (error) throw error;

      setPdfInvoice({ ...inv, items: items || [] } as any);
    } catch (err) {
      console.error("Failed to load invoice items:", err);
      setError("Failed to load invoice items");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">Invoices</h1>
          <p className="text-slate-400 mt-2">
            Track, record payments, and download invoices for your customers.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> New Invoice
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Outstanding"
          value={`KSh ${totalOutstanding.toLocaleString()}`}
          subtitle="Unpaid balance"
          icon={<Receipt className="w-4 h-4" />}
        />
        <StatCard
          title="Total Collected"
          value={`KSh ${totalPaid.toLocaleString()}`}
          subtitle="All time"
        />
        <StatCard
          title="Overdue"
          value={overdueCount}
          subtitle="Past due date"
        />
        <StatCard title="Paid" value={paidCount} subtitle="Fully settled" />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by invoice # or customer..."
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
            {Object.entries(STATUS_CONFIG).map(([k, c]) => (
              <SelectItem key={k} value={k}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ChartCard title="All Invoices">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">
              {invoices.length === 0
                ? "No invoices yet. Create your first one!"
                : "No invoices match your filters."}
            </p>
            {invoices.length === 0 && (
              <Button
                onClick={handleCreate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" /> Create Invoice
              </Button>
            )}
          </div>
        ) : (
          <DataTable data={filtered} columns={columns} />
        )}
      </ChartCard>

      {showForm && (
        <InvoiceForm
          businessId={business?.id || ""}
          initialInvoice={editingInvoice as any}
          onClose={() => {
            setShowForm(false);
            setEditingInvoice(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingInvoice(null);
            setSuccess(editingInvoice ? "Invoice updated" : "Invoice created");
            fetchInvoices();
            setTimeout(() => setSuccess(""), 3000);
          }}
        />
      )}

      {/* Delete */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription className="text-slate-400">
              Delete <strong>{invoiceToDelete?.invoice_number}</strong>? This
              cannot be undone.
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

      {/* PDF */}
      {pdfInvoice && (
        <Dialog
          open={!!pdfInvoice}
          onOpenChange={(o) => !o && setPdfInvoice(null)}
        >
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
            <DialogHeader>
              <DialogTitle>Invoice {pdfInvoice.invoice_number}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Download or print the invoice as an A4 PDF.
              </DialogDescription>
            </DialogHeader>
            <InvoicePDFButton
              invoice={pdfInvoice as any}
              business={business ?? {}}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Record Payment */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a payment to <strong>{invoiceToPay?.invoice_number}</strong>.
              Current balance: KSh {fmt(num(invoiceToPay?.balance_due))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs text-slate-400">Amount (KSh)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
