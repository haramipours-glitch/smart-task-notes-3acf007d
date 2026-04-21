import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a goal-decomposition expert. Given a high-level goal and a deadline, you break it into:
1. Monthly milestones (3-6 major milestones, distributed evenly between today and the deadline)
2. For EACH milestone: 2-4 weekly tasks
3. For EACH weekly task: 2-5 small daily action items

Each item must be concrete, actionable, and time-boxed.
Use the user's specified language. Always return through the tool call.`;

const PLAN_TOOL = {
  type: "function",
  function: {
    name: "create_goal_plan",
    description: "Returns a hierarchical breakdown of a goal",
    parameters: {
      type: "object",
      properties: {
        milestones: {
          type: "array",
          description: "Monthly milestones",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Milestone title (1 sentence)" },
              target_date: { type: "string", description: "ISO date YYYY-MM-DD" },
              weekly: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    target_date: { type: "string", description: "ISO date YYYY-MM-DD" },
                    daily: {
                      type: "array",
                      items: { type: "string", description: "Daily action item title" },
                    },
                  },
                  required: ["title", "target_date", "daily"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "target_date", "weekly"],
            additionalProperties: false,
          },
        },
      },
      required: ["milestones"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { goal, deadline, language } = await req.json();
    if (!goal || !deadline) {
      return new Response(JSON.stringify({ error: "goal and deadline required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const today = new Date().toISOString().slice(0, 10);
    let sys = SYSTEM_PROMPT + `\n\nToday: ${today}\nDeadline: ${deadline}`;
    if (language === "fa") sys += `\n\nIMPORTANT: Respond entirely in Persian (Farsi). Titles must be in Persian.`;
    else if (language === "en") sys += `\n\nIMPORTANT: Respond entirely in English.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Goal: ${goal}` },
        ],
        tools: [PLAN_TOOL],
        tool_choice: { type: "function", function: { name: "create_goal_plan" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "محدودیت سرعت — کمی صبر کنید." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "اعتبار AI تمام شده. در تنظیمات Workspace شارژ کنید." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "خطای AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned");
    const plan = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("goal-planner error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
