// app/business/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock, Building2, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { useBusiness } from '@/context/BusinessContext';

export default function BusinessLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { setBusiness, business } = useBusiness();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [platformSettings, setPlatformSettings] = useState({
    platform_logo: '',
    platform_name: 'SME Dashboard',
    company_name: '',
  });

  // Redirect if already logged in
  useEffect(() => {
    if (business) {
      router.push('/dashboard');
    }
  }, [business, router]);

  // Fetch platform settings for logo and company name
  useEffect(() => {
    const fetchPlatformSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('platform_logo, platform_name, company_name')
          .limit(1)
          .single();

        if (!error && data) {
          setPlatformSettings({
            platform_logo: data.platform_logo || '',
            platform_name: data.platform_name || 'SME Dashboard',
            company_name: data.company_name || '',
          });
        }
      } catch (err) {
        console.error('Error fetching platform settings:', err);
      }
    };

    fetchPlatformSettings();
  }, [supabase]);


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  try {
    // Sign in with Supabase Auth using email
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: username, // Use email as username
      password: password,
    });

    if (signInError) {
      setError('Invalid email or password');
      setIsLoading(false);
      return;
    }

    if (!authData.user.email_confirmed_at) {
      setError('Please verify your email before logging in. Check your inbox for the verification link.');
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }

    // Get business data from your businesses table using the auth user's email
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('contact_email', authData.user.email)
      .single();

    if (businessError || !business) {
      setError('Business account not found');
      setIsLoading(false);
      return;
    }

    // Check subscription status
    if (business.subscription_status !== 'active') {
      setError('Your subscription is not active. Please contact support.');
      setIsLoading(false);
      return;
    }

    // Set business in context
    const { admin_password, ...businessWithoutPassword } = business;
    setBusiness(businessWithoutPassword);
    
    router.push('/dashboard');
    
  } catch (err: any) {
    console.error('Login error:', err);
    setError('An error occurred during login. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <Card className="w-full max-w-md z-10 border-slate-700 bg-slate-950">
        <CardHeader className="space-y-3 text-center">
          {/* Company Logo */}
          {platformSettings.platform_logo ? (
            <div className="flex justify-center mb-2">
              <div className="relative w-20 h-20">
                <img
                  src={platformSettings.platform_logo}
                  alt={platformSettings.platform_name}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-blue-500/20 rounded-lg inline-flex">
                <Building2 className="w-10 h-10 text-blue-400" />
              </div>
            </div>
          )}
          
          {/* Company Name */}
          <div>
            <CardTitle className="text-2xl font-bold text-white">
              {platformSettings.company_name || platformSettings.platform_name}
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Business Dashboard Login
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Email</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Enter your business email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-500 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {isLoading ? 'Logging in...' : 'Login to Dashboard'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-xs text-center text-slate-500">
              Need help? Contact your system administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}