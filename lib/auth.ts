// Authentication utilities for demo/dummy auth using localStorage

export const DEMO_CREDENTIALS = {
  email: 'demo@sme.com',
  password: 'demo123',
};

export const AUTH_TOKEN_KEY = 'sme-dashboard-auth-token';
export const AUTH_USER_KEY = 'sme-dashboard-user';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  company: string;
}

const mockUser: AuthUser = {
  id: '1',
  email: 'demo@sme.com',
  name: 'Demo User',
  company: 'Your Business',
};

export function login(email: string, password: string): { success: boolean; error?: string } {
  if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, 'dummy-token-' + Date.now());
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));
    }
    return { success: true };
  }
  return { success: false, error: 'Invalid credentials' };
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(AUTH_USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}
