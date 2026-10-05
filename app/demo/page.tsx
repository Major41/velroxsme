// app/business/demo/page.tsx
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
import {
  AlertCircle,
  Lock,
  Building2,
  User,
  KeyRound,
  ArrowRight,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";

// ============================================================
//  DEMO CREDENTIALS - update these to match your demo business
// ============================================================
const DEMO_EMAIL = "velroxdemo@gmail.com";
const DEMO_PASSWORD = "Demo account";

export default function DemoLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { setBusiness, business, loading } = useBusiness();

  const [username, setUsername] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [platformSettings, setPlatformSettings] = useState({
    platform_logo: "",
    platform_name: "SME Dashboard",
    company_name: "",
  });

  // Redirect if already logged in
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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

  // Quick-fill handler so users can restore the defaults with one click
  const fillDemoCredentials = () => {
    setUsername(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Ambient glows */}
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
              Demo Account Login
            </CardDescription>
          </div>

          {/* Demo banner */}
          <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-xs font-medium text-emerald-300">
              Exploring the Free Demo
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {/* Credentials preview card */}
          <div className="mb-5 p-4 rounded-lg bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Demo Credentials
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Email</span>
                <code className="px-2 py-1 rounded bg-slate-800 text-slate-200 text-xs font-mono">
                  {DEMO_EMAIL}
                </code>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Password</span>
                <code className="px-2 py-1 rounded bg-slate-800 text-slate-200 text-xs font-mono">
                  {showPassword ? DEMO_PASSWORD : "••••••••••••"}
                </code>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? "Hide password" : "Show password"}
              </button>
              <span className="text-slate-700">·</span>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Reset to defaults
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="Enter demo email"
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
                  placeholder="Enter demo password"
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {isLoading ? (
                "Logging in..."
              ) : (
                <>
                  Enter Demo Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700 space-y-3">
            <p className="text-xs text-center text-slate-500">
              This is a read-only demo. Changes you make are saved to a shared
              sandbox.
            </p>
            <p className="text-xs text-center text-slate-500">
              Prefer a real setup?{" "}
              <a
                href="https://wa.me/254790809501?text=Hi%20Velrox%20team%2C%20I%27d%20like%20to%20set%20up%20a%20real%20account."
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                Talk to us on WhatsApp
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
