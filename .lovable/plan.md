# پلن تغییرات

## ۱) نوت‌های داخل تسک (`TaskDetail.tsx`)
نوت‌هایی که داخل یک Task باز می‌شوند فقط RichEditor دارند. سه‌حالته می‌کنیم مثل صفحه‌ی Notes:
- اضافه کردن `Tabs` با سه حالت: **نمایش/ویرایش (Visual)**، **Markdown خام**، **پیش‌نمایش**.
- کامپوننت یکسان با `NotesView` (بازنویسی به صورت یک کامپوننت کوچک قابل‌استفاده‌ی مجدد به نام `NoteEditorTabs` در `src/components/NoteEditorTabs.tsx` تا بین `NotesView` و `TaskDetail` مشترک باشد).

## ۲) عرض کامل نوت‌ها
- `TaskDetail.tsx` در حالت `page`: حذف `max-w-5xl` در صفحه و سهم نوت = تمام عرض. Sheet نوت داخل تسک: `sm:max-w-full`.
- `NotesView.tsx`: حذف `max-w-6xl mx-auto`، استفاده از `w-full px-2 sm:px-4`.
- `prose-note` در `index.css`: حذف هر `max-width` (یا اضافه‌ی `max-w-none`).

## ۳) دکمه‌ی شناور برای نمایش مجدد Toolbar در RichEditor
- توولبار فعلی `sticky top-0` است ولی داخل scroll-container جداست؛ گاهی هنگام اسکرول داخل صفحه‌ی والد محو می‌شود.
- اضافه می‌کنیم: state `toolbarVisible`، یک IntersectionObserver روی sentinel بالای editor. اگر toolbar از view خارج شد، یک FAB کوچک `Floating ⋯` در گوشه‌ی پایین‌چپِ editor نشان داده می‌شود. کلیک = `scrollIntoView` روی toolbar یا توگل یک نسخه‌ی floating mini-toolbar (بولد/ایتالیک/لیست/H2/AI).
- مکان: `src/components/RichEditor.tsx`.

## ۴) Undo/Redo سراسری برای حذف‌ها و ویرایش‌ها
ایجاد یک سیستم سبک:
- `src/lib/undoStack.ts`: stack در حافظه (نه دیتابیس) با ظرفیت ۲۰، API:
  - `pushUndo({ label, undo: async () => void, redo?: async () => void })`
  - `undoLast()`, `redoLast()`
- بعد از هر حذف (task/subtask/note/step/list/folder/tag) قبل از `delete`، snapshot ردیف(ها) را برمی‌داریم؛ سپس `pushUndo` با `undo` که insert مجدد می‌کند.
- یک toast با دکمه‌ی «↶ بازگردانی» (sonner action) بعد از هر حذف.
- میانبر کیبورد: `Ctrl/Cmd+Z` و `Ctrl/Cmd+Shift+Z` در `src/App.tsx` (listener سراسری).
- نقاط ادغام: `TasksView.delTask`, `TaskDetail.askDelNote`, `TaskStepLists.deleteStep/deleteList`, `NotesView.del`, `AppSidebar` folder/tag delete.
- توضیح: متن داخل ادیتورها (RichEditor/AutoTextarea) از undo/redo بومی مرورگر/Tiptap استفاده می‌کند (Tiptap StarterKit شامل History است) — در توولبار دو دکمه‌ی Undo/Redo اضافه می‌کنیم.

## ۵) Time Block به صورت کشویی (Collapsible)
- در `TaskDetail.tsx` بخش Time Block را داخل `Collapsible` با عنوان «⏱ Time Block» قرار می‌دهیم. پیش‌فرض **بسته**؛ باز شدن وقتی `start_at` یا `end_at` یا `estimated_minutes` ست شده.

## ۶) جابجایی مراحل (Steps) بالا/پایین
در `TaskStepLists.tsx`:
- اضافه‌ی `dnd-kit` (`SortableContext` + `useSortable`) برای هر `list`.
- یا ساده‌تر: دو دکمه‌ی `▲` `▼` کنار هر step که `position` را با همسایه‌ی بالا/پایین swap می‌کند و در DB آپدیت می‌کند. (پیشنهاد: هر دو — drag handle + دکمه‌های آپ/داون برای موبایل).
- روش انتخابی: drag handle (GripVertical) + dnd-kit، چون قبلاً در پروژه استفاده می‌شود.

## ۷) Sort اولویت‌بندی پایدار در Task Manager
الان `filters.sort` فقط در state بود و در سشن بعد به `priority` ریست می‌شد.
- ذخیره‌ی کل `filters` در `localStorage` با کلید `task_filters_v1` (در `TasksView.tsx` mount/effect).
- یا بهتر: ذخیره فقط `sort` به‌صورت per-scope: `task_sort_v1` = `{ inbox: "due_asc", today: "priority", ... }`.
- روش انتخابی: ذخیره‌ی per-scope در localStorage و خواندن در init `useState`.

