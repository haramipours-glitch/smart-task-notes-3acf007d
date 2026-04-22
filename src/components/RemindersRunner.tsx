import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { loadSettings, checkAndFireReminders, ensureDailyTasks } from "@/lib/reminders";

/** Mounts globally inside AppLayout — polls every 60s for reminders + auto-creates daily tasks. */
export default function RemindersRunner() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let stopped = false;

    const tick = async () => {
      const s = await loadSettings(user.id);
      if (!s || stopped) return;
      await ensureDailyTasks(user.id, s);
      checkAndFireReminders(s);
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => { stopped = true; clearInterval(id); };
  }, [user]);

  return null;
}
