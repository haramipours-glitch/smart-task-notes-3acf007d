// MEQ — Morningness-Eveningness Questionnaire (19 items, simplified scoring)
export type MeqQuestion = { id: number; q: string; options: { label: string; score: number }[] };

export const MEQ_QUESTIONS: MeqQuestion[] = [
  { id: 1, q: "اگر کاملاً آزاد باشی، چه ساعتی از خواب بیدار می‌شوی؟", options: [
    { label: "۵–۶:۳۰", score: 5 }, { label: "۶:۳۰–۷:۴۵", score: 4 },
    { label: "۷:۴۵–۹:۴۵", score: 3 }, { label: "۹:۴۵–۱۱", score: 2 }, { label: "۱۱–۱۲", score: 1 },
  ]},
  { id: 2, q: "اگر کاملاً آزاد باشی، چه ساعتی به خواب می‌روی؟", options: [
    { label: "۲۰–۲۱", score: 5 }, { label: "۲۱–۲۲:۱۵", score: 4 },
    { label: "۲۲:۱۵–۰۰:۳۰", score: 3 }, { label: "۰۰:۳۰–۰۱:۴۵", score: 2 }, { label: "۰۱:۴۵–۳", score: 1 },
  ]},
  { id: 3, q: "میزان وابستگی‌ات به ساعت زنگ‌دار برای بیدار شدن صبح؟", options: [
    { label: "اصلاً وابسته نیستم", score: 4 }, { label: "کم", score: 3 }, { label: "متوسط", score: 2 }, { label: "زیاد", score: 1 },
  ]},
  { id: 4, q: "بیدار شدن صبح برایت چقدر آسان است؟", options: [
    { label: "خیلی آسان", score: 4 }, { label: "نسبتاً آسان", score: 3 }, { label: "نسبتاً سخت", score: 2 }, { label: "خیلی سخت", score: 1 },
  ]},
  { id: 5, q: "نیم ساعت بعد از بیدار شدن چقدر هوشیاری؟", options: [
    { label: "خیلی هوشیار", score: 4 }, { label: "نسبتاً هوشیار", score: 3 }, { label: "نسبتاً خواب‌آلود", score: 2 }, { label: "خیلی خواب‌آلود", score: 1 },
  ]},
  { id: 6, q: "اشتها نیم ساعت بعد از بیدار شدن چطور است؟", options: [
    { label: "خیلی خوب", score: 4 }, { label: "نسبتاً خوب", score: 3 }, { label: "نسبتاً ضعیف", score: 2 }, { label: "خیلی ضعیف", score: 1 },
  ]},
  { id: 7, q: "نیم ساعت بعد از بیدار شدن چقدر خسته‌ای؟", options: [
    { label: "اصلاً خسته نیستم", score: 4 }, { label: "کمی", score: 3 }, { label: "نسبتاً خسته", score: 2 }, { label: "خیلی خسته", score: 1 },
  ]},
  { id: 8, q: "بهترین زمان برای ورزش جدی برایت کی است؟", options: [
    { label: "۸–۱۰ صبح", score: 4 }, { label: "۱۱–۱۳", score: 3 }, { label: "۱۵–۱۷", score: 2 }, { label: "۱۹–۲۱", score: 1 },
  ]},
  { id: 9, q: "اگر مجبور بودی ساعت ۲۲ بخوابی چقدر خسته می‌بودی؟", options: [
    { label: "خسته نبودم", score: 1 }, { label: "کمی خسته", score: 2 }, { label: "نسبتاً خسته", score: 3 }, { label: "خیلی خسته", score: 5 },
  ]},
  { id: 10, q: "اگر مجبور باشی ۲ ساعت کار ذهنی سنگین انجام دهی، کی بهترین است؟", options: [
    { label: "۸–۱۰ صبح", score: 6 }, { label: "۱۱–۱۳", score: 4 }, { label: "۱۵–۱۷", score: 2 }, { label: "۱۹–۲۱", score: 0 },
  ]},
  { id: 11, q: "خستگی ذهنی در چه زمانی بیشتر است؟", options: [
    { label: "۲۰–۲۲", score: 5 }, { label: "۲۲–۰۰", score: 3 }, { label: "۰۰–۲", score: 2 }, { label: "۲–۵", score: 1 },
  ]},
  { id: 12, q: "اگر فردا امتحان داری، ترجیح می‌دهی...", options: [
    { label: "صبح زود (۶–۹)", score: 4 }, { label: "اواسط روز (۹–۱۲)", score: 3 }, { label: "بعدازظهر (۱۵–۱۸)", score: 2 }, { label: "شب (۲۰–۲۳)", score: 1 },
  ]},
  { id: 13, q: "اگر تا ۳ بامداد بیدار بمانی، روز بعد چه حسی داری؟", options: [
    { label: "خیلی بد", score: 4 }, { label: "نسبتاً بد", score: 3 }, { label: "نسبتاً خوب", score: 2 }, { label: "عالی", score: 1 },
  ]},
  { id: 14, q: "خود را به‌طور کلی چه می‌دانی؟", options: [
    { label: "کاملاً صبحگاهی", score: 6 }, { label: "بیشتر صبحگاهی", score: 4 }, { label: "بیشتر شبانه", score: 2 }, { label: "کاملاً شبانه", score: 0 },
  ]},
  { id: 15, q: "ساعت بیدار شدن طبیعی تو در روز تعطیل؟", options: [
    { label: "۵–۶:۳۰", score: 5 }, { label: "۶:۳۰–۷:۴۵", score: 4 }, { label: "۷:۴۵–۹:۴۵", score: 3 }, { label: "۹:۴۵+", score: 1 },
  ]},
  { id: 16, q: "اگر مجبور باشی بین ۴ تا ۶ صبح بیدار شوی، چقدر سخت است؟", options: [
    { label: "آسان", score: 4 }, { label: "نسبتاً آسان", score: 3 }, { label: "نسبتاً سخت", score: 2 }, { label: "خیلی سخت", score: 1 },
  ]},
  { id: 17, q: "بیشترین انرژی فیزیکی روزانه‌ات کی است؟", options: [
    { label: "۸–۱۰ صبح", score: 4 }, { label: "۱۱–۱۳", score: 3 }, { label: "۱۵–۱۸", score: 2 }, { label: "۱۹–۲۲", score: 1 },
  ]},
  { id: 18, q: "اگر شب ۴ ساعت دیر بخوابی، چه ساعتی بیدار می‌شوی؟", options: [
    { label: "همان ساعت همیشگی", score: 4 }, { label: "تقریباً همان", score: 3 }, { label: "کمی دیرتر", score: 2 }, { label: "خیلی دیرتر", score: 1 },
  ]},
  { id: 19, q: "آیا بعد از بیدار شدن سریع به اوج کارایی می‌رسی؟", options: [
    { label: "بله، خیلی سریع", score: 4 }, { label: "نسبتاً سریع", score: 3 }, { label: "آرام", score: 2 }, { label: "خیلی آرام", score: 1 },
  ]},
];

export type Chronotype = "definite_morning" | "moderate_morning" | "intermediate" | "moderate_evening" | "definite_evening";

export const CHRONOTYPE_LABELS: Record<Chronotype, string> = {
  definite_morning: "کاملاً صبحگاهی",
  moderate_morning: "نسبتاً صبحگاهی",
  intermediate: "بینابین",
  moderate_evening: "نسبتاً شبانه",
  definite_evening: "کاملاً شبانه",
};

export function categorize(score: number): Chronotype {
  if (score >= 70) return "definite_morning";
  if (score >= 59) return "moderate_morning";
  if (score >= 42) return "intermediate";
  if (score >= 31) return "moderate_evening";
  return "definite_evening";
}

export function peakWindow(c: Chronotype): { peak: [number, number]; trough: [number, number] } {
  switch (c) {
    case "definite_morning": return { peak: [6, 11], trough: [20, 23] };
    case "moderate_morning": return { peak: [8, 12], trough: [21, 23] };
    case "intermediate": return { peak: [10, 14], trough: [3, 6] };
    case "moderate_evening": return { peak: [14, 19], trough: [6, 9] };
    case "definite_evening": return { peak: [16, 22], trough: [6, 10] };
  }
}
