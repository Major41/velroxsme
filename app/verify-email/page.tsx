// app/verify-email/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [state, setState] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [message, setMessage] = useState("");
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("No verification token was provided.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setState("error");
          setMessage(data.error || "Verification failed.");
          return;
        }

        setState("success");
        setBusinessName(data.businessName || "");
      } catch (err: any) {
        if (!cancelled) {
          setState("error");
          setMessage(err.message || "Something went wrong.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Ambient glows */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="relative w-full max-w-md z-10">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {/* Logo header */}
          <div className="text-center mb-8">
            <div className="text-lg font-black tracking-[0.2em] text-white">
              VELROX
            </div>
            <div className="text-[10px] tracking-[0.14em] text-slate-500 mt-1">
              BUSINESS MANAGEMENT PLATFORM
            </div>
          </div>

          {state === "verifying" && (
            <div className="text-center py-6">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">
                Verifying your email
              </h1>
              <p className="text-sm text-slate-400">
                Hang tight, this takes just a moment.
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">
                Email verified!
              </h1>
              <p className="text-sm text-slate-400 mb-1">
                {businessName ? (
                  <>
                    <strong className="text-slate-200">{businessName}</strong>{" "}
                    is now active.
                  </>
                ) : (
                  "Your business account is now active."
                )}
              </p>
              <p className="text-xs text-slate-500 mb-6">
                You can now log in to your dashboard.
              </p>

              <Link href="/business/login">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Go to login
                </Button>
              </Link>
            </div>
          )}

          {state === "error" && (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">
                Verification failed
              </h1>
              <p className="text-sm text-slate-400 mb-6">{message}</p>

              <div className="space-y-3">
                <Link href="/resend-verification">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <Mail className="w-4 h-4 mr-2" />
                    Request a new link
                  </Button>
                </Link>
                <Link href="/business/login">
                  <Button
                    variant="outline"
                    className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Back to login
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Having trouble?{" "}
          <a
            href="mailto:support@velrox.app"
            className="text-blue-400 hover:text-blue-300"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}