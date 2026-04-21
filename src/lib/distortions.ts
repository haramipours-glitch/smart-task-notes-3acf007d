// Cognitive distortion detection (10 classic CBT distortions)
export type Distortion =
  | "overgeneralization" | "all_or_nothing" | "mental_filter" | "discounting_positive"
  | "jumping_to_conclusions" | "magnification" | "emotional_reasoning" | "shoulds"
  | "labeling" | "personalization";

export const DISTORTION_LABELS: Record<Distortion, string> = {
  overgeneralization: "تعمیم افراطی",
  all_or_nothing: "تفکر دوقطبی",
  mental_filter: "فیلتر ذهنی",
  discounting_positive: "نادیده گرفتن مثبت",
  jumping_to_conclusions: "نتیجه‌گیری شتاب‌زده",
  magnification: "بزرگ‌نمایی",
  emotional_reasoning: "استدلال احساسی",
  shoulds: "بایدها",
  labeling: "برچسب‌زنی",
  personalization: "شخصی‌سازی",
};

export const DISTORTION_HINTS: Record<Distortion, string> = {
  overgeneralization: "کلمات «همیشه/هرگز/هیچ‌کس» الگوی تعمیم است. ۳ مثال نقض پیدا کن.",
  all_or_nothing: "آیا یک حالت میانی هم قابل تصور است؟",
  mental_filter: "آیا اتفاق مثبتی در همان موقعیت بوده که نادیده گرفتی؟",
  discounting_positive: "اگر همین برای دوستت می‌افتاد، آن را بی‌اهمیت می‌شمردی؟",
  jumping_to_conclusions: "این نتیجه‌گیری بر چه داده عینی استوار است؟",
  magnification: "در مقیاس ۰-۱۰، این واقعاً چقدر بد است؟",
  emotional_reasoning: "احساس یک داده است، نه اثبات. چه شواهد دیگری داری؟",
  shoulds: "این «باید» از کجا می‌آید؟ قانون شخصی است یا واقعی؟",
  labeling: "این یک برچسب است یا توصیف یک رفتار خاص؟",
  personalization: "چه عوامل دیگری (خارج از کنترل تو) در کار بودند؟",
};

const PATTERNS: { d: Distortion; rx: RegExp }[] = [
  { d: "overgeneralization", rx: /\b(همیشه|هرگز|هیچ‌?کس|هیچوقت|هیچ وقت|همه)\b/ },
  { d: "all_or_nothing", rx: /\b(کاملاً? شکست|صفر|هیچ|یا .* یا)\b/ },
  { d: "magnification", rx: /\b(فاجعه|افتضاح|نابودی|نابود|وحشتناک)\b/ },
  { d: "shoulds", rx: /\b(باید|نباید|مجبور(م|ی|ه)?)\b/ },
  { d: "labeling", rx: /\b(بازنده|ضعیف(م|ی|ه)?|احمق|بی‌?عرضه)\b/ },
  { d: "personalization", rx: /\b(تقصیر من|به خاطر من|بخاطر من)\b/ },
  { d: "emotional_reasoning", rx: /\b(احساس می‌?کنم پس|چون احساس)\b/ },
  { d: "jumping_to_conclusions", rx: /\b(حتماً? فکر کرد|معلومه که|قطعاً?)\b/ },
];

export function detectDistortions(text: string): Distortion[] {
  const found = new Set<Distortion>();
  for (const { d, rx } of PATTERNS) if (rx.test(text)) found.add(d);
  return Array.from(found);
}
