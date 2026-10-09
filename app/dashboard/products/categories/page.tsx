"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Edit2, Trash2, Layers, Ruler, AlertCircle, Check, Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";
import { DEFAULT_UNITS } from "@/lib/product-units";

interface Category {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  color: string | null;
  created_at: string;
}

interface Unit {
  id: string;
  business_id: string;
  name: string;
  abbreviation: string;
  allow_decimals: boolean;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export default function CategoriesAndUnitsPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Category form
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    parent_id: "",
    color: "#3b82f6",
  });

  // Unit form
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({
    name: "",
    abbreviation: "",
    allow_decimals: true,
    description: "",
  });

  // Delete dialogs
  const [deleteCategoryDialog, setDeleteCategoryDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteUnitDialog, setDeleteUnitDialog] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

  /* ---------------- Fetch ---------------- */

  useEffect(() => {
    if (business?.id) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  const fetchAll = async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const [catsRes, unitsRes] = await Promise.all([
        supabase
          .from("product_categories")
          .select("*")
          .eq("business_id", business.id)
          .order("name"),
        supabase
          .from("units_of_measure")
          .select("*")
          .eq("business_id", business.id)
          .order("name"),
      ]);

      if (catsRes.error) throw catsRes.error;
      if (unitsRes.error) throw unitsRes.error;

      setCategories(catsRes.data || []);

      // Seed default units on first visit
      let unitList = unitsRes.data || [];
      if (unitList.length === 0) {
        const { data: seeded } = await supabase
          .from("units_of_measure")
          .insert(
            DEFAULT_UNITS.map((u) => ({
              business_id: business.id,
              ...u,
            })),
          )
          .select("*");
        unitList = seeded || [];
      }
      setUnits(unitList);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================ */
  /*  CATEGORIES                                                  */
  /* ============================================================ */

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: "",
      description: "",
      parent_id: "",
      color: "#3b82f6",
    });
    setShowCategoryForm(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || "",
      parent_id: cat.parent_id || "",
      color: cat.color || "#3b82f6",
    });
    setShowCategoryForm(true);
  };

  const handleSaveCategory = async () => {
    if (!business?.id) return;
    setError("");

    if (!categoryForm.name.trim()) {
      setError("Category name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        business_id: business.id,
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || null,
        parent_id: categoryForm.parent_id || null,
        color: categoryForm.color || null,
        updated_at: new Date().toISOString(),
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("product_categories")
          .update(payload)
          .eq("id", editingCategory.id);
        if (error) throw error;
        setSuccess("Category updated");
      } else {
        const { error } = await supabase
          .from("product_categories")
          .insert(payload);
        if (error) throw error;
        setSuccess("Category created");
      }

      setShowCategoryForm(false);
      setEditingCategory(null);
      await fetchAll();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Save category error:", err);
      setError(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", categoryToDelete.id);
      if (error) throw error;
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      setSuccess("Category deleted");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete category");
    } finally {
      setSaving(false);
      setDeleteCategoryDialog(false);
      setCategoryToDelete(null);
    }
  };

  /* ============================================================ */
  /*  UNITS                                                       */
  /* ============================================================ */

  const openCreateUnit = () => {
    setEditingUnit(null);
    setUnitForm({
      name: "",
      abbreviation: "",
      allow_decimals: true,
      description: "",
    });
    setShowUnitForm(true);
  };

  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitForm({
      name: unit.name,
      abbreviation: unit.abbreviation,
      allow_decimals: unit.allow_decimals,
      description: unit.description || "",
    });
    setShowUnitForm(true);
  };

  const handleSaveUnit = async () => {
    if (!business?.id) return;
    setError("");

    if (!unitForm.name.trim() || !unitForm.abbreviation.trim()) {
      setError("Unit name and abbreviation are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        business_id: business.id,
        name: unitForm.name.trim(),
        abbreviation: unitForm.abbreviation.trim(),
        allow_decimals: unitForm.allow_decimals,
        description: unitForm.description.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingUnit) {
        const { error } = await supabase
          .from("units_of_measure")
          .update(payload)
          .eq("id", editingUnit.id);
        if (error) throw error;
        setSuccess("Unit updated");
      } else {
        const { error } = await supabase
          .from("units_of_measure")
          .insert(payload);
        if (error) throw error;
        setSuccess("Unit created");
      }

      setShowUnitForm(false);
      setEditingUnit(null);
      await fetchAll();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Save unit error:", err);
      setError(err.message || "Failed to save unit");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!unitToDelete) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("units_of_measure")
        .delete()
        .eq("id", unitToDelete.id);
      if (error) throw error;
      setUnits((prev) => prev.filter((u) => u.id !== unitToDelete.id));
      setSuccess("Unit deleted");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete unit");
    } finally {
      setSaving(false);
      setDeleteUnitDialog(false);
      setUnitToDelete(null);
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">
          Categories & Units
        </h1>
        <p className="text-slate-400 mt-1">
          Organise your products into categories, and define the units you sell
          or buy in.
        </p>
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

      {loading ? (
        <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
          <p className="text-slate-400">Loading...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ========================= CATEGORIES ========================= */}
          <Card className="bg-slate-800/50 border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Layers className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Categories
                  </h2>
                  <p className="text-xs text-slate-400">
                    {categories.length} categor
                    {categories.length === 1 ? "y" : "ies"}
                  </p>
                </div>
              </div>
              <Button
                onClick={openCreateCategory}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New
              </Button>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-700 rounded-lg">
                <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  No categories yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-blue-500/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
                        style={{ backgroundColor: cat.color || "#3b82f6" }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-100 truncate">
                          {cat.name}
                        </p>
                        {cat.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditCategory(cat)}
                        className="p-1.5 hover:bg-slate-800 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-400 hover:text-blue-400" />
                      </button>
                      <button
                        onClick={() => {
                          setCategoryToDelete(cat);
                          setDeleteCategoryDialog(true);
                        }}
                        className="p-1.5 hover:bg-slate-800 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ========================= UNITS ========================= */}
          <Card className="bg-slate-800/50 border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Ruler className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Units of Measure
                  </h2>
                  <p className="text-xs text-slate-400">
                    {units.length} unit{units.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <Button
                onClick={openCreateUnit}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New
              </Button>
            </div>

            {units.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-700 rounded-lg">
                <Ruler className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No units yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs font-mono font-semibold text-emerald-300 flex-shrink-0">
                        {unit.abbreviation}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-100 truncate flex items-center gap-2">
                          {unit.name}
                          {unit.is_system && (
                            <Lock className="w-3 h-3 text-slate-500" />
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {unit.allow_decimals
                            ? "Decimals allowed"
                            : "Whole numbers only"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditUnit(unit)}
                        className="p-1.5 hover:bg-slate-800 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-400" />
                      </button>
                      <button
                        onClick={() => {
                          setUnitToDelete(unit);
                          setDeleteUnitDialog(true);
                        }}
                        className="p-1.5 hover:bg-slate-800 rounded disabled:opacity-30"
                        title="Delete"
                        disabled={unit.is_system}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ============================ CATEGORY DIALOG ============================ */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "New Category"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Group related products together.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Name *
              </label>
              <Input
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="e.g. Electronics"
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: e.target.value,
                  })
                }
                placeholder="What belongs in this category?"
                className="bg-slate-950 border-slate-700 text-white"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Parent Category (optional)
              </label>
              <select
                value={categoryForm.parent_id}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    parent_id: e.target.value,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white text-sm"
              >
                <option value="">— None (top level) —</option>
                {categories
                  .filter((c) => c.id !== editingCategory?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      color: e.target.value,
                    })
                  }
                  className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-700 cursor-pointer"
                />
                <Input
                  value={categoryForm.color}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      color: e.target.value,
                    })
                  }
                  className="bg-slate-950 border-slate-700 text-white font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCategoryForm(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving
                ? "Saving..."
                : editingCategory
                  ? "Update"
                  : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================ UNIT DIALOG ============================ */}
      <Dialog open={showUnitForm} onOpenChange={setShowUnitForm}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>
              {editingUnit ? "Edit Unit" : "New Unit of Measure"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Define how your products are counted, weighed, or measured.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Unit Name *
                </label>
                <Input
                  value={unitForm.name}
                  onChange={(e) =>
                    setUnitForm({ ...unitForm, name: e.target.value })
                  }
                  placeholder="e.g. Kilogram"
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Abbreviation *
                </label>
                <Input
                  value={unitForm.abbreviation}
                  onChange={(e) =>
                    setUnitForm({
                      ...unitForm,
                      abbreviation: e.target.value,
                    })
                  }
                  placeholder="e.g. kg"
                  className="bg-slate-950 border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <Input
                value={unitForm.description}
                onChange={(e) =>
                  setUnitForm({ ...unitForm, description: e.target.value })
                }
                placeholder="Optional"
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 cursor-pointer">
              <input
                type="checkbox"
                checked={unitForm.allow_decimals}
                onChange={(e) =>
                  setUnitForm({
                    ...unitForm,
                    allow_decimals: e.target.checked,
                  })
                }
                className="accent-emerald-500"
              />
              <div>
                <p className="text-sm text-slate-200">
                  Allow decimal quantities
                </p>
                <p className="text-[11px] text-slate-500">
                  Turn off for units counted in whole numbers (e.g. pieces,
                  boxes)
                </p>
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnitForm(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveUnit}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "Saving..." : editingUnit ? "Update" : "Create Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================ DELETE DIALOGS ============================ */}
      <Dialog
        open={deleteCategoryDialog}
        onOpenChange={setDeleteCategoryDialog}
      >
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription className="text-slate-400">
              Delete "{categoryToDelete?.name}"? Products in this category
              will be marked uncategorised.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCategoryDialog(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteCategory}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteUnitDialog} onOpenChange={setDeleteUnitDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Unit</DialogTitle>
            <DialogDescription className="text-slate-400">
              Delete "{unitToDelete?.name}"? Products using this unit will
              need to be reassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteUnitDialog(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteUnit}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}