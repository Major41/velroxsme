'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { Users, TrendingUp, Calendar, DollarSign, Star, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useBusiness } from '@/context/BusinessContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  total_spent: number;
  visit_count: number;
  last_purchase_date: string;
  first_purchase_date: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function CustomersPage() {
  const { business } = useBusiness();
  const supabase = createClient();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('total_spent');

  // Fetch customers on component mount
  useEffect(() => {
    if (business?.id) {
      fetchCustomers();
    }
  }, [business]);

  const fetchCustomers = async () => {
    if (!business?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order(sortBy, { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate retention metrics
  const getRetentionMetrics = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const sixtyDaysAgo = new Date(now.setDate(now.getDate() - 60));
    
    const activeCustomers = customers.filter(c => c.status === 'active');
    const repeatCustomers = customers.filter(c => c.visit_count > 1);
    const highValueCustomers = customers.filter(c => c.total_spent > 50000);
    
    // Customers who purchased in last 30 days
    const recentCustomers = customers.filter(c => {
      const lastPurchase = new Date(c.last_purchase_date);
      return lastPurchase >= thirtyDaysAgo;
    });
    
    // Customer retention rate (customers who purchased in last 30 days / total active customers)
    const retentionRate = activeCustomers.length > 0 
      ? Math.round((recentCustomers.length / activeCustomers.length) * 100) 
      : 0;
    
    // Average customer value
    const avgCustomerValue = customers.length > 0 
      ? Math.round(customers.reduce((sum, c) => sum + c.total_spent, 0) / customers.length) 
      : 0;
    
    // Average visits per customer
    const avgVisits = customers.length > 0 
      ? Math.round(customers.reduce((sum, c) => sum + c.visit_count, 0) / customers.length) 
      : 0;
    
    return {
      activeCustomers: activeCustomers.length,
      repeatCustomers: repeatCustomers.length,
      highValueCustomers: highValueCustomers.length,
      recentCustomers: recentCustomers.length,
      retentionRate,
      avgCustomerValue,
      avgVisits,
      totalRevenue: customers.reduce((sum, c) => sum + c.total_spent, 0),
    };
  };

  const metrics = getRetentionMetrics();

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getCustomerTier = (totalSpent: number, visitCount: number) => {
    if (totalSpent >= 100000) return { name: 'Platinum', color: 'bg-purple-500/20 text-purple-400' };
    if (totalSpent >= 50000) return { name: 'Gold', color: 'bg-yellow-500/20 text-yellow-400' };
    if (totalSpent >= 25000) return { name: 'Silver', color: 'bg-gray-400/20 text-gray-400' };
    if (visitCount >= 5) return { name: 'Frequent', color: 'bg-blue-500/20 text-blue-400' };
    return { name: 'Standard', color: 'bg-slate-500/20 text-slate-400' };
  };

  const columns = [
    { key: 'name' as const, label: 'Customer Name' },
    { key: 'phone' as const, label: 'Phone' },
    { key: 'email' as const, label: 'Email' },
    {
      key: 'total_spent' as const,
      label: 'Total Spent',
      render: (value: number) => `KSh ${value.toLocaleString()}`,
    },
    { key: 'visit_count' as const, label: 'Visits' },
    {
      key: 'last_purchase_date' as const,
      label: 'Last Purchase',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'tier' as const,
      label: 'Tier',
      render: (_: any, row: Customer) => {
        const tier = getCustomerTier(row.total_spent, row.visit_count);
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${tier.color}`}>
            {tier.name}
          </span>
        );
      },
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'}>
          {value === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Customer Management</h1>
        <p className="text-slate-400 mt-2">Track and manage your customer relationships and retention.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={customers.length}
          subtitle="Active & inactive"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="Active Customers"
          value={metrics.activeCustomers}
          subtitle="Currently active"
        />
        <StatCard
          title="Repeat Customers"
          value={metrics.repeatCustomers}
          subtitle={`${metrics.repeatCustomers > 0 ? Math.round((metrics.repeatCustomers / customers.length) * 100) : 0}% of total`}
        />
        <StatCard
          title="Avg Customer Value"
          value={`KSh ${metrics.avgCustomerValue.toLocaleString()}`}
          subtitle="Per customer"
        />
      </div>

      {/* Retention Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Customer Retention Rate"
          value={`${metrics.retentionRate}%`}
          subtitle="Purchased in last 30 days"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          title="Recent Customers"
          value={metrics.recentCustomers}
          subtitle="Last 30 days"
          icon={<Calendar className="w-4 h-4" />}
        />
        <StatCard
          title="High Value Customers"
          value={metrics.highValueCustomers}
          subtitle="Spent over KSh 50K"
          icon={<Star className="w-4 h-4" />}
        />
        <StatCard
          title="Average Visits"
          value={metrics.avgVisits}
          subtitle="Per customer"
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Search and Filter */}
      <ChartCard title="Search & Filter">
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1">
              <Input
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => {
              setSortBy(value);
              fetchCustomers();
            }}>
              <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="total_spent">Highest Spent</SelectItem>
                <SelectItem value="visit_count">Most Visits</SelectItem>
                <SelectItem value="last_purchase_date">Recent Purchase</SelectItem>
                <SelectItem value="first_purchase_date">Oldest Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ChartCard>

      {/* Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Customer Tiers">
          <div className="space-y-3">
            {[
              { tier: 'Platinum', min: 100000, count: customers.filter(c => c.total_spent >= 100000).length, color: 'bg-purple-500' },
              { tier: 'Gold', min: 50000, max: 99999, count: customers.filter(c => c.total_spent >= 50000 && c.total_spent < 100000).length, color: 'bg-yellow-500' },
              { tier: 'Silver', min: 25000, max: 49999, count: customers.filter(c => c.total_spent >= 25000 && c.total_spent < 50000).length, color: 'bg-gray-400' },
              { tier: 'Frequent', condition: (c: Customer) => c.visit_count >= 5 && c.total_spent < 25000, count: customers.filter(c => c.visit_count >= 5 && c.total_spent < 25000).length, color: 'bg-blue-500' },
              { tier: 'Standard', condition: (c: Customer) => c.visit_count < 5 && c.total_spent < 25000, count: customers.filter(c => c.visit_count < 5 && c.total_spent < 25000).length, color: 'bg-slate-500' },
            ].map((tier) => (
              <div key={tier.tier} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${tier.color}`}></div>
                  <span className="text-slate-300">{tier.tier}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white font-semibold">{tier.count} customers</span>
                  <span className="text-slate-400 text-sm">
                    {Math.round((tier.count / customers.length) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Retention Insights">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300">Customer Retention Rate</span>
                <span className="text-white font-bold">{metrics.retentionRate}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${metrics.retentionRate}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {metrics.recentCustomers} out of {metrics.activeCustomers} active customers purchased in last 30 days
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300">Repeat Purchase Rate</span>
                <span className="text-white font-bold">
                  {customers.length > 0 ? Math.round((metrics.repeatCustomers / customers.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${customers.length > 0 ? (metrics.repeatCustomers / customers.length) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {metrics.repeatCustomers} customers have made multiple purchases
              </p>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Total Revenue</p>
                  <p className="text-xl font-bold text-white">KSh {metrics.totalRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Average Visits</p>
                  <p className="text-xl font-bold text-white">{metrics.avgVisits}</p>
                </div>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Top Customers */}
      <ChartCard title="Top Customers by Value">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {[...customers]
              .sort((a, b) => b.total_spent - a.total_spent)
              .slice(0, 5)
              .map((customer, index) => (
                <div key={customer.id} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-500">#{index + 1}</span>
                    <div>
                      <p className="text-white font-medium">{customer.name}</p>
                      <p className="text-xs text-slate-400">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">KSh {customer.total_spent.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{customer.visit_count} visits</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </ChartCard>

      {/* Customers Table */}
      <ChartCard title={`Customers (${filteredCustomers.length})`}>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <DataTable data={filteredCustomers} columns={columns} />
        )}
      </ChartCard>
    </div>
  );
}