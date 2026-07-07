# ARSHNAZ — آرشناز

اپلیکیشن مدیریت تسک، نوت، عادت و سلامت روان.

## شروع سریع

```bash
npm install --legacy-peer-deps
npm run dev      # http://localhost:8080
npm run build    # dist/
npm run preview  # پیش‌نمایش محصول
```

## متغیرهای محیطی

فایل `.env.example` را کپی کرده و نامش را به `.env` بگذار. مقادیر واقعی را از داشبورد Supabase یا پروژه Lovable بگیر:

```bash
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
```

## انتشار روی arshnaz.life

### 1) GitHub

- در GitHub یک ریپوی خصوصی/عمومی به نام `arshnaz` بساز.
- این دستورات را اجرا کن:

```bash
git remote add origin https://github.com/YOUR_USERNAME/arshnaz.git
git branch -M main
git push -u origin main
```

### 2) Vercel

- در [vercel.com](https://vercel.com) اکانت بساز.
- New Project → Import از GitHub → ریپوی `arshnaz` را انتخاب کن.
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install --legacy-peer-deps`
- Environment Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`
- Deploy کن.

### 3) دامنه اختصاصی

- در تنظیمات Vercel بخش Domains، `arshnaz.life` را اضافه کن.
- رکورد DNS نوع `A` در دامنه ثبت‌شده به آدرس Vercel بده (معمولاً `76.76.21.21`).
- رکورد `www` هم با CNAME به `cname.vercel-dns.com.` بده.

### 4) همگام‌سازی با Lovable

برای اینکه تغییرات Lovable به GitHub منتقل شود، در پروژه Lovable:

- Settings → GitHub Integration → Connect repository
- ریپوی `arshnaz` را انتخاب کن.
- با هر تغییر در Lovable، کد به GitHub پوش می‌شود و Vercel خودکار دوباره deploy می‌کند.

## قابلیت‌های همگام‌سازی (Sync)

- **داده**: از Supabase Realtime استفاده می‌شود. هر کاربر پس از لاگین، داده‌ها را بین دستگاه‌ها همگام می‌بیند.
- **PWA auto-update**: در `vite.config.ts` با `registerType: "autoUpdate"` فعال است.
- **کد**: از طریق GitHub + Lovable Integration و Vercel auto-deploy.
