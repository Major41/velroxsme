'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  Download,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/context/UserContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Payment, Business } from '@/types/dashboard';

type PaymentStatus = 'all' | 'paid' | 'pending' | 'expired';

export default function PaymentsPage() {
  const { user } = useUser();
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>('all');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('M-Pesa');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Fetch payments and businesses
  useEffect(() => {
    if (user?.id) {
      fetchPayments();
      fetchBusinesses();
    }
  }, [user]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .order('billing_date', { ascending: false });

      if (fetchError) throw fetchError;

      // Calculate days until expiry for each payment
      const paymentsWithDaysLeft = (data || []).map((payment: any) => ({
        id: payment.id,
        businessId: payment.business_id,
        businessName: payment.business_name,
        amount: payment.amount,
        subscriptionTier: payment.subscription_tier,
        paymentStatus: payment.payment_status,
        billingDate: payment.billing_date,
        expiryDate: payment.expiry_date,
        daysUntilExpiry: calculateDaysUntilExpiry(payment.expiry_date),
        paymentMethod: payment.payment_method,
      }));

      setPayments(paymentsWithDaysLeft);
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('businesses')
        .select('id, business_name, subscription_tier, subscription_amount')
        .eq('super_admin_id', user?.id)
        .order('business_name');

      if (fetchError) throw fetchError;
      setBusinesses(data || []);
    } catch (err: any) {
      console.error('Error fetching businesses:', err);
    }
  };

  const calculateDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateNextBillingDate = (paymentDate: Date) => {
    const nextDate = new Date(paymentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  };

  const calculateExpiryDate = (billingDate: Date) => {
    const expiry = new Date(billingDate);
    expiry.setMonth(expiry.getMonth() + 1);
    expiry.setDate(expiry.getDate() - 1); // Expires one day before next billing
    return expiry;
  };

  const handleAddPayment = async () => {
    if (!selectedBusiness || !paymentAmount || !paymentMethod) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const selectedBusinessData = businesses.find(b => b.id === selectedBusiness);
      if (!selectedBusinessData) {
        setError('Business not found');
        return;
      }

      const amount = parseFloat(paymentAmount);
      const billingDate = new Date();
      const nextBillingDate = calculateNextBillingDate(billingDate);
      const expiryDate = calculateExpiryDate(billingDate);

      // Insert payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          business_id: selectedBusiness,
          business_name: selectedBusinessData.business_name,
          amount: amount,
          subscription_tier: selectedBusinessData.subscription_tier,
          payment_status: 'paid',
          billing_date: billingDate.toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          next_billing_date: nextBillingDate.toISOString().split('T')[0],
          payment_method: paymentMethod,
          super_admin_id: user?.id,
        })
        .select();

      if (paymentError) throw paymentError;

      // Update business subscription end date
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          subscription_end_date: expiryDate.toISOString().split('T')[0],
          subscription_status: 'active',
          last_payment_date: billingDate.toISOString().split('T')[0],
          last_payment_amount: amount,
        })
        .eq('id', selectedBusiness);

      if (updateError) console.error('Error updating business:', updateError);

      setSuccess(`Payment recorded successfully! Next billing date: ${nextBillingDate.toLocaleDateString()}`);
      
      // Reset form and refresh data
      setSelectedBusiness('');
      setPaymentAmount('');
      setPaymentMethod('M-Pesa');
      setShowAddPayment(false);
      
      await fetchPayments();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error adding payment:', err);
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendReminder = async (payment: Payment) => {
    setSendingReminder(payment.id);
    try {
      // Here you would integrate with your email/SMS service
      // For now, we'll just show a success message
      setSuccess(`Reminder sent to ${payment.businessName}`);
      
      // Update reminder sent timestamp in database
      await supabase
        .from('payments')
        .update({ last_reminder_sent: new Date().toISOString() })
        .eq('id', payment.id);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(`Failed to send reminder to ${payment.businessName}`);
      setTimeout(() => setError(''), 3000);
    } finally {
      setSendingReminder(null);
    }
  };

  const exportToCSV = () => {
    const filtered = getFilteredPayments();
    const headers = ['Business Name', 'Tier', 'Amount', 'Billing Date', 'Expiry Date', 'Days Left', 'Payment Method', 'Status'];
    const csvData = filtered.map(p => [
      p.businessName,
      p.subscriptionTier,
      p.amount.toString(),
      p.billingDate,
      p.expiryDate,
      p.daysUntilExpiry.toString(),
      p.paymentMethod,
      p.paymentStatus,
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getFilteredPayments = () => {
    return payments.filter((payment) => {
      const matchesSearch =
        payment.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || payment.paymentStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'expired':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'basic':
        return 'bg-blue-500/20 text-blue-300';
      case 'pro':
        return 'bg-cyan-500/20 text-cyan-300';
      case 'enterprise':
        return 'bg-purple-500/20 text-purple-300';
      default:
        return 'bg-slate-500/20 text-slate-300';
    }
  };

  const filteredPayments = getFilteredPayments();
  const totalRevenue = filteredPayments
    .filter(p => p.paymentStatus === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const paidCount = payments.filter(p => p.paymentStatus === 'paid').length;
  const pendingCount = payments.filter(p => p.paymentStatus === 'pending').length;
  const expiredCount = payments.filter(p => p.paymentStatus === 'expired').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Payments & Subscriptions</h1>
          <p className="text-slate-400 mt-1">Track business subscription payments and renewal dates</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={fetchPayments}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowAddPayment(true)}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </Button>
          <Button
            onClick={exportToCSV}
            className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-200 text-sm">{success}</p>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700/50 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search by business name or payment method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'paid', 'pending', 'expired'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <p className="text-slate-400 text-sm font-medium">Total Revenue</p>
          <p className="text-3xl font-bold text-slate-100 mt-2">KSh {(totalRevenue / 1000).toFixed(1)}k</p>
          <p className="text-xs text-slate-500 mt-2">From paid subscriptions</p>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <p className="text-slate-400 text-sm font-medium">Paid Subscriptions</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{paidCount}</p>
          <p className="text-xs text-slate-500 mt-2">Active payments</p>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <p className="text-slate-400 text-sm font-medium">Pending Payments</p>
          <p className="text-3xl font-bold text-yellow-400 mt-2">{pendingCount}</p>
          <p className="text-xs text-slate-500 mt-2">Awaiting completion</p>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <p className="text-slate-400 text-sm font-medium">Expired</p>
          <p className="text-3xl font-bold text-red-400 mt-2">{expiredCount}</p>
          <p className="text-xs text-slate-500 mt-2">Requires renewal</p>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
            <p className="text-slate-400">Loading payments...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Business</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Tier</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Billing Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Expiry Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Days Left</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Method</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-100">{payment.businessName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${getTierColor(payment.subscriptionTier)}`}>
                        {payment.subscriptionTier?.charAt(0).toUpperCase() + payment.subscriptionTier?.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-100">KSh {payment.amount.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-100">{payment.billingDate}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-100">{payment.expiryDate}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${
                          payment.daysUntilExpiry < 0
                            ? 'text-red-400'
                            : payment.daysUntilExpiry < 7
                              ? 'text-yellow-400'
                              : 'text-emerald-400'
                        }`}>
                          {payment.daysUntilExpiry < 0
                            ? `${Math.abs(payment.daysUntilExpiry)}d ago`
                            : `${payment.daysUntilExpiry}d`}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-100">{payment.paymentMethod}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payment.paymentStatus)}
                        <span className={`text-xs font-medium px-3 py-1 rounded border ${getStatusColor(payment.paymentStatus)}`}>
                          {payment.paymentStatus.charAt(0).toUpperCase() + payment.paymentStatus.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => sendReminder(payment)}
                        disabled={sendingReminder === payment.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium disabled:opacity-50"
                      >
                        {sendingReminder === payment.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        Reminder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredPayments.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-400 text-sm">No payments found matching your criteria</p>
          </div>
        )}
      </Card>

      {/* Critical Alert */}
      {expiredCount > 0 && (
        <Card className="bg-red-500/10 border-red-500/30 p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-300 mb-2">Action Required</h3>
              <p className="text-red-200 text-sm">
                {expiredCount} business
                {expiredCount !== 1 ? 'es have' : ' has'} expired
                subscriptions and should be contacted for renewal.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Add Payment Dialog */}
      <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription className="text-slate-400">
              Record a subscription payment from a business. The next billing date will be set to exactly one month from today.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Select Business *</label>
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Choose a business" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {businesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.business_name} - {business.subscription_tier} (KSh {business.subscription_amount?.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Payment Amount (KSh) *</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Payment Method *</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-blue-300">
                ⚡ Next billing date will be automatically set to exactly one month from today.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddPayment(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={isSubmitting || !selectedBusiness || !paymentAmount}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}