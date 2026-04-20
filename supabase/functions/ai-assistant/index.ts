import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  parse_task: `You parse a natural-language description into a structured task. Extract title, optional description, priority (none/low/medium/high), and due_date as ISO 8601 string if mentioned (relative dates like "tomorrow", "next week" should be resolved using today's date which the user provides). Detect the user's language and keep title in same language.`,
  breakdown: `You break down a high-level task into 4-8 concrete actionable subtasks. Keep them concise. Match the language of the input.`,
  generate_note: `You generate a well-structured Markdown note about the given topic. Use headings, lists, and emphasis. Match the language of the input.`,
  summarize_note: `You summarize the given Markdown note into key bullet points in Markdown. Match the language of the input.`,
  improve_note: `You improve and rewrite the given note to be clearer and better structured while preserving meaning. Output Markdown. Match input language.`,
  suggest: `You generate 5-8 actionable suggestions (tasks or note ideas) for the given topic. Each should be concise and useful. Match the language of the input.`,
  chat: `You are a helpful productivity assistant. The user's tasks and notes context will be provided. Help them organize, prioritize, and reflect. Be concise. Match the user's language.`,
};

const TOOLS: Record<string, any> = {
  parse_task: {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a structured task",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["none", "low", "medium", "high"] },
          due_date: { type: "string", description: "ISO 8601 datetime, or empty if not mentioned" },
        },
        required: ["title", "priority"],
      },
    },
  },
  breakdown: {
    type: "function",
    function: {
      name: "subtasks",
      description: "Return list of subtasks",
      parameters: {
        type: "object",
        properties: {
          subtasks: { type: "array", items: { type: "string" } },
        },
        required: ["subtasks"],
      },
    },
  },
  suggest: {
    type: "function",
    function: {
      name: "suggestions",
      description: "Return suggestions",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
              },
              required: ["title"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, input, context, settings } = await req.json();

    const useCustom = settings && settings.provider && settings.provider !== "lovable" && settings.apiKey;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!useCustom && !LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
    const today = new Date().toISOString();

    const messages: any[] = [
      { role: "system", content: `${systemPrompt}\n\nToday's date: ${today}` },
    ];

    if (context) {
      messages.push({ role: "system", content: `User context:\n${context}` });
    }

    if (mode === "chat" && Array.isArray(input)) {
      messages.push(...input);
    } else {
      messages.push({ role: "user", content: typeof input === "string" ? input : JSON.stringify(input) });
    }

    // Resolve endpoint, key and model
    let endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let apiKey = LOVABLE_API_KEY!;
    let model = "google/gemini-2.5-flash";

    if (useCustom) {
      apiKey = settings.apiKey;
      model = settings.model || model;
      const baseUrls: Record<string, string> = {
        openai: "https://api.openai.com/v1",
        openrouter: "https://openrouter.ai/api/v1",
        anthropic: "https://api.anthropic.com/v1",
        gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
        custom: settings.baseUrl || "",
      };
      const base = baseUrls[settings.provider] || settings.baseUrl;
      if (!base) throw new Error("Base URL تعریف نشده");
      endpoint = `${base.replace(/\/+$/, "")}/chat/completions`;
    }

    const body: any = { model, messages };

    if (TOOLS[mode]) {
      body.tools = [TOOLS[mode]];
      body.tool_choice = { type: "function", function: { name: TOOLS[mode].function.name } };
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
    const choice = data.choices?.[0]?.message;

    let result: any = { text: choice?.content || "" };
    const toolCall = choice?.tool_calls?.[0];
    if (toolCall) {
      try {
        result.data = JSON.parse(toolCall.function.arguments);
      } catch {
        result.data = null;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
