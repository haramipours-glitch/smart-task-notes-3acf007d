# نقشه‌ی ژست‌های حرفه‌ای — Arshnaz

الهام‌گرفته از **Things 3, Todoist, TickTick, Notion, Apple Notes, Telegram, iOS Mail**.
هدف: هر ژست یک معنای ثابت و قابل‌پیش‌بینی داشته باشد، با Haptic ظریف و بدون تداخل با اسکرول/سایدبار.

---

## 1) قانون‌های پایه (Gesture Grammar)

| ژست | معنای ثابت در کل اپ |
|---|---|
| Tap | انتخاب / باز کردن |
| Double-tap | اکشن سریعِ اصلی همان آیتم (مثل ❤ در اینستاگرام) |
| Long-press (≥450ms) | منوی کانتکست (Action Sheet) |
| Swipe → (راست) | اکشن مثبت (تکمیل/آرشیو) |
| Swipe ← (چپ) | اکشن منفی (حذف/اسنوز) |
| Swipe طولانی (full-swipe >60%) | اجرای فوری بدون تأیید |
| Two-finger swipe | Undo/Redo (مثل Apple Notes) |
| Pull down | Refresh |
| Pull up (در تَه لیست) | بارگذاری بیشتر / ساخت آیتم جدید |
| Edge-swipe | باز کردن منو (موجود) |
| Pinch | Zoom محتوا (در نوت/تقویم) |

---

## 2) روی **تسک‌ها** (TaskItem)

موجود: swipe complete/delete، long-press → action sheet. اضافه می‌شود:

- **Double-tap روی تسک** → باز کردن صفحه‌ی جزئیات (سریع‌تر از long-press → ویرایش)
- **Swipe کوتاه راست (40-95px)** → نگه داشتن در حالت reveal با دکمه‌های "تکمیل / فردا / +۷ روز" (مثل iOS Mail)
- **Swipe کوتاه چپ** → reveal "حذف / Snooze / تغییر اولویت"
- **Full-swipe راست (>60% عرض)** → تکمیل آنی + Undo toast (۵ ثانیه)
- **Full-swipe چپ** → حذف آنی + Undo toast
- **Long-press + drag (روی هندل)** → Reorder درون لیست
- **Long-press روی چک‌باکس** → باز کردن انتخاب چندتایی (Multi-select) — مثل Things
- **Two-finger swipe چپ/راست** → Undo / Redo آخرین عملیات

## 3) روی **نوت‌ها**

- **Double-tap روی کارت نوت** → ورود به حالت ویرایش سریع
- **Swipe راست** → Pin/Unpin
- **Swipe چپ** → آرشیو (نه حذف؛ حذف فقط از long-press)
- **Long-press** → Action sheet: اشتراک، کپی لینک، انتقال به فولدر، رنگ‌گذاری
- **Pinch داخل نوت** → بزرگ/کوچک کردن متن (font-size موقت)
- **Two-finger swipe** → Undo/Redo ویرایش

## 4) روی **عادت‌ها (Habits)**

- **Tap** روی روز → toggle انجام
- **Double-tap** → ثبت با شمارش +۱ (برای عادت‌های شمارشی)
- **Long-press روی روز** → یادداشت برای آن روز + تعیین مقدار دلخواه
- **Swipe راست روی کارت عادت** → streak freeze (مرخصی یک‌روزه)
- **Swipe چپ** → آرشیو

## 5) روی **تقویم**

- **Swipe افقی** → ماه/هفته‌ی بعد و قبل (موجود در ماهانه؛ به هفتگی/روزانه هم اضافه شود)
- **Swipe عمودی روی Day view** → جابه‌جایی ساعت‌ها
- **Double-tap روی یک slot ساعتی** → ساخت رویداد/تسک سریع در همان ساعت
- **Long-press روی روز** → Day Detail Sheet (موجود) + گزینه‌ی "ساخت تسک برای این روز"
- **Pinch روی Day/Week** → zoom ساعت‌ها (1h ↔ 30min ↔ 15min)
- **Drag رویداد** → جابه‌جایی زمان

