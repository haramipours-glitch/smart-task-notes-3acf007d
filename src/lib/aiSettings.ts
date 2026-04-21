// Per-operation AI settings
// Each AI operation can have its own provider+model.
// Stored in localStorage. Sent to edge function on every call.

export type Provider = "lovable" | "openai" | "anthropic" | "gemini" | "openrouter" | "custom";

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
    defaultModel: "google/gemini-2.5-flash",
    baseUrl: "",
    help: "بدون نیاز به کلید — از طریق Lovable Cloud.",
    models: [
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
      "google/gemini-3-flash-preview",
      "google/gemini-3.1-pro-preview",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5.2",
    ],
  },
  openai:     { label: "OpenAI",            defaultModel: "gpt-4o-mini",              baseUrl: "https://api.openai.com/v1", help: "از platform.openai.com کلید بگیرید.", models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"] },
  anthropic:  { label: "Anthropic Claude",  defaultModel: "claude-3-5-sonnet-latest", baseUrl: "https://api.anthropic.com/v1", help: "از console.anthropic.com کلید بگیرید.", models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"] },
  gemini:     { label: "Google Gemini",     defaultModel: "gemini-1.5-flash",         baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", help: "از aistudio.google.com کلید بگیرید.", models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"] },
  openrouter: { label: "OpenRouter",        defaultModel: "openai/gpt-4o-mini",       baseUrl: "https://openrouter.ai/api/v1", help: "از openrouter.ai کلید بگیرید.", models: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-pro-1.5"] },
  custom:     { label: "OpenAI-compatible سفارشی", defaultModel: "",                  baseUrl: "", help: "هر سرویس سازگار با OpenAI API.", models: [] },
};

const SETTINGS_KEY = "ai_settings_v2";
const LEGACY_KEY = "ai_settings_v1";

export type AIPerOpSettings = {
  default: ProviderConfig;
  perOp: Partial<Record<AIOperation, ProviderConfig>>;
};

export function defaultConfig(): ProviderConfig {
  return { provider: "lovable", apiKey: "", model: "google/gemini-2.5-flash", baseUrl: "" };
}

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
