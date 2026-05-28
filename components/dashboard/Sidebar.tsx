"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  CreditCard,
  Users,
  MessageCircle,
  Bell,
  LogOut,
  Home,
  TrendingUp,
  RepeatIcon,
  Zap,
  Shield,
  Settings,
  ShoppingCart,
  Building2,
  Wallet,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { useBusiness } from "@/context/BusinessContext";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { business, logout } = useBusiness();
  const [isOpen, setIsOpen] = useState(false);

  const mainItems: SidebarItem[] = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Sales",
      href: "/dashboard/sales",
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      label: "Expenses",
      href: "/dashboard/expenses",
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      label: "Purchases",
      href: "/dashboard/purchases",
      icon: <ShoppingCart className="w-4 h-4" />,
    },
    {
      label: "Customers",
      href: "/dashboard/customers",
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: "Payroll",
      href: "/dashboard/payroll",
      icon: <Wallet className="w-4 h-4" />,
    },
    {
      label: "Service Fees",
      href: "/dashboard/service-fee",
      icon: <Wrench className="w-4 h-4" />,
    },
  ];

  const growthItems: SidebarItem[] = [
    {
      label: "Marketing",
      href: "/dashboard/marketing",
      icon: <MessageCircle className="w-4 h-4" />,
    },
    {
      label: "Reminders",
      href: "/dashboard/reminders",
      icon: <Bell className="w-4 h-4" />,
      badge: 4,
    },
  ];

  const settingsItems: SidebarItem[] = [
    { label: 'Employees', href: '/dashboard/users', icon: <Users className="w-4 h-4" /> },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      {/* Mobile toggle button - hidden on desktop */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 border border-slate-700 rounded-lg"
      >
        <BarChart3 className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 md:translate-x-0 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo & Business Info */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            {business?.business_logo ? (
              <div className="relative w-10 h-10 flex-shrink-0">
                <img
                  src={business.business_logo}
                  alt={business.business_name}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            ) : (
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-white text-sm truncate">
                {business?.business_name || "Business"}
              </h1>
              <p className="text-xs text-slate-400 truncate">
                {business?.admin_username || "Username"}
              </p>
            </div>
          </div>

          {/* Subscription Status Badge */}
          {business?.subscription_status && (
            <div
              className={`mt-2 px-2 py-1 rounded-md text-xs font-medium text-center ${
                business.subscription_status === "active"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}
            >
              {business.subscription_status === "active"
                ? "Active Subscription"
                : "Subscription Inactive"}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-8">
          {/* Main */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
              Core
            </p>
            <div className="space-y-1">
              {mainItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      onClick={() => setIsOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                        isActive
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
                      }`}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="bg-blue-500/30 text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Growth */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
              Growth
            </p>
            <div className="space-y-1">
              {growthItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      onClick={() => setIsOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                        isActive
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
                      }`}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="bg-emerald-500/30 text-emerald-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Settings */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
              Settings
            </p>
            <div className="space-y-1">
              {settingsItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      onClick={() => setIsOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                        isActive
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
                      }`}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="bg-emerald-500/30 text-emerald-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Logout button */}
        <div className="p-4 border-t border-slate-800">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 font-medium"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
