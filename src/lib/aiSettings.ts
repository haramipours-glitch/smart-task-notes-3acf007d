// Per-operation AI settings
// Each AI operation can have its own provider+model.
// Stored in localStorage. Sent to edge function on every call.

export type Provider = "lovable" | "openai" | "anthropic" | "gemini" | "groq" | "openrouter" | "custom";

export type ProviderConfig = {
  provider: Provider;
  apiKey: string;     // ignored for "lovable"
  model: string;
  baseUrl?: string;   // only for "custom"
};

export type AIOperation =
  | "parse_task"
  | "breakdown"
  | "generate_note"
  | "summarize_note"
  | "improve_note"
  | "suggest"
  | "chat"
  | "inline_edit"
  | "task_subtasks"
  | "task_metadata_suggest"
  | "task_chat"
  | "folder_chat"
  | "socratic"
  | "distortion_detect";

export const OPERATIONS: { key: AIOperation; label: string; group: string }[] = [
  { key: "parse_task",            label: "تجزیه زبان طبیعی به تسک",        group: "تسک" },
  { key: "breakdown",             label: "خرد کردن تسک به subtask",         group: "تسک" },
  { key: "task_subtasks",         label: "Subtaskهای هوشمند تسک",            group: "تسک" },
  { key: "task_metadata_suggest", label: "پیشنهاد priority/due/recurrence",  group: "تسک" },
  { key: "task_chat",             label: "چت روی یک تسک",                    group: "تسک" },
  { key: "folder_chat",           label: "چت روی یک فولدر (پروژه)",          group: "فولدر" },
  { key: "generate_note",         label: "تولید نوت",                         group: "نوت" },
  { key: "summarize_note",        label: "خلاصه‌سازی نوت",                    group: "نوت" },
  { key: "improve_note",          label: "بهبود متن نوت",                     group: "نوت" },
  { key: "inline_edit",           label: "ویرایش inline متن",                 group: "نوت" },
  { key: "suggest",               label: "پیشنهادهای موضوعی",                 group: "عمومی" },
  { key: "chat",                  label: "چت عمومی AI",                       group: "عمومی" },
  { key: "socratic",              label: "چت سقراطی (فقط سوال)",              group: "سلامت ذهن" },
  { key: "distortion_detect",     label: "تشخیص خطای شناختی (CBT)",          group: "سلامت ذهن" },
];

export const PROVIDER_INFO: Record<Provider, { label: string; defaultModel: string; baseUrl: string; help: string; models: string[] }> = {
  lovable: {
    label: "Lovable AI (پیش‌فرض، رایگان)",
    defaultModel: "google/gemini-3-flash-preview",
    baseUrl: "",
    help: "بدون نیاز به کلید — از طریق Lovable Cloud.",
    models: [
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3-pro-image-preview",
      "google/gemini-3-flash-preview",
      "google/gemini-2.5-pro",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5.2",
    ],
  },
  openai: {
    label: "OpenAI",
    defaultModel: "gpt-5-mini",
    baseUrl: "https://api.openai.com/v1",
    help: "از platform.openai.com کلید بگیرید.",
    models: ["gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"],
  },
  anthropic: {
    label: "Anthropic Claude",
    defaultModel: "claude-3-5-sonnet-latest",
    baseUrl: "https://api.anthropic.com/v1",
    help: "از console.anthropic.com کلید بگیرید.",
    models: ["claude-sonnet-4-5", "claude-opus-4-1", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
  },
  gemini: {
    // Updated: Gemini 3 / 3.1 pro · flash · flash-lite + جدیدترین ۲.۵
    label: "Google Gemini (مستقیم)",
    defaultModel: "gemini-3-flash-preview",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    help: "از aistudio.google.com کلید بگیرید. شامل Gemini 3 / 3.1 (Pro · Flash · Flash-Lite).",
    models: [
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-preview",
      "gemini-3.1-flash-lite-preview",
      "gemini-3-pro-preview",
      "gemini-3-flash-preview",
      "gemini-3-flash-lite-preview",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
    ],
  },
  groq: {
    // Groq — سریع‌ترین inference با مدل‌های open-source به‌روز
    label: "Groq (سریع‌ترین)",
    defaultModel: "llama-3.3-70b-versatile",
    baseUrl: "https://api.groq.com/openai/v1",
    help: "از console.groq.com کلید بگیرید (رایگان). سریع‌ترین inference در دنیا.",
    models: [
      "llama-3.3-70b-versatile",         // قوی‌ترین — کیفیت بالا، سرعت خوب
      "llama-3.1-70b-versatile",         // متعادل — همه‌کاره
      "llama-3.1-8b-instant",            // سریع‌ترین — وظایف ساده
      "llama-3.2-90b-vision-preview",    // تصویر+متن
      "llama-3.2-11b-vision-preview",    // تصویر سبک
      "deepseek-r1-distill-llama-70b",   // استدلال عمیق (reasoning)
      "deepseek-r1-distill-qwen-32b",    // استدلال + کد
      "qwen-2.5-32b",                    // کد و چندزبانه
      "qwen-2.5-coder-32b",              // برنامه‌نویسی
      "mixtral-8x7b-32768",              // context طولانی
      "gemma2-9b-it",                    // سبک و سریع
    ],
  },
  openrouter: {
    label: "OpenRouter",
    defaultModel: "openai/gpt-4o-mini",
    baseUrl: "https://openrouter.ai/api/v1",
    help: "از openrouter.ai کلید بگیرید — دسترسی به صدها مدل.",
    models: ["openai/gpt-5", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-pro-1.5", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-r1"],
  },
  custom: { label: "OpenAI-compatible سفارشی", defaultModel: "", baseUrl: "", help: "هر سرویس سازگار با OpenAI API.", models: [] },
};

const SETTINGS_KEY = "ai_settings_v2";
const LEGACY_KEY = "ai_settings_v1";

export type AIPerOpSettings = {
  default: ProviderConfig;
  perOp: Partial<Record<AIOperation, ProviderConfig>>;
};

export function defaultConfig(): ProviderConfig {
  return { provider: "lovable", apiKey: "", model: "google/gemini-3-flash-preview", baseUrl: "" };
}

// Short description per model — used in Settings UI for guidance.
export const MODEL_DESCRIPTIONS: Record<string, string> = {
  // Lovable / Gemini via gateway
  "google/gemini-3.1-pro-preview": "قوی‌ترین Gemini — استدلال عمیق",
  "google/gemini-3-flash-preview": "نسل ۳ — متعادل، سریع و دقیق (پیش‌فرض)",
  "google/gemini-2.5-pro": "قدرتمند برای کارهای پیچیده multimodal",
  "google/gemini-2.5-flash": "سریع و متعادل",
  "google/gemini-2.5-flash-lite": "ارزان‌ترین و سریع‌ترین Gemini 2.5",
  "openai/gpt-5": "قوی‌ترین GPT — دقت بالا",
  "openai/gpt-5-mini": "متعادل GPT-5",
  "openai/gpt-5-nano": "سریع و ارزان GPT-5",
  "openai/gpt-5.2": "جدیدترین GPT با reasoning پیشرفته",
  // Groq
  "llama-3.3-70b-versatile": "قوی‌ترین Llama روی Groq — کیفیت بالا، سرعت سریع",
  "llama-3.1-70b-versatile": "متعادل و همه‌کاره",
  "llama-3.1-8b-instant": "سریع‌ترین — مناسب وظایف ساده و چت سبک",
  "llama-3.2-90b-vision-preview": "پشتیبانی از تصویر + متن",
  "llama-3.2-11b-vision-preview": "تصویر سبک",
  "deepseek-r1-distill-llama-70b": "استدلال زنجیره‌ای عمیق (reasoning)",
  "deepseek-r1-distill-qwen-32b": "استدلال + برنامه‌نویسی",
  "qwen-2.5-32b": "چندزبانه قوی",
  "qwen-2.5-coder-32b": "تخصصی برنامه‌نویسی",
  "mixtral-8x7b-32768": "context طولانی (32k)",
  "gemma2-9b-it": "سبک و سریع از Google",
  // Gemini direct
  "gemini-3.1-pro-preview": "Gemini 3.1 Pro — قوی‌ترین",
  "gemini-3.1-flash-preview": "Gemini 3.1 Flash — متعادل",
  "gemini-3.1-flash-lite-preview": "Gemini 3.1 Flash-Lite — سریع‌ترین",
  "gemini-3-pro-preview": "Gemini 3 Pro",
  "gemini-3-flash-preview": "Gemini 3 Flash",
  "gemini-3-flash-lite-preview": "Gemini 3 Flash-Lite",
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.5-flash-lite": "Gemini 2.5 Flash-Lite",
};

export function loadAISettings(): AIPerOpSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
    // Migrate from v1 if present
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy);
      const cfg: ProviderConfig = {
        provider: old.provider || "lovable",
        apiKey: old.apiKey || "",
        model: old.model || PROVIDER_INFO[old.provider as Provider]?.defaultModel || "google/gemini-2.5-flash",
        baseUrl: old.baseUrl || "",
      };
      return { default: cfg, perOp: {} };
    }
  } catch {}
  return { default: defaultConfig(), perOp: {} };
}

export function saveAISettings(s: AIPerOpSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function getOpConfig(op: AIOperation): ProviderConfig {
  const s = loadAISettings();
  return s.perOp[op] || s.default;
}
