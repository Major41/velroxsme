"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Loader2, Trash2, Filter, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { useBusiness } from "@/context/BusinessContext";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { DateRangeKey } from "@/lib/analytics/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_quarter", label: "This Quarter" },
  { key: "last_quarter", label: "Last Quarter" },
  { key: "this_year", label: "This Year" },
  { key: "last_year", label: "Last Year" },
  { key: "all", label: "All Time" },
];

const SUGGESTION_GROUPS = [
  {
    title: "Money",
    questions: [
      "How much did we sell this period?",
      "How much did we spend?",
      "How much profit did we make?",
      "What is our profit margin?",
      "What percentage of revenue goes to payroll?",
    ],
  },
  {
    title: "Sales",
    questions: [
      "What are our best-selling products?",
      "Which employee generates the most sales?",
      "Which days generate the most sales?",
      "How is revenue changing?",
      "What is our average transaction value?",
    ],
  },
  {
    title: "Customers",
    questions: [
      "How many active customers do we have?",
      "Which customers spend the most?",
      "Which customers owe us money?",
      "What is our customer retention rate?",
    ],
  },
  {
    title: "Invoices & Quotes",
    questions: [
      "How much is outstanding?",
      "How much is overdue?",
      "What is our quotation conversion rate?",
      "How much business are we losing through rejected quotes?",
    ],
  },
  {
    title: "Purchases",
    questions: [
      "How much do we spend on each supplier?",
      "Which products cost us the most?",
      "Which suppliers have outstanding balances?",
    ],
  },
];

export default function VelroxAIPage() {
  const { business } = useBusiness();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<DateRangeKey>("this_month");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

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
          period,
          history: messages.slice(-6),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get answer");

      setMessages([
        ...updated,
        { role: "assistant", content: data.answer || "No response." },
      ]);
    } catch (err: any) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            Velrox AI
          </h1>
          <p className="text-slate-400 mt-2">
            Ask anything about your business. I read your live analytics and give you accurate answers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select value={period} onValueChange={(v) => setPeriod(v as DateRangeKey)}>
            <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-white">
              {DATE_RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {messages.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setMessages([])}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Chat column */}
        <ChartCard title="Conversation">
          <div
            ref={scrollRef}
            className="h-[560px] overflow-y-auto space-y-4 p-1"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  What would you like to know?
                </h3>
                <p className="text-sm text-slate-400 max-w-md">
                  I can answer questions about your money, sales, customers,
                  purchases, invoices, and quotations. Pick a suggestion on the
                  right, or type your own below.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-slate-800 text-slate-100 rounded-bl-md border border-slate-700"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="p-4 bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-md flex items-center gap-3">
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
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your business... (e.g. 'How much profit did we make?')"
                className="bg-slate-950 border-slate-700 text-white"
                disabled={loading}
              />
              <Button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Velrox AI reads live numbers from your analytics. It never
              calculates every figure comes from your data.
            </p>
          </div>
        </ChartCard>

        {/* Suggestions column */}
        <div className="space-y-4">
          <ChartCard title="Suggested questions">
            <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
              {SUGGESTION_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {group.title}
                  </p>
                  <div className="space-y-1.5">
                    {group.questions.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSend(q)}
                        disabled={loading}
                        className="w-full text-left p-2.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/40 rounded-lg text-xs text-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}