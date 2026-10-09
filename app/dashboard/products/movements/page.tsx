"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  PackagePlus, TrendingDown, Wrench, RotateCcw, AlertTriangle,
  Search, Filter, Download, ArrowRightLeft, Calendar, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";

type MovementType =
  | "restock"
  | "sale"
  | "adjustment"
  | "return"
  | "damage"
  | "transfer"
  | "all";

interface Movement {
  id: string;
  business_id: string;
  product_id: string;
  type: MovementType;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  supplier: string | null;
  reference: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  reason: string | null;
  notes: string | null;
  stock_after: number | null;
  recorded_by: string | null;
  movement_date: string;
  created_at: string;
  products?: { name: string; sku: string | null } | null;
}

const TYPE_CONFIG: Record<
  MovementType,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  restock: {
    label: "Restock",
    color: "text-emerald-300",
    bg: "bg-emerald-500/20",
    icon: <PackagePlus className="w-3 h-3" />,
  },
  sale: {
    label: "Sale",
    color: "text-blue-300",
    bg: "bg-blue-500/20",
    icon: <TrendingDown className="w-3 h-3" />,
  },
  adjustment: {
    label: "Adjustment",
    color: "text-amber-300",
    bg: "bg-amber-500/20",
    icon: <Wrench className="w-3 h-3" />,
  },
  return: {
    label: "Return",
    color: "text-purple-300",
    bg: "bg-purple-500/20",
    icon: <RotateCcw className="w-3 h-3" />,
  },
  damage: {
    label: "Damage",
    color: "text-red-300",
    bg: "bg-red-500/20",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  transfer: {
    label: "Transfer",
    color: "text-cyan-300",
    bg: "bg-cyan-500/20",
    icon: <ArrowRightLeft className="w-3 h-3" />,
  },
  all: {
    label: "All",
    color: "text-slate-300",
    bg: "bg-slate-500/20",
    icon: null,
  },
};

export default function StockMovementsPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterType, setFilterType] = useState<MovementType>("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (business?.id) fetchMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  const fetchMovements = async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, products(name, sku)")
        .eq("business_id", business.id)
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setMovements((data as any) || []);
    } catch (err: any) {
      console.error("Fetch movements error:", err);
      setError("Failed to load stock movements: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (filterType !== "all" && m.type !== filterType) return false;
      if (filterFrom && m.movement_date < filterFrom) return false;
      if (filterTo && m.movement_date > filterTo) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          m.products?.name,
          m.products?.sku,
          m.supplier,
          m.reference,
          m.recorded_by,
          m.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [movements, filterType, filterFrom, filterTo, search]);

  const stats = useMemo(() => {
    const restocks = filtered.filter((m) => m.type === "restock");
    const restockValue = restocks.reduce(
      (s, m) => s + (m.total_cost || 0),
      0,
    );
    const totalIn = filtered
      .filter((m) => m.quantity > 0)
      .reduce((s, m) => s + m.quantity, 0);
    const totalOut = Math.abs(
      filtered
        .filter((m) => m.quantity < 0)
        .reduce((s, m) => s + m.quantity, 0),
    );

    return {
      totalMovements: filtered.length,
      restockCount: restocks.length,
      restockValue,
      totalIn,
      totalOut,
    };
  }, [filtered]);

  const exportCSV = () => {
    const headers = [
      "Date",
      "Type",
      "Product",
      "SKU",
      "Quantity",
      "Unit Cost",
      "Total Cost",
      "Supplier",
      "Reference",
      "Batch",
      "Expiry",
      "Stock After",
      "Recorded By",
      "Notes",
    ];

    const rows = filtered.map((m) => [
      m.movement_date,
      m.type,
      m.products?.name || "",
      m.products?.sku || "",
      m.quantity,
      m.unit_cost ?? "",
      m.total_cost ?? "",
      m.supplier || "",
      m.reference || "",
      m.batch_number || "",
      m.expiry_date || "",
      m.stock_after ?? "",
      m.recorded_by || "",
      m.notes || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock-movements-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters =
    filterType !== "all" || filterFrom || filterTo || search;

  const clearFilters = () => {
    setFilterType("all");
    setFilterFrom("");
    setFilterTo("");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">
            Stock Movements
          </h1>
          <p className="text-slate-400 mt-1">
            Every stock in/out — restocks, sales, adjustments, and more
          </p>
        </div>
        <Button
          onClick={exportCSV}
          variant="outline"
          disabled={filtered.length === 0}
          className="border-slate-600 text-slate-300 hover:bg-slate-800 text-black"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/30 p-4">
          <p className="text-red-200 text-sm">{error}</p>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Movements
          </p>
          <p className="text-2xl font-bold text-white mt-1">
            {stats.totalMovements}
          </p>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Restocks
          </p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {stats.restockCount}
          </p>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Restock Value
          </p>
          <p className="text-lg font-bold text-white mt-1">
            KSh {stats.restockValue.toLocaleString()}
          </p>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Total In / Out
          </p>
          <p className="text-sm font-bold text-white mt-1">
            <span className="text-emerald-400">+{stats.totalIn}</span>
            {" / "}
            <span className="text-red-400">-{stats.totalOut}</span>
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by product, supplier, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white"
          />
        </div>

        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as MovementType)}
        >
          <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="restock">Restocks</SelectItem>
            <SelectItem value="sale">Sales</SelectItem>
            <SelectItem value="adjustment">Adjustments</SelectItem>
            <SelectItem value="return">Returns</SelectItem>
            <SelectItem value="damage">Damages</SelectItem>
            <SelectItem value="transfer">Transfers</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="w-40 bg-slate-800 border-slate-700 text-white"
          />
          <span className="text-slate-400 text-sm">to</span>
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="w-40 bg-slate-800 border-slate-700 text-white"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
          <p className="text-slate-400">Loading movements...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
          <Filter className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            {movements.length === 0
              ? "No stock movements recorded yet."
              : "No movements match your filters."}
          </p>
        </Card>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                    Unit Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                    Supplier / Ref
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                    Stock After
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map((m) => {
                  const cfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.adjustment;
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-300">
                          {new Date(m.movement_date).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          by {m.recorded_by || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${cfg.bg} ${cfg.color}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-200">
                          {m.products?.name || "—"}
                        </p>
                        {m.products?.sku && (
                          <p className="text-[10px] text-slate-500 font-mono">
                            {m.products.sku}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm font-medium ${
                            m.quantity > 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {m.quantity > 0 ? "+" : ""}
                          {m.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">
                        {m.unit_cost != null
                          ? `KSh ${m.unit_cost.toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-300">
                        {m.total_cost != null
                          ? `KSh ${m.total_cost.toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-300">
                          {m.supplier || "—"}
                        </p>
                        {m.reference && (
                          <p className="text-[10px] text-slate-500">
                            Ref: {m.reference}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-300">
                        {m.stock_after ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}