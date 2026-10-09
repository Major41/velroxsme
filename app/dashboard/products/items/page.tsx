"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
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
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  AlertCircle,
  Check,
  Search,
  Filter,
  Archive,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";
const NONE_VALUE = "__none__";
import { RestockDialog } from "@/components/dashboard/RestockDialog";
import { PackagePlus } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  allow_decimals: boolean;
}

interface Product {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  category_id: string | null;
  unit_id: string | null;
  cost_price: number;
  selling_price: number;
  track_stock: boolean;
  stock_quantity: number;
  reorder_level: number;
  image_url: string | null;
  is_service: boolean;
  status: "active" | "inactive";
  created_at: string;
  product_categories?: { name: string; color: string | null } | null;
  units_of_measure?: { name: string; abbreviation: string } | null;
}

export default function ProductsItemsPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    category_id: "",
    unit_id: "",
    cost_price: "",
    selling_price: "",
    track_stock: true,
    stock_quantity: "",
    reorder_level: "",
    is_service: false,
    status: "active" as "active" | "inactive",
  });

  /* ---------------- Fetch ---------------- */

  useEffect(() => {
    if (business?.id) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  const fetchAll = async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const [prodRes, catRes, unitRes] = await Promise.all([
        supabase
          .from("products")
          .select(
            "*, product_categories(name, color), units_of_measure(name, abbreviation)",
          )
          .eq("business_id", business.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("product_categories")
          .select("id, name, color")
          .eq("business_id", business.id)
          .order("name"),
        supabase
          .from("units_of_measure")
          .select("id, name, abbreviation, allow_decimals")
          .eq("business_id", business.id)
          .order("name"),
      ]);

      if (prodRes.error) throw prodRes.error;
      if (catRes.error) throw catRes.error;
      if (unitRes.error) throw unitRes.error;

      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
      setUnits(unitRes.data || []);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("Failed to load products: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Actions ---------------- */

  const openCreate = () => {
    setEditingProduct(null);
    setForm({
      name: "",
      sku: "",
      barcode: "",
      description: "",
      category_id: "",
      unit_id: units[0]?.id || "",
      cost_price: "",
      selling_price: "",
      track_stock: true,
      stock_quantity: "0",
      reorder_level: "0",
      is_service: false,
      status: "active",
    });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      sku: p.sku || "",
      barcode: p.barcode || "",
      description: p.description || "",
      category_id: p.category_id || "",
      unit_id: p.unit_id || "",
      cost_price: String(p.cost_price || 0),
      selling_price: String(p.selling_price || 0),
      track_stock: p.track_stock,
      stock_quantity: String(p.stock_quantity || 0),
      reorder_level: String(p.reorder_level || 0),
      is_service: p.is_service,
      status: p.status,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!business?.id) return;
    setError("");

    if (!form.name.trim()) {
      setError("Product name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        business_id: business.id,
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        unit_id: form.unit_id || null,
        cost_price: parseFloat(form.cost_price) || 0,
        selling_price: parseFloat(form.selling_price) || 0,
        track_stock: form.track_stock,
        stock_quantity: parseFloat(form.stock_quantity) || 0,
        reorder_level: parseFloat(form.reorder_level) || 0,
        is_service: form.is_service,
        status: form.status,
        updated_at: new Date().toISOString(),
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);
        if (error) throw error;
        setSuccess("Product updated");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        setSuccess("Product created");
      }

      setShowForm(false);
      setEditingProduct(null);
      await fetchAll();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Save product error:", err);
      setError(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productToDelete.id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setSuccess("Product deleted");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete product");
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  /* ---------------- Filtering ---------------- */

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filterCategory !== "all" && p.category_id !== filterCategory)
        return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = [p.name, p.sku, p.barcode]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, filterCategory, filterStatus, searchQuery]);

  /* ---------------- Derived ---------------- */

  const stats = useMemo(() => {
    const active = products.filter((p) => p.status === "active").length;
    const lowStock = products.filter(
      (p) =>
        p.track_stock &&
        p.stock_quantity > 0 &&
        p.stock_quantity <= p.reorder_level,
    ).length;
    const outOfStock = products.filter(
      (p) => p.track_stock && p.stock_quantity <= 0 && !p.is_service,
    ).length;
    const totalValue = products.reduce(
      (s, p) => s + p.stock_quantity * p.cost_price,
      0,
    );
    return { active, lowStock, outOfStock, totalValue };
  }, [products]);

  const selectedUnit = units.find((u) => u.id === form.unit_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Products</h1>
          <p className="text-slate-400 mt-1">
            Your inventory of products and services
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={units.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Product
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex gap-3">
          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-emerald-200 text-sm">{success}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Active Products
          </p>
          <p className="text-2xl font-bold text-white mt-1">{stats.active}</p>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Low Stock
          </p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {stats.lowStock}
          </p>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Out of Stock
          </p>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {stats.outOfStock}
          </p>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Stock Value
          </p>
          <p className="text-lg font-bold text-white mt-1">
            KSh {stats.totalValue.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by name, SKU, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
          <p className="text-slate-400">Loading products...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            {products.length === 0
              ? "No products yet. Create your first one to get started."
              : "No products match your filters."}
          </p>
        </Card>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                    Product
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                    Category
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                    Cost
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                    Selling
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                    Stock
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map((p) => {
                  const lowStock =
                    p.track_stock &&
                    p.stock_quantity > 0 &&
                    p.stock_quantity <= p.reorder_level;
                  const outOfStock =
                    p.track_stock && p.stock_quantity <= 0 && !p.is_service;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-100">
                            {p.name}
                          </p>
                          {p.sku && (
                            <p className="text-xs text-slate-500 font-mono">
                              {p.sku}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {p.product_categories ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded"
                            style={{
                              backgroundColor: `${
                                p.product_categories.color || "#3b82f6"
                              }20`,
                              color: p.product_categories.color || "#3b82f6",
                            }}
                          >
                            {p.product_categories.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Uncategorised
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-slate-300">
                        KSh {p.cost_price.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-emerald-300">
                        KSh {p.selling_price.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {p.is_service ? (
                          <span className="text-xs text-purple-300">
                            Service
                          </span>
                        ) : p.track_stock ? (
                          <span
                            className={`text-sm font-medium ${
                              outOfStock
                                ? "text-red-400"
                                : lowStock
                                  ? "text-amber-400"
                                  : "text-slate-200"
                            }`}
                          >
                            {p.stock_quantity}{" "}
                            <span className="text-xs text-slate-500">
                              {p.units_of_measure?.abbreviation || ""}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Not tracked
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            p.status === "active"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-slate-600/20 text-slate-400"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          {/* Restock — only show for physical products */}
                          {!p.is_service && (
                            <button
                              onClick={() => {
                                setRestockProduct({
                                  ...p,
                                  units_of_measure: p.units_of_measure || null,
                                } as any);
                                setShowRestockDialog(true);
                              }}
                              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                              title="Restock"
                            >
                              <PackagePlus className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
                            </button>
                          )}

                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                          </button>
                          <button
                            onClick={() => {
                              setProductToDelete(p);
                              setDeleteDialogOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ---------- Create/Edit Product Dialog ---------- */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "New Product"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingProduct
                ? "Update product details, pricing, and stock."
                : "Add a new product or service to your catalogue."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">
                Basic Information
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Product Name *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. A4 Printing Paper"
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    SKU
                  </label>
                  <Input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="e.g. STA-001"
                    className="bg-slate-950 border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Barcode
                  </label>
                  <Input
                    value={form.barcode}
                    onChange={(e) =>
                      setForm({ ...form, barcode: e.target.value })
                    }
                    placeholder="Scan or type"
                    className="bg-slate-950 border-slate-700 text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Classification */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">
                Classification
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Category
                  </label>
                  <Select
                    value={form.category_id || NONE_VALUE}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        category_id: v === NONE_VALUE ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      <SelectItem value={NONE_VALUE}>— None —</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Unit of Measure
                  </label>
                  <Select
                    value={form.unit_id || NONE_VALUE}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        unit_id: v === NONE_VALUE ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      <SelectItem value={NONE_VALUE}>— None —</SelectItem>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_service}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      is_service: e.target.checked,
                      track_stock: !e.target.checked && form.track_stock,
                    })
                  }
                  className="accent-purple-500"
                />
                <div>
                  <p className="text-sm text-slate-200">
                    This is a service (not physical stock)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Services don't track inventory levels
                  </p>
                </div>
              </label>
            </div>

            {/* Pricing */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">Pricing</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Cost Price (KSh)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_price}
                    onChange={(e) =>
                      setForm({ ...form, cost_price: e.target.value })
                    }
                    placeholder="0"
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Selling Price (KSh)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.selling_price}
                    onChange={(e) =>
                      setForm({ ...form, selling_price: e.target.value })
                    }
                    placeholder="0"
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Stock */}
            {!form.is_service && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-200">Stock</h3>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.track_stock}
                    onChange={(e) =>
                      setForm({ ...form, track_stock: e.target.checked })
                    }
                    className="accent-blue-500"
                  />
                  <div>
                    <p className="text-sm text-slate-200">
                      Track stock quantity
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Turn off if you don't want to monitor inventory levels
                    </p>
                  </div>
                </label>

                {form.track_stock && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Current Stock
                        {selectedUnit && (
                          <span className="text-slate-500 font-normal">
                            {" "}
                            ({selectedUnit.abbreviation})
                          </span>
                        )}
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step={selectedUnit?.allow_decimals ? "0.001" : "1"}
                        value={form.stock_quantity}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            stock_quantity: e.target.value,
                          })
                        }
                        placeholder="0"
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Reorder Level
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step={selectedUnit?.allow_decimals ? "0.001" : "1"}
                        value={form.reorder_level}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            reorder_level: e.target.value,
                          })
                        }
                        placeholder="0"
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Warn when stock falls below this
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as "active" | "inactive" })
                }
              >
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving
                ? "Saving..."
                : editingProduct
                  ? "Update Product"
                  : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription className="text-slate-400">
              Delete "{productToDelete?.name}"? This cannot be undone.
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
              {saving ? "Deleting..." : "Delete Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RestockDialog
        open={showRestockDialog}
        onOpenChange={(open) => {
          setShowRestockDialog(open);
          if (!open) setRestockProduct(null);
        }}
        product={
          restockProduct
            ? {
                id: restockProduct.id,
                name: restockProduct.name,
                stock_quantity: restockProduct.stock_quantity,
                cost_price: restockProduct.cost_price,
                units_of_measure: restockProduct.units_of_measure || null,
              }
            : null
        }
        onSuccess={() => {
          fetchAll();
          setSuccess("Stock restocked successfully");
          setTimeout(() => setSuccess(""), 3000);
        }}
      />
    </div>
  );
}
