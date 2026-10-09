"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBusiness } from "@/context/BusinessContext";
import { usePathname } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "How much did we sell this month?",
  "What is our profit margin?",
  "Who owes us money?",
  "What are our best-selling products?",
  "How are our expenses trending?",
  "How many active customers do we have?",
];

export function AIAssistantModal() {
  const { business } = useBusiness();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hintDismissed, setHintDismissed] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Persist hint dismissal
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("velrox-ai-hint-dismissed");
      if (dismissed === "1") setHintDismissed(true);
    }
  }, []);

  const dismissHint = () => {
    setHintDismissed(true);
    localStorage.setItem("velrox-ai-hint-dismissed", "1");
  };

  // Don't show inside the dedicated /dashboard/ai page (it has its own UI)
  if (pathname === "/dashboard/ai") return null;

  const handleSend = async (question?: string) => {
    const q = (question ?? input).trim();
    if (!q || loading || !business?.id) return;

    const userMsg: Message = { role: "user", content: q };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          question: q,
          period: "this_month",
          history: messages.slice(-6),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get answer");
      }

      setMessages([
        ...updated,
        { role: "assistant", content: data.answer || "No response." },
      ]);
    } catch (err: any) {
      console.error("AI error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <>
      {/* Floating button */}
      {!open && (
        <div className="fixed bottom-6 right-6 z-40 flex items-end gap-3">
          {/* Hint bubble — only if not dismissed */}
          {!hintDismissed && (
            <div className="hidden md:flex items-start gap-2 max-w-xs p-3 bg-slate-900 border border-blue-500/30 rounded-lg shadow-2xl mb-2 animate-in slide-in-from-right-2 fade-in">
              <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-200 leading-relaxed">
                  <strong className="text-white">Ask Velrox AI</strong> anything about your business, profit, sales, customers, invoices. Get instant answers.
                </p>
                <button
                  onClick={dismissHint}
                  className="text-[10px] text-slate-500 hover:text-slate-300 mt-1.5"
                >
                  Got it
                </button>
              </div>
              <button
                onClick={dismissHint}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            onClick={() => setOpen(true)}
            className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 shadow-2xl shadow-blue-500/30 flex items-center justify-center transition-all hover:scale-105 group"
            title="Ask Velrox AI"
          >
            <Sparkles className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
          </button>
        </div>
      )}

      {/* Modal */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed bottom-6 right-6 z-50 w-full max-w-md h-[600px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-blue-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Velrox AI</h3>
                  <p className="text-[10px] text-slate-400">
                    Your business analyst
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <p className="text-sm font-semibold text-white">
                        Hi! I'm Velrox AI
                      </p>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Ask me anything about your business numbers. I read your
                      live analytics, sales, expenses, purchases, customers,
                      invoices, quotations, and payroll and give you instant,
                      accurate answers.
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-semibold">
                      Try asking
                    </p>
                    <div className="space-y-1.5">
                      {SUGGESTED_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSend(q)}
                          className="w-full text-left p-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/40 rounded-lg text-xs text-slate-200 transition-all"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl rounded-bl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-xs text-slate-400">
                      Reading your analytics...
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-800">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your business..."
                  className="bg-slate-950 border-slate-700 text-white text-sm"
                  disabled={loading}
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 text-center">
                AI reads your live data. Numbers are calculated by Velrox.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}