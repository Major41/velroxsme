'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Building2, Phone, Mail, Upload, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/context/UserContext';
import Image from 'next/image';

interface PlatformSettings {
  id?: string;
  platform_name: string;
  company_name: string;
  platform_email: string;
  platform_phone: string;
  support_email: string;
  support_phone: string;
  platform_logo?: string;
  currency: string;
  timezone: string;
  created_at?: string;
  updated_at?: string;
}

export default function SettingsPage() {
  const { user } = useUser();
  const supabase = createClient();
  
  const [settings, setSettings] = useState<PlatformSettings>({
    platform_name: '',
    company_name: '',
    platform_email: '',
    platform_phone: '',
    support_email: '',
    support_phone: '',
    platform_logo: '',
    currency: 'KSh',
    timezone: 'Africa/Nairobi',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('super_admin_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setSettings({
          platform_name: data.platform_name || '',
          company_name: data.company_name || '',
          platform_email: data.platform_email || '',
          platform_phone: data.platform_phone || '',
          support_email: data.support_email || '',
          support_phone: data.support_phone || '',
          platform_logo: data.platform_logo || '',
          currency: data.currency || 'KSh',
          timezone: data.timezone || 'Africa/Nairobi',
        });
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
    formData.append('folder', 'super-admin/logos');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (err: any) {
      console.error('Upload error:', err);
      throw new Error('Failed to upload image to Cloudinary');
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('File size must be less than 2MB');
        return;
      }

      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      setError('');
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setSettings(prev => ({ ...prev, platform_logo: '' }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveSettings = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setSaving(true);
    setError('');
    
    try {
      let logoUrl = settings.platform_logo;
      
      // Upload new logo if selected
      if (logoFile) {
        setUploading(true);
        try {
          logoUrl = await uploadImageToCloudinary(logoFile);
        } catch (uploadErr: any) {
          setError(uploadErr.message);
          setSaving(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      // Prepare settings data
      const settingsData = {
        super_admin_id: user.id,
        platform_name: settings.platform_name,
        company_name: settings.company_name,
        platform_email: settings.platform_email,
        platform_phone: settings.platform_phone,
        support_email: settings.support_email,
        support_phone: settings.support_phone,
        platform_logo: logoUrl,
        currency: settings.currency,
        timezone: settings.timezone,
        updated_at: new Date().toISOString(),
      };

      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('super_admin_id', user.id)
        .single();

      let result;
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from('platform_settings')
          .update(settingsData)
          .eq('super_admin_id', user.id);
      } else {
        // Insert new settings
        result = await supabase
          .from('platform_settings')
          .insert([settingsData]);
      }

      if (result.error) throw result.error;

      // Update local state
      setSettings(prev => ({ ...prev, platform_logo: logoUrl }));
      setLogoFile(null);
      setLogoPreview('');
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-400" />
            Platform Settings
          </h1>
          <p className="text-slate-400 mt-2">Manage your platform configuration and details</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 font-medium">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-300 font-medium">Settings saved successfully!</p>
          </div>
        )}

        {/* Platform Info Section */}
        <Card className="bg-slate-800/50 border-slate-700/50 p-6 mb-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Platform Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Platform Name</label>
                <Input
                  type="text"
                  name="platform_name"
                  value={settings.platform_name}
                  onChange={handleInputChange}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  placeholder="e.g., Business Hub Pro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                <Input
                  type="text"
                  name="company_name"
                  value={settings.company_name}
                  onChange={handleInputChange}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  placeholder="e.g., Business Hub Pro Ltd"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  Platform Email
                </label>
                <Input
                  type="email"
                  name="platform_email"
                  value={settings.platform_email}
                  onChange={handleInputChange}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  placeholder="contact@platform.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-400" />
                  Platform Phone
                </label>
                <Input
                  type="tel"
                  name="platform_phone"
                  value={settings.platform_phone}
                  onChange={handleInputChange}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  placeholder="+254 712 345 678"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
                <Input
                  type="text"
                  name="currency"
                  value={settings.currency}
                  onChange={handleInputChange}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  placeholder="KSh"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                <Input
                  type="text"
                  name="timezone"
                  value={settings.timezone}
                  onChange={handleInputChange}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  placeholder="Africa/Nairobi"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Support Section */}
        <Card className="bg-slate-800/50 border-slate-700/50 p-6 mb-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-400" />
              Support Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  Support Email
                </label>
                <Input
                  type="email"
                  name="support_email"
                  value={settings.support_email}
                  onChange={handleInputChange}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  placeholder="support@platform.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-400" />
                  Support Phone
                </label>
                <Input
                  type="tel"
                  name="support_phone"
                  value={settings.support_phone}
                  onChange={handleInputChange}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  placeholder="+254 712 345 678"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Logo Section */}
        <Card className="bg-slate-800/50 border-slate-700/50 p-6 mb-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 mb-6">Platform Logo</h2>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="relative w-32 h-32 bg-slate-700/50 rounded-lg border-2 border-slate-600 flex items-center justify-center overflow-hidden">
                {(logoPreview || settings.platform_logo) ? (
                  <>
                    <img
                      src={logoPreview || settings.platform_logo}
                      alt="Platform Logo"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={removeLogo}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </>
                ) : (
                  <Building2 className="w-12 h-12 text-slate-500" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      disabled={uploading}
                    />
                    <Button
                      type="button"
                      onClick={() => document.querySelector('input[type="file"]')?.click()}
                      disabled={uploading}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-100"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                  </label>
                  {settings.platform_logo && !logoFile && (
                    <Button
                      type="button"
                      onClick={removeLogo}
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-950"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove Logo
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  Recommended size: 200x200px (PNG or JPG, max 2MB)
                </p>
                {logoFile && (
                  <p className="text-xs text-blue-400 mt-1">
                    New logo selected: {logoFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleSaveSettings}
            disabled={saving || uploading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 font-medium disabled:opacity-50"
          >
            {(saving || uploading) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploading ? 'Uploading Logo...' : 'Saving...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
          <Button
            onClick={() => fetchSettings()}
            variant="outline"
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}