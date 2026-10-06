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
import {
  AlertCircle,
  Lock,
  Building2,
  User,
  ArrowRight,
  Sparkles,
  Heart,
  PartyPopper,
  Star,
} from "lucide-react";
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

  const [showDemoNotice, setShowDemoNotice] = useState(false);

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

  // Fetch platform settings
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

  // Reset demo notice when user edits either field
  useEffect(() => {
    setShowDemoNotice(false);
  }, [username, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      {/* Celebration confetti (subtle, top corners) */}
      <CelebrationConfetti />

      <Card className="w-full max-w-md z-10 border-slate-700 bg-slate-950 overflow-hidden">
        {/* ============================================================
            CUSTOMER SERVICE WEEK BANNER
            ============================================================ */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 px-6 py-5">
          <div className="absolute inset-0 opacity-20">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px), radial-gradient(circle at 40% 80%, white 1px, transparent 1px)`,
                backgroundSize: "60px 60px, 80px 80px, 100px 100px",
              }}
            />
          </div>

          <div className="relative flex items-center justify-center gap-2 text-white">
            <PartyPopper className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">
              Customer Service Week
            </span>
            <Heart className="w-4 h-4 fill-current" />
          </div>

          <p className="relative mt-2 text-center text-white/95 text-sm font-semibold">
            Thank you for being at the heart of what we do
          </p>
        </div>

        <CardHeader className="space-y-3 text-center pt-6">
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

          {/* Personal welcome note */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {/* <Sparkles className="w-3.5 h-3.5 text-amber-400" /> */}
            <p className="text-xs text-slate-400 italic">
              Welcome back, we&apos;ve missed you
            </p>
            {/* <Sparkles className="w-3.5 h-3.5 text-amber-400" /> */}
          </div>
        </CardHeader>

        <CardContent>
          {/* Demo redirect notice */}
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

          {/* ============================================================
              CUSTOMER SERVICE WEEK APPRECIATION CARD
              ============================================================ */}
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-br from-blue-500/10 via-slate-900 to-teal-500/10 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex -space-x-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">
                Thank You
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every login, every sale, every invoice you record, you&apos;re
              building something real. This Customer Service Week, we&apos;re
              celebrating
              <span className="text-white font-semibold">
                you and your business
              </span>
              .
            </p>
          </div>

          {/* Footer with demo link */}
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

/* ============================================================
   Celebration confetti — subtle floating dots in the top corners
   ============================================================ */
function CelebrationConfetti() {
  const dots = [
    {
      left: "8%",
      top: "12%",
      color: "bg-blue-400",
      size: "w-2 h-2",
      delay: "0s",
    },
    {
      left: "15%",
      top: "22%",
      color: "bg-teal-400",
      size: "w-1.5 h-1.5",
      delay: "0.4s",
    },
    {
      left: "22%",
      top: "8%",
      color: "bg-amber-400",
      size: "w-2 h-2",
      delay: "0.8s",
    },
    {
      right: "10%",
      top: "15%",
      color: "bg-teal-400",
      size: "w-2 h-2",
      delay: "0.2s",
    },
    {
      right: "18%",
      top: "28%",
      color: "bg-blue-400",
      size: "w-1.5 h-1.5",
      delay: "0.6s",
    },
    {
      right: "25%",
      top: "10%",
      color: "bg-amber-400",
      size: "w-1.5 h-1.5",
      delay: "1s",
    },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {dots.map((dot, i) => (
        <span
          key={i}
          className={`absolute rounded-full ${dot.color} ${dot.size} opacity-40`}
          style={{
            left: dot.left,
            right: dot.right,
            top: dot.top,
            animation: `float 6s ease-in-out infinite`,
            animationDelay: dot.delay,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-15px) scale(1.15);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
