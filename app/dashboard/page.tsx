'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, CreditCard, Percent, Package, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useBusiness } from '@/context/BusinessContext';

interface Sale {
  id: string;
  date: string;
  product_name: string;
  customer_name: string;
  amount: number;
  status: string;
  payment_status: string;
}

interface Expense {
  id: string;
  date: string;
  amount: number;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  total_spent: number;
  visit_count: number;
  status: string;
}

export default function DashboardPage() {
  const { business } = useBusiness();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  // Fetch all data
  useEffect(() => {
    if (business?.id) {
      fetchDashboardData();
    }
  }, [business]);

  const fetchDashboardData = async () => {
    if (!business?.id) return;
    
    setLoading(true);
    try {
      // Fetch sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('business_id', business.id)
        .order('date', { ascending: false });

      if (salesError) throw salesError;
      setSales(salesData || []);
      
      // Set recent sales (last 5)
      setRecentSales((salesData || []).slice(0, 5));

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('business_id', business.id);

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id);

      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Prepare chart data (last 30 days)
      const last30Days = getLast30Days();
      const chartDataMap = new Map();
      
      // Initialize chart data
      last30Days.forEach(date => {
        chartDataMap.set(date, { date, sales: 0, expenses: 0 });
      });
      
      // Add sales to chart
      (salesData || []).forEach(sale => {
        const date = sale.date;
        if (chartDataMap.has(date)) {
          const existing = chartDataMap.get(date);
          existing.sales += sale.amount;
          chartDataMap.set(date, existing);
        }
      });
      
      // Add expenses to chart
      (expensesData || []).forEach(expense => {
        const date = expense.date;
        if (chartDataMap.has(date)) {
          const existing = chartDataMap.get(date);
          existing.expenses += expense.amount;
          chartDataMap.set(date, existing);
        }
      });
      
      setChartData(Array.from(chartDataMap.values()).slice(-30));

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLast30Days = () => {
    const dates = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Calculate statistics
  const calculateStats = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Current month sales
    const currentMonthSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear && sale.payment_status === 'paid';
    }).reduce((sum, sale) => sum + sale.amount, 0);
    
    // Current month expenses
    const currentMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear && expense.status === 'paid';
    }).reduce((sum, expense) => sum + expense.amount, 0);
    
    // Total sales
    const totalSales = sales.filter(sale => sale.payment_status === 'paid').reduce((sum, sale) => sum + sale.amount, 0);
    
    // Total expenses
    const totalExpenses = expenses.filter(expense => expense.status === 'paid').reduce((sum, expense) => sum + expense.amount, 0);
    
    // Profit margin
    const profitMargin = totalSales > 0 ? ((totalSales - totalExpenses) / totalSales) * 100 : 0;
    
    // Total customers
    const totalCustomers = customers.length;
    
    // Repeat customers (visited more than once)
    const repeatCustomers = customers.filter(c => c.visit_count > 1).length;
    
    // Active promotions (you can implement this based on your promotions table)
    const activePromotions = 0;
    
    // Average order value
    const completedSales = sales.filter(s => s.status === 'completed' && s.payment_status === 'paid');
    const avgOrderValue = completedSales.length > 0 
      ? completedSales.reduce((sum, sale) => sum + sale.amount, 0) / completedSales.length 
      : 0;
    
    return {
      currentMonthSales,
      currentMonthExpenses,
      totalSales,
      totalExpenses,
      profitMargin: Math.round(profitMargin),
      totalCustomers,
      repeatCustomers,
      activePromotions,
      avgOrderValue: Math.round(avgOrderValue),
    };
  };

  const stats = calculateStats();

  const columns = [
    { key: 'date' as const, label: 'Date' },
    { key: 'product_name' as const, label: 'Product' },
    { key: 'customer_name' as const, label: 'Customer' },
    {
      key: 'amount' as const,
      label: 'Amount',
      render: (value: number) => `KSh ${value.toLocaleString()}`,
    },
    {
      key: 'payment_status' as const,
      label: 'Payment Status',
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            value === 'paid'
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
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-slate-400 mt-2">Welcome back! Here&apos;s your business snapshot.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Sales"
          value={`KSh ${stats.currentMonthSales.toLocaleString()}`}
          subtitle="This month"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          title="Monthly Expenses"
          value={`KSh ${stats.currentMonthExpenses.toLocaleString()}`}
          subtitle="This month"
          icon={<CreditCard className="w-4 h-4" />}
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          subtitle={`${stats.repeatCustomers} returning`}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="Profit Margin"
          value={`${stats.profitMargin}%`}
          subtitle="Overall profitability"
          icon={<Percent className="w-4 h-4" />}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sales"
          value={`KSh ${stats.totalSales.toLocaleString()}`}
          subtitle="All time"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          title="Total Expenses"
          value={`KSh ${stats.totalExpenses.toLocaleString()}`}
          subtitle="All time"
          icon={<CreditCard className="w-4 h-4" />}
        />
        <StatCard
          title="Net Profit"
          value={`KSh ${(stats.totalSales - stats.totalExpenses).toLocaleString()}`}
          subtitle="Total revenue - expenses"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          title="Avg Order Value"
          value={`KSh ${stats.avgOrderValue.toLocaleString()}`}
          subtitle="Per transaction"
          icon={<Package className="w-4 h-4" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales vs Expenses */}
        <ChartCard
          title="Sales vs Expenses"
          description="Revenue and expenses trend (Last 30 days)"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => `KSh ${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`KSh ${value.toLocaleString()}`, '']}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Sales"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Quick Stats */}
        <ChartCard title="Quick Stats">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <span className="text-slate-300">Total Sales (All Time)</span>
              <span className="font-bold text-white">KSh {stats.totalSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <span className="text-slate-300">Total Expenses (All Time)</span>
              <span className="font-bold text-white">KSh {stats.totalExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <span className="text-slate-300">Net Profit</span>
              <span className="font-bold text-emerald-400">KSh {(stats.totalSales - stats.totalExpenses).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <span className="text-slate-300">Active Customers</span>
              <span className="font-bold text-white">{customers.filter(c => c.status === 'active').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Avg Order Value</span>
              <span className="font-bold text-white">KSh {stats.avgOrderValue.toLocaleString()}</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Sales by Payment Status */}
      {sales.length > 0 && (
        <ChartCard title="Payment Status Overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { 
                status: 'Paid', 
                amount: sales.filter(s => s.payment_status === 'paid').reduce((sum, s) => sum + s.amount, 0),
                count: sales.filter(s => s.payment_status === 'paid').length,
                color: 'bg-emerald-500',
                textColor: 'text-emerald-400'
              },
              { 
                status: 'Pending', 
                amount: sales.filter(s => s.payment_status === 'pending').reduce((sum, s) => sum + s.amount, 0),
                count: sales.filter(s => s.payment_status === 'pending').length,
                color: 'bg-yellow-500',
                textColor: 'text-yellow-400'
              },
              { 
                status: 'Failed', 
                amount: sales.filter(s => s.payment_status === 'failed').reduce((sum, s) => sum + s.amount, 0),
                count: sales.filter(s => s.payment_status === 'failed').length,
                color: 'bg-red-500',
                textColor: 'text-red-400'
              },
            ].map((item) => (
              <div key={item.status} className="p-4 bg-slate-800/30 rounded-lg">
                <p className="text-slate-400 text-sm mb-2">{item.status} Payments</p>
                <p className={`text-2xl font-bold ${item.textColor}`}>KSh {item.amount.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">{item.count} transactions</p>
                <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
                  <div className={`${item.color} h-1 rounded-full`} style={{ 
                    width: `${(item.amount / stats.totalSales) * 100}%` 
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Recent Sales */}
      <ChartCard title="Recent Sales">
        {recentSales.length > 0 ? (
          <DataTable data={recentSales} columns={columns} />
        ) : (
          <div className="text-center py-8 text-slate-400">
            No sales recorded yet. Add your first sale to see it here.
          </div>
        )}
      </ChartCard>
    </div>
  );
}