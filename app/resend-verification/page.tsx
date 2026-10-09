// app/resend-verification/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setState("sending");
    setError("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend");
      }

      setState("sent");
    } catch (err: any) {
      setState("error");
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-lg font-black tracking-[0.2em] text-white">
              VELROX
            </div>
          </div>

          {state !== "sent" ? (
            <>
              <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className="text-xl font-bold text-white text-center mb-2">
                Resend verification email
              </h1>
              <p className="text-sm text-slate-400 text-center mb-6">
                Enter the email address you registered with, and we'll send you
                a new verification link.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  required
                  disabled={state === "sending"}
                />
                <Button
                  type="submit"
                  disabled={state === "sending"}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {state === "sending" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send verification link"
                  )}
                </Button>
              </form>

              <Link
                href="/business/login"
                className="flex items-center justify-center gap-1 mt-6 text-xs text-slate-400 hover:text-slate-200"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to login
              </Link>
            </>
          ) : (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">
                Check your inbox
              </h1>
              <p className="text-sm text-slate-400 mb-6">
                If an unverified account exists for that email, we've sent a
                fresh verification link. It expires in 24 hours.
              </p>
              <Link href="/business/login">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Back to login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}