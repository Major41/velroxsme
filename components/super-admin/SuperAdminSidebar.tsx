'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, BarChart3, Building2, CreditCard, LogOut, Settings } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useUser();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [platformLogo, setPlatformLogo] = useState<string>('');
  const [platformName, setPlatformName] = useState<string>('Platform Admin');
  const [loading, setLoading] = useState(true);

  const menuItems: SidebarItem[] = [
    { label: 'Overview', href: '/super-admin/dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { label: 'Businesses', href: '/super-admin/dashboard/businesses', icon: <Building2 className="w-4 h-4" /> },
    { label: 'Payments', href: '/super-admin/dashboard/payments', icon: <CreditCard className="w-4 h-4" /> },
    { label: 'Settings', href: '/super-admin/dashboard/settings', icon: <Settings className="w-4 h-4" /> },
  ];

  // Fetch platform settings
  useEffect(() => {
    const fetchPlatformSettings = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('platform_logo, platform_name, company_name')
          .eq('super_admin_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching platform settings:', error);
          return;
        }

        if (data) {
          setPlatformLogo(data.platform_logo || '');
          setPlatformName(data.platform_name || data.company_name || 'Platform Admin');
        }
      } catch (err) {
        console.error('Failed to load platform settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlatformSettings();
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push('/super-admin/login');
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-slate-800 border border-slate-700 p-2 rounded-lg text-slate-300 hover:text-slate-100"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform md:translate-x-0 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-800">
          {!loading && (
            <div className="flex flex-col items-center text-center">
              {platformLogo ? (
                <div className="relative w-16 h-16 mb-3 mx-auto">
                  <img
                    src={platformLogo}
                    alt={platformName}
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 bg-blue-500/10 rounded-lg flex items-center justify-center mb-3 mx-auto border border-blue-500/30">
                  <Building2 className="w-8 h-8 text-blue-400" />
                </div>
              )}
              <h1 className="text-lg font-bold text-blue-400 truncate max-w-full">
                {platformName}
              </h1>
              <p className="text-xs text-slate-400 mt-1">Super Admin</p>
            </div>
          )}
          
          {loading && (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-lg animate-pulse mb-3 mx-auto"></div>
              <div className="h-5 w-32 bg-slate-800 rounded animate-pulse mb-2"></div>
              <div className="h-3 w-20 bg-slate-800 rounded animate-pulse"></div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          {user && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs text-slate-400">Logged in as</p>
              <p className="text-sm font-medium text-slate-100 truncate">{user.name || 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}