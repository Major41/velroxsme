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
import { Plus, Trash2, AlertCircle, Check } from 'lucide-react';

export default function ServiceFeePage() {
  const { user } = useUser();
  const {business} = useBusiness()
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [serviceFees, setServiceFees] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');

  const serviceTypes = [
    'Machine Repair',
    'Equipment Maintenance',
    'Cleaning Services',
    'Utilities',
    'Supplies',
    'Other',
  ];

  const [formData, setFormData] = useState({
    serviceName: '',
    serviceType: 'Machine Repair',
    amount: '',
    description: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });


  // Fetch service fees
  useEffect(() => {
    const fetchServiceFees = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('service_fees')
          .select('*')
          .eq('business_id', business?.id)
          .order('payment_date', { ascending: false });

        if (fetchError) throw fetchError;
        setServiceFees(data || []);
      } catch (err) {
        console.error('Error fetching service fees:', err);
      }
    };

    fetchServiceFees();
  }, [business, supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, serviceType: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!formData.serviceName || !formData.amount) {
        setError('Please fill in all required fields');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('service_fees')
        .insert({
          business_id: business?.id,
          service_name: formData.serviceName,
          service_type: formData.serviceType,
          amount: parseFloat(formData.amount),
          description: formData.description,
          payment_date: formData.paymentDate,
          status: 'completed',
        });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess('Service fee recorded successfully!');
      setFormData({
        serviceName: '',
        serviceType: 'Machine Repair',
        amount: '',
        description: '',
        paymentDate: new Date().toISOString().split('T')[0],
      });

      setTimeout(() => {
        setShowForm(false);
        setSuccess('');
      }, 2000);

      // Refresh service fees
      const { data: updated } = await supabase
        .from('service_fees')
        .select('*')
        .eq('business_id', selectedBusiness)
        .order('payment_date', { ascending: false });
      setServiceFees(updated || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('service_fees')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setServiceFees((prev) => prev.filter((record) => record.id !== id));
      setSuccess('Record deleted successfully!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Error deleting record');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Service Fees Management</h1>
        <p className="text-slate-400 mt-1">Record and manage business service expenses</p>
      </div>


      {/* Add Button and Form */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-100">Service Fee Records</h2>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Record Service Fee
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Service Name *
                </label>
                <Input
                  type="text"
                  name="serviceName"
                  value={formData.serviceName}
                  onChange={handleInputChange}
                  placeholder="e.g., Machine repair"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Service Type *
                </label>
                <Select value={formData.serviceType} onValueChange={handleSelectChange}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Amount (KSh) *
                </label>
                <Input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="bg-slate-800 border-slate-700 text-white"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Payment Date *
                </label>
                <Input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Additional details about the service..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? 'Saving...' : 'Record Service Fee'}
              </Button>
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {serviceFees.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No service fees recorded yet. Click "Record Service Fee" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">
                    Amount (KSh)
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {serviceFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-6 py-3 text-sm text-slate-100">{fee.service_name}</td>
                    <td className="px-6 py-3 text-sm text-slate-300">{fee.service_type}</td>
                    <td className="px-6 py-3 text-sm font-medium text-orange-400">
                      KSh {parseFloat(fee.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-300">
                      {new Date(fee.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-medium">
                        {fee.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <button
                        onClick={() => handleDelete(fee.id)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {serviceFees.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Total Service Expenses</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                KSh {serviceFees.reduce((sum, f) => sum + parseFloat(f.amount), 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Service Types</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {new Set(serviceFees.map((f) => f.service_type)).size}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Records</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">{serviceFees.length}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-3">Expenses by Type</p>
              <div className="space-y-2">
                {Array.from(
                  new Map(
                    serviceFees.map((f) => [
                      f.service_type,
                      serviceFees
                        .filter((fee) => fee.service_type === f.service_type)
                        .reduce((sum, fee) => sum + parseFloat(fee.amount), 0),
                    ])
                  ).entries()
                ).map(([type, total]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-slate-300">{type}</span>
                    <span className="text-orange-400 font-medium">
                      KSh {total.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
