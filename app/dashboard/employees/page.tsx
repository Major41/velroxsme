'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { useBusiness } from '@/context/BusinessContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Edit2, AlertCircle, Check, Search, X } from 'lucide-react';

interface Employee {
  id: string;
  name: string;  // Changed from employee_name
  email: string | null;
  phone: string | null;
  role: string | null;  // Changed from position
  status?: string;
  created_at: string;
}

export default function EmployeesPage() {
  const { user } = useUser();
  const { business } = useBusiness();
  const supabase = createClient();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });

  // Fetch employees from business_users
  useEffect(() => {
    fetchEmployees();
  }, [business?.id]);

  const fetchEmployees = async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('business_users')
        .select('*')
        .eq('business_id', business.id)
        .order('name');

      if (fetchError) throw fetchError;
      setEmployees(data || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching employees');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
    });
    setEditingEmployee(null);
    setError('');
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role || '',
    });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.name) {
        setError('Employee name is required');
        return;
      }

      if (!business?.id) {
        setError('No business selected');
        return;
      }

      if (editingEmployee) {
        // Update existing employee
        const { error: updateError } = await supabase
          .from('business_users')
          .update({
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.role || null,
          })
          .eq('id', editingEmployee.id);

        if (updateError) throw updateError;
        setSuccess('Employee updated successfully!');
      } else {
        // Create new employee
        const { error: insertError } = await supabase
          .from('business_users')
          .insert({
            business_id: business.id,
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.role || null,
          });

        if (insertError) throw insertError;
        setSuccess('Employee added successfully!');
      }

      resetForm();
      setShowForm(false);
      await fetchEmployees();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('business_users')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSuccess('Employee deleted successfully!');
      await fetchEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error deleting employee');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Filter employees by search term
  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Employees</h1>
          <p className="text-slate-400 mt-1">Manage your team members</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </Button>
      </div>

      {/* Success/Error Messages */}
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

      {/* Employee Form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-100">
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <Button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name *
                </label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+254 700 000000"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Role/Position
                </label>
                <Input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  placeholder="Software Engineer"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? 'Saving...' : (editingEmployee ? 'Update Employee' : 'Add Employee')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* Employees Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {searchTerm 
              ? 'No employees match your search criteria.' 
              : 'No employees yet. Click "Add Employee" to get started.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-6 py-3 text-sm text-slate-100 font-medium">
                      {employee.name}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-300">
                      {employee.email || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-300">
                      {employee.phone || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-300">
                      {employee.role || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="text-blue-400 hover:text-blue-300 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="text-red-400 hover:text-red-300 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}