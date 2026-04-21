import type { Priority } from "./priority";

export type Quadrant = 1 | 2 | 3 | 4;

export const QUADRANT_META: Record<Quadrant, {
  label: string;
  subtitle: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  emoji: string;
}> = {
  1: {
    label: "مهم و فوری",
    subtitle: "همین الان انجام بده",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/40",
    textClass: "text-rose-600 dark:text-rose-400",
    emoji: "🔥",
  },
  2: {
    label: "مهم و غیرفوری",
    subtitle: "برنامه‌ریزی کن",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/40",
    textClass: "text-blue-600 dark:text-blue-400",
    emoji: "🎯",
  },
  3: {
    label: "غیرمهم و فوری",
    subtitle: "تفویض یا سریع تمام کن",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/40",
    textClass: "text-amber-600 dark:text-amber-400",
    emoji: "⚡",
  },
  4: {
    label: "غیرمهم و غیرفوری",
    subtitle: "حذف یا بعداً",
    bgClass: "bg-muted/40",
    borderClass: "border-border",
    textClass: "text-muted-foreground",
    emoji: "🗑",
  },
};

export const QUADRANT_TO_META = (q: Quadrant): { priority: Priority; daysOffset: number | null } => {
  switch (q) {
    case 1: return { priority: "high", daysOffset: 0 };
    case 2: return { priority: "high", daysOffset: 14 };
    case 3: return { priority: "low", daysOffset: 0 };
    case 4: return { priority: "low", daysOffset: null };
  }
};

export function computeQuadrant(t: { priority: Priority; due_date: string | null; quadrant?: number | null }): Quadrant {
  if (t.quadrant && t.quadrant >= 1 && t.quadrant <= 4) return t.quadrant as Quadrant;
  const important = t.priority === "high" || t.priority === "medium";
  let urgent = false;
  if (t.due_date) {
    const diff = new Date(t.due_date).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    urgent = days <= 3;
  }
  if (important && urgent) return 1;
  if (important && !urgent) return 2;
  if (!important && urgent) return 3;
  return 4;
}
