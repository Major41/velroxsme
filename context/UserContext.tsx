// context/UserContext.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/super-admin/me', { cache: 'no-store' });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const { admin } = await res.json();
      setUser({
        id: admin.id,
        email: admin.email,
        name: admin.name || admin.full_name || 'Admin',
        role: admin.role || 'super_admin',
      });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchMe();
      setLoading(false);
    })();
  }, [fetchMe]);

  // Re-check when tab regains focus (fixes "stuck on loading" in new tabs)
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') fetchMe();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/super-admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout API failed:', err);
    }
    setUser(null);
    router.push('/super-admin/login');
  }, [router]);

  return (
    <UserContext.Provider
      value={{ user, setUser, logout, refresh: fetchMe, loading }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}