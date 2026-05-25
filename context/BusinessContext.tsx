// context/BusinessContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
    const router = useRouter();
  

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Get current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          setBusiness(null);
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
          } else {
            setBusiness(null);
          }
        } else {
          setBusiness(null);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: businessData } = await supabase
            .from('businesses')
            .select('*')
            .eq('contact_email', session.user.email)
            .single();
          
          setBusiness(businessData || null);
        } else {
          setBusiness(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    
    setBusiness(null);
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