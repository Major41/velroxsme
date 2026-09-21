'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { createClient } from '@/lib/supabase/client';
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
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useState, useEffect, useCallback, useMemo } from 'react';

interface Business {
  id: string;
  business_name: string;
  business_type: string | null;
  subscription_tier: string | null;
  subscription_amount: number | null;
  subscription_status: string | null;
  email_verified: boolean | null;
  start_date: string | null;
  contact_person_name: string | null;
  contact_email: string | null;
  location: string | null;
  created_at: string;
}

export default function SuperAdminOverview() {
  const router = useRouter();
  const { user, logout, loading: userLoading } = useUser();
  const supabase = createClient();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  // Redirect to login if no user (after auth check completes)
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/super-admin/login');
    }
  }, [user, userLoading, router]);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoadingData(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setBusinesses((data as Business[]) || []);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data: ' + err.message);
    } finally {
      setLoadingData(false);
    }
  }, [user?.id, supabase]);

  useEffect(() => {
    if (userLoading) return;
    if (!user?.id) {
      setLoadingData(false);
      return;
    }
    fetchDashboardData();
  }, [userLoading, user?.id, fetchDashboardData]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // ---- Derived stats (all computed from real data) ----
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalBusinesses = businesses.length;
    const activeBusinesses = businesses.filter(
      (b) => (b.subscription_status || '').toLowerCase() === 'active'
    ).length;
    const totalUsers = businesses.length; // one admin user per business

    const monthlyRevenue = businesses
      .filter((b) => new Date(b.created_at) >= startOfMonth)
      .reduce((sum, b) => sum + (b.subscription_amount || 0), 0);

    const paidPayments = businesses.filter(
      (b) => (b.subscription_status || '').toLowerCase() === 'active'
    ).length;
    const pendingPayments = businesses.filter(
      (b) => (b.subscription_status || '').toLowerCase() === 'pending'
    ).length;
    const expiredPayments = businesses.filter(
      (b) => (b.subscription_status || '').toLowerCase() === 'expired'
    ).length;

    const tierCounts = { basic: 0, pro: 0, enterprise: 0 };
    businesses.forEach((b) => {
      const tier = (b.subscription_tier || b.business_type || 'basic').toLowerCase();
      if (tier === 'basic') tierCounts.basic++;
      else if (tier === 'pro') tierCounts.pro++;
      else if (tier === 'enterprise') tierCounts.enterprise++;
    });

    return {
      totalBusinesses,
      activeBusinesses,
      totalUsers,
      monthlyRevenue,
      paidPayments,
      pendingPayments,
      expiredPayments,
      tierCounts,
    };
  }, [businesses]);

  // ---- Revenue trend: last 6 months, real data ----
  const revenueData = useMemo(() => {
    const months: { month: string; revenue: number; key: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleString('en-US', { month: 'short' }),
        key: `${d.getFullYear()}-${d.getMonth()}`,
        revenue: 0,
      });
    }

    businesses.forEach((b) => {
      const created = new Date(b.created_at);
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.revenue += b.subscription_amount || 0;
    });

    return months.map(({ month, revenue }) => ({ month, revenue }));
  }, [businesses]);

  // ---- Payment status chart ----
  const paymentStatusData = useMemo(
    () => [
      { name: 'Paid', value: stats.paidPayments, fill: '#10b981' },
      { name: 'Pending', value: stats.pendingPayments, fill: '#f59e0b' },
      { name: 'Expired', value: stats.expiredPayments, fill: '#ef4444' },
    ],
    [stats]
  );

  // ---- Tier chart ----
  const tierData = useMemo(
    () => [
      { name: 'Basic', value: stats.tierCounts.basic, fill: '#3b82f6' },
      { name: 'Pro', value: stats.tierCounts.pro, fill: '#06b6d4' },
      { name: 'Enterprise', value: stats.tierCounts.enterprise, fill: '#8b5cf6' },
    ],
    [stats]
  );

  // ---- Recent businesses (already ordered desc by created_at) ----
  const recentBusinesses = useMemo(() => businesses.slice(0, 4), [businesses]);

  const getStatusColor = (status: string | null) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
      case 'paid':
        return 'bg-emerald-500/20 text-emerald-300';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'expired':
      case 'inactive':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-slate-500/20 text-slate-300';
    }
  };

  // ---- Loading / auth gating ----
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Page Header with Logout */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-1">
            Welcome, {user.name || user.email}
          </p>
        </div>
        <Button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 disabled:opacity-50"
        >
          <LogOut className="w-4 h-4 text-black" />
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </Button>
      </div>

      {error && (
        <Card className="bg-red-500/10 border border-red-500/30 p-4">
          <p className="text-red-200 text-sm">{error}</p>
        </Card>
      )}

      {loadingData ? (
        <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <p className="text-slate-400">Loading dashboard data...</p>
          </div>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Total Businesses</p>
                  <p className="text-3xl font-bold text-slate-100 mt-2">
                    {stats.totalBusinesses}
                  </p>
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
                  <p className="text-3xl font-bold text-slate-100 mt-2">
                    {stats.activeBusinesses}
                  </p>
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
                  <p className="text-3xl font-bold text-slate-100 mt-2">
                    {stats.totalUsers}
                  </p>
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
                  <p className="text-3xl font-bold text-slate-100 mt-2">
                    KSh {stats.monthlyRevenue.toLocaleString()}
                  </p>
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
              <p className="text-3xl font-bold text-yellow-400">
                {stats.pendingPayments}
              </p>
              <p className="text-xs text-slate-500 mt-2">Awaiting payment</p>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <p className="text-slate-400 text-sm font-medium mb-4">
                Expired Subscriptions
              </p>
              <p className="text-3xl font-bold text-red-400">{stats.expiredPayments}</p>
              <p className="text-xs text-slate-500 mt-2">Requires renewal</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Monthly Revenue Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                    formatter={(value: number) => [`KSh ${value.toLocaleString()}`, 'Revenue']}
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

            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Payment Status Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={{ fill: '#e2e8f0', fontSize: 12 }}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Subscription Tiers & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Subscription Tiers
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tierData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
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

            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Recent Businesses
              </h3>
              {recentBusinesses.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  No businesses yet. Add one from the Businesses page.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentBusinesses.map((business) => (
                    <div
                      key={business.id}
                      className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-slate-100 font-medium text-sm">
                          {business.business_name}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {business.contact_person_name || business.contact_email}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(
                          business.subscription_status
                        )}`}
                      >
                        {(business.subscription_status || 'unknown')
                          .charAt(0)
                          .toUpperCase() +
                          (business.subscription_status || 'unknown').slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}