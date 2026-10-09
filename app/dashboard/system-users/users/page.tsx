"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
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
import {
  Plus, Edit2, Trash2, X, UserCog, AlertCircle, Check,
  ShieldCheck, Eye, EyeOff, Mail, Phone, User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

interface BusinessUser {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone: string | null;
  role_id: string | null;
  status: "active" | "inactive";
  last_login_at: string | null;
  created_at: string;
  roles?: { name: string } | null;
}

export default function SystemUsersPage() {
  const { business } = useBusiness();
  const supabase = createClient();

  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<BusinessUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<BusinessUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role_id: "",
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
      const [usersRes, rolesRes] = await Promise.all([
        supabase
          .from("business_users")
          .select("*, roles(name)")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("roles")
          .select("id, name, description, is_system")
          .eq("business_id", business.id)
          .order("name"),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Actions ---------------- */

  const openCreate = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      role_id: roles[0]?.id || "",
      status: "active",
    });
    setShowPassword(false);
    setShowForm(true);
  };

  const openEdit = (user: BusinessUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      role_id: user.role_id || "",
      status: user.status,
    });
    setShowPassword(false);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!business?.id) return;
    setError("");

    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Name and email are required");
      return;
    }
    if (!formData.role_id) {
      setError("Please select a role");
      return;
    }
    if (!editingUser && !formData.password) {
      setError("Password is required for new users");
      return;
    }
    if (formData.password && formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      const normalizedEmail = formData.email.trim().toLowerCase();

      if (editingUser) {
        // Update user (password only if provided)
        const updatePayload: any = {
          name: formData.name.trim(),
          email: normalizedEmail,
          phone: formData.phone.trim() || null,
          role_id: formData.role_id,
          status: formData.status,
          updated_at: new Date().toISOString(),
        };

        // Only send password to the API when it's actually being changed
        const res = await fetch("/api/business/users/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingUser.id,
            business_id: business.id,
            password: formData.password || undefined,
            ...updatePayload,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update user");
        setSuccess("User updated successfully");
      } else {
        // Create user via API route (handles password hashing)
        const res = await fetch("/api/business/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_id: business.id,
            name: formData.name.trim(),
            email: normalizedEmail,
            phone: formData.phone.trim() || null,
            password: formData.password,
            role_id: formData.role_id,
            status: formData.status,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create user");
        setSuccess("User created successfully");
      }

      setShowForm(false);
      setEditingUser(null);
      await fetchAll();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Save user error:", err);
      setError(err.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("business_users")
        .delete()
        .eq("id", userToDelete.id);
      if (error) throw error;
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setSuccess("User deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">System Users</h1>
          <p className="text-slate-400 mt-1">
            Team members who can access this business dashboard
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={roles.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
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

      {roles.length === 0 && !loading && (
        <Card className="bg-amber-500/10 border-amber-500/30 p-4">
          <p className="text-amber-200 text-sm">
            You need to create a role first before adding users. Go to{" "}
            <a
              href="/dashboard/system-users/roles"
              className="underline font-semibold"
            >
              Roles
            </a>{" "}
            to get started.
          </p>
        </Card>
      )}

      {/* Users table */}
      {loading ? (
        <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
          <p className="text-slate-400">Loading users...</p>
        </Card>
      ) : users.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
          <UserCog className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            No users yet. Click "Add User" to invite your first team member.
          </p>
        </Card>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                    Last Login
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-100 truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.roles?.name ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-blue-500/20 text-blue-300">
                          <ShieldCheck className="w-3 h-3" />
                          {user.roles.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          No role
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          user.status === "active"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-600/20 text-slate-400"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-400">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString()
                          : "Never"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => openEdit(user)}
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300 hover:bg-slate-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400 hover:bg-red-950 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingUser
                ? "Update details. Leave password blank to keep the current one."
                : "Create a team member who can log in to this dashboard."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Jane Doe"
                  className="pl-10 bg-slate-950 border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="jane@company.com"
                  className="pl-10 bg-slate-950 border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+254 ..."
                  className="pl-10 bg-slate-950 border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Role *
              </label>
              <Select
                value={formData.role_id}
                onValueChange={(v) => setFormData({ ...formData, role_id: v })}
              >
                <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {editingUser ? "New Password (optional)" : "Password *"}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={
                    editingUser
                      ? "Leave blank to keep current"
                      : "Minimum 6 characters"
                  }
                  className="bg-slate-950 border-slate-700 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    status: v as "active" | "inactive",
                  })
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
              onClick={() => {
                setShowForm(false);
                setEditingUser(null);
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
                : editingUser
                  ? "Update User"
                  : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription className="text-slate-400">
              Remove "{userToDelete?.name}" from this dashboard? They will lose
              access immediately. This cannot be undone.
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
              {saving ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}