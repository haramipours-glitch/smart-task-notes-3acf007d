# پلن: اشتراک‌گذاری + تقویت زبان انگلیسی

دو فیچر بزرگ که هرکدام چند مرحله دارد. پایین خلاصهٔ کاربری + بخش فنی.

---

## بخش ۱ — اشتراک‌گذاری Task / Note / Folder

### رفتار کاربر
- روی هر تسک/نوت/فولدر دکمهٔ **Share** اضافه می‌شود (در منوی action sheet موبایل و در صفحهٔ جزئیات).
- کاربر ایمیل شخص مقابل را وارد می‌کند و یکی از سه سطح مجوز را انتخاب می‌کند:
  - **View** — فقط دیدن
  - **Comment/Complete** — می‌تواند تسک را تکمیل/زیرتسک اضافه کند، اما حذف/ویرایش عنوان نه
  - **Edit** — دسترسی کامل به‌جز حذف اصلی و تغییر مالک
- اگر طرف مقابل هنوز در سیستم نیست، یک **invite** ساخته می‌شود و پس از ثبت‌نام با همان ایمیل، خودکار به آیتم‌های share شده وصل می‌شود.
- در سایدبار بخش جدید **"Shared with me"** اضافه می‌شود که آیتم‌های دریافتی را گروه‌بندی می‌کند (Tasks / Notes / Folders).
- در سطر هر آیتم share شده، آیکن کوچک 👥 + آواتار افراد نمایش داده می‌شود.
- صاحب آیتم می‌تواند هر زمان مجوز را تغییر دهد یا اشتراک را لغو کند (از همان sheet).
- برای فولدر: اشتراک به‌صورت **cascading** است — همهٔ تسک/نوت‌های داخل فولدر هم share می‌شوند.

### بخش فنی
- جدول جدید `shares`:
  - `id`, `owner_id`, `recipient_id (nullable)`, `recipient_email`, `resource_type` (`task|note|folder`), `resource_id`, `permission` (`view|comment|edit`), `accepted_at`, `created_at`.
- RLS: مالک کنترل کامل؛ گیرنده فقط share های خودش را می‌بیند.
- توسعهٔ RLS روی `tasks`, `notes`, `folders` با security-definer function `has_share_access(resource_id, resource_type, level)` تا گیرنده‌ها بتوانند براساس مجوزشان CRUD کنند.
- برای فولدر: تابع helper بازگشتی که تسک/نوت‌های داخل فولدرهای shared را هم پوشش دهد.
- وقتی کاربر جدید با ایمیل مطابق ثبت‌نام کرد، در trigger `handle_new_user` رکوردهای `shares` با `recipient_email` ست می‌شوند روی `recipient_id`.
- UI:
  - `src/components/ShareDialog.tsx` (دیالوگ مدیریت اشتراک + لیست افراد + انتخاب permission)
  - دکمهٔ Share در `TaskActionSheet`, `SidebarItemSheet`, `NotesView` toolbar, `TaskDetail`
  - بخش "Shared with me" در `AppSidebar`
  - فچ shared items در queryهای موجود tasks/notes/folders با union

---

## بخش ۲ — تقویت کامل English (i18n)

### رفتار کاربر
- LanguageSwitcher موجود است ولی فقط بخش کوچکی از UI ترجمه شده. همه‌جا به فارسی hardcoded است.
- بعد از این کار، با تغییر زبان به English، کل برنامه (تب‌بار، sidebar، toolbarها، dialogها، toastها، action sheetها، فرم‌ها، صفحات Settings/Insights/Pomodoro/Habits/Goals/...) به انگلیسی روان تبدیل می‌شود.
- جهت متن (RTL/LTR) خودکار با زبان عوض می‌شود.

### بخش فنی
- گسترش `src/i18n/locales/en.ts` و `fa.ts` با ~۲۵۰+ کلید جدید زیر namespaceهای: `tasks`, `notes`, `folders`, `tags`, `share`, `pomodoro`, `habits`, `goals`, `calendar`, `insights`, `review`, `checkin`, `cbt`, `settings`, `actions`, `gestures`, `sidebar`, `toasts`, `dialogs`, `placeholders`, `errors`.
- جایگزینی stringهای فارسی hardcoded در فایل‌های پرکاربرد با `t("namespace.key")`:
  - `BottomTabBar`, `AppSidebar`, `TaskActionSheet`, `SidebarItemSheet`, `RecentlyDeletedSheet`, `QuickCaptureDialog`, `MoveToDialog`, `KeyboardShortcutsDialog`, `TasksView`, `NotesView`, `KanbanView`, `HomeView`, `PomodoroTimer`, `HabitsView`, `GoalsView`, `CalendarView`, `SettingsView`, `InsightsView`, دیالوگ‌های confirm.
- تنظیم `dir` در `<html>` خودکار براساس `i18n.language` در `i18n/index.ts` (اگر هنوز نیست).
- همهٔ `toast.success/error` ها از طریق helper `tToast(key)` که زبان فعلی را می‌خواند.

---

## ترتیب پیاده‌سازی پیشنهادی
1. اول **بخش ۲ (i18n)** — چون پایه‌ای است و در stringهای دیالوگ Share هم استفاده می‌شود.
2. سپس **بخش ۱ (Sharing)** — مهاجرت دیتابیس، helper function، RLS، UI، sidebar section.

---

**سوال قبل از شروع:** چون این دو فیچر بزرگ‌اند، آیا می‌خواهی **هر دو را در همین مرحله** کامل کنم، یا اول **فقط i18n** و در پیام بعدی Sharing؟ همچنین برای Sharing، **سطوح مجوز سه‌گانه (View/Comment/Edit)** درست است یا فقط **View/Edit** کافی است؟
