// app/business/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Lock, Building2, User, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";

// ============================================================
//  DEMO DETECTION - match these against input to redirect users
// ============================================================
const DEMO_EMAIL = "velroxdemo@gmail.com";
const DEMO_PASSWORD = "Demo account";
const DEMO_LOGIN_URL = "https://app.velrox.app/demo";

export default function BusinessLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { setBusiness, business, loading } = useBusiness();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ⬅️ NEW: state for the "this is a demo login" notice
  const [showDemoNotice, setShowDemoNotice] = useState(false);

  const [platformSettings, setPlatformSettings] = useState({
    platform_logo: "",
    platform_name: "SME Dashboard",
    company_name: "",
  });

  // Redirect if already logged in (context is source of truth)
  useEffect(() => {
    if (!loading && business) {
      router.replace("/dashboard");
    }
  }, [business, loading, router]);

  // Fetch platform settings for logo and company name
  useEffect(() => {
    const fetchPlatformSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("platform_logo, platform_name, company_name")
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setPlatformSettings({
            platform_logo: data.platform_logo || "",
            platform_name: data.platform_name || "SME Dashboard",
            company_name: data.company_name || "",
          });
        }
      } catch (err) {
        console.error("Error fetching platform settings:", err);
      }
    };

    fetchPlatformSettings();
  }, [supabase]);

  // ⬅️ NEW: reset demo notice as soon as the user changes either field
  useEffect(() => {
    setShowDemoNotice(false);
  }, [username, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // ⬅️ NEW: check for demo credentials BEFORE hitting the API
    const isDemoEmail =
      username.trim().toLowerCase() === DEMO_EMAIL.toLowerCase();
    const isDemoPassword = password === DEMO_PASSWORD;

    if (isDemoEmail && isDemoPassword) {
      setShowDemoNotice(true);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/business/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: username.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      setBusiness(data.business);
      router.replace("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      setError("An error occurred during login. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <Card className="w-full max-w-md z-10 border-slate-700 bg-slate-950">
        <CardHeader className="space-y-3 text-center">
          {platformSettings.platform_logo ? (
            <div className="flex justify-center mb-2">
              <div className="relative w-20 h-20">
                <img
                  src={platformSettings.platform_logo}
                  alt={platformSettings.platform_name}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-blue-500/20 rounded-lg inline-flex">
                <Building2 className="w-10 h-10 text-blue-400" />
              </div>
            </div>
          )}

          <div>
            <CardTitle className="text-2xl font-bold text-white">
              {platformSettings.company_name || platformSettings.platform_name}
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Business Dashboard Login
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* ⬅️ NEW: Demo redirect notice */}
          {showDemoNotice && (
            <div className="mb-5 p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/40">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-semibold text-emerald-300">
                    These are demo credentials
                  </p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    The demo account has its own login page. Head there to sign
                    in and explore Velrox instantly.
                  </p>
                </div>
              </div>
              <a
                href={DEMO_LOGIN_URL}
                className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                Go to Demo Login
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-[11px] text-slate-500 mt-3 text-center break-all">
                {DEMO_LOGIN_URL}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="Enter your business email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                  required
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <Alert className="border border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-sm text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {isLoading ? "Logging in..." : "Login to Dashboard"}
            </Button>
          </form>

          {/* ⬅️ UPDATED: footer with demo link */}
          <div className="mt-6 pt-6 border-t border-slate-700 space-y-3">
            <p className="text-xs text-center text-slate-500">
              Need help? Contact your system administrator
            </p>
            <p className="text-xs text-center text-slate-500">
              Just exploring?{" "}
              <a
                href={DEMO_LOGIN_URL}
                className="text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Use the Demo Account
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
