import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { loadSettings, checkAndFireReminders, ensureDailyTasks } from "@/lib/reminders";
import { applyFontSize, applyUIScale, type FontSize } from "@/lib/uiScale";

/** Mounts globally inside AppLayout — polls every 60s for reminders + applies UI prefs. */
export default function RemindersRunner() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let stopped = false;

    const tick = async () => {
      const s = await loadSettings(user.id);
      if (!s || stopped) return;
      // Apply persisted UI prefs (font + scale + theme)
      if ((s as any).font_size) applyFontSize((s as any).font_size as FontSize);
      if ((s as any).ui_scale) applyUIScale((s as any).ui_scale);
      await ensureDailyTasks(user.id, s);
      checkAndFireReminders(s);
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => { stopped = true; clearInterval(id); };
  }, [user]);

  return null;
}
