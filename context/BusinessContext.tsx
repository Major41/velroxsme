// context/BusinessContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

export interface Business {
  id: string;
  business_name: string;
  business_type?: string | null;
  subscription_status?: string | null;
  subscription_tier?: string | null;
  subscription_amount?: number | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  location?: string | null;
  business_logo?: string | null;
  [key: string]: any;
}

interface BusinessContextType {
  business: Business | null;
  setBusiness: (b: Business | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(
  undefined,
);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/business/me", { cache: "no-store" });
      if (!res.ok) {
        setBusiness(null);
        return;
      }
      const { business } = await res.json();
      setBusiness(business);
    } catch {
      setBusiness(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchMe();
      setLoading(false);
    })();
  }, [fetchMe]);

  // Re-check when tab becomes visible again - no more stale tab
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") fetchMe();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchMe]);

  const logout = useCallback(async () => {
    await fetch("/api/business/logout", { method: "POST" });
    setBusiness(null);
    router.push("/");
  }, [router]);

  return (
    <BusinessContext.Provider
      value={{ business, setBusiness, refresh: fetchMe, logout, loading }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
}