## ۸) حذف کامل ماتریس آیزن‌هاور
- در `TasksView.tsx`: حذف `import EisenhowerMatrix`، حذف هر دو `<Tabs>`، فقط `listView` نمایش داده شود برای حالت غیر-folder. برای حالت folder فقط دو تب: `لیست` و `Kanban`.
- حذف فایل‌ها: `src/components/EisenhowerMatrix.tsx` و `src/lib/eisenhower.ts`.
- حذف ستون `quadrant` از کوئری‌ها (در صورت ارجاع — ستون DB دست‌نخورده می‌ماند، فقط استفاده‌ی فرانت حذف می‌شود).

## ۹) حذف تب Kanban از سایدبار
- در `src/components/AppSidebar.tsx` آیتم `{ url: "/app/kanban", icon: LayoutGrid, label: "Kanban" }` حذف می‌شود.
- در `src/pages/HomeView.tsx` چیپ «کانبان» از quick widgets پیش‌فرض حذف می‌شود.
- در `src/components/CommandPalette.tsx` ورودی Kanban حذف می‌شود.
- مسیر `/app/kanban` در `App.tsx` نگه داشته می‌شود (در صورت bookmark) ولی از سایدبار حذف. (در صورت تمایل کامل، می‌توانیم route را هم حذف کنیم — لطفاً تأیید کن یا همین رفتار را نگه می‌داریم.)
- پلن انتخابی: route را نگه می‌داریم تا Kanban درون فولدر کار کند، فقط لینک سایدبار حذف.

## ۱۰) چیدمان جدید کارت تسک (در `TasksView.tsx` `renderTask`)
الان: `[handle][chevron][checkbox][title]`
هدف:
- ردیف اول کاملاً عریض برای title، چک‌باکس در **گوشه‌ی راست** (RTL = end).
  - چون `dir="rtl"`، در DOM چک‌باکس باید **آخرین** آیتم در flex باشد تا در راست قرار بگیرد.
  - ساختار جدید ردیف ۱: `[chevron][title flex-1][checkbox]`.
- Drag handle می‌رود به یک ردیف کوچک زیر (همراه دکمه‌های FolderInput / Trash) تا روی Title فشاری وارد نشود. عملاً ردیف ۲ فعلی (badges + actions) را نگه می‌داریم و GripVertical را به ابتدای آن منتقل می‌کنیم.
- یعنی: ردیف ۱ = chevron + title + checkbox (راست). ردیف ۲ = grip + badges + dropzone + move + delete.

## نکات فنی (برای توسعه)
- **Tiptap History**: قبلاً در StarterKit فعال است؛ صرفاً دکمه‌های Undo/Redo در toolbar اضافه می‌کنیم با `editor.chain().focus().undo().run()` و `redo()`.
- **dnd-kit برای Steps**: نیاز به `SortableContext items={steps.map(s=>s.id)}` و `useSortable` در آیتم. آپدیت `position` در DB پس از `arrayMove` (مشابه TasksView).
- **NoteEditorTabs مشترک**: props = `{ markdown, onChange, aiLang, onAILang, busy, onAI }`. در `TaskDetail` AI و Lang toggle اختیاری/ساده می‌شود.
- **persisted filters**: `useEffect(() => { localStorage.setItem("task_sort_v1", JSON.stringify({ ...prev, [scope]: filters.sort })); }, [filters.sort, scope])`.
- **Floating toolbar btn**: sentinel `<div ref={sentinelRef} />` بالای editor، Observer با `threshold: 0` → اگر `!isIntersecting` → FAB.
- **Undo for deletes (تسک با زیرتسک)**: snapshot شامل والد + همه‌ی `descendants` + روابط `task_tags`؛ insert مجدد با حفظ `id`ها.

## فایل‌های تأثیرپذیر
- ویرایش: `src/components/TaskDetail.tsx`, `src/components/RichEditor.tsx`, `src/components/TaskStepLists.tsx`, `src/pages/TasksView.tsx`, `src/pages/NotesView.tsx`, `src/components/AppSidebar.tsx`, `src/components/CommandPalette.tsx`, `src/pages/HomeView.tsx`, `src/index.css`, `src/App.tsx`
- ایجاد: `src/components/NoteEditorTabs.tsx`, `src/lib/undoStack.ts`
- حذف: `src/components/EisenhowerMatrix.tsx`, `src/lib/eisenhower.ts`

پس از تأیید، همه‌ی موارد بالا یکجا اعمال می‌شود.
