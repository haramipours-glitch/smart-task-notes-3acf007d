// Pre-built decision templates with guiding questions
export type DecisionTemplate = {
  id: string;
  name: string;
  emoji: string;
  context_hint: string;
  options_hint: string[];
  rationale_hint: string;
  predicted_outcome_hint: string;
  review_in_days: number;
};

export const DECISION_TEMPLATES: DecisionTemplate[] = [
  {
    id: "blank",
    name: "تصمیم خالی",
    emoji: "📝",
    context_hint: "",
    options_hint: ["", ""],
    rationale_hint: "",
    predicted_outcome_hint: "",
    review_in_days: 14,
  },
  {
    id: "career",
    name: "تغییر شغل / آفر کاری",
    emoji: "💼",
    context_hint: "وضعیت فعلی شغلی، چرا این آفر مطرح شد، چه چیزی تو را برای تغییر تحریک کرد؟",
    options_hint: ["قبول کردن آفر جدید", "ماندن در شغل فعلی", "مذاکره برای شرایط بهتر"],
    rationale_hint: "حقوق، مسیر رشد، فرهنگ تیم، یادگیری، تعادل کار-زندگی، ریسک. هر کدام چه وزنی داره؟",
    predicted_outcome_hint: "۶ ماه دیگه از این تصمیم چه احساسی خواهی داشت؟ بهترین/بدترین/محتمل‌ترین حالت؟",
    review_in_days: 90,
  },
  {
    id: "purchase",
    name: "خرید بزرگ",
    emoji: "💰",
    context_hint: "چه چیزی می‌خوای بخری؟ چرا الان؟ آیا واقعاً نیاز هست یا میل لحظه‌ای؟",
    options_hint: ["خرید الان", "صبر و پس‌انداز", "خرید گزینه ارزان‌تر"],
    rationale_hint: "هزینه فرصت چیست؟ این پول می‌تواند جای دیگری چه ارزشی بسازد؟",
    predicted_outcome_hint: "۳ ماه بعد چقدر از این خرید استفاده خواهی کرد؟ پشیمان می‌شی؟",
    review_in_days: 60,
  },
  {
    id: "relationship",
    name: "تصمیم رابطه",
    emoji: "❤️",
    context_hint: "چه نوع رابطه‌ای؟ چه اتفاقی این تصمیم را لازم کرد؟ احساسات الان چطور است؟",
    options_hint: ["ادامه دادن رابطه", "صحبت صریح و دادن فرصت", "پایان دادن"],
    rationale_hint: "ارزش‌های خودت چیست؟ آیا این رابطه به تو کمک می‌کند بهترین نسخه خودت باشی؟",
    predicted_outcome_hint: "یک سال بعد، با هر گزینه چه شخصیتی خواهی شد؟",
    review_in_days: 90,
  },
  {
    id: "education",
    name: "تحصیل / دوره",
    emoji: "🎓",
    context_hint: "چرا این رشته/دوره؟ چه چیزی را قرار است یاد بگیری؟ هزینه زمان و مالی؟",
    options_hint: ["شروع دوره", "یادگیری خودخوان (رایگان)", "صبر تا فرصت بهتر"],
    rationale_hint: "این یادگیری به کدام هدف بزرگ‌تر متصل است؟ چه دری برات باز می‌کنه؟",
    predicted_outcome_hint: "بعد از پایان، چه مهارتی خواهی داشت؟ چقدر استفاده خواهی کرد؟",
    review_in_days: 180,
  },
  {
    id: "move",
    name: "نقل مکان / مهاجرت",
    emoji: "✈️",
    context_hint: "چه شهر/کشوری؟ چه چیزی تو را به رفتن می‌کشد؟ چه چیزی تو را اینجا نگه می‌دارد؟",
    options_hint: ["رفتن", "ماندن و بهبود وضعیت فعلی", "تجربه موقت (۳-۶ ماه)"],
    rationale_hint: "خانواده، هزینه، فرهنگ، فرصت‌ها، سلامت روان. کدام مهم‌ترند؟",
    predicted_outcome_hint: "۲ سال بعد در هر گزینه، زندگی روزانه‌ات چطور خواهد بود؟",
    review_in_days: 180,
  },
  {
    id: "investment",
    name: "سرمایه‌گذاری",
    emoji: "📈",
    context_hint: "چه ابزاری؟ چقدر سرمایه؟ این پول را اگر از دست بدی چه می‌شود؟",
    options_hint: ["ورود کامل", "ورود تدریجی (DCA)", "صبر و رصد"],
    rationale_hint: "افق زمانی؟ تحمل ریسک؟ آیا واقعاً درک می‌کنی چه می‌خری؟",
    predicted_outcome_hint: "احتمال ۲ برابر شدن؟ احتمال نصف شدن؟ به هر دو سناریو راحتی؟",
    review_in_days: 180,
  },
];
