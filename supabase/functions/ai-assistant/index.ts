import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  parse_task: `You parse a natural-language description into a structured task. Extract title, optional description, priority (none/low/medium/high), and due_date as ISO 8601 string if mentioned. Detect the user's language and keep title in same language.`,
  breakdown: `You break down a high-level task into 4-8 concrete actionable subtasks. Match the language of the input.`,
  generate_note: `You generate a well-structured Markdown note about the given topic. Use headings, lists, and emphasis. Match the language of the input.`,
  summarize_note: `You summarize the given Markdown note into key bullet points in Markdown. Match the language of the input.`,
  improve_note: `You improve and rewrite the given note to be clearer and better structured while preserving meaning. Output Markdown. Match input language.`,
  suggest: `You generate 5-8 actionable suggestions (tasks or note ideas) for the given topic. Each should be concise and useful. Match the language of the input.`,
  chat: `You are a helpful productivity assistant. The user's tasks and notes context will be provided. Help them organize, prioritize, and reflect. Be concise. Match the user's language.`,
  inline_edit: `You transform a piece of text according to the requested action. Output ONLY the transformed text, no preamble, no explanation, no quotes. Preserve formatting (Markdown). Match the input language.`,
  task_subtasks: `You generate concrete subtasks for a given task. If the task is ambiguous, instead return clarifying questions with multiple-choice options. Match the language of the input.`,
  task_metadata_suggest: `You analyze a task and suggest the best priority (none/low/medium/high), an ISO 8601 due_date if appropriate, and a recurrence rule if it seems repetitive. Provide a short reason. Match the language of the input.`,
  task_chat: `You are an assistant helping the user with a specific task. The task and optionally all their other tasks/notes are provided as context. Be concise and actionable. Match the user's language.`,
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
        additionalProperties: false,
      },
    },
  },
  breakdown: {
    type: "function",
    function: {
      name: "subtasks",
      parameters: {
        type: "object",
        properties: { subtasks: { type: "array", items: { type: "string" } } },
        required: ["subtasks"],
        additionalProperties: false,
      },
    },
  },
  suggest: {
    type: "function",
    function: {
      name: "suggestions",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { title: { type: "string" }, description: { type: "string" } },
              required: ["title"],
              additionalProperties: false,
            },
          },
        },
        required: ["items"],
        additionalProperties: false,
      },
    },
  },
  task_subtasks: {
    type: "function",
    function: {
      name: "task_subtasks_or_questions",
      description: "Either provide subtasks OR clarifying questions with multi-choice options",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["subtasks", "questions"] },
          subtasks: { type: "array", items: { type: "string" } },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" } },
              },
              required: ["question", "options"],
              additionalProperties: false,
            },
          },
        },
        required: ["mode"],
        additionalProperties: false,
      },
    },
  },
  task_metadata_suggest: {
    type: "function",
    function: {
      name: "task_metadata",
      parameters: {
        type: "object",
        properties: {
          priority: { type: "string", enum: ["none", "low", "medium", "high"] },
          due_date: { type: "string", description: "ISO 8601 or empty" },
          recurrence_rule: {
            type: "object",
            properties: {
              freq: { type: "string", enum: ["daily", "weekly", "monthly", "yearly"] },
              interval: { type: "number" },
              byweekday: { type: "array", items: { type: "string", enum: ["MO","TU","WE","TH","FR","SA","SU"] } },
              byhour: { type: "number" },
              byminute: { type: "number" },
            },
          },
          reason: { type: "string" },
        },
        required: ["priority", "reason"],
        additionalProperties: false,
      },
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, input, context, settings, action, language } = await req.json();

    const useCustom = settings && settings.provider && settings.provider !== "lovable" && settings.apiKey;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!useCustom && !LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
    if (mode === "inline_edit" && action) {
      systemPrompt += `\n\nAction: ${action}`;
    }
    // Language directive (overrides "match input language")
    if (language === "fa") {
      systemPrompt += `\n\nIMPORTANT: Always respond in Persian (Farsi / فارسی), regardless of the input language. Use natural, fluent Persian.`;
    } else if (language === "en") {
      systemPrompt += `\n\nIMPORTANT: Always respond in English, regardless of the input language. Use clear, natural English.`;
    }
    const today = new Date().toISOString();

    const messages: any[] = [
      { role: "system", content: `${systemPrompt}\n\nToday's date: ${today}` },
    ];

    if (context) messages.push({ role: "system", content: `Context:\n${context}` });

    if ((mode === "chat" || mode === "task_chat") && Array.isArray(input)) {
      messages.push(...input);
    } else {
      messages.push({ role: "user", content: typeof input === "string" ? input : JSON.stringify(input) });
    }

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
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
      try { result.data = JSON.parse(toolCall.function.arguments); }
      catch { result.data = null; }
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
