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
  folder_chat: `You help the user plan a project (folder). Two modes:
- "interview": ask 3-5 targeted questions ONE AT A TIME to understand goal, deadline, resources, blockers. After enough info, propose tasks.
- "free": chat freely. When user clicks "build tasks", propose tasks from the conversation.
When proposing tasks, ALWAYS call the "propose_tasks" tool. Each task: title (required), priority, due_date (ISO or empty), and optional kanban_column ("todo"|"doing"|"done"). Match the user's language.`,
  socratic: `You are a Socratic guide. NEVER give direct answers or advice. ONLY ask open-ended questions that help the user discover their own insights. Match the user's language.`,
  distortion_detect: `You detect cognitive distortions in the user's automatic thought. Output a brief CBT-style feedback identifying any of the 10 common distortions present, then gently propose a more balanced alternative. Match the user's language.`,
  image_extract: `You extract ALL readable text from the provided image accurately. Preserve structure (lines, lists, headings). Output Markdown only. Match the language detected in the image.`,
  image_summarize: `You analyze the provided image (text + visuals). Produce a well-structured Markdown note: a short summary, then key points/sections. Expand on important details. Match the language of the image.`,
  image_research: `You analyze the provided image, identify the main topic(s), and produce structured research notes in Markdown: background, key concepts, important questions, references to explore. Match the language of the image.`,
  image_to_tasks: `You analyze the provided image and extract concrete actionable tasks. If the image suggests timing/dates, include them. Match the language of the image.`,
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
  image_to_tasks: {
    type: "function",
    function: {
      name: "image_tasks",
      description: "Tasks extracted from an image",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["none","low","medium","high"] },
                due_date: { type: "string", description: "ISO 8601 or empty" },
              },
              required: ["title"],
              additionalProperties: false,
            },
          },
        },
        required: ["tasks"],
        additionalProperties: false,
      },
    },
  },
  folder_chat: {
    type: "function",
    function: {
      name: "propose_tasks",
      description: "Propose tasks extracted from the project conversation",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                priority: { type: "string", enum: ["none", "low", "medium", "high"] },
                due_date: { type: "string", description: "ISO 8601 or empty" },
                kanban_column: { type: "string", enum: ["todo", "doing", "done"] },
                description: { type: "string" },
              },
              required: ["title"],
              additionalProperties: false,
            },
          },
          summary: { type: "string", description: "Short rationale" },
        },
        required: ["tasks"],
        additionalProperties: false,
      },
    },
  },
};

const TONE_DIRECTIVES: Record<string, string> = {
  data_driven: "لحن: Data-Driven Minimal. بدون جملات همدلانه یا انگیزشی. فقط داده، درصد، استدلال شفاف و گزینه‌های تصمیم. جملات کوتاه.",
  gentle_analytical: "لحن: Gentle Analytical. همان داده دقیق، اما با Framing نرم‌تر و فضای تفسیر شخصی. از جملات تحکمی پرهیز کن.",
  exploratory: "لحن: Exploratory. چند زاویه دید ارائه بده، دعوت به کاوش کن، سوال‌های باز مطرح کن.",
  neutral: "",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, input, context, settings, action, language, mhProfile, aboutMe, webSearch } = await req.json();

    const useCustom = settings && settings.provider && settings.provider !== "lovable" && settings.apiKey;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!useCustom && !LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
    if (mode === "inline_edit" && action) {
      systemPrompt += `\n\nAction: ${action}`;
    }
    if (language === "fa") {
      systemPrompt += `\n\nIMPORTANT: Always respond in Persian (Farsi / فارسی), regardless of the input language. Use natural, fluent Persian.`;
    } else if (language === "en") {
      systemPrompt += `\n\nIMPORTANT: Always respond in English, regardless of the input language. Use clear, natural English.`;
    }
    // Mental health profile → tone calibration
    if (mhProfile && typeof mhProfile === "object") {
      const tone = TONE_DIRECTIVES[mhProfile.ai_tone || "neutral"];
      if (tone) systemPrompt += `\n\n${tone}`;
      if (mhProfile.signature_strengths?.length) {
        systemPrompt += `\n\nنقاط قوت اصلی کاربر (Signature Strengths): ${mhProfile.signature_strengths.join(", ")}. در پیشنهادها و مداخله‌ها از این نقاط قوت استفاده کن، نه از جملات عمومی.`;
      }
      if (mhProfile.hexaco_pattern) {
        systemPrompt += `\n\nالگوی شخصیتی کاربر: ${mhProfile.hexaco_pattern}.`;
      }
      if (mhProfile.attachment_quadrant) {
        systemPrompt += `\n\nسبک دلبستگی: ${mhProfile.attachment_quadrant} — این را در نحوه ارائه بازخورد در نظر بگیر.`;
      }
    }
    // About-me personalization → inject brief profile context
    if (aboutMe && typeof aboutMe === "object") {
      const parts: string[] = [];
      if (aboutMe.ai_analysis?.summary) parts.push(`خلاصه پروفایل: ${aboutMe.ai_analysis.summary}`);
      if (Array.isArray(aboutMe.ai_analysis?.themes) && aboutMe.ai_analysis.themes.length) {
        parts.push(`تم‌های اصلی زندگی: ${aboutMe.ai_analysis.themes.join("، ")}`);
      }
      if (aboutMe.answers && typeof aboutMe.answers === "object") {
        const a = aboutMe.answers;
        const brief: string[] = [];
        if (a.occupation) brief.push(`شغل: ${a.occupation}`);
        if (a.main_goal) brief.push(`هدف اصلی: ${a.main_goal}`);
        if (Array.isArray(a.life_areas) && a.life_areas.length) brief.push(`حوزه‌های تمرکز: ${a.life_areas.join("، ")}`);
        if (Array.isArray(a.core_values) && a.core_values.length) brief.push(`ارزش‌ها: ${a.core_values.join("، ")}`);
        if (a.biggest_challenge) brief.push(`چالش اصلی: ${a.biggest_challenge}`);
        if (brief.length) parts.push(brief.join(" | "));
      }
      if (parts.length) {
        systemPrompt += `\n\nاطلاعات شخصی کاربر (برای شخصی‌سازی پاسخ‌ها و پیشنهادها از این‌ها استفاده کن، اما به آن‌ها اشاره مستقیم نکن مگر مرتبط باشد):\n${parts.join("\n")}`;
      }
    }
    const today = new Date().toISOString();

    const messages: any[] = [
      { role: "system", content: `${systemPrompt}\n\nToday's date: ${today}` },
    ];

    if (context) messages.push({ role: "system", content: `Context:\n${context}` });

    if ((mode === "chat" || mode === "task_chat" || mode === "folder_chat" || mode === "socratic") && Array.isArray(input)) {
      messages.push(...input);
    } else if (input && typeof input === "object" && input.imageUrl) {
      const userText = input.text || "Analyze this image.";
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: input.imageUrl } },
        ],
      });
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
        groq: "https://api.groq.com/openai/v1",
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

    // Web search via Gemini google_search grounding (Lovable AI gateway only).
    // Note: tool calling and grounding cannot be combined, so skip when a structured tool is in use.
    if (webSearch && !useCustom && !TOOLS[mode] && model.startsWith("google/")) {
      body.tools = [{ google_search: {} }];
      systemPrompt += `\n\nThe user has enabled web search. Use up-to-date information from the web. Cite sources at the end as a "منابع" / "Sources" list.`;
      // rewrite system message
      messages[0] = { role: "system", content: `${systemPrompt}\n\nToday's date: ${today}` };
    } else if (webSearch && !useCustom && !TOOLS[mode]) {
      // Force gemini for grounded search
      model = "google/gemini-2.5-flash";
      body.model = model;
      body.tools = [{ google_search: {} }];
      systemPrompt += `\n\nThe user has enabled web search. Use up-to-date information and cite sources.`;
      messages[0] = { role: "system", content: `${systemPrompt}\n\nToday's date: ${today}` };
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
