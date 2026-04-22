

# پلن: سایدبار قابل‌جابجایی + تقویم پیشرفته + ماژول‌های سلامت روان

سه بخش اصلی + پیشنهادهای انتخابی از فایل معماری.

---

## بخش ۱ — سایدبار قابل‌جابجایی (Drag & Reorder)

**هدف:** ترتیب ۵ گروه + بلاک فولدرها + بلاک تگ‌ها قابل جابجایی توسط کاربر باشد، با ترتیب پیش‌فرض جدید:
**فولدرها → تگ‌ها → کارها → نوت‌ها → خودشناسی → سلامت ذهن → ابزار**

**اجرا:**
- استفاده از کتابخانه `@dnd-kit/core` + `@dnd-kit/sortable` (سبک، accessible، RTL-friendly).
- یک handle کوچک (آیکون `GripVertical`) در سمت چپ هر عنوان گروه (در حالت دسکتاپ + موبایل با long-press).
- ترتیب در `localStorage` با کلید `sidebar_order_v1` ذخیره می‌شود.
- دکمه «بازنشانی ترتیب» در پایین سایدبار.

---

## بخش ۲ — تقویم پیشرفته (CalendarView بازنویسی)

**Tabbed Views:**
- **ماهانه (Month)** — همان نمای فعلی، بهبودیافته
- **هفتگی (Week)** — ۷ ستون روز × ۲۴ ردیف ساعت (نمای ساعتی)
- **روزانه (Day)** — یک ستون با time-slot ساعتی (۰۰:۰۰ تا ۲۳:۰۰)
- **Agenda** — لیست عمودی رویدادها

**کلیک روی روز → DayDetailSheet:**
- در نمای ماهانه با کلیک روی هر سلول، یک Sheet/Dialog باز شود شامل:
  - **هدر:** تاریخ شمسی + میلادی + روز هفته
  - **مناسبت‌ها:** تعطیلی ایران/استرالیا (از جدول `holidays`) + روز خاص شمسی
  - **خط‌زمان ساعتی:** نمایش تسک‌ها روی محور ساعت (با `due_date` و `reminder_at`)
  - **چک‌این آن روز:** mood/energy/sleep از `daily_checkins` اگر ثبت شده
  - **پیش‌بینی روز:** از `predictions` اگر موجود باشد
  - **دکمه‌ها:** «+ تسک جدید برای این روز»، «+ نوت روزانه»، «+ Check-in»

**زیر هر سلول روز در نمای ماهانه:**
- خط اول: مناسبت روز (اگر بود)
- خط دوم: تعداد تسک‌ها + نقطه‌های رنگی (تا ۳ تا) براساس priority

**ساختار فایل:**
```
src/pages/CalendarView.tsx          ← shell با Tabs
src/components/calendar/
  ├─ MonthGrid.tsx
  ├─ WeekView.tsx                   ← grid 7×24
  ├─ DayView.tsx                    ← single column 24 slots
  ├─ AgendaView.tsx
  └─ DayDetailSheet.tsx             ← popup روز
```

**درگ تسک روی time-slot (هفتگی/روزانه):** کشیدن تسک به ساعت دیگر → آپدیت `due_date`. (با `@dnd-kit` که برای بخش ۱ اضافه می‌شود.)

---

## بخش ۳ — پیشنهادها از فایل معماری (انتخابی)

از فایل ۴۹۲ خطی، این موارد **با زیرساخت فعلی قابل پیاده‌سازی‌اند** (DB ها از قبل آماده):

### A. آماده برای پیاده‌سازی فوری (MVP پیشنهادی)

