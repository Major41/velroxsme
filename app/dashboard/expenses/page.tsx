'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CreditCard, Plus, Edit2, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { createClient } from '@/lib/supabase/client';
import { useBusiness } from '@/context/BusinessContext';

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  status: 'paid' | 'pending';
  receipt_url?: string;
  created_at: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function ExpensesPage() {
  const { business } = useBusiness();
  const supabase = createClient();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    payment_method: 'Bank Transfer',
    status: 'pending',
  });

  // Fetch expenses on component mount
  useEffect(() => {
    if (business?.id) {
      fetchExpenses();
    }
  }, [business]);

  const fetchExpenses = async () => {
    if (!business?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('business_id', business.id)
        .order('date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setError('Failed to load expenses data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!business?.id) return;
    
    setSaving(true);
    setError('');
    
    try {
      // Validate form
      if (!formData.category || !formData.amount) {
        setError('Please fill in all required fields');
        setSaving(false);
        return;
      }

      const expenseData = {
        business_id: business.id,
        date: formData.date,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        status: formData.status,
      };

      let result;
      
      if (editingExpense) {
        // Update existing expense
        const { data, error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        setSuccess('Expense updated successfully!');
      } else {
        // Create new expense
        const { data, error } = await supabase
          .from('expenses')
          .insert([expenseData])
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        setSuccess('Expense added successfully!');
      }

      // Refresh expenses list
      await fetchExpenses();
      
      // Reset form and close
      resetForm();
      setShowAddForm(false);
      setEditingExpense(null);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error saving expense:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseToDelete.id);

      if (error) throw error;

      setExpenses(expenses.filter(e => e.id !== expenseToDelete.id));
      setSuccess('Expense deleted successfully!');
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date.split('T')[0],
      category: expense.category,
      description: expense.description || '',
      amount: expense.amount.toString(),
      payment_method: expense.payment_method,
      status: expense.status,
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: '',
      payment_method: 'Bank Transfer',
      status: 'pending',
    });
    setError('');
  };

  // Calculate statistics
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const paidExpenses = expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const avgExpense = expenses.length > 0 ? Math.round(totalExpenses / expenses.length) : 0;

  // Get unique categories from expenses
  const getUniqueCategories = () => {
    const categories = new Set(expenses.map(expense => expense.category));
    return Array.from(categories).sort();
  };

  // Prepare chart data
  const expenseByCategoryData = () => {
    const grouped = expenses.reduce((acc: any, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += expense.amount;
      return acc;
    }, {});
    
    return Object.entries(grouped).map(([name, value], index) => ({
      name,
      value,
      fill: COLORS[index % COLORS.length],
    }));
  };

  const categoryDistributionData = expenseByCategoryData();

  const filteredExpenses = filterCategory === 'all' 
    ? expenses 
    : expenses.filter(e => e.category === filterCategory);

  const columns = [
    { key: 'date' as const, label: 'Date' },
    { key: 'category' as const, label: 'Category' },
    { key: 'description' as const, label: 'Description' },
    {
      key: 'amount' as const,
      label: 'Amount',
      render: (value: number) => `KSh ${value.toLocaleString()}`,
    },
    { key: 'payment_method' as const, label: 'Method' },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string) => {
        const config = {
          paid: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Paid' },
          pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Pending' },
        };
        const c = config[value as keyof typeof config];
        const Icon = c.icon;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.color}`}>
            <Icon className="w-3 h-3" />
            {c.label}
          </span>
        );
      },
    },
    {
      key: 'actions' as const,
      label: 'Actions',
      render: (_: any, row: Expense) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Edit expense"
          >
            <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-400" />
          </button>
          <button
            onClick={() => {
              setExpenseToDelete(row);
              setDeleteDialogOpen(true);
            }}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Delete expense"
          >
            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Expense Tracking</h1>
        <p className="text-slate-400 mt-2">Monitor and manage your business expenses.</p>
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

      {/* Category Filter & Add Button */}
      <div className="flex gap-2 flex-wrap justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterCategory('all')}
            className={
              filterCategory === 'all'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'border-slate-600 text-slate-300'
            }
          >
            All
          </Button>
          {getUniqueCategories().map((cat) => (
            <Button
              key={cat}
              variant={filterCategory === cat ? 'default' : 'outline'}
              onClick={() => setFilterCategory(cat)}
              className={
                filterCategory === cat
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'border-slate-600 text-slate-300'
              }
            >
              {cat}
            </Button>
          ))}
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingExpense(null);
            setShowAddForm(!showAddForm);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Add/Edit Expense Form */}
      {showAddForm && (
        <ChartCard title={editingExpense ? 'Edit Expense' : 'Add New Expense'}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Date *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Category *</label>
                <Input
                  type="text"
                  placeholder="e.g., Utilities, Salaries, Marketing, etc."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-400 mt-1">Enter any category name (free text)</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Description</label>
              <Textarea
                placeholder="What is this expense for?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Amount (KSh) *</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Payment Method</label>
                <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Debit Card">Debit Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Status</label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingExpense(null);
                  resetForm();
                }}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Save Expense')}
              </Button>
            </div>
          </div>
        </ChartCard>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Expenses"
          value={`KSh ${totalExpenses.toLocaleString()}`}
          subtitle="All expenses"
          icon={<CreditCard className="w-4 h-4" />}
          // trend={{ value: 8, direction: 'up' }}
        />
        <StatCard
          title="Paid Expenses"
          value={`KSh ${paidExpenses.toLocaleString()}`}
          subtitle="Completed payments"
        />
        <StatCard
          title="Pending Expenses"
          value={`KSh ${pendingExpenses.toLocaleString()}`}
          subtitle="Awaiting payment"
        />
        <StatCard 
          title="Avg Expense" 
          value={`KSh ${avgExpense.toLocaleString()}`} 
          subtitle="Per transaction" 
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        {categoryDistributionData.length > 0 && (
          <ChartCard title="Expenses by Category">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={categoryDistributionData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" tickFormatter={(value) => `KSh ${(value / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`KSh ${value.toLocaleString()}`, 'Amount']}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="value" name="Amount">
                  {categoryDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Category Distribution Pie Chart */}
        {categoryDistributionData.length > 0 && (
          <ChartCard title="Category Distribution">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={categoryDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={(entry) => `${entry.name}: KSh ${entry.value.toLocaleString()}`}
                >
                  {categoryDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`KSh ${value.toLocaleString()}`, 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Category Summary */}
      {getUniqueCategories().length > 0 && (
        <ChartCard title="Category Summary">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {getUniqueCategories().map((category) => {
              const categoryTotal = expenses
                .filter(e => e.category === category)
                .reduce((sum, e) => sum + e.amount, 0);
              const categoryCount = expenses.filter(e => e.category === category).length;
              return (
                <div key={category} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <p className="text-sm font-medium text-slate-300">{category}</p>
                  <p className="text-lg font-bold text-white">KSh {categoryTotal.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">{categoryCount} expense(s)</p>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}

      {/* Expenses Table */}
      <ChartCard title="Expense Details">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <DataTable data={filteredExpenses} columns={columns} />
        )}
      </ChartCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this expense? This action cannot be undone.
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
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}