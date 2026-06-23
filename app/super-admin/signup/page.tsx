'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Check } from 'lucide-react';

export default function SuperAdminSignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [superAdminExists, setSuperAdminExists] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const { setUser } = useUser();

  // Check if super admin already exists on component mount
  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const { data, error } = await supabase
          .from('super_admin_profiles')
          .select('id')
          .limit(1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          setSuperAdminExists(true);
        }
      } catch (err) {
        console.error('Error checking super admin:', err);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkSuperAdmin();
  }, [supabase]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check again before signup
      const { data: existingAdmin } = await supabase
        .from('super_admin_profiles')
        .select('id')
        .limit(1);

      if (existingAdmin && existingAdmin.length > 0) {
        setSuperAdminExists(true);
        setError('A super admin account already exists. Only one super admin is allowed.');
        setLoading(false);
        return;
      }

      // Sign up with Supabase
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'super-admin',
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/`,
        },
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (data.user) {
        // Set user in context
        setUser({
          id: data.user.id,
          email: data.user.email || email,
          name: name,
        });

        setSuccess(true);
        setError('');
        
        // Redirect to dashboard after 1 second
        setTimeout(() => {
          router.push('/super-admin/dashboard');
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Checking super admin status...</p>
        </div>
      </div>
    );
  }

  if (superAdminExists) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-white">Super Admin Exists</h1>
              <p className="text-slate-400">A super admin account has already been created for this platform.</p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                Only one super admin account is allowed per platform. If you need to access the super admin dashboard, please use the login page with your credentials.
              </p>
            </div>

            <Button
              onClick={() => router.push('/super-admin/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white">Create Super Admin</h1>
            <p className="text-slate-400">Set up your platform super admin account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex gap-3">
                <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-emerald-200 text-sm">Account created successfully! Redirecting to dashboard...</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <Input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
            </div>

            <Button
              type="submit"
              disabled={loading || success}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Super Admin Account'}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/super-admin/login')}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
