'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, Plus, X, Edit2, Trash2, CreditCard, Clock, CheckCircle, XCircle } from 'lucide-react';
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

interface Sale {
  id: string;
  date: string;
  product_name: string;
  category: string;
  customer_name: string;
  customer_phone: string;
  quantity: number;
  unit_price: number;
  amount: number;
  payment_method: string;
  payment_status: 'paid' | 'pending' | 'failed' | 'refunded';
  status: 'completed' | 'pending' | 'cancelled';
  notes: string;
  created_at: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function SalesPage() {
  const { business } = useBusiness();
  const supabase = createClient();
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    category: '',
    customer_name: '',
    customer_phone: '',
    quantity: '1',
    unit_price: '',
    amount: '',
    payment_method: 'Cash',
    payment_status: 'pending',
    status: 'completed',
    notes: '',
  });

  // Fetch sales on component mount
  useEffect(() => {
    if (business?.id) {
      fetchSales();
    }
  }, [business, filterPeriod]);

  const fetchSales = async () => {
    if (!business?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select('*')
        .eq('business_id', business.id)
        .order('date', { ascending: false });

      // Apply date filter
      if (filterPeriod !== 'all') {
        const today = new Date();
        let startDate = new Date();
        
        switch (filterPeriod) {
          case 'today':
            startDate = new Date(today.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(today.setDate(today.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(today.setMonth(today.getMonth() - 1));
            break;
        }
        
        query = query.gte('date', startDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSales(data || []);
    } catch (err: any) {
      console.error('Error fetching sales:', err);
      setError('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAmount = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const handleQuantityChange = (value: string) => {
    const quantity = parseFloat(value) || 0;
    const unitPrice = parseFloat(formData.unit_price) || 0;
    const amount = calculateAmount(quantity, unitPrice);
    
    setFormData({
      ...formData,
      quantity: value,
      amount: amount.toString(),
    });
  };

  const handleUnitPriceChange = (value: string) => {
    const unitPrice = parseFloat(value) || 0;
    const quantity = parseFloat(formData.quantity) || 0;
    const amount = calculateAmount(quantity, unitPrice);
    
    setFormData({
      ...formData,
      unit_price: value,
      amount: amount.toString(),
    });
  };


  // Add this function to your sales page component
const updateOrCreateCustomer = async (saleData: any) => {
  if (!business?.id) return;
  
  try {
    // Check if customer exists
    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .eq('phone', saleData.customer_phone)
      .maybeSingle();

    if (existingCustomer) {
      // Update existing customer
      const newTotalSpent = existingCustomer.total_spent + saleData.amount;
      const newVisitCount = existingCustomer.visit_count + 1;
      
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: saleData.customer_name, // Update name in case it changed
          total_spent: newTotalSpent,
          visit_count: newVisitCount,
          last_purchase_date: saleData.date,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCustomer.id);

      if (updateError) {
        console.error('Error updating customer:', updateError);
      } else {
        console.log('Customer updated successfully:', existingCustomer.id);
      }
    } else {
      // Create new customer
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          business_id: business.id,
          name: saleData.customer_name,
          phone: saleData.customer_phone,
          total_spent: saleData.amount,
          visit_count: 1,
          last_purchase_date: saleData.date,
          first_purchase_date: saleData.date,
          status: 'active',
        })
        .select();

    }
  } catch (err) {
    console.error('Error in updateOrCreateCustomer:', err);
  }
};

  const handleSubmit = async () => {
    if (!business?.id) return;
    
    setSaving(true);
    setError('');
    
    try {
      // Validate form
      if (!formData.product_name || !formData.category || !formData.customer_name || !formData.quantity || !formData.unit_price) {
        setError('Please fill in all required fields');
        setSaving(false);
        return;
      }

      const saleData = {
        business_id: business.id,
        date: formData.date,
        product_name: formData.product_name,
        category: formData.category,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        status: formData.status,
        notes: formData.notes,
      };

      let result;
      
      if (editingSale) {
        // Update existing sale
        const { data, error } = await supabase
          .from('sales')
          .update(saleData)
          .eq('id', editingSale.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        setSuccess('Sale updated successfully!');
      } else {
        // Create new sale
        const { data, error } = await supabase
          .from('sales')
          .insert([saleData])
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        setSuccess('Sale added successfully!');
        await updateOrCreateCustomer(saleData);
      }

      // Refresh sales list
      await fetchSales();
      
      // Reset form and close
      resetForm();
      setShowAddForm(false);
      setEditingSale(null);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error saving sale:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!saleToDelete) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleToDelete.id);

      if (error) throw error;

      setSales(sales.filter(s => s.id !== saleToDelete.id));
      setSuccess('Sale deleted successfully!');
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error deleting sale:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      date: sale.date.split('T')[0],
      product_name: sale.product_name,
      category: sale.category,
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone || '',
      quantity: sale.quantity.toString(),
      unit_price: sale.unit_price.toString(),
      amount: sale.amount.toString(),
      payment_method: sale.payment_method,
      payment_status: sale.payment_status,
      status: sale.status,
      notes: sale.notes || '',
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      product_name: '',
      category: '',
      customer_name: '',
      customer_phone: '',
      quantity: '1',
      unit_price: '',
      amount: '',
      payment_method: 'Cash',
      payment_status: 'pending',
      status: 'completed',
      notes: '',
    });
    setError('');
  };

  // Calculate statistics
  const totalSales = sales
    .filter(s => s.payment_status === 'paid')
    .reduce((sum, s) => sum + s.amount, 0);
    
  const pendingPayments = sales
    .filter(s => s.payment_status === 'pending')
    .reduce((sum, s) => sum + s.amount, 0);
    
  const completedTransactions = sales.filter(s => s.status === 'completed').length;
  const avgOrderValue = completedTransactions > 0 ? Math.round(totalSales / completedTransactions) : 0;

  // Prepare chart data
  const salesChartData = () => {
    const grouped = sales.reduce((acc: any, sale) => {
      const date = sale.date;
      if (!acc[date]) {
        acc[date] = { date, sales: 0, paid: 0, pending: 0 };
      }
      acc[date].sales += sale.amount;
      if (sale.payment_status === 'paid') {
        acc[date].paid += sale.amount;
      } else if (sale.payment_status === 'pending') {
        acc[date].pending += sale.amount;
      }
      return acc;
    }, {});
    
    return Object.values(grouped).slice(-30); // Last 30 days
  };

  // Get unique categories from sales
  const getUniqueCategories = () => {
    const categories = new Set(sales.map(sale => sale.category));
    return Array.from(categories).sort();
  };

  const categoryData = () => {
    const grouped = sales.reduce((acc: any, sale) => {
      if (sale.payment_status === 'paid') {
        if (!acc[sale.category]) {
          acc[sale.category] = 0;
        }
        acc[sale.category] += sale.amount;
      }
      return acc;
    }, {});
    
    return Object.entries(grouped).map(([name, value], index) => ({
      name,
      value,
      fill: COLORS[index % COLORS.length],
    }));
  };

  const paymentStatusData = () => {
    const paid = sales.filter(s => s.payment_status === 'paid').reduce((sum, s) => sum + s.amount, 0);
    const pending = sales.filter(s => s.payment_status === 'pending').reduce((sum, s) => sum + s.amount, 0);
    const failed = sales.filter(s => s.payment_status === 'failed').reduce((sum, s) => sum + s.amount, 0);
    const refunded = sales.filter(s => s.payment_status === 'refunded').reduce((sum, s) => sum + s.amount, 0);
    
    return [
      { name: 'Paid', value: paid, fill: '#10b981' },
      { name: 'Pending', value: pending, fill: '#f59e0b' },
      { name: 'Failed', value: failed, fill: '#ef4444' },
      { name: 'Refunded', value: refunded, fill: '#8b5cf6' },
    ].filter(item => item.value > 0);
  };

  const columns = [
    { key: 'date' as const, label: 'Date' },
    { key: 'product_name' as const, label: 'Product' },
    { key: 'category' as const, label: 'Category' },
    { key: 'customer_name' as const, label: 'Customer' },
    { key: 'customer_phone' as const, label: 'Phone' },
    {
      key: 'quantity' as const,
      label: 'Qty',
      render: (value: number) => value,
    },
    {
      key: 'amount' as const,
      label: 'Amount',
      render: (value: number) => `KSh ${value.toLocaleString()}`,
    },
    {
      key: 'payment_status' as const,
      label: 'Payment',
      render: (value: string) => {
        const config = {
          paid: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Paid' },
          pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Pending' },
          failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' },
          refunded: { icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Refunded' },
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
      key: 'status' as const,
      label: 'Status',
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            value === 'completed'
              ? 'bg-emerald-500/20 text-emerald-300'
              : value === 'pending'
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-red-500/20 text-red-300'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'actions' as const,
      label: 'Actions',
      render: (_: any, row: Sale) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Edit sale"
          >
            <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-400" />
          </button>
          <button
            onClick={() => {
              setSaleToDelete(row);
              setDeleteDialogOpen(true);
            }}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Delete sale"
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
        <h1 className="text-3xl font-bold text-white">Sales Tracking</h1>
        <p className="text-slate-400 mt-2">Monitor your sales performance and track payment status.</p>
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

      {/* Period Filter and Add Button */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-2">
          {['today', 'week', 'month', 'all'].map((period) => (
            <Button
              key={period}
              variant={filterPeriod === period ? 'default' : 'outline'}
              onClick={() => setFilterPeriod(period)}
              className={
                filterPeriod === period
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'border-slate-600 text-slate-300'
              }
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          ))}
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingSale(null);
            setShowAddForm(!showAddForm);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Sale
        </Button>
      </div>

      {/* Add/Edit Sale Form */}
      {showAddForm && (
        <ChartCard title={editingSale ? 'Edit Sale' : 'Add New Sale'}>
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
                <label className="text-sm font-medium text-slate-300 block mb-2">Product Name *</label>
                <Input
                  type="text"
                  placeholder="e.g., Laptop Pro"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Category *</label>
                <Input
                  type="text"
                  placeholder="e.g., Electronics, Furniture, Food, etc."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-400 mt-1">Enter any category name (free text)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Customer Name *</label>
                <Input
                  type="text"
                  placeholder="e.g., John Doe"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Customer Phone</label>
                <Input
                  type="tel"
                  placeholder="+254 712 345 678"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Quantity *</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Unit Price (KSh) *</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.unit_price}
                  onChange={(e) => handleUnitPriceChange(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Total Amount (KSh)</label>
                <Input
                  type="number"
                  value={formData.amount}
                  disabled
                  className="bg-slate-800 border-slate-700 text-white cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Payment Status</label>
                <Select value={formData.payment_status} onValueChange={(value) => setFormData({ ...formData, payment_status: value })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Order Status</label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Notes (Optional)</label>
              <Textarea
                placeholder="Additional notes about this sale..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingSale(null);
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
                {saving ? 'Saving...' : (editingSale ? 'Update Sale' : 'Save Sale')}
              </Button>
            </div>
          </div>
        </ChartCard>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sales (Paid)"
          value={`KSh ${totalSales.toLocaleString()}`}
          subtitle="From completed payments"
          icon={<TrendingUp className="w-4 h-4" />}
          // trend={{ value: 15, direction: 'up' }}
        />
        <StatCard
          title="Avg Order Value"
          value={`KSh ${avgOrderValue.toLocaleString()}`}
          subtitle="Per transaction"
        />
        <StatCard
          title="Total Orders"
          value={completedTransactions}
          subtitle="Completed orders"
        />
        <StatCard
          title="Pending Payments"
          value={`KSh ${pendingPayments.toLocaleString()}`}
          subtitle="Awaiting clearance"
          // trend={{ value: 2, direction: 'down' }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <ChartCard title="Sales Trend" description="Daily sales and payment status">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`KSh ${value.toLocaleString()}`, '']}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Line type="monotone" dataKey="paid" stroke="#10b981" strokeWidth={2} dot={false} name="Paid" />
              <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} dot={false} name="Pending" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Payment Status Distribution */}
        <ChartCard title="Payment Status" description="Revenue by payment status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentStatusData()}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label={(entry) => `${entry.name}: KSh ${entry.value.toLocaleString()}`}
              >
                {paymentStatusData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`KSh ${value.toLocaleString()}`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Sales by Category - Dynamic Categories */}
      {categoryData().length > 0 && (
        <ChartCard title="Sales by Category" description="Revenue breakdown by product category">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={categoryData()} 
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
                formatter={(value: number) => [`KSh ${value.toLocaleString()}`, 'Revenue']}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="value" name="Revenue">
                {categoryData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {getUniqueCategories().map((category) => {
              const categoryTotal = sales
                .filter(s => s.category === category && s.payment_status === 'paid')
                .reduce((sum, s) => sum + s.amount, 0);
              return (
                <div key={category} className="flex justify-between items-center p-2 bg-slate-700/30 rounded-lg">
                  <span className="text-sm text-slate-300">{category}</span>
                  <span className="text-sm font-semibold text-white">KSh {categoryTotal.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}

      {/* Sales Table */}
      <ChartCard title="Sales Transactions">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <DataTable data={sales} columns={columns} />
        )}
      </ChartCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Sale</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this sale? This action cannot be undone.
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