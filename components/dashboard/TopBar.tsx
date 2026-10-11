"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User as UserIcon,
  LogOut,
  Settings,
  ChevronDown,
  ScanLine,
  Bell,
} from "lucide-react";
import { useBusiness } from "@/context/BusinessContext";

export function TopBar() {
  const { business, logout } = useBusiness();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close on route change handled by the buttons themselves

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push("/");
  };

  const initial =
    business?.business_name?.charAt(0)?.toUpperCase() || "B";
  const displayName = business?.business_name || "Business";
  const displaySub = business?.admin_username || "admin";

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/95 backdrop-blur border-b border-slate-800 flex items-center justify-between px-4 md:px-6 md:pl-72">
      {/* Left — POS shortcut */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/pos">
          <button
            className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all"
            title="Open Point of Sale"
          >
            <ScanLine className="w-4 h-4" />
            <span>POS</span>
          </button>
        </Link>
      </div>

      {/* Right — notifications + user menu */}
      <div className="flex items-center gap-2">
        {/* Optional: notifications placeholder */}
        <button
          className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-slate-400" />
          {/* dot when you have notifications */}
          {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" /> */}
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {business?.business_logo ? (
                <img
                  src={business.business_logo}
                  alt=""
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                initial
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-slate-200 truncate max-w-[140px]">
                {displayName}
              </p>
              <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                {displaySub}
              </p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                menuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-800">
                <p className="text-sm font-semibold text-white truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {displaySub}
                </p>
              </div>

              {/* Items */}
              <div className="p-1.5">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMenuOpen(false)}
                >
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>Profile & Settings</span>
                  </button>
                </Link>

                <Link
                  href="/dashboard/settings"
                  onClick={() => setMenuOpen(false)}
                >
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Business Settings</span>
                  </button>
                </Link>

                <div className="my-1 border-t border-slate-800" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}