## 6) روی **Pomodoro**

- **Double-tap روی تایمر** → Start/Pause
- **Long-press روی تایمر** → Reset
- **Swipe راست** → Skip به استراحت
- **Swipe چپ** → Skip به session بعد

## 7) روی **Kanban**

- **Long-press روی کارت** → پیکاپ برای drag بین ستون‌ها (موجود) + Haptic medium
- **Double-tap روی کارت** → باز کردن جزئیات
- **Swipe افقی روی ستون** → جابه‌جایی بین ستون‌ها وقتی صفحه باریک است

## 8) **ناوبری سراسری**

- **Swipe افقی روی صفحه** (موجود) → بین Home/Today/Inbox/...
- **Swipe از پایین به بالا (در BottomTabBar)** → باز کردن Quick Capture
- **Double-tap روی تَب فعال** → اسکرول به بالا (مثل Twitter/Instagram)
- **Long-press روی تَب** → منوی میان‌بُر آن بخش (مثلاً روی Today: "ساخت تسک امروز / مشاهده‌ی فردا")
- **Two-finger tap** → باز/بسته کردن AI Panel
- **Swipe از لبه‌ی پایین به بالا** → نمایش Command Palette

## 9) **Haptic Map** (همه ظریف، فقط روی اکشن‌های مهم)

| رویداد | الگو |
|---|---|
| تکمیل تسک | success (۱۰ms) |
| حذف | warning (۲۰ms) |
| Long-press fired | medium (۱۵ms) |
| Threshold reached هنگام swipe | light (۸ms) |
| Undo | light |
| Drag pickup | medium |
| Snap به ستون Kanban | light |

---

## فازبندی پیاده‌سازی (پیشنهادی، قابل تیک‌زدن)

**فاز ۱ — برد سریع (همین حالا)**
1. Double-tap روی TaskItem → باز کردن جزئیات
2. Double-tap روی تَب فعال در BottomTabBar → scroll-to-top
3. Two-finger swipe → Undo/Redo (هوک سراسری)
4. Full-swipe (>60%) → اجرای آنی + Undo toast
5. Long-press روی چک‌باکس → multi-select mode

**فاز ۲ — نوت‌ها و عادت‌ها**
6. Swipe روی نوت‌ها (Pin/Archive) + double-tap edit
7. Double-tap روی روز عادت = +۱، long-press = یادداشت

**فاز ۳ — تقویم و پومودورو**
8. Pinch zoom در Day/Week
9. Double-tap slot → ساخت سریع
10. Pomodoro double-tap/long-press/swipe

**فاز ۴ — Kanban و micro-polish**
11. Swipe بین ستون‌های Kanban در موبایل
12. Long-press روی تَب‌های ناوبری → میان‌بُر
13. هماهنگ‌سازی کامل Haptic Map

---

## نکات فنی (برای توسعه)

- یک هوک واحد `useGestures` می‌سازیم که tap/double-tap/long-press/swipe را با state-machine مدیریت کند و از تداخل tap با double-tap (delay 250ms) جلوگیری کند.
- Double-tap فقط روی موبایل فعال شود (`useIsMobile`).
- Two-finger gestures با `e.touches.length === 2` تشخیص داده شوند و در `window` listener جداگانه.
- Multi-select با Context سراسری `SelectionContext` (آرایه‌ی idهای انتخاب‌شده + اکشن‌بار شناور پایین).
- Undo از `undoStack` موجود استفاده کند.
- همه‌ی ژست‌های جدید با feature-flag در Settings قابل خاموش شدن باشند: `gestures.doubleTap`, `gestures.fullSwipe`, `gestures.twoFinger`.

## بعد از تأیید

به من بگو **کدام فاز(ها)** را اول بسازم — یا اگر همه‌ی فاز ۱ سبز است، مستقیم شروع می‌کنم.