| # | ماژول | چرا الان؟ | وضعیت DB |
|---|---|---|---|
| A1 | **Cognitive Load v2** (فرمول کامل با Chronotype + Sleep Multiplier) | فقط منطق محاسباتی + UI | داده‌ها در `tasks`, `daily_checkins`, `chronotype` موجود |
| A2 | **Dynamic Evening Check-in** (سوالات پویا براساس بار شناختی روز) | فقط شرط روی فرم فعلی | جدول `daily_checkins` آماده |
| A3 | **Calibration Curve** (نمودار پیش‌بینی vs واقعی برای Prediction) | فقط چارت + محاسبه | جدول `predictions` آماده |
| A4 | **Cognitive Distortion Detector پیشرفته** (۱۰ خطا با کلمات کلیدی فارسی) | فقط ارتقاء `src/lib/distortions.ts` | جدول `thought_records` آماده |
| A5 | **Disclaimer بالینی + Onboarding تایید** | یک صفحه + flag در profile | نیاز به ستون `clinical_consent` |

### B. نیاز به ساختار جدید (متوسط)

| # | ماژول | چه چیز جدید نیاز است |
|---|---|---|
| B1 | **Sleep Layer** | جدول `sleep_logs` (hours, quality, awakenings, caffeine_cutoff) + Sleep Debt chart |
| B2 | **Cross-Correlation Radar** (با زبان آماری: «اعتماد متوسط، نمونه ۱۴ روز») | الگوریتم همبستگی + UI |
| B3 | **Progressive Profiling** (Mini-IPIP ۲۰ سوال + توزیع تدریجی HEXACO/VIA در طول ۶ هفته) | جدول `profile_questions_queue` + تزریق در ۳ نقطه (Idle/شب/Pomodoro) |
| B4 | **Pattern Detection ABC پیشرفته** (آستانه ≥۷ نمونه + frequency ≥0.6) | فقط ارتقاء UI (DB موجود) |
| B5 | **Decision Journal** | جدول `decision_journal` |

### C. پیچیده / فاز بعدی

| # | ماژول | پیچیدگی |
|---|---|---|
| C1 | **Duo Mode** (اشتراک‌گذاری granular با partner) | نیاز به sharing system + invite flow + ECR-R conflict logic |
| C2 | **A/B Testing شخصی** (هفته آینده Deep Work را ۹-۱۱ صبح امتحان کن) | نیاز به experiment tracker |
| C3 | **End-to-End Encryption** برای Thought Records | نیاز به key management در client |

---

## نکات فنی مختصر

- **DnD library:** `@dnd-kit/core@6` + `@dnd-kit/sortable@8` (~30KB، RTL-OK)
- **Calendar Week/Day view:** بدون کتابخانه سنگین — grid CSS ساده با `date-fns`
- **DayDetailSheet:** از `Sheet` shadcn استفاده می‌کنیم (mobile-friendly، از پایین باز می‌شود در موبایل)
- **هیچ migration خطرناکی** نیاز نیست؛ فقط برای موارد B/C اگر تایید کنی جدول جدید می‌سازم

---

## انتخاب‌های لازم

سه گروه سوال — لطفاً برای هر کدام انتخاب کن:

### ۱) از پیشنهادهای فایل معماری چه چیز اضافه شود؟
- **(الف)** فقط بخش ۱ + ۲ همین حالا، ماژول‌های فایل بعداً
- **(ب)** بخش ۱ + ۲ + همه موارد گروه **A** (A1..A5) — سریع و ارزشمند
- **(ج)** بخش ۱ + ۲ + گروه **A** + گروه **B** کامل — جامع
- **(د)** فقط آیتم‌های منتخب — اسم بگو (مثلاً «A1 + A4 + B1»)

### ۲) ترتیب پیش‌فرض سایدبار:
- **(الف)** فولدرها → تگ‌ها → کارها → نوت‌ها → خودشناسی → سلامت ذهن → ابزار  ← (پیشنهاد تو)
- **(ب)** فولدرها → کارها → تگ‌ها → بقیه
- **(ج)** ترتیب فعلی بماند، فقط قابلیت drag اضافه شود

### ۳) DayDetailSheet موبایل:
- **(الف)** Sheet از پایین (مدرن، swipe-down برای بستن)
- **(ب)** Dialog کامل (full-screen در موبایل)

پس از پاسخ، شروع به اجرا می‌کنم.

