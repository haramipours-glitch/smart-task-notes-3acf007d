
## هدف
ساده‌سازی تجربه و کاهش بار شناختی با ۵ تغییر اصلی در UX/IA.

## ۱) گروه‌بندی سایدبار به ۴ ناحیه
بازنویسی `src/components/AppSidebar.tsx` با ۴ `SidebarGroup` قابل جمع‌شدن:

- **انجام دادن**: Today, Inbox, Tomorrow, Next7, Calendar, Kanban, Pomodoro
- **رشد**: Goals, Habits, Review, Weekly Review, Insights
- **ذهن**: Check-in, Thoughts, ABC, Socratic, Decisions
- **خودِ من**: AboutMe, Self-knowledge, Settings

گروهی که مسیر فعال در آن است به‌صورت پیش‌فرض باز می‌ماند (`defaultOpen`). Home و Search بالای همه به‌صورت آیتم‌های مستقل.

## ۲) حالت متمرکز در Home
در `src/pages/HomeView.tsx`:
- اضافه کردن toggle «حالت متمرکز / حالت کامل» (ذخیره در `user_settings` یا localStorage با کلید `home_focus_mode`، پیش‌فرض = متمرکز برای کاربران جدید).
- در حالت متمرکز فقط ۳ کارت: **مهم‌ترین کار امروز**، **Check-in سریع**، **Pomodoro**.
- بقیهٔ ویجت‌ها پشت یک دکمهٔ «بیشتر» که `Sheet` (از پایین) را باز می‌کند و همان لیست تنظیمات/ویجت‌های فعلی را نشان می‌دهد.

## ۳) Command/جستجو در BottomTab موبایل
بازنویسی `src/components/BottomTabBar.tsx`:
- به‌جای دو دکمهٔ منوی یکسان، یک نوار با ۳ آیتم: **منو**، **جستجو (Command)**، **خانه**.
- دکمهٔ جستجو همان رویداد `⌘K` فعلی را dispatch می‌کند.
- در `md:hidden` فقط؛ دسکتاپ بدون تغییر.

## ۴) Onboarding سه مرحله‌ای
کامپوننت جدید `src/components/Onboarding.tsx`:
- Dialog/Sheet که فقط در اولین ورود نشان داده می‌شود (پرچم در localStorage: `onboarded_v1`).
- ۳ اسلاید: «اولین تسک بنویس» → «Check-in بزن» → «اولین Pomodoro را شروع کن».
- هر اسلاید یک CTA دارد که کاربر را به مسیر مربوطه می‌برد و پرچم را ست می‌کند.
- mount در `AppLayout.tsx`.

## ۵) Assistant به‌صورت Bottom-Sheet در موبایل
در `src/components/AIPanel.tsx`:
- در `md:` همان `Sheet` راست فعلی.
- در موبایل (`useIsMobile`) از `Drawer` (vaul) با ارتفاع پیش‌فرض `60vh` و قابلیت کشیدن تا full-height استفاده شود.

## فایل‌های تغییر یا ساخته‌شده
- ویرایش: `src/components/AppSidebar.tsx`, `src/pages/HomeView.tsx`, `src/components/BottomTabBar.tsx`, `src/components/AIPanel.tsx`, `src/layouts/AppLayout.tsx`
- ساخت: `src/components/Onboarding.tsx`

## خارج از این پلن
- بدون تغییر مسیرها/Routes، بدون migration دیتابیس، بدون تغییر منطق تسک/پومودورو.
