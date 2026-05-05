import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ASSESSMENT_PROMPT = `You are a senior clinical psychologist with 20+ years of experience in personality and attachment assessment, writing in fluent natural Persian (Farsi).
You will receive raw scores plus basic analysis from one of three validated instruments: HEXACO-60, VIA-72 character strengths, or ECR-R adult attachment.

Your task: produce an EXTENSIVE, deeply personalized clinical-style report (1500-2000 words) — NOT a generic template. Reference actual numerical scores throughout. Speak directly to the person ("تو" / informal). Use vivid, real-life examples.

Sections (Persian Markdown), each separated by a horizontal rule (---):
## 🔍 تصویر کلی شخصیت تو
## 🧬 تحلیل بُعد به بُعد
## 💪 نقاط قوت ویژه و چگونگی استفاده از آن‌ها
## ⚠️ نقاط حساسیت، نقاط کور و الگوهای ریسک
## 🤝 سبک کار و رابطه با دیگران
## 🧭 توصیه‌های عملی شخصی‌سازی‌شده
## 🎯 آزمایش هفتگی (Weekly Experiment)
## 📌 ۳ سؤال برای تفکر این هفته

Rules: فارسی روان، اعداد فارسی، 1500-2000 کلمه، بدون disclaimer پایانی.`;

const PROMPTS: Record<string, string> = {
  assessment_analysis: ASSESSMENT_PROMPT,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, input, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = PROMPTS[mode] || "You are a helpful assistant.";
    if (language === "fa") {
      systemPrompt += `\n\nIMPORTANT: Respond in fluent Persian only.`;
    }

    const messages = [
      { role: "system", content: `${systemPrompt}\n\nToday's date: ${new Date().toISOString()}` },
      { role: "user", content: typeof input === "string" ? input : JSON.stringify(input) },
    ];

    const model =
      mode === "assessment_analysis" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: true, max_tokens: 8000 }),
    });

    if (upstream.status === 429) {
      return new Response(
        JSON.stringify({ error: "محدودیت سرعت — کمی صبر کنید." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (upstream.status === 402) {
      return new Response(
        JSON.stringify({ error: "اعتبار AI تمام شده. در تنظیمات Workspace شارژ کنید." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!upstream.ok || !upstream.body) {
      const t = await upstream.text();
      console.error("AI gateway error:", upstream.status, t);
      return new Response(JSON.stringify({ error: "خطای AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-stream error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
