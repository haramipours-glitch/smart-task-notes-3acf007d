// Cognitive Load Engine v2
// Daily_Load = Σ(Task_Weight × Context_Switch_Penalty) × Sleep_Mult × Chronotype_Align

export const TASK_WEIGHTS: Record<string, number> = {
  deep: 4, creative: 3, comm: 2.5, shallow: 1.5, physical: 1, recovery: -0.5,
};

// Heuristic: derive task weight from priority+description length
function inferTaskWeight(t: any): number {
  if (t.priority === "high") return 3.5;
  if (t.priority === "medium") return 2.5;
  if (t.priority === "low") return 1.5;
  return 2;
}

export function computeCognitiveLoad(opts: {
  tasks: any[]; // active tasks for the day
  sleepHours?: number | null;
  chronotype?: { peak_window_start?: number | null; peak_window_end?: number | null; trough_window_start?: number | null; trough_window_end?: number | null } | null;
  hourOfDay?: number;
}): { load: number; breakdown: { base: number; switchMult: number; sleepMult: number; chronoMult: number } } {
  const base = opts.tasks.reduce((s, t) => s + inferTaskWeight(t), 0);

  // Context switch penalty: count distinct quadrants/folders as switch proxy
  const distinctContexts = new Set(opts.tasks.map((t) => t.folder_id || t.quadrant || "x")).size;
  const switchMult = distinctContexts >= 4 ? 1.5 : distinctContexts >= 2 ? 1.2 : 1.0;

  let sleepMult = 1.0;
  if (opts.sleepHours != null) {
    if (opts.sleepHours < 6) sleepMult = 1.3;
    else if (opts.sleepHours < 7) sleepMult = 1.1;
  }

  let chronoMult = 1.0;
  const h = opts.hourOfDay ?? new Date().getHours();
  const c = opts.chronotype;
  if (c?.peak_window_start != null && c.peak_window_end != null && h >= c.peak_window_start && h <= c.peak_window_end) {
    chronoMult = 0.9;
  } else if (c?.trough_window_start != null && c.trough_window_end != null && h >= c.trough_window_start && h <= c.trough_window_end) {
    chronoMult = 1.3;
  }

  const load = base * switchMult * sleepMult * chronoMult;
  return { load: Math.round(load * 10) / 10, breakdown: { base, switchMult, sleepMult, chronoMult } };
}

export function loadStatus(load: number, threshold = 15): { label: string; tone: "ok" | "warn" | "high" } {
  if (load < threshold * 0.7) return { label: "سبک", tone: "ok" };
  if (load < threshold) return { label: "متعادل", tone: "ok" };
  if (load < threshold * 1.3) return { label: "بالا", tone: "warn" };
  return { label: "اضافه‌بار", tone: "high" };
}
