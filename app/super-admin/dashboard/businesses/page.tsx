'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, Edit2, Trash2, RefreshCw, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AlertCircle, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function BusinessesPage() {
  const { user } = useUser();
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [editingBusiness, setEditingBusiness] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<any>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'basic',
    location: '',
    contactPersonName: '',
    contactPosition: '',
    contactPhone: '',
    contactEmail: '',
    subscriptionAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    adminUsername: '',
    adminPassword: '',
  });

  // Fetch businesses on component mount
  useEffect(() => {
    fetchBusinesses();
  }, [user]);

  const fetchBusinesses = async () => {
    if (!user?.id) return;
    
    setFetching(true);
    setError('');
    
    try {
      const { data, error: fetchError } = await supabase
        .from('businesses')
        .select('*')
        .eq('super_admin_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setBusinesses(data || []);
    } catch (err: any) {
      console.error('Error fetching businesses:', err);
      setError('Failed to fetch businesses: ' + err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, businessType: value }));
  };

  const resetForm = () => {
    setFormData({
      businessName: '',
      businessType: 'basic',
      location: '',
      contactPersonName: '',
      contactPosition: '',
      contactPhone: '',
      contactEmail: '',
      subscriptionAmount: '',
      startDate: new Date().toISOString().split('T')[0],
      adminUsername: '',
      adminPassword: '',
    });
    setEditingBusiness(null);
  };

  const handleEdit = (business: any) => {
    setEditingBusiness(business);
    setFormData({
      businessName: business.business_name || '',
      businessType: business.business_type || 'basic',
      location: business.location || '',
      contactPersonName: business.contact_person_name || '',
      contactPosition: business.contact_position || '',
      contactPhone: business.contact_phone || '',
      contactEmail: business.contact_email || '',
      subscriptionAmount: business.subscription_amount?.toString() || '',
      startDate: business.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      adminUsername: business.admin_username || '',
      adminPassword: '', // Don't populate password for security
    });
    setShowForm(true);
  };

  const handleDeleteClick = (business: any) => {
    setBusinessToDelete(business);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!businessToDelete) return;
    
    setLoading(true);
    setError('');
    
    try {
      // First, delete the auth user if they have an auth_id
      if (businessToDelete.auth_id) {
        // Call an API endpoint to delete the auth user
        await fetch('/api/admin/delete-business-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: businessToDelete.auth_id }),
        });
      }

      // Delete the business from the database
      const { error: deleteError } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessToDelete.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess('Business deleted successfully!');
      setBusinesses(businesses.filter(b => b.id !== businessToDelete.id));
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error deleting business:', err);
      setError('Failed to delete business: ' + err.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setBusinessToDelete(null);
    }
  };

 // In the businesses page, update the resend function
const resendVerificationEmail = async (business: any) => {
  setResendingEmail(business.id);
  setError('');
  
  try {
    const response = await fetch('/api/admin/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: business.contact_email,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to resend verification email');
    }
    
    setSuccess(`Verification email sent to ${business.contact_email}`);
    setTimeout(() => setSuccess(''), 3000);
  } catch (err: any) {
    console.error('Error resending email:', err);
    setError(err.message);
    setTimeout(() => setError(''), 3000);
  } finally {
    setResendingEmail(null);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      // Validate form
      if (
        !formData.businessName ||
        !formData.location ||
        !formData.contactPersonName ||
        !formData.contactPhone ||
        !formData.contactEmail ||
        !formData.subscriptionAmount
      ) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Only validate password for new businesses
      if (!editingBusiness && (!formData.adminUsername || !formData.adminPassword)) {
        setError('Admin username and password are required for new businesses');
        setLoading(false);
        return;
      }

      if (!editingBusiness && formData.adminPassword.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      let result;
      
      if (editingBusiness) {
        // Update existing business
        const updateData: any = {
          business_name: formData.businessName,
          business_type: formData.businessType,
          location: formData.location,
          contact_person_name: formData.contactPersonName,
          contact_position: formData.contactPosition,
          contact_phone: formData.contactPhone,
          contact_email: formData.contactEmail,
          subscription_amount: parseFloat(formData.subscriptionAmount),
          start_date: formData.startDate,
          subscription_tier: formData.businessType,
        };
        
        // Only update username if provided
        if (formData.adminUsername) {
          updateData.admin_username = formData.adminUsername;
        }
        
        // Only update password if provided (for security)
        if (formData.adminPassword) {
          updateData.admin_password = formData.adminPassword;
        }
        
        const { data, error: updateError } = await supabase
          .from('businesses')
          .update(updateData)
          .eq('id', editingBusiness.id)
          .select();

        if (updateError) throw updateError;
        
        result = data;
        setSuccess('Business updated successfully!');
      } else {
        // Create new business with Supabase Auth
        // First, create the auth user
        const response = await fetch('/api/admin/create-business-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.contactEmail,
            password: formData.adminPassword,
            userData: {
              business_name: formData.businessName,
              admin_username: formData.adminUsername,
              business_type: formData.businessType,
            }
          }),
        });

        const authData = await response.json();

        if (!response.ok) {
          throw new Error(authData.error || 'Failed to create user account');
        }

        // Insert business into database with auth_id
        const { data, error: insertError } = await supabase
          .from('businesses')
          .insert({
            super_admin_id: user.id,
            business_name: formData.businessName,
            business_type: formData.businessType,
            location: formData.location,
            contact_person_name: formData.contactPersonName,
            contact_position: formData.contactPosition,
            contact_phone: formData.contactPhone,
            contact_email: formData.contactEmail,
            subscription_amount: parseFloat(formData.subscriptionAmount),
            start_date: formData.startDate,
            admin_username: formData.adminUsername,
            admin_password: formData.adminPassword,
            subscription_tier: formData.businessType,
            auth_id: authData.user.id, // Store the auth user ID
            email_verified: false, // Initially not verified
          })
          .select();

        if (insertError) throw insertError;
        
        result = data;
        setSuccess(`Business created successfully! Verification email sent to ${formData.contactEmail}`);
      }

      // Update businesses list
      if (result) {
        if (editingBusiness) {
          setBusinesses(businesses.map(b => b.id === editingBusiness.id ? result[0] : b));
        } else {
          setBusinesses([result[0], ...businesses]);
        }
      }

      resetForm();
      
      setTimeout(() => {
        setShowForm(false);
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error('Error saving business:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Businesses</h1>
          <p className="text-slate-400 mt-1">Manage all registered businesses on the platform</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={fetchBusinesses}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            disabled={fetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${fetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Business
          </Button>
        </div>
      </div>

      {/* Add/Edit Business Form */}
      {showForm && (
        <Card className="bg-slate-800/50 border-slate-700/50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-100">
              {editingBusiness ? 'Edit Business' : 'Add New Business'}
            </h2>
            <button 
              onClick={() => {
                setShowForm(false);
                resetForm();
              }} 
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex gap-3 mb-6">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-200 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Information - same as before */}
            <div>
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business Name *</label>
                  <Input
                    type="text"
                    name="businessName"
                    placeholder="Enter business name"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business Type *</label>
                  <Select value={formData.businessType} onValueChange={handleSelectChange}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business Location *</label>
                  <Input
                    type="text"
                    name="location"
                    placeholder="Enter business location/address"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contact Information - same as before */}
            <div>
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Contact Person Name *</label>
                  <Input
                    type="text"
                    name="contactPersonName"
                    placeholder="Full name"
                    value={formData.contactPersonName}
                    onChange={handleInputChange}
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Position</label>
                  <Input
                    type="text"
                    name="contactPosition"
                    placeholder="Job title/position"
                    value={formData.contactPosition}
                    onChange={handleInputChange}
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number *</label>
                  <Input
                    type="tel"
                    name="contactPhone"
                    placeholder="+1 (555) 000-0000"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Company Email *</label>
                  <Input
                    type="email"
                    name="contactEmail"
                    placeholder="company@example.com"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Subscription Details - same as before */}
            <div>
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Subscription Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Subscription Amount (KSh) *</label>
                  <Input
                    type="number"
                    name="subscriptionAmount"
                    placeholder="0"
                    value={formData.subscriptionAmount}
                    onChange={handleInputChange}
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Start Date *</label>
                  <Input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="bg-slate-900 border-slate-700 text-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Admin Credentials - same as before */}
            <div>
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Admin Credentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Admin Username {!editingBusiness && '*'}
                  </label>
                  <Input
                    type="text"
                    name="adminUsername"
                    placeholder="Username for admin login"
                    value={formData.adminUsername}
                    onChange={handleInputChange}
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                    required={!editingBusiness}
                  />
                  {editingBusiness && (
                    <p className="text-xs text-slate-400 mt-1">Leave blank to keep current username</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Admin Password {!editingBusiness && '*'}
                  </label>
                  <Input
                    type="password"
                    name="adminPassword"
                    placeholder={editingBusiness ? "Leave blank to keep current password" : "Minimum 6 characters"}
                    value={formData.adminPassword}
                    onChange={handleInputChange}
                    className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                    required={!editingBusiness}
                  />
                  {editingBusiness && (
                    <p className="text-xs text-slate-400 mt-1">Leave blank to keep current password</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {editingBusiness 
                  ? "Update credentials only if you want to change them" 
                  : "These credentials will be used by the business admin to login to the dashboard"}
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 justify-end pt-6 border-t border-slate-700">
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={loading}
              >
                {loading ? (editingBusiness ? 'Updating...' : 'Creating...') : (editingBusiness ? 'Update Business' : 'Create Business')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Businesses List */}
      {fetching ? (
        <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
          <div className="flex items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            <p className="text-slate-400">Loading businesses...</p>
          </div>
        </Card>
      ) : businesses.length > 0 ? (
        <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Business Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Email Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Tier</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Amount (KSh)</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {businesses.map((business) => (
                  <tr key={business.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-100">{business.business_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">{business.location}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-slate-100">{business.contact_person_name}</p>
                        <p className="text-xs text-slate-500">{business.contact_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {business.email_verified ? (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">
                          Verified
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">
                            Pending
                          </span>
                          <Button
                            onClick={() => resendVerificationEmail(business)}
                            disabled={resendingEmail === business.id}
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-800"
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            {resendingEmail === business.id ? 'Sending...' : 'Resend'}
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${getTierColor(business.subscription_tier)}`}>
                        {business.subscription_tier?.charAt(0).toUpperCase() + business.subscription_tier?.slice(1) || 'Basic'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-100">KSh {parseFloat(business.subscription_amount).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => handleEdit(business)}
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300 hover:bg-slate-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteClick(business)}
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400 hover:bg-red-950 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
          <p className="text-slate-400">No businesses added yet. Click "Add Business" to get started.</p>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete Business</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete "{businessToDelete?.business_name}"? This action cannot be undone.
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
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}