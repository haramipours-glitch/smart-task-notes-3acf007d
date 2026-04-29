# برنامه‌ی بهبودها

## ۱. جابجایی موقعیت تسک‌ها (بالا/پایین بردن یک تسک)

**وضعیت فعلی:** dnd-kit با PointerSensor و فاصله‌ی ۵px فعال است و یک GripVertical برای drag وجود دارد، اما روی موبایل (viewport کنونی ۶۲۰px) drag-handle خیلی کوچک (۳.۵×۳.۵) و touch-action نادرست باعث می‌شود اسکرول اولویت بگیرد.

**تغییرات در `src/pages/TasksView.tsx` و `TaskDnDHelpers.tsx`:**
- اضافه کردن `TouchSensor` با `delay: 250ms, tolerance: 8` در کنار `PointerSensor` تا long-press روی موبایل drag را شروع کند.
- بزرگ‌تر کردن دستگیره (h-7 w-7) و گذاشتن `touch-none` و یک پس‌زمینه‌ی نیمه‌شفاف برای دیده‌شدن.
- اضافه کردن دو دکمه‌ی فلش ↑ ↓ کنار GripVertical (مخصوصاً برای کاربری که نمی‌تواند drag کند) که موقعیت تسک را بین خواهرها/برادرها در allTasks جابجا و در DB با `position` ذخیره می‌کند.
- مرتب‌سازی پیش‌فرض زمانی که کاربر دستی reorder می‌کند: اگر `sort_primary` کاربر `created`/`due`/`priority` بود، یک پیام نشان دهیم که «برای جابجایی دستی، فیلتر مرتب‌سازی را خاموش کنید» — یا گزینه‌ی `manual (position)` را به sort اضافه کنیم و آن را پیش‌فرض جدید قرار دهیم.

## ۲. نمایش درست `**bold**` و سایر نشانه‌های Markdown داخل متن

**علت فعلی:** در تب «نمایش/ویرایش» نوت از TipTap (RichEditor) استفاده می‌شود اما خروجی Markdown فقط در ذخیره‌سازی محاسبه می‌شود. زمانی که ابتدا متن خام `**word**` به ادیتور وارد شود، `markdownToHtml` فقط در `EditorContent` اولیه اعمال می‌شود؛ هنگام تایپ مستقیم `**` در ادیتور، StarterKit به‌طور خودکار آن را به bold تبدیل نمی‌کند چون `Markdown` extension فعال نیست.

**تغییرات:**
- اضافه کردن extension `tiptap-markdown` (یا فعال‌سازی `Typography` و یک input rule ساده) به `RichEditor.tsx` تا تایپ `**bold**`، `*italic*`، `# H1`، ``` `code` ```، `- list` به‌صورت زنده تبدیل شوند.
- در تب Preview / پیش‌نمایش، `ReactMarkdown` با `remarkGfm` صحیح است؛ افزودن `rehype-raw` تا تگ‌های inline HTML (مثل `<u>`) هم رندر شوند.
- اطمینان از این‌که `htmlToMarkdown` (turndown) خروجی `**` تولید می‌کند برای bold (پیش‌فرض درست است؛ تست با یک نمونه).

## ۳. حذف کادر دور نوت در نوت‌ها و داخل تسک

**در `NoteEditorTabs.tsx`:**
- حذف `border rounded-lg p-5 bg-card/40` از تب‌های `markdown` و `preview`، استفاده از `p-0` و `border-0`.
- در `RichEditor.tsx` حذف `border rounded-lg` بیرونی، استفاده از padding صفر و عرض کامل (`w-full`).

**در `NotesView.tsx` و `TaskDetail.tsx`:**
- پدینگ ظرف بیرونی نوت به `px-0` کاهش پیدا می‌کند تا متن از لبه تا لبه‌ی صفحه باشد. روی دسکتاپ یک `max-w-screen-lg` اختیاری.

## ۴. اولویت پیشرفته‌تر در تسک‌ها

**فعلی:** فقط ۴ سطح ساده (none/low/medium/high) با badge.

**تغییرات در `src/lib/priority.ts` و `TaskDetail.tsx` / `NewTaskView.tsx`:**
- اضافه کردن سطح **Urgent (P0)** با رنگ قرمز پررنگ و آیکون 🔥 (به‌عنوان بالاترین).
- نمایش حلقه‌ی رنگی (priority dot) جلوی عنوان تسک و رنگ نوار سمت چپ کارت متناسب با اولویت (الان `borderClass` هست، فقط روشن‌تر شود).
- در picker اولویت: اضافه کردن **deadline-aware hint**: اگر `due_date` گذشته یا کمتر از ۲ ساعت مانده، یک نشانه‌ی «پیشنهاد: Urgent» نشان داده شود.
- Sort secondary پیش‌فرض را به `priority desc` تغییر دهیم.
- اختیاری: اضافه کردن میانبر کیبورد `1/2/3/4/5` در صفحه‌ی جزئیات تسک برای ست‌کردن سریع اولویت.

## ۵. دکمه‌ی «تمام صفحه» تسک جدید: همه‌ی امکانات (نوت، فایل، زیرتسک، چک‌باکس و …)

**فعلی:** `NewTaskView.tsx` فقط فیلدهای پایه دارد؛ امکانات کامل در `TaskDetail.tsx` هستند.

**رویکرد:**
- بعد از اولین `setTitle` و blur (یا با debounce 800ms) **به‌صورت خودکار draft تسک در DB ساخته شود** (`auto-save draft`) و سپس کامپوننت‌های زیر مستقیماً در همان صفحه render شوند:
  - `<TaskSubtasksInline taskId={draftId} />` — زیرتسک‌ها با چک‌باکس
  - `<TaskStepLists taskId={draftId} />` — لیست مراحل (شماره/چک/نقطه/فلش) با drag
  - `<TaskAttachments taskId={draftId} />` — آپلود فایل
  - بخش «نوت‌های این تسک» شبیه `TaskDetail` به همراه `NoteEditorTabs`
  - `<RecurrenceEditor>` و Time Block (همان قبلی)
- دکمه‌ی «ذخیره» در حقیقت تنها از حالت draft خارج می‌کند (no-op اگر همه‌چیز قبلاً ذخیره شده) و navigate می‌زند.
- در صورت ترک صفحه بدون عنوان، draft پاک شود (cleanup در unmount با چک خالی‌بودن title).

این تغییر `NewTaskView` را عملاً به نسخه‌ی صفحه‌ای از `TaskDetail` تبدیل می‌کند بدون نیاز به دو بار ذخیره. در نهایت می‌توانیم همان `<TaskDetail mode="page">` را با task draft مقداردهی کنیم تا یک منبع حقیقت داشته باشیم.

## بخش فنی (خلاصه)

| فایل | تغییر کلیدی |
|---|---|
| `src/pages/TasksView.tsx` | TouchSensor + دکمه‌های ↑↓ reorder + sort `manual` |
| `src/components/TaskDnDHelpers.tsx` | sensor جدید، touch-none |
| `src/components/RichEditor.tsx` | حذف border، اضافه‌کردن tiptap-markdown extension |
| `src/components/NoteEditorTabs.tsx` | حذف کادر `bg-card/40` و `border` |
| `src/pages/NotesView.tsx`, `TaskDetail.tsx` | پدینگ صفر برای فول‌ویدث نوت |
| `src/lib/priority.ts` | اضافه‌کردن `urgent` |
| `src/pages/NewTaskView.tsx` | auto-create draft + embed Subtasks/Steps/Attachments/Notes |

پس از تأیید، همه‌ی موارد در یک پاس ساخته می‌شود.