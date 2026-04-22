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

  // Fetch mental-health profile + about-me for personalization (best-effort)
  let mhProfile: any = null;
  let aboutMe: any = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [{ data: mh }, { data: am }] = await Promise.all([
        supabase.from("mh_profile").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("about_me" as any).select("answers, free_text, ai_analysis").eq("user_id", user.id).maybeSingle(),
      ]);
      if (mh) mhProfile = mh;
      if (am) aboutMe = am;
    }
  } catch { /* ignore */ }

  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: { mode, input, context, settings, action, language, mhProfile, aboutMe, webSearch: opts?.webSearch === true },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { text: string; data?: any };
}
