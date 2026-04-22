// Sleep utilities — debt calculation, recommended hours, debt aggregation
export const RECOMMENDED_HOURS = 7.5;

export type SleepLog = {
  id: string;
  sleep_date: string;
  bedtime: string | null;
  wake_time: string | null;
  hours: number | null;
  quality: number | null;
  awakenings: number | null;
  caffeine_cutoff_hour: number | null;
  notes: string | null;
};

/** Compute hours from bedtime + wake_time (handles cross-midnight). */
export function computeHours(bedtime: string | null, wake_time: string | null): number | null {
  if (!bedtime || !wake_time) return null;
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wake_time.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}

/** Sleep debt over last N days. Negative = surplus, positive = debt (hours). */
export function sleepDebt(logs: SleepLog[], days = 7): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = logs.filter((l) => new Date(l.sleep_date) >= cutoff && l.hours != null);
  if (recent.length === 0) return 0;
  return recent.reduce((sum, l) => sum + (RECOMMENDED_HOURS - (l.hours || 0)), 0);
}

/** Multiplier for cognitive load: more debt → higher load multiplier. */
export function debtToMultiplier(debt: number): number {
  if (debt <= -3) return 0.85;        // well-rested surplus
  if (debt <= 1) return 1.0;
  if (debt <= 4) return 1.15;
  if (debt <= 8) return 1.3;
  return 1.5;                          // severe debt
}

/** Quality score — higher quality reduces effective debt impact. */
export function effectiveDebt(logs: SleepLog[], days = 7): number {
  const debt = sleepDebt(logs, days);
  const recent = logs.filter((l) => l.quality != null).slice(0, days);
  if (recent.length === 0) return debt;
  const avgQuality = recent.reduce((s, l) => s + (l.quality || 3), 0) / recent.length;
  // quality 5 → debt scaled to 0.7×, quality 1 → 1.3×
  const qualityFactor = 1 + (3 - avgQuality) * 0.15;
  return debt * qualityFactor;
}
