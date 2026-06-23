// app/super-admin/page.tsx (your dashboard page)

'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { Building2, Users, CreditCard, TrendingUp, LogOut } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSuperAdminStats, mockPaymentsData, mockBusinessesData } from '@/lib/super-admin-mock-data';
import { useState, useEffect } from 'react';

export default function SuperAdminOverview() {
  const router = useRouter();
  const { user, logout, loading } = useUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const stats = getSuperAdminStats();

  // Redirect to login if no user
  useEffect(() => {
    if (!loading && !user) {
      router.push('/super-admin/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // After logout, redirect to login
      router.push('/super-admin/login');
      router.refresh(); // Force a refresh to clear any cached data
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, force a redirect
      router.push('/super-admin/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, don't render (will redirect)
  if (!user) {
    return null;
  }

  const revenueData = [
    { month: 'Jan', revenue: 120000 },
    { month: 'Feb', revenue: 145000 },
    { month: 'Mar', revenue: 168000 },
    { month: 'Apr', revenue: 182000 },
    { month: 'May', revenue: 156000 },
    { month: 'Jun', revenue: 198000 },
  ];

  const paymentStatusData = [
    { name: 'Paid', value: stats.paidPayments, fill: '#10b981' },
    { name: 'Pending', value: stats.pendingPayments, fill: '#f59e0b' },
    { name: 'Expired', value: stats.expiredPayments, fill: '#ef4444' },
  ];

  const tierData = [
    { name: 'Basic', value: stats.tierCounts.basic, fill: '#3b82f6' },
    { name: 'Pro', value: stats.tierCounts.pro, fill: '#06b6d4' },
    { name: 'Enterprise', value: stats.tierCounts.enterprise, fill: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header with Logout */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Welcome, {user.name || user.email}</p>
        </div>
        <Button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </Button>
      </div>

      {/* Rest of your dashboard content */}
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Businesses</p>
              <p className="text-3xl font-bold text-slate-100 mt-2">{stats.totalBusinesses}</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Active Businesses</p>
              <p className="text-3xl font-bold text-slate-100 mt-2">{stats.activeBusinesses}</p>
            </div>
            <div className="bg-emerald-500/20 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold text-slate-100 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Monthly Revenue</p>
              <p className="text-3xl font-bold text-slate-100 mt-2">KSh {(stats.monthlyRevenue / 1000).toFixed(0)}k</p>
            </div>
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <CreditCard className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Payment Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <p className="text-slate-400 text-sm font-medium mb-4">Paid Subscriptions</p>
          <p className="text-3xl font-bold text-emerald-400">{stats.paidPayments}</p>
          <p className="text-xs text-slate-500 mt-2">Active subscriptions</p>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <p className="text-slate-400 text-sm font-medium mb-4">Pending Payments</p>
          <p className="text-3xl font-bold text-yellow-400">{stats.pendingPayments}</p>
          <p className="text-xs text-slate-500 mt-2">Awaiting payment</p>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <p className="text-slate-400 text-sm font-medium mb-4">Expired Subscriptions</p>
          <p className="text-3xl font-bold text-red-400">{stats.expiredPayments}</p>
          <p className="text-xs text-slate-500 mt-2">Requires renewal</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment Status Pie */}
        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Payment Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={paymentStatusData} cx="50%" cy="50%" labelLine={false} label={{ fill: '#e2e8f0', fontSize: 12 }} outerRadius={80} dataKey="value">
                {paymentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Subscription Tiers & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Tiers */}
        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Subscription Tiers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                {tierData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent Businesses */}
        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Recent Businesses</h3>
          <div className="space-y-3">
            {mockBusinessesData.slice(0, 4).map((business) => (
              <div key={business.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div className="flex-1">
                  <p className="text-slate-100 font-medium text-sm">{business.businessName}</p>
                  <p className="text-slate-500 text-xs">{business.ownerName}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    business.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : business.status === 'inactive'
                        ? 'bg-slate-500/20 text-slate-300'
                        : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {business.status.charAt(0).toUpperCase() + business.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}