import { RRule, Frequency, Weekday } from "rrule";

export type RecurrenceRule = {
  freq: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  byweekday?: ("MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU")[];
  byhour?: number;
  byminute?: number;
};

const FREQ_MAP: Record<RecurrenceRule["freq"], Frequency> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
};

const WD_MAP: Record<NonNullable<RecurrenceRule["byweekday"]>[number], Weekday> = {
  MO: RRule.MO, TU: RRule.TU, WE: RRule.WE, TH: RRule.TH,
  FR: RRule.FR, SA: RRule.SA, SU: RRule.SU,
};

export function nextOccurrence(rule: RecurrenceRule, after: Date = new Date()): Date | null {
  try {
    const opts: any = {
      freq: FREQ_MAP[rule.freq],
      interval: Math.max(1, rule.interval || 1),
      dtstart: after,
    };
    if (rule.byweekday?.length) opts.byweekday = rule.byweekday.map((d) => WD_MAP[d]);
    if (typeof rule.byhour === "number") opts.byhour = [rule.byhour];
    if (typeof rule.byminute === "number") opts.byminute = [rule.byminute];
    const r = new RRule(opts);
    return r.after(after, false);
  } catch (e) {
    console.error("rrule error", e);
    return null;
  }
}

export function describeRule(rule: RecurrenceRule | null): string {
  if (!rule) return "بدون تکرار";
  const freqMap = { daily: "روز", weekly: "هفته", monthly: "ماه", yearly: "سال" };
  const intervalText = rule.interval > 1 ? `هر ${rule.interval} ${freqMap[rule.freq]}` : `هر ${freqMap[rule.freq]}`;
  const wdNames: Record<string, string> = {
    MO: "دوشنبه", TU: "سه‌شنبه", WE: "چهارشنبه", TH: "پنج‌شنبه",
    FR: "جمعه", SA: "شنبه", SU: "یکشنبه",
  };
  const days = rule.byweekday?.length ? ` در ${rule.byweekday.map((d) => wdNames[d]).join("، ")}` : "";
  const time = typeof rule.byhour === "number" ? ` ساعت ${String(rule.byhour).padStart(2, "0")}:${String(rule.byminute || 0).padStart(2, "0")}` : "";
  return `${intervalText}${days}${time}`;
}
