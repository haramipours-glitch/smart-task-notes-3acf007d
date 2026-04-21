// Hard-stop trigger phrases for crisis intervention
const HARD_STOPS = [
  /\bخودکشی\b/i, /\bخودآزار/i, /\bبه (خودم|خود) آسیب/i,
  /\bدیگر نمی‌?توانم\b/i, /\bدیگه نمیتونم\b/i,
  /\bهیچ راهی نیست\b/i, /\bمی‌?خواهم بمیرم\b/i, /\bمیخوام بمیرم\b/i,
  /\bتمام کنم زندگی\b/i, /\bبی‌?ارزش(م|ی|ه)?\b/i,
  /\bبهتره نباشم\b/i, /\bبهتر است نباشم\b/i,
];

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  return HARD_STOPS.some((rx) => rx.test(text));
}

export const CRISIS_RESOURCES = {
  fa: [
    { label: "اورژانس اجتماعی", phone: "123" },
    { label: "خط مشاوره بهزیستی", phone: "1480" },
    { label: "اورژانس", phone: "115" },
  ],
};
