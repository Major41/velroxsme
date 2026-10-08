import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildBundle } from "@/lib/analytics/kpi-engine";
import { buildAIContext } from "@/lib/analytics/ai-context";
import { getDateRangeBounds, getPreviousRange } from "@/lib/analytics/dates";
import type { DateBounds, DateRangeKey } from "@/lib/analytics/types";

/* ==================================================================== */
/*  GEMINI CLIENT                                                       */
/* ==================================================================== */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Model choice:
//   gemini-2.0-flash     → fast, cheap, generous free tier (recommended)
//   gemini-1.5-flash     → stable fallback
//   gemini-1.5-pro       → more capable, smaller free tier
const MODEL_NAME = "gemini-3.8-flash";

/* ==================================================================== */
/*  ROUTE                                                               */
/* ==================================================================== */

export async function POST(req: Request) {
  try {
    const { businessId, question, period, customFrom, customTo, history } =
      await req.json();

    if (!businessId || !question) {
      return NextResponse.json(
        { error: "businessId and question are required" },
        { status: 400 },
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 },
      );
    }

    /* ---------------------------------------------------------------- */
    /*  1. Fetch analytics with a server-side Supabase client            */
    /* ---------------------------------------------------------------- */

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );

    const bundle = await fetchAnalyticsBundleServer(supabase, {
      businessId,
      filterPeriod: period || "this_month",
      customFrom,
      customTo,
    });

    const context = buildAIContext(bundle);

    /* ---------------------------------------------------------------- */
    /*  2. Build the system prompt                                       */
    /* ---------------------------------------------------------------- */

    const systemPrompt = `You are Velrox AI — the built-in business analyst for Velrox, a business management platform used by SMEs in Kenya.

You will receive a JSON object called "Context" containing pre-calculated business metrics.

CRITICAL RULES:
1. Every number you cite MUST come directly from the Context object. Do NOT calculate, sum, average, extrapolate, or derive anything yourself.
2. If the user asks for a number that is not in the Context, say plainly: "That figure isn't available in your current data." Do not guess.
3. Currency is KSh (Kenyan Shilling). Format large numbers with thousand separators (e.g. KSh 185,000).
4. Percentages should be shown to one decimal place (e.g. 36.7%).
5. Be conversational but concise. Use 2–4 short paragraphs unless the user asks for a list.
6. When the user asks "why" or "how", explain using the trends and top-N lists — but never invent causes beyond what the data shows.
7. If the user asks a question that has no matching field, gently guide them to what the data DOES show (e.g. "I don't track that, but I can tell you X, Y, or Z instead").

Context (JSON):
${JSON.stringify(context, null, 2)}`;

    /* ---------------------------------------------------------------- */
    /*  3. Build the conversation history                                */
    /*     Gemini uses { role: "user" | "model", parts: [{ text }] }     */
    /* ---------------------------------------------------------------- */

    const geminiHistory: Array<{
      role: "user" | "model";
      parts: Array<{ text: string }>;
    }> = [];

    if (Array.isArray(history) && history.length > 0) {
      for (const m of history.slice(-6)) {
        if (m?.role === "user") {
          geminiHistory.push({
            role: "user",
            parts: [{ text: String(m.content || "") }],
          });
        } else if (m?.role === "assistant") {
          geminiHistory.push({
            role: "model",
            parts: [{ text: String(m.content || "") }],
          });
        }
      }
    }

    /* ---------------------------------------------------------------- */
    /*  4. Create the model and call it                                  */
    /* ---------------------------------------------------------------- */

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: geminiHistory,
      generationConfig: {
        // temperature: 0.3,
        maxOutputTokens: 500,
        thinkingConfig: {
          thinkingLevel: "low",
        },
      },
    });

    const result = await chat.sendMessage(question);
    const answer = result.response.text();

    /* ---------------------------------------------------------------- */
    /*  5. Return in the same shape the client already expects           */
    /* ---------------------------------------------------------------- */

    return NextResponse.json({
      answer,
      usage: {
        // Gemini reports token counts differently; expose what's available
        // from usageMetadata if you need it later
        promptTokens: result.response.usageMetadata?.promptTokenCount ?? null,
        completionTokens:
          result.response.usageMetadata?.candidatesTokenCount ?? null,
        totalTokens: result.response.usageMetadata?.totalTokenCount ?? null,
      },
    });
  } catch (err: any) {
    console.error("Gemini AI error:", err);

    // Surface the most useful part of Gemini's error
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      "AI request failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ==================================================================== */
/*  SERVER-SIDE ANALYTICS FETCHER                                       */
/*  Same as the browser version but accepts an injected supabase client  */
/* ==================================================================== */

async function fetchAnalyticsBundleServer(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    filterPeriod: DateRangeKey;
    customFrom?: string;
    customTo?: string;
  },
) {
  const { businessId, filterPeriod, customFrom, customTo } = params;

  let bounds: DateBounds | null = null;
  if (filterPeriod === "custom" && customFrom && customTo) {
    bounds = { from: customFrom, to: customTo };
  } else if (filterPeriod !== "all") {
    bounds = getDateRangeBounds(filterPeriod);
  }

  async function fetchPeriod(b: DateBounds | null) {
    let salesQ = supabase
      .from("sales")
      .select("*")
      .eq("business_id", businessId);
    if (b) salesQ = salesQ.gte("date", b.from).lte("date", b.to);
    const { data: sales } = await salesQ;

    let expQ = supabase
      .from("expenses")
      .select("*")
      .eq("business_id", businessId);
    if (b) expQ = expQ.gte("date", b.from).lte("date", b.to);
    const { data: expenses } = await expQ;

    let purQ = supabase
      .from("purchases")
      .select("*")
      .eq("business_id", businessId);
    if (b) purQ = purQ.gte("date", b.from).lte("date", b.to);
    const { data: purchases } = await purQ;

    let invQ = supabase
      .from("invoices_with_status")
      .select("*")
      .eq("business_id", businessId);
    if (b) invQ = invQ.gte("invoice_date", b.from).lte("invoice_date", b.to);
    const { data: invoices } = await invQ;

    let quoQ = supabase
      .from("quotations_with_status")
      .select("*")
      .eq("business_id", businessId);
    if (b)
      quoQ = quoQ.gte("quotation_date", b.from).lte("quotation_date", b.to);
    const { data: quotations } = await quoQ;

    let payQ = supabase
      .from("payroll")
      .select("*")
      .eq("business_id", businessId);
    if (b) payQ = payQ.gte("payment_date", b.from).lte("payment_date", b.to);
    const { data: payroll } = await payQ;

    const { data: customers } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", businessId);

    return {
      sales: sales || [],
      expenses: expenses || [],
      purchases: purchases || [],
      invoices: invoices || [],
      quotations: quotations || [],
      payroll: payroll || [],
      customers: customers || [],
    };
  }

  const current = await fetchPeriod(bounds);

  let previous = {
    sales: [],
    expenses: [],
    purchases: [],
    invoices: [],
    quotations: [],
    payroll: [],
    customers: [],
  } as typeof current;

  if (bounds) {
    const prev = getPreviousRange(filterPeriod, bounds.from, bounds.to);
    if (prev) previous = await fetchPeriod(prev);
  }

  return buildBundle(current as any, previous as any);
}
