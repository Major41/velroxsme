"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  User as UserIcon,
  LogOut,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useBusiness } from "@/context/BusinessContext";

export function POSTopBar() {
  const { business, logout } = useBusiness();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push("/");
  };

  const initial = business?.business_name?.charAt(0)?.toUpperCase() || "B";
  const displayName = business?.business_name || "Business";
  const displaySub = business?.admin_username || "admin";

  return (
    <header className="sticky top-0 z-40 h-16 bg-slate-900/95 backdrop-blur border-b border-slate-800 flex items-center justify-between px-4 md:px-6">
      {/* Left — Home link back to dashboard */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm font-medium">
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        </Link>

        <div className="hidden md:flex items-center gap-2 pl-3 ml-3 border-l border-slate-700">
          <span className="text-xs font-black tracking-[0.18em] text-white">
            VELROX
          </span>
          <span className="text-xs text-slate-500">POS</span>
        </div>
      </div>

      {/* Right — user menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-sm font-semibold text-white truncate">
                {displayName}
              </p>
              <p className="text-xs text-slate-500 truncate">{displaySub}</p>
            </div>
            <div className="p-1.5">
              <Link
                href="/dashboard/settings"
                onClick={() => setMenuOpen(false)}
              >
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Settings</span>
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
    </header>
  );
}