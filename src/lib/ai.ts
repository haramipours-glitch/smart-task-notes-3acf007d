import { supabase } from "@/integrations/supabase/client";

export type AIMode = "parse_task" | "breakdown" | "generate_note" | "summarize_note" | "improve_note" | "suggest" | "chat";

export async function callAI(mode: AIMode, input: any, context?: string) {
  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: { mode, input, context },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { text: string; data?: any };
}
