# Plan: Stronger English + Per-Section AI Mapping

## وضعیت فعلی
- فقط ۸ فایل از کل اپ از `useTranslation` استفاده می‌کنند؛ بقیهٔ صفحات (Tasks, Notes, Pomodoro, Breathing, Calendar, Mind, Socratic, ABC, Habits, Goals, Settings, TaskDetail …) متن فارسی **هاردکد** دارند. به همین خاطر وقتی زبان روی English گذاشته می‌شود، فقط چند گوشه ترجمه می‌شود.
- در `aiSettings.ts` لیست عملیات (`OPERATIONS`) هست ولی **برچسب‌ها فقط فارسی‌اند**، توضیح/پیشنهاد مدل برای هر بخش وجود ندارد، و کاربر نمی‌داند برای هر کار کدام مدل بهتر است.

## ۱) تقویت زبان انگلیسی (i18n)

### الف) گسترش دیکشنری ترجمه
به `src/i18n/locales/fa.ts` و `en.ts` کلیدهای جدید اضافه می‌شود برای پوشش این بخش‌ها:
- `tasks.*` (افزودن، فیلترها، اولویت‌ها، تکرار، subtask، attachment، notes داخل تسک، تاریخ سررسید، time block)
- `notes.*` (ادیتور، tabs، AI actions: summarize/improve/generate, markdown/preview)
- `pomodoro.*` (focus/break/long-break, ambient sounds names, meditation, sleep frequencies, controls)
- `breathing.*` (نام تکنیک‌ها: Box, 4-7-8, Coherent, Wim Hof…، فاز inhale/hold/exhale، دکمه‌ها)
- `calendar.*` (روز/هفته/ماه/agenda، Google sync، هولیدی)
- `mind.*` , `socratic.*`, `abc.*`, `cbt.*`, `checkin.*`, `worry.*`, `cycle.*`, `aboutMe.*`, `selfKnowledge.*`, `assessments.*`
- `habits.*`, `goals.*`, `weeklyReview.*`
- `home.*` (greeting، quote، hourly story، widgets)
- `settings.*` کامل (AI per-op، Google Calendar، notifications، haptics، theme، update prompt)
- `ai.*` (نام عملیات‌ها به انگلیسی + توضیح هر عملیات + نام مدل‌ها)
- `share.*`, `folders.*`, `tags.*`, `command.*`, `errors.*`, `toasts.*`

### ب) اتصال صفحات به i18n
صفحات/کامپوننت‌های زیر از `useTranslation` استفاده می‌کنند و تمام متن‌های فارسی هاردکد جایگزین می‌شوند:
- Pages: `HomeView`, `TasksView`, `NotesView`, `PomodoroView`, `BreathingView`, `CalendarView`, `MindView`, `SocraticView`, `ABCView`, `CheckinView`, `WorryView`, `CycleView`, `HabitsView`, `ValuesGoalsView`, `SelfKnowledgeView`, `AboutMeView`, `ThoughtRecordsView`, `SettingsView`, `NewTaskView`, `NewNoteView`, `TaskDetailView`, `KanbanView`, `SharedWithMeView`, `AssessmentRunner/Result/Screener`.
- Components: `TaskDetail`, `TaskAIPanel`, `AIPanel`, `QuickAddTask`, `QuickCaptureDialog`, `PomodoroTimer`, `CommandPalette`, `AppSidebar`, `BottomTabBar`, `Onboarding`, `ShareDialog`, `RecurrenceEditor`, `DueDatePicker`, `RecentlyDeletedSheet`, `InstallPrompt`, `OfflineIndicator`, `KeyboardShortcutsDialog`, calendar/* components, gestures dialogs.

### ج) چیزهای جانبی برای انگلیسی قوی
- اعداد فارسی فقط زمانی نمایش داده شوند که `i18n.language === "fa"` (در `persianDigits.ts` یک helper شرطی).
- تاریخ‌ها در حالت EN با میلادی + locale `en-US` فرمت شوند (jalali فقط در FA).
- جهت متن: روی `<html>` همان کاری که الان می‌شود؛ علاوه‌بر آن کلاس‌های `text-end`/`ms-/me-` مرور شوند تا در LTR درست بنشینند (چند مورد `text-right` هاردکد در `AIPanel` اصلاح شود).
- placeholder ها، toast ها، و پیام‌های خطای edge function (در صورت لزوم با `language` که از قبل ارسال می‌شود).
- Switcher زبان در Settings بدون reload عمل کند (الان می‌کند، فقط مطمئن شویم).

## ۲) نقشهٔ هوش مصنوعی برای هر بخش

### الف) پیشنهاد پیش‌فرض هوشمند (Recommended model per operation)
به `aiSettings.ts` اضافه می‌شود:
```ts
OP_RECOMMENDED: Record<AIOperation, { provider, model, why }>
```
نگاشت پیشنهادی:

| بخش / عملیات | مدل پیشنهادی | چرا |
|---|---|---|
| `parse_task` (تجزیه زبان طبیعی) | `google/gemini-3-flash-preview` | سریع، ارزان، استخراج ساختارمند خوب |
| `breakdown` / `task_subtasks` | `openai/gpt-5-mini` | استدلال مرحله‌ای بهتر |
| `task_metadata_suggest` | `google/gemini-2.5-flash-lite` | کار سبک، latency پایین |
| `task_chat` | `google/gemini-3-flash-preview` | متعادل |
| `folder_chat` (پروژه) | `google/gemini-2.5-pro` | context طولانی |
| `generate_note` | `openai/gpt-5` | کیفیت نوشتاری بالا |
| `summarize_note` | `google/gemini-2.5-flash` | خلاصه‌سازی سریع |
| `improve_note` / `inline_edit` | `openai/gpt-5-mini` | ویرایش طبیعی |
| `suggest` (پیشنهاد موضوعی) | `google/gemini-3-flash-preview` | متنوع، سریع |
| `chat` (چت عمومی) | `openai/gpt-5-mini` | همه‌کاره |
| `socratic` (سلامت ذهن) | `openai/gpt-5` با reasoning=medium | پرسش عمیق |
| `distortion_detect` (CBT) | `openai/gpt-5.2` | reasoning قوی |

این فقط **پیش‌فرض هوشمند** است؛ کاربر می‌تواند override کند.

### ب) UI تنظیمات AI (بازطراحی `SettingsView` بخش AI)
- یک کارت **«AI per Section»** با لیست تمام عملیات‌های `OPERATIONS`، هر سطر:
  - برچسب عملیات (با ترجمه EN/FA)
  - badge **Recommended: provider/model** + توضیح کوتاه «چرا»
  - دکمه «Use recommended»
  - یا انتخاب دستی provider + model + (اختیاری) reasoning effort
- یک toggle **«Apply recommended to all»** که پیش‌فرض را روی همه عملیات‌ها ست می‌کند.
- نمایش وضعیت: کدام بخش روی Lovable است، کدام روی کلید شخصی، و آیا کلید لازم تنظیم شده.
- در همه جای اپ که AI صدا زده می‌شود، اگر perOp ست نباشد، به‌جای `default` global، از `OP_RECOMMENDED` استفاده شود (با fallback به default).

### ج) شفافیت در داخل خود بخش‌ها
کنار هر کنش AI در UI (مثل دکمه‌های «خلاصه»، «بهبود متن»، «Subtaskهای هوشمند»، «چت سقراطی»…) یک نشانه کوچک نمایش داده می‌شود:
> `AI: gemini-3-flash-preview · change`
کلیک روی «change» مستقیماً به همان ردیف در Settings → AI per Section اسکرول می‌کند (با hash مثل `#ai-op-summarize_note`).

### د) به‌روزرسانی برچسب‌ها
`OPERATIONS` به ساختار `{ key, labelFa, labelEn, descFa, descEn, group }` تبدیل می‌شود (یا کلیدهای i18n) تا هم در UI فارسی و هم انگلیسی درست نشان داده شوند.

## فایل‌های تحت تأثیر (تخمینی)
- `src/i18n/locales/fa.ts`, `src/i18n/locales/en.ts` — افزایش حجم زیاد
- `src/lib/aiSettings.ts` — افزودن `OP_RECOMMENDED` + ساختار برچسب دوزبانه
- `src/lib/ai.ts` — `getOpConfig` با fallback به recommended
- `src/lib/persianDigits.ts` — شرطی‌کردن بر اساس زبان
- `src/pages/SettingsView.tsx` — بازطراحی بخش AI
- ~۲۵ صفحه و ~۱۵ کامپوننت برای جایگزینی متن‌های هاردکد با `t(...)`
- یک کامپوننت کوچک جدید: `src/components/AIOpBadge.tsx` (نشان‌دادن مدل کنار اکشن‌ها)

## خارج از scope
- ترجمهٔ محتوای تولیدشده توسط کاربر (تسک/نوت‌های خودش)
- ترجمهٔ خروجی AI (همان `aiLang` فعلی پاسخگو است)
- اضافه‌کردن زبان سوم
