"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Edit2, Trash2, X, ShieldCheck, AlertCircle, Check,
  Lock, Users as UsersIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  DEFAULT_ROLES,
} from "@/lib/permissions";

interface Role {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

export default function RolesPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [roles, setRoles] = useState<Role[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  /* ---------------- Fetch ---------------- */

  useEffect(() => {
    if (business?.id) fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  const fetchRoles = async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("business_id", business.id)
        .order("is_system", { ascending: false })
        .order("name");

      if (error) throw error;

      let list = data || [];

      // Seed default roles on first visit if none exist
      if (list.length === 0) {
        const { data: seeded, error: seedError } = await supabase
          .from("roles")
          .insert(
            DEFAULT_ROLES.map((r) => ({
              business_id: business.id,
              name: r.name,
              description: r.description,
              permissions: r.permissions,
              is_system: r.is_system,
            })),
          )
          .select("*");

        if (seedError) throw seedError;
        list = seeded || [];
      }

      setRoles(list);

      // Count users per role
      const { data: users } = await supabase
        .from("business_users")
        .select("role_id")
        .eq("business_id", business.id);

      const counts: Record<string, number> = {};
      for (const u of users || []) {
        if (u.role_id) counts[u.role_id] = (counts[u.role_id] || 0) + 1;
      }
      setUserCounts(counts);
    } catch (err: any) {
      console.error("Fetch roles error:", err);
      setError("Failed to load roles: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Actions ---------------- */

  const openCreate = () => {
    setEditingRole(null);
    setFormData({ name: "", description: "", permissions: [] });
    setShowForm(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || [],
    });
    setShowForm(true);
  };

  const togglePermission = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const toggleGroup = (group: string) => {
    const groupKeys = PERMISSIONS.filter((p) => p.group === group).map(
      (p) => p.key,
    );
    const allSelected = groupKeys.every((k) =>
      formData.permissions.includes(k),
    );

    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !groupKeys.includes(p))
        : Array.from(new Set([...prev.permissions, ...groupKeys])),
    }));
  };

  const handleSubmit = async () => {
    if (!business?.id) return;
    setError("");

    if (!formData.name.trim()) {
      setError("Role name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingRole) {
        const { error } = await supabase
          .from("roles")
          .update({
            name: formData.name.trim(),
            description: formData.description.trim(),
            permissions: formData.permissions,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingRole.id);
        if (error) throw error;
        setSuccess("Role updated successfully");
      } else {
        const { error } = await supabase.from("roles").insert({
          business_id: business.id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          permissions: formData.permissions,
          is_system: false,
        });
        if (error) throw error;
        setSuccess("Role created successfully");
      }

      setShowForm(false);
      setEditingRole(null);
      await fetchRoles();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Save role error:", err);
      setError(err.message || "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", roleToDelete.id);
      if (error) throw error;
      setRoles((prev) => prev.filter((r) => r.id !== roleToDelete.id));
      setSuccess("Role deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete role");
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const requestDelete = (role: Role) => {
    if (role.is_system) {
      setError("System roles cannot be deleted. Edit them instead.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    if (userCounts[role.id] > 0) {
      setError(
        `Cannot delete - ${userCounts[role.id]} user(s) assigned. Reassign first.`,
      );
      setTimeout(() => setError(""), 4000);
      return;
    }
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  /* ---------------- Render helpers ---------------- */

  const groupedPermissions = useMemo(() => {
    const map: Record<string, typeof PERMISSIONS> = {};
    for (const p of PERMISSIONS) {
      if (!map[p.group]) map[p.group] = [];
      map[p.group].push(p);
    }
    return map;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Roles</h1>
          <p className="text-slate-400 mt-1">
            Define what each team member can do in the dashboard
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Role
        </Button>
      </div>

      {/* Alerts */}
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

      {/* Roles list */}
      {loading ? (
        <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
          <p className="text-slate-400">Loading roles...</p>
        </Card>
      ) : roles.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
          <p className="text-slate-400">No roles yet. Create one to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card
              key={role.id}
              className="bg-slate-800/50 border-slate-700/50 p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate flex items-center gap-2">
                      {role.name}
                      {role.is_system && (
                        <Lock className="w-3 h-3 text-slate-500" />
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                      {role.description || "No description"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {role.permissions.length} permissions
                </span>
                <span className="flex items-center gap-1">
                  <UsersIcon className="w-3 h-3" />
                  {userCounts[role.id] || 0} users
                </span>
              </div>

              <div className="mt-auto flex gap-2">
                <Button
                  onClick={() => openEdit(role)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button
                  onClick={() => requestDelete(role)}
                  variant="outline"
                  size="sm"
                  className="border-red-600 text-red-400 hover:bg-red-950 hover:text-red-300"
                  disabled={role.is_system}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Edit Role" : "Create New Role"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Give the role a name and check what this role can access.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Role Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Accountant"
                  className="bg-slate-950 border-slate-700 text-white"
                  disabled={editingRole?.is_system}
                />
                {editingRole?.is_system && (
                  <p className="text-xs text-slate-500 mt-1">
                    System roles can't be renamed
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Short summary"
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Permission matrix */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-200">
                  Permissions ({formData.permissions.length} selected)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        permissions: PERMISSIONS.map((p) => p.key),
                      })
                    }
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Select all
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    onClick={() =>
                      setFormData({ ...formData, permissions: [] })
                    }
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => {
                  const groupPerms = groupedPermissions[group];
                  const allSelected = groupPerms.every((p) =>
                    formData.permissions.includes(p.key),
                  );
                  return (
                    <div
                      key={group}
                      className="border border-slate-700 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleGroup(group)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
                      >
                        <span className="text-sm font-semibold text-slate-200">
                          {group}
                        </span>
                        <span className="text-xs text-slate-400">
                          {allSelected ? "Unselect all" : "Select all"}
                        </span>
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-2">
                        {groupPerms.map((perm) => {
                          const checked = formData.permissions.includes(
                            perm.key,
                          );
                          return (
                            <label
                              key={perm.key}
                              className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                checked
                                  ? "bg-blue-500/10 border border-blue-500/30"
                                  : "hover:bg-slate-800/40 border border-transparent"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(perm.key)}
                                className="mt-0.5 accent-blue-500"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-200">
                                  {perm.label}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {perm.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditingRole(null);
                setError("");
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving
                ? "Saving..."
                : editingRole
                  ? "Update Role"
                  : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription className="text-slate-400">
              Delete "{roleToDelete?.name}"? Users assigned to this role will
              lose access. This cannot be undone.
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
              onClick={handleDeleteConfirm}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}