// Super Admin Authentication - Independent from SME dashboard auth

export const SUPER_ADMIN_AUTH_KEY = 'super_admin_auth';
export const SUPER_ADMIN_SIGNUP_ATTEMPTED_KEY = 'super_admin_signup_attempted';

export interface SuperAdminAuthData {
  id: string;
  email: string;
  name: string;
  role: 'super-admin';
  createdDate: string;
}

export function getSuperAdminAuth(): SuperAdminAuthData | null {
  if (typeof window === 'undefined') return null;
  const auth = localStorage.getItem(SUPER_ADMIN_AUTH_KEY);
  return auth ? JSON.parse(auth) : null;
}

export function setSuperAdminAuth(auth: SuperAdminAuthData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SUPER_ADMIN_AUTH_KEY, JSON.stringify(auth));
}

export function clearSuperAdminAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
}

export function hasSuperAdminSignupOccurred(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SUPER_ADMIN_SIGNUP_ATTEMPTED_KEY) === 'true';
}

export function setSuperAdminSignupOccurred(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SUPER_ADMIN_SIGNUP_ATTEMPTED_KEY, 'true');
}

export function isSuperAdminAuthenticated(): boolean {
  return getSuperAdminAuth() !== null;
}
