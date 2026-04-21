import { supabase } from "@/integrations/supabase/client";
import { getOpConfig, type AIOperation } from "@/lib/aiSettings";

export type AIMode = AIOperation;

function getAISettings(mode: AIMode) {
  const cfg = getOpConfig(mode);
  if (!cfg.provider || cfg.provider === "lovable") return null;
  if (!cfg.apiKey) return null;
  return cfg;
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
  opts?: { webSearch?: boolean },
) {
  const settings = getAISettings(mode);
  const lang = langOverride ?? getAILanguage();
  const language = lang === "auto" ? undefined : lang;

  // Fetch mental-health profile for tone calibration (best-effort, silent on failure)
  let mhProfile: any = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("mh_profile").select("*").eq("user_id", user.id).maybeSingle();
      if (data) mhProfile = data;
    }
  } catch { /* ignore */ }

  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: { mode, input, context, settings, action, language, mhProfile, webSearch: opts?.webSearch === true },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { text: string; data?: any };
}
