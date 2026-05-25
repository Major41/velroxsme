'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBusiness } from '@/context/BusinessContext';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Search,
  Mail,
  Phone,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Lock,
  Loader2,
} from 'lucide-react';

interface BusinessUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'manager' | 'staff';
  status: 'active' | 'inactive';
  permissions: string[];
  last_login: string;
  created_at: string;
}

export default function UsersPage() {
  const { business } = useBusiness();
  const supabase = createClient();
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<BusinessUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<BusinessUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff' as const,
  });

  // Fetch users on component mount
  useEffect(() => {
    if (business?.id) {
      fetchUsers();
    }
  }, [business]);

  const fetchUsers = async () => {
    if (!business?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_users')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getRolePermissions = (role: string) => {
    if (role === 'manager') {
      return ['view_all', 'edit_sales', 'edit_customers', 'view_reports'];
    }
    return ['view_sales', 'view_customers', 'add_reminders'];
  };

  const handleAddUser = async () => {
    if (!business?.id) return;
    
    setSaving(true);
    setError('');
    
    try {
      // Validate form
      if (!formData.name || !formData.email || !formData.password || !formData.role) {
        setError('Please fill in all required fields');
        setSaving(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/business/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          businessId: business.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccess('User created successfully!');
      setUsers([data.user, ...users]);
      resetForm();
      setShowAddForm(false);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser || !business?.id) return;
    
    setSaving(true);
    setError('');
    
    try {
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        role: formData.role,
        permissions: getRolePermissions(formData.role),
      };

      const { error: updateError } = await supabase
        .from('business_users')
        .update(updateData)
        .eq('id', editingUser.id);

      if (updateError) throw updateError;

      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...updateData }
          : u
      ));
      
      setSuccess('User updated successfully!');
      resetForm();
      setEditingUser(null);
      setShowAddForm(false);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: BusinessUser) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    try {
      const { error } = await supabase
        .from('business_users')
        .update({ status: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === user.id ? { ...u, status: newStatus } : u
      ));
      
      setSuccess(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error toggling status:', err);
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setSaving(true);
    
    try {
      // Delete from business_users (cascade will handle auth user if needed)
      const { error } = await supabase
        .from('business_users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== userToDelete.id));
      setSuccess('User deleted successfully!');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'staff',
    });
    setError('');
  };

  const openEditModal = (user: BusinessUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      role: user.role,
    });
    setShowAddForm(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'staff':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'active' ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    ) : (
      <XCircle className="w-4 h-4 text-red-400" />
    );
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Team Members</h1>
          <p className="text-slate-400 mt-1">Add and manage managers and staff who will use the dashboard</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingUser(null);
            setShowAddForm(!showAddForm);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium w-full md:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Error/Success Messages */}
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

      {/* Add/Edit User Form */}
      {showAddForm && (
        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingUser ? 'Edit Team Member' : 'Add New Team Member'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
              <Input
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address *</label>
              <Input
                type="email"
                placeholder="Enter email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingUser}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
              {editingUser && (
                <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
              <Input
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {editingUser ? 'New Password (optional)' : 'Password *'}
              </label>
              <Input
                type="password"
                placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
              {!editingUser && (
                <p className="text-xs text-slate-400 mt-1">Minimum 6 characters</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Role *</label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData({ ...formData, role: value as 'manager' | 'staff' })}
              >
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="manager" className="text-white">Manager</SelectItem>
                  <SelectItem value="staff" className="text-white">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={editingUser ? handleEditUser : handleAddUser}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'Saving...' : (editingUser ? 'Update Member' : 'Add Member')}
            </Button>
            <Button
              onClick={() => {
                setShowAddForm(false);
                setEditingUser(null);
                resetForm();
              }}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800/50"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-40 bg-slate-700/50 border-slate-600 text-white">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">All Roles</SelectItem>
              <SelectItem value="manager" className="text-white">Manager</SelectItem>
              <SelectItem value="staff" className="text-white">Staff</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40 bg-slate-700/50 border-slate-600 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">All Status</SelectItem>
              <SelectItem value="active" className="text-white">Active</SelectItem>
              <SelectItem value="inactive" className="text-white">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Joined</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Last Login</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="font-medium text-white">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{user.phone || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(user.status)}
                        <span className={user.status === 'active' ? 'text-emerald-400' : 'text-red-400'}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      <span className="text-sm">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                          title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          <Lock className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
                        </button>
                        <button
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No team members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <p className="text-slate-400 text-sm font-medium mb-2">Total Members</p>
          <p className="text-3xl font-bold text-white">{users.length}</p>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <p className="text-slate-400 text-sm font-medium mb-2">Active Members</p>
          <p className="text-3xl font-bold text-emerald-400">
            {users.filter((u) => u.status === 'active').length}
          </p>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <p className="text-slate-400 text-sm font-medium mb-2">Managers</p>
          <p className="text-3xl font-bold text-blue-400">
            {users.filter((u) => u.role === 'manager').length}
          </p>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Team Member</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
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
              onClick={handleDeleteUser}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}