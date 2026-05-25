'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ShoppingCart, TrendingDown, Plus, Edit2, Trash2, CheckCircle, Clock, XCircle, Truck } from 'lucide-react';
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

interface Purchase {
  id: string;
  date: string;
  vendor_name: string;
  category: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  status: 'delivered' | 'pending' | 'cancelled';
  delivery_date: string;
  notes: string;
  created_at: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function PurchasesPage() {
  const { business } = useBusiness();
  const supabase = createClient();
  
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    category: '',
    description: '',
    quantity: '1',
    unit_price: '',
    total_amount: '',
    payment_method: 'Bank Transfer',
    status: 'pending',
    delivery_date: '',
    notes: '',
  });

  // Fetch purchases on component mount
  useEffect(() => {
    if (business?.id) {
      fetchPurchases();
    }
  }, [business]);

  const fetchPurchases = async () => {
    if (!business?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('purchases')
        .select('*')
        .eq('business_id', business.id)
        .order('date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setPurchases(data || []);
    } catch (err: any) {
      console.error('Error fetching purchases:', err);
      setError('Failed to load purchases data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalAmount = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const handleQuantityChange = (value: string) => {
    const quantity = parseFloat(value) || 0;
    const unitPrice = parseFloat(formData.unit_price) || 0;
    const totalAmount = calculateTotalAmount(quantity, unitPrice);
    
    setFormData({
      ...formData,
      quantity: value,
      total_amount: totalAmount.toString(),
    });
  };

  const handleUnitPriceChange = (value: string) => {
    const unitPrice = parseFloat(value) || 0;
    const quantity = parseFloat(formData.quantity) || 0;
    const totalAmount = calculateTotalAmount(quantity, unitPrice);
    
    setFormData({
      ...formData,
      unit_price: value,
      total_amount: totalAmount.toString(),
    });
  };

  const handleSubmit = async () => {
    if (!business?.id) return;
    
    setSaving(true);
    setError('');
    
    try {
      // Validate form
      if (!formData.vendor_name || !formData.category || !formData.quantity || !formData.unit_price) {
        setError('Please fill in all required fields');
        setSaving(false);
        return;
      }

      const purchaseData = {
        business_id: business.id,
        date: formData.date,
        vendor_name: formData.vendor_name,
        category: formData.category,
        description: formData.description,
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        total_amount: parseFloat(formData.total_amount),
        payment_method: formData.payment_method,
        status: formData.status,
        delivery_date: formData.delivery_date || null,
        notes: formData.notes,
      };

      let result;
      
      if (editingPurchase) {
        // Update existing purchase
        const { data, error } = await supabase
          .from('purchases')
          .update(purchaseData)
          .eq('id', editingPurchase.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        setSuccess('Purchase updated successfully!');
      } else {
        // Create new purchase
        const { data, error } = await supabase
          .from('purchases')
          .insert([purchaseData])
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        setSuccess('Purchase added successfully!');
      }

      // Refresh purchases list
      await fetchPurchases();
      
      // Reset form and close
      resetForm();
      setShowAddForm(false);
      setEditingPurchase(null);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error saving purchase:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!purchaseToDelete) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseToDelete.id);

      if (error) throw error;

      setPurchases(purchases.filter(p => p.id !== purchaseToDelete.id));
      setSuccess('Purchase deleted successfully!');
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error deleting purchase:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      date: purchase.date.split('T')[0],
      vendor_name: purchase.vendor_name,
      category: purchase.category,
      description: purchase.description || '',
      quantity: purchase.quantity.toString(),
      unit_price: purchase.unit_price.toString(),
      total_amount: purchase.total_amount.toString(),
      payment_method: purchase.payment_method,
      status: purchase.status,
      delivery_date: purchase.delivery_date ? purchase.delivery_date.split('T')[0] : '',
      notes: purchase.notes || '',
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      vendor_name: '',
      category: '',
      description: '',
      quantity: '1',
      unit_price: '',
      total_amount: '',
      payment_method: 'Bank Transfer',
      status: 'pending',
      delivery_date: '',
      notes: '',
    });
    setError('');
  };

  // Calculate statistics
  const totalPurchases = purchases.reduce((sum, p) => sum + p.total_amount, 0);
  const deliveredPurchases = purchases.filter(p => p.status === 'delivered').reduce((sum, p) => sum + p.total_amount, 0);
  const pendingPurchases = purchases.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.total_amount, 0);
  const cancelledPurchases = purchases.filter(p => p.status === 'cancelled').reduce((sum, p) => sum + p.total_amount, 0);
  const avgPurchase = purchases.length > 0 ? Math.round(totalPurchases / purchases.length) : 0;

  // Get unique categories
  const getUniqueCategories = () => {
    const categories = new Set(purchases.map(p => p.category));
    return Array.from(categories).sort();
  };

  // Category data for chart
  const categoryData = () => {
    const grouped = purchases.reduce((acc: any, purchase) => {
      if (!acc[purchase.category]) {
        acc[purchase.category] = 0;
      }
      acc[purchase.category] += purchase.total_amount;
      return acc;
    }, {});
    
    return Object.entries(grouped).map(([name, value], index) => ({
      name,
      value,
      fill: COLORS[index % COLORS.length],
    }));
  };

  // Status distribution
  const statusData = [
    { name: 'Delivered', value: purchases.filter(p => p.status === 'delivered').length, fill: '#10b981' },
    { name: 'Pending', value: purchases.filter(p => p.status === 'pending').length, fill: '#f59e0b' },
    { name: 'Cancelled', value: purchases.filter(p => p.status === 'cancelled').length, fill: '#ef4444' },
  ].filter(item => item.value > 0);

  // Monthly trend
  const monthlyTrendData = () => {
    const grouped = purchases.reduce((acc: any, purchase) => {
      const month = purchase.date.substring(0, 7);
      if (!acc[month]) {
        acc[month] = { month, total: 0 };
      }
      acc[month].total += purchase.total_amount;
      return acc;
    }, {});
    
    return Object.values(grouped).slice(-6);
  };

  // Filtered purchases
  const filteredPurchases = purchases.filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchesStatus && matchesCategory;
  });

  const columns = [
    { key: 'date' as const, label: 'Date' },
    { key: 'vendor_name' as const, label: 'Vendor' },
    { key: 'category' as const, label: 'Category' },
    { key: 'description' as const, label: 'Description' },
    { key: 'quantity' as const, label: 'Qty' },
    {
      key: 'total_amount' as const,
      label: 'Amount',
      render: (value: number) => `KSh ${value.toLocaleString()}`,
    },
    { key: 'payment_method' as const, label: 'Method' },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string) => {
        const config = {
          delivered: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Delivered' },
          pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Pending' },
          cancelled: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Cancelled' },
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
      render: (_: any, row: Purchase) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Edit purchase"
          >
            <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-400" />
          </button>
          <button
            onClick={() => {
              setPurchaseToDelete(row);
              setDeleteDialogOpen(true);
            }}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Delete purchase"
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
        <h1 className="text-3xl font-bold text-white">Purchase Management</h1>
        <p className="text-slate-400 mt-2">Monitor all purchases and vendor transactions for your business.</p>
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

      {/* Filters & Add Button */}
      <div className="flex gap-2 flex-wrap justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Categories</SelectItem>
              {getUniqueCategories().map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button
          onClick={() => {
            resetForm();
            setEditingPurchase(null);
            setShowAddForm(!showAddForm);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Purchase
        </Button>
      </div>

      {/* Add/Edit Purchase Form */}
      {showAddForm && (
        <ChartCard title={editingPurchase ? 'Edit Purchase' : 'Add New Purchase'}>
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
                <label className="text-sm font-medium text-slate-300 block mb-2">Vendor Name *</label>
                <Input
                  type="text"
                  placeholder="e.g., Tech Supplies Co"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Category *</label>
                <Input
                  type="text"
                  placeholder="e.g., Equipment, Electronics, Furniture, etc."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-400 mt-1">Enter any category name (free text)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Description</label>
                <Input
                  type="text"
                  placeholder="What are you purchasing?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  value={formData.total_amount}
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
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
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
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Expected Delivery Date</label>
                <Input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Notes (Optional)</label>
              <Textarea
                placeholder="Additional notes about this purchase..."
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
                  setEditingPurchase(null);
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
                {saving ? 'Saving...' : (editingPurchase ? 'Update Purchase' : 'Save Purchase')}
              </Button>
            </div>
          </div>
        </ChartCard>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Purchases"
          value={`KSh ${totalPurchases.toLocaleString()}`}
          subtitle={`${purchases.length} orders`}
          icon={<ShoppingCart className="w-4 h-4" />}
        />
        <StatCard
          title="Delivered"
          value={`KSh ${deliveredPurchases.toLocaleString()}`}
          subtitle={`${purchases.filter(p => p.status === 'delivered').length} orders`}
        />
        <StatCard
          title="Pending"
          value={`KSh ${pendingPurchases.toLocaleString()}`}
          subtitle={`${purchases.filter(p => p.status === 'pending').length} orders`}
        />
        <StatCard
          title="Avg Purchase"
          value={`KSh ${avgPurchase.toLocaleString()}`}
          subtitle="Per transaction"
          icon={<TrendingDown className="w-4 h-4" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchases by Category */}
        {categoryData().length > 0 && (
          <ChartCard title="Purchases by Category">
            <ResponsiveContainer width="100%" height={350}>
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
                  formatter={(value: number) => [`KSh ${value.toLocaleString()}`, 'Amount']}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="value" name="Amount">
                  {categoryData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Status Distribution */}
        {statusData.length > 0 && (
          <ChartCard title="Status Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Monthly Trend */}
      {monthlyTrendData().length > 0 && (
        <ChartCard title="Monthly Purchase Trend">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrendData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => `KSh ${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`KSh ${value.toLocaleString()}`, 'Total']}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name="Purchases" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Category Summary */}
      {getUniqueCategories().length > 0 && (
        <ChartCard title="Category Summary">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {getUniqueCategories().map((category) => {
              const categoryTotal = purchases
                .filter(p => p.category === category)
                .reduce((sum, p) => sum + p.total_amount, 0);
              const categoryCount = purchases.filter(p => p.category === category).length;
              return (
                <div key={category} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <p className="text-sm font-medium text-slate-300">{category}</p>
                  <p className="text-lg font-bold text-white">KSh {categoryTotal.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">{categoryCount} purchase(s)</p>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}

      {/* Purchases Table */}
      <ChartCard title="Purchase Details">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <DataTable data={filteredPurchases} columns={columns} />
        )}
      </ChartCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Purchase</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this purchase? This action cannot be undone.
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