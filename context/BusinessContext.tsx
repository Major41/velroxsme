// context/BusinessContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

interface Business {
  id: string;
  business_name: string;
  admin_username: string;
  subscription_status: string;
  subscription_end_date?: string;
  business_type?: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  business_logo?: string;
}

interface BusinessContextType {
  business: Business | null;
  setBusiness: (business: Business | null) => void;
  logout: () => void;
  loading: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/dashboard/*', '/settings', '/profile'];
const AUTH_ROUTES = ['/', '/login', '/signup'];

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const redirectToLogin = () => {
    router.push('/');
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true);
        
        // Get current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          setBusiness(null);
          handleUnauthorized();
          return;
        }

        if (session?.user) {
          // Get business data using the auth user's email
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('contact_email', session.user.email)
            .single();

          if (!businessError && businessData) {
            setBusiness(businessData);
            // User is authenticated and has business data
            return;
          } else {
            // User is authenticated but no business found
            console.error('Business not found for user:', session.user.email);
            setBusiness(null);
            handleUnauthorized();
            return;
          }
        } else {
          // No session
          setBusiness(null);
          handleUnauthorized();
          return;
        }
      } catch (err) {
        console.error('Session check failed:', err);
        setBusiness(null);
        handleUnauthorized();
      } finally {
        setLoading(false);
      }
    };

    const handleUnauthorized = () => {
      // Only redirect if we're on a protected route
      const isProtectedRoute = PROTECTED_ROUTES.some(route => 
        pathname?.startsWith(route.replace('/*', ''))
      );
      
      if (isProtectedRoute) {
        redirectToLogin();
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: businessData } = await supabase
            .from('businesses')
            .select('*')
            .eq('contact_email', session.user.email)
            .single();
          
          setBusiness(businessData || null);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setBusiness(null);
          setLoading(false);
          // Redirect to login if on protected route
          const isProtectedRoute = PROTECTED_ROUTES.some(route => 
            pathname?.startsWith(route.replace('/*', ''))
          );
          if (isProtectedRoute) {
            redirectToLogin();
          }
        } else {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, pathname]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setBusiness(null);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <BusinessContext.Provider value={{ business, setBusiness, logout, loading }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within BusinessProvider');
  }
  return context;
}