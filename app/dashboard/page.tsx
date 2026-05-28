'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, CreditCard, Percent, Package, DollarSign, Briefcase, Truck, Receipt } from 'lucide-react';
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

interface Purchase {
  id: string;
  date: string;
  total_amount: number;
  status: string;
}

interface Payroll {
  id: string;
  payment_date: string;
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

interface ServiceFee {
  id: string;
  created_at: string;
  amount: number;
  status: string;
}

export default function DashboardPage() {
  const { business } = useBusiness();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [serviceFees, setServiceFees] = useState<ServiceFee[]>([]);
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
        .eq('business_id', business.id)
        .eq('status', 'paid');

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);

      // Fetch purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*')
        .eq('business_id', business.id)
        .eq('status', 'received');

      if (purchasesError) throw purchasesError;
      setPurchases(purchasesData || []);

      // Fetch payroll
      const { data: payrollData, error: payrollError } = await supabase
        .from('payroll')
        .select('*')
        .eq('business_id', business.id)
        .eq('status', 'paid');

      if (payrollError) throw payrollError;
      setPayrolls(payrollData || []);

      // Fetch service fees (assuming you have a service_fees table)
      const { data: serviceFeesData, error: serviceFeesError } = await supabase
        .from('service_fees')
        .select('*')
        .eq('business_id', business.id)
        .eq('status', 'completed');

      if (serviceFeesError && !serviceFeesError.message.includes('relation')) {
        console.error('Error fetching service fees:', serviceFeesError);
      }
      setServiceFees(serviceFeesData || []);

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
        chartDataMap.set(date, { 
          date, 
          sales: 0, 
          expenses: 0, 
          purchases: 0, 
          payroll: 0,
          serviceFees: 0,
          profit: 0 
        });
      });
      
      // Add sales to chart
      (salesData || []).forEach(sale => {
        const date = sale.date;
        if (chartDataMap.has(date) && sale.payment_status === 'paid') {
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
      
      // Add purchases to chart
      (purchasesData || []).forEach(purchase => {
        const date = purchase.date;
        if (chartDataMap.has(date)) {
          const existing = chartDataMap.get(date);
          existing.purchases += purchase.total_amount;
          chartDataMap.set(date, existing);
        }
      });
      
      // Add payroll to chart
      (payrollData || []).forEach(payroll => {
        const date = payroll.payment_date;
        if (chartDataMap.has(date)) {
          const existing = chartDataMap.get(date);
          existing.payroll += payroll.amount;
          chartDataMap.set(date, existing);
        }
      });
      
      // Add service fees to chart
      (serviceFeesData || []).forEach(fee => {
        const date = fee.created_at?.split('T')[0];
        if (chartDataMap.has(date)) {
          const existing = chartDataMap.get(date);
          existing.serviceFees += fee.amount;
          chartDataMap.set(date, existing);
        }
      });
      
      // Calculate profit for each day
      const chartArray = Array.from(chartDataMap.values());
      chartArray.forEach(day => {
        const totalCosts = day.expenses + day.purchases + day.payroll + day.serviceFees;
        day.profit = day.sales - totalCosts;
      });
      
      setChartData(chartArray.slice(-30));

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
    
    // Current month sales (paid only)
    const currentMonthSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth && 
             saleDate.getFullYear() === currentYear && 
             sale.payment_status === 'paid';
    }).reduce((sum, sale) => sum + sale.amount, 0);
    
    // Current month expenses (paid only)
    const currentMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    }).reduce((sum, expense) => sum + expense.amount, 0);
    
    // Current month purchases
    const currentMonthPurchases = purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.date);
      return purchaseDate.getMonth() === currentMonth && 
             purchaseDate.getFullYear() === currentYear;
    }).reduce((sum, purchase) => sum + purchase.total_amount, 0);
    
    // Current month payroll
    const currentMonthPayroll = payrolls.filter(payroll => {
      const payrollDate = new Date(payroll.payment_date);
      return payrollDate.getMonth() === currentMonth && 
             payrollDate.getFullYear() === currentYear;
    }).reduce((sum, payroll) => sum + payroll.amount, 0);
    
    // Current month service fees
    const currentMonthServiceFees = serviceFees.filter(fee => {
      const feeDate = new Date(fee.created_at);
      return feeDate.getMonth() === currentMonth && 
             feeDate.getFullYear() === currentYear;
    }).reduce((sum, fee) => sum + fee.amount, 0);
    
    // Current month total costs
    const currentMonthTotalCosts = currentMonthExpenses + currentMonthPurchases + currentMonthPayroll + currentMonthServiceFees;
    
    // Current month profit
    const currentMonthProfit = currentMonthSales - currentMonthTotalCosts;
    
    // All time totals
    const totalSales = sales.filter(sale => sale.payment_status === 'paid').reduce((sum, sale) => sum + sale.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.total_amount, 0);
    const totalPayroll = payrolls.reduce((sum, payroll) => sum + payroll.amount, 0);
    const totalServiceFees = serviceFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    // Total costs
    const totalCosts = totalExpenses + totalPurchases + totalPayroll + totalServiceFees;
    
    // Net profit
    const netProfit = totalSales - totalCosts;
    
    // Profit margin
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    
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
      currentMonthPurchases,
      currentMonthPayroll,
      currentMonthServiceFees,
      currentMonthTotalCosts,
      currentMonthProfit,
      totalSales,
      totalExpenses,
      totalPurchases,
      totalPayroll,
      totalServiceFees,
      totalCosts,
      netProfit,
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
          title="Monthly Profit"
          value={`KSh ${stats.currentMonthProfit.toLocaleString()}`}
          subtitle={`After all costs`}
          icon={<DollarSign className="w-4 h-4" />}
          trend={stats.currentMonthProfit >= 0 ? 'positive' : 'negative'}
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

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Expenses"
          value={`KSh ${stats.currentMonthExpenses.toLocaleString()}`}
          subtitle="Operational costs"
          icon={<CreditCard className="w-4 h-4" />}
        />
        <StatCard
          title="Monthly Purchases"
          value={`KSh ${stats.currentMonthPurchases.toLocaleString()}`}
          subtitle="Inventory/Stock"
          icon={<Package className="w-4 h-4" />}
        />
        <StatCard
          title="Monthly Payroll"
          value={`KSh ${stats.currentMonthPayroll.toLocaleString()}`}
          subtitle="Employee salaries"
          icon={<Briefcase className="w-4 h-4" />}
        />
        <StatCard
          title="Monthly Service Fees"
          value={`KSh ${stats.currentMonthServiceFees.toLocaleString()}`}
          subtitle="Platform fees"
          icon={<Receipt className="w-4 h-4" />}
        />
      </div>

      {/* All Time Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Sales"
          value={`KSh ${stats.totalSales.toLocaleString()}`}
          subtitle="All time"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          title="Total Costs"
          value={`KSh ${stats.totalCosts.toLocaleString()}`}
          subtitle="All expenses combined"
          icon={<CreditCard className="w-4 h-4" />}
        />
        <StatCard
          title="Net Profit"
          value={`KSh ${stats.netProfit.toLocaleString()}`}
          subtitle="Total revenue - total costs"
          icon={<TrendingUp className="w-4 h-4" />}
          trend={stats.netProfit >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          title="Avg Order Value"
          value={`KSh ${stats.avgOrderValue.toLocaleString()}`}
          subtitle="Per transaction"
          icon={<Package className="w-4 h-4" />}
        />
        <StatCard
          title="Total Payroll"
          value={`KSh ${stats.totalPayroll.toLocaleString()}`}
          subtitle="All employee payments"
          icon={<Briefcase className="w-4 h-4" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit & Loss Chart */}
        <ChartCard
          title="Revenue vs Costs"
          description="Sales vs Total Costs (Last 30 days)"
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
              <Line
                type="monotone"
                dataKey="purchases"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Purchases"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Daily Profit */}
        <ChartCard title="Daily Profit (Last 30 days)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
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
              <Bar 
                dataKey="profit" 
                fill="#10b981" 
                name="Daily Profit"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Cost Breakdown Chart */}
      <ChartCard title="Cost Breakdown (Current Month)">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-800/30 rounded-lg">
            <p className="text-slate-400 text-sm mb-2">Expenses</p>
            <p className="text-2xl font-bold text-red-400">KSh {stats.currentMonthExpenses.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">
              {((stats.currentMonthExpenses / stats.currentMonthTotalCosts) * 100).toFixed(1)}% of total costs
            </p>
            <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
              <div className="bg-red-500 h-1 rounded-full" style={{ 
                width: `${(stats.currentMonthExpenses / stats.currentMonthTotalCosts) * 100}%` 
              }}></div>
            </div>
          </div>
          
          <div className="p-4 bg-slate-800/30 rounded-lg">
            <p className="text-slate-400 text-sm mb-2">Purchases</p>
            <p className="text-2xl font-bold text-orange-400">KSh {stats.currentMonthPurchases.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">
              {((stats.currentMonthPurchases / stats.currentMonthTotalCosts) * 100).toFixed(1)}% of total costs
            </p>
            <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
              <div className="bg-orange-500 h-1 rounded-full" style={{ 
                width: `${(stats.currentMonthPurchases / stats.currentMonthTotalCosts) * 100}%` 
              }}></div>
            </div>
          </div>
          
          <div className="p-4 bg-slate-800/30 rounded-lg">
            <p className="text-slate-400 text-sm mb-2">Payroll</p>
            <p className="text-2xl font-bold text-purple-400">KSh {stats.currentMonthPayroll.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">
              {((stats.currentMonthPayroll / stats.currentMonthTotalCosts) * 100).toFixed(1)}% of total costs
            </p>
            <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
              <div className="bg-purple-500 h-1 rounded-full" style={{ 
                width: `${(stats.currentMonthPayroll / stats.currentMonthTotalCosts) * 100}%` 
              }}></div>
            </div>
          </div>
          
          <div className="p-4 bg-slate-800/30 rounded-lg">
            <p className="text-slate-400 text-sm mb-2">Service Fees</p>
            <p className="text-2xl font-bold text-cyan-400">KSh {stats.currentMonthServiceFees.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">
              {((stats.currentMonthServiceFees / stats.currentMonthTotalCosts) * 100).toFixed(1)}% of total costs
            </p>
            <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
              <div className="bg-cyan-500 h-1 rounded-full" style={{ 
                width: `${(stats.currentMonthServiceFees / stats.currentMonthTotalCosts) * 100}%` 
              }}></div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Total Monthly Costs:</span>
            <span className="text-2xl font-bold text-white">KSh {stats.currentMonthTotalCosts.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-slate-300">Monthly Profit (Sales - All Costs):</span>
            <span className={`text-2xl font-bold ${stats.currentMonthProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              KSh {stats.currentMonthProfit.toLocaleString()}
            </span>
          </div>
        </div>
      </ChartCard>

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