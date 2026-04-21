import { supabase } from "@/integrations/supabase/client";

export type AIMode = "parse_task" | "breakdown" | "generate_note" | "summarize_note" | "improve_note" | "suggest" | "chat" | "inline_edit" | "task_subtasks" | "task_metadata_suggest" | "task_chat";

const STORAGE_KEY = "ai_settings_v1";

function getAISettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.provider || s.provider === "lovable") return null;
    if (!s.apiKey) return null;
    return s;
  } catch {
    return null;
  }
}

export type AILanguage = "fa" | "en" | "auto";

const LANG_KEY = "ai_language_v1";
export function getAILanguage(): AILanguage {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "fa" || v === "en" || v === "auto") return v;
  } catch {}
  return "fa";
}
export function setAILanguage(lang: AILanguage) {
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
}

export async function callAI(
  mode: AIMode,
  input: any,
  context?: string,
  action?: string,
  langOverride?: AILanguage,
) {
  const settings = getAISettings();
  const lang = langOverride ?? getAILanguage();
  const language = lang === "auto" ? undefined : lang;
  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: { mode, input, context, settings, action, language },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { text: string; data?: any };
}
