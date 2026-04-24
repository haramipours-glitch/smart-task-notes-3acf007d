// Reminders engine — Web Notifications + auto daily task creation
import { supabase } from "@/integrations/supabase/client";

export type UserSettings = {
  user_id: string;
  sleep_reminder_enabled: boolean;
  sleep_reminder_time: string; // "HH:MM" or "HH:MM:SS"
  checkin_reminder_enabled: boolean;
  checkin_reminder_time: string;
  notifications_enabled: boolean;
  sleep_goal_hours: number;
  micro_prompt_enabled: boolean;
  theme: string;
  auto_create_daily_tasks: boolean;
  font_size: "small" | "medium" | "large" | "xlarge";
  ui_scale: number;
  default_widget_id: string | null;
  task_card_layout: "compact" | "comfortable";
  default_landing: "today" | "widget" | "last";
};

const LAST_NOTIFY_KEY = "reminder_last_fired_v1"; // {sleep:"YYYY-MM-DD", checkin:"YYYY-MM-DD"}
const LAST_TASK_KEY = "reminder_last_task_v1"; // "YYYY-MM-DD"

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseHM(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map(Number);
  return { h, m: m || 0 };
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

function fire(title: string, body: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, icon: "/icon-192.png" });
  } catch {
    /* ignore */
  }
}

export function checkAndFireReminders(s: UserSettings) {
  if (!s.notifications_enabled) return;
  const now = new Date();
  const today = todayKey();
  const stored = JSON.parse(localStorage.getItem(LAST_NOTIFY_KEY) || "{}");

  const tryFire = (kind: "sleep" | "checkin", enabled: boolean, time: string, title: string, body: string) => {
    if (!enabled) return;
    if (stored[kind] === today) return;
    const { h, m } = parseHM(time);
    if (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)) {
      fire(title, body, `${kind}-${today}`);
      stored[kind] = today;
    }
  };

  tryFire("checkin", s.checkin_reminder_enabled, s.checkin_reminder_time,
    "📝 چک‌این روزانه", "حال امروزت چطور بود؟");

  localStorage.setItem(LAST_NOTIFY_KEY, JSON.stringify(stored));
}

export async function ensureDailyTasks(userId: string, s: UserSettings) {
  if (!s.auto_create_daily_tasks) return;
  const today = todayKey();
  if (localStorage.getItem(LAST_TASK_KEY) === today) return;

  const dueIso = new Date().toISOString();
  const items: { title: string; description: string }[] = [];
  if (s.checkin_reminder_enabled) items.push({
    title: "چک‌این روزانه 📝",
    description: "خلق، انرژی، تمرکز، استرس را ثبت کن. روی این تسک بزن تا مستقیم به صفحه چک‌این بری.",
  });

  if (items.length === 0) {
    localStorage.setItem(LAST_TASK_KEY, today);
    return;
  }

  // Avoid duplicates: check for tasks today with these titles
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const { data: existing } = await supabase
    .from("tasks")
    .select("title")
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString());
  const existingTitles = new Set((existing || []).map((t: any) => t.title));

  const toInsert = items
    .filter((i) => !existingTitles.has(i.title))
    .map((i) => ({
      user_id: userId,
      title: i.title,
      description: i.description,
      due_date: dueIso,
      priority: "medium" as const,
      recurrence: "daily" as const,
    }));

  if (toInsert.length > 0) {
    await supabase.from("tasks").insert(toInsert);
  }
  localStorage.setItem(LAST_TASK_KEY, today);
}

export async function loadSettings(userId: string): Promise<UserSettings | null> {
  const { data } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data as UserSettings;
  // Create defaults
  const { data: created } = await supabase
    .from("user_settings")
    .insert({ user_id: userId })
    .select()
    .maybeSingle();
  return (created as UserSettings) || null;
}

export async function saveSettings(userId: string, patch: Partial<UserSettings>) {
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) throw error;
}
