import { supabase } from "@/integrations/supabase/client";

export type AIMode = "parse_task" | "breakdown" | "generate_note" | "summarize_note" | "improve_note" | "suggest" | "chat";

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

export async function callAI(mode: AIMode, input: any, context?: string) {
  const settings = getAISettings();
  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: { mode, input, context, settings },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { text: string; data?: any };
}
