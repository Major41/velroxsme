'use client';

import { StatCard } from '@/components/dashboard/StatCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { mockRepeatCustomersData, mockCustomersData } from '@/lib/mock-data';
import { RepeatIcon, TrendingUp, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RepeatCustomersPage() {
  const totalCustomers = mockCustomersData.length;
  const repeatCustomers = mockRepeatCustomersData.length;
  const repeatRate = Math.round((repeatCustomers / totalCustomers) * 100);
  const avgRepeatValue = Math.round(
    mockRepeatCustomersData.reduce((sum, c) => sum + c.totalSpent, 0) / repeatCustomers
  );

  const loyaltyData = [
    { tier: 'Bronze', color: '#92400e', count: 0 },
    { tier: 'Silver', color: '#71717a', count: 0 },
    { tier: 'Gold', color: '#f59e0b', count: 0 },
    { tier: 'Platinum', color: '#a78bfa', count: 0 },
  ];

  mockRepeatCustomersData.forEach((customer) => {
    const tier = loyaltyData.find((t) => t.tier.toLowerCase() === customer.loyaltyTier);
    if (tier) tier.count++;
  });

  const columns = [
    { key: 'name' as const, label: 'Name' },
    { key: 'visitCount' as const, label: 'Visits' },
    {
      key: 'totalSpent' as const,
      label: 'Total Spent',
      render: (value: number) => `₹${value.toLocaleString()}`,
    },
    {
      key: 'repeatPercentage' as const,
      label: 'Repeat %',
      render: (value: number) => `${value}%`,
    },
    {
      key: 'loyaltyTier' as const,
      label: 'Loyalty Tier',
      render: (value: string) => {
        const colors: Record<string, string> = {
          bronze: 'bg-yellow-900/30 text-yellow-300',
          silver: 'bg-gray-500/30 text-gray-200',
          gold: 'bg-yellow-500/30 text-yellow-300',
          platinum: 'bg-purple-500/30 text-purple-300',
        };
        return (
          <Badge className={colors[value] || 'bg-slate-600'}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Repeat Customer Analytics</h1>
        <p className="text-slate-400 mt-2">Track and analyze your loyal customer base.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Repeat Customers"
          value={repeatCustomers}
          subtitle={`${repeatRate}% of total`}
          icon={<RepeatIcon className="w-4 h-4" />}
          trend={{ value: 12, direction: 'up' }}
        />
        <StatCard
          title="Repeat Rate"
          value={`${repeatRate}%`}
          subtitle="Customer retention"
          trend={{ value: 5, direction: 'up' }}
        />
        <StatCard
          title="Avg Repeat Customer Value"
          value={`₹${avgRepeatValue.toLocaleString()}`}
          subtitle="Per customer lifetime"
          trend={{ value: 18, direction: 'up' }}
        />
        <StatCard
          title="Avg Visits"
          value={Math.round(mockRepeatCustomersData.reduce((sum, c) => sum + c.visitCount, 0) / repeatCustomers)}
          subtitle="Per repeat customer"
        />
      </div>

      {/* Loyalty Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loyalty Distribution Chart */}
        <ChartCard title="Loyalty Tier Distribution" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={loyaltyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="tier" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tier Summary */}
        <ChartCard title="Loyalty Tiers">
          <div className="space-y-3">
            {loyaltyData.map((tier) => (
              <div key={tier.tier} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tier.color }}></div>
                  <span className="text-slate-300 font-medium">{tier.tier}</span>
                </div>
                <span className="text-white font-bold">{tier.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Insights */}
      <ChartCard title="Key Insights">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400 mb-2">Top Tier Customer</p>
            <p className="text-xl font-bold text-white">{mockRepeatCustomersData[0]?.name || 'N/A'}</p>
            <p className="text-xs text-slate-400 mt-1">{mockRepeatCustomersData[0]?.loyaltyTier}</p>
          </div>
          <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400 mb-2">Highest Repeat %</p>
            <p className="text-xl font-bold text-white">
              {Math.max(...mockRepeatCustomersData.map((c) => c.repeatPercentage))}%
            </p>
            <p className="text-xs text-slate-400 mt-1">Customer loyalty rate</p>
          </div>
          <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400 mb-2">Total Repeat Revenue</p>
            <p className="text-xl font-bold text-white">
              ₹{mockRepeatCustomersData.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">From repeat customers</p>
          </div>
        </div>
      </ChartCard>

      {/* Repeat Customers Table */}
      <ChartCard title="Repeat Customers">
        <DataTable data={mockRepeatCustomersData} columns={columns} />
      </ChartCard>
    </div>
  );
}
