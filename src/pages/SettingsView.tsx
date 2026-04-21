import { useEffect, useState } from "react";
import { Sparkles, Key, Save, Trash2, Info, Languages, Download, ShieldOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getAILanguage, setAILanguage, type AILanguage } from "@/lib/ai";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Provider = "lovable" | "openai" | "anthropic" | "gemini" | "openrouter" | "custom";

type AISettings = {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string;
};

const STORAGE_KEY = "ai_settings_v1";
const DEFAULTS: AISettings = { provider: "lovable", apiKey: "", model: "", baseUrl: "" };

const PROVIDER_INFO: Record<Provider, { label: string; defaultModel: string; baseUrl: string; help: string }> = {
  lovable:    { label: "Lovable AI (پیش‌فرض)", defaultModel: "google/gemini-2.5-flash", baseUrl: "", help: "بدون نیاز به کلید — همین الان کار می‌کند." },
  openai:     { label: "OpenAI",                defaultModel: "gpt-4o-mini",            baseUrl: "https://api.openai.com/v1", help: "از platform.openai.com کلید بگیرید." },
  anthropic:  { label: "Anthropic Claude",      defaultModel: "claude-3-5-sonnet-latest", baseUrl: "https://api.anthropic.com/v1", help: "از console.anthropic.com کلید بگیرید." },
  gemini:     { label: "Google Gemini",         defaultModel: "gemini-1.5-flash",       baseUrl: "https://generativelanguage.googleapis.com/v1beta", help: "از aistudio.google.com کلید بگیرید." },
  openrouter: { label: "OpenRouter",            defaultModel: "openai/gpt-4o-mini",     baseUrl: "https://openrouter.ai/api/v1", help: "از openrouter.ai کلید بگیرید." },
  custom:     { label: "OpenAI-compatible سفارشی", defaultModel: "",                    baseUrl: "", help: "هر سرویس سازگار با OpenAI API." },
};

export default function SettingsView() {
  const { user } = useAuth();
  const [s, setS] = useState<AISettings>(DEFAULTS);
  const [lang, setLang] = useState<AILanguage>("fa");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function exportAll() {
    if (!user) return;
    setExporting(true);
    try {
      const tables = [
        "profiles", "tasks", "subtasks", "folders", "tags", "task_tags", "notes", "note_tags",
        "habits", "habit_logs", "goals", "pomodoro_sessions", "folder_columns",
        "daily_checkins", "thought_records", "abc_records", "predictions",
        "user_values", "chronotype", "safe_contacts", "crisis_events",
        "assessment_responses", "assessment_results", "mh_profile",
      ];
      const out: Record<string, any> = { exported_at: new Date().toISOString(), user_id: user.id };
      for (const t of tables) {
        const { data } = await supabase.from(t as any).select("*");
        out[t] = data || [];
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taskflow-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("صادرات کامل شد");
    } catch (e: any) {
      toast.error(e.message || "خطا در صادرات");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAll() {
    if (!user) return;
    setDeleting(true);
    try {
      const tables = [
        "task_tags", "note_tags", "subtasks", "habit_logs", "folder_columns",
        "tasks", "notes", "habits", "goals", "folders", "tags", "pomodoro_sessions",
        "daily_checkins", "thought_records", "abc_records", "predictions",
        "user_values", "chronotype", "safe_contacts", "crisis_events",
        "assessment_responses", "assessment_results", "mh_profile",
      ];
      for (const t of tables) {
        await supabase.from(t as any).delete().eq("user_id", user.id);
      }
      await supabase.auth.signOut();
      localStorage.clear();
      toast.success("همه داده‌ها حذف شد");
      window.location.href = "/auth";
    } catch (e: any) {
      toast.error(e.message || "خطا در حذف");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
    setLang(getAILanguage());
  }, []);

  const onLangChange = (v: AILanguage) => {
    setLang(v);
    setAILanguage(v);
    toast.success("زبان AI ذخیره شد");
  };

  const onProvider = (p: Provider) => {
    const info = PROVIDER_INFO[p];
    setS((prev) => ({
      ...prev,
      provider: p,
      model: info.defaultModel,
      baseUrl: info.baseUrl,
    }));
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    toast.success("تنظیمات ذخیره شد");
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setS(DEFAULTS);
    toast.success("تنظیمات پاک شد — Lovable AI پیش‌فرض فعال است");
  };

  const info = PROVIDER_INFO[s.provider];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> تنظیمات
        </h1>
        <p className="text-sm text-muted-foreground mt-1">پیکربندی ارائه‌دهنده هوش مصنوعی</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">زبان پاسخ‌های هوش مصنوعی</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          زبان پیش‌فرض همه پاسخ‌های AI (تولید نوت، subtask، چت، بهبود متن و...). در هر پنل AI می‌توانی موقت override کنی.
        </p>
        <Select value={lang} onValueChange={(v) => onLangChange(v as AILanguage)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fa">🇮🇷 فارسی</SelectItem>
            <SelectItem value="en">🇬🇧 English</SelectItem>
            <SelectItem value="auto">🌐 خودکار (تشخیص از ورودی)</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">ارائه‌دهنده AI</h2>
        </div>

        <div className="space-y-2">
          <Label>سرویس</Label>
          <Select value={s.provider} onValueChange={(v) => onProvider(v as Provider)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PROVIDER_INFO) as Provider[]).map((p) => (
                <SelectItem key={p} value={p}>{PROVIDER_INFO[p].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="text-xs">{info.help}</AlertDescription>
        </Alert>

        {s.provider !== "lovable" && (
          <>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={s.apiKey}
                onChange={(e) => setS({ ...s, apiKey: e.target.value })}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                کلید فقط روی همین مرورگر ذخیره می‌شود (localStorage). برای استفاده عمومی توصیه می‌شود از Lovable AI استفاده کنید.
              </p>
            </div>

            <div className="space-y-2">
              <Label>مدل</Label>
              <Input
                placeholder={info.defaultModel}
                value={s.model}
                onChange={(e) => setS({ ...s, model: e.target.value })}
              />
            </div>

            {s.provider === "custom" && (
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  placeholder="https://your-endpoint/v1"
                  value={s.baseUrl}
                  onChange={(e) => setS({ ...s, baseUrl: e.target.value })}
                />
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={save} className="gap-2">
            <Save className="w-4 h-4" /> ذخیره
          </Button>
          <Button variant="outline" onClick={clear} className="gap-2">
            <Trash2 className="w-4 h-4" /> بازنشانی
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">داده‌های تو (Right to Export & Delete)</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-6">
          همه داده‌هایت — تسک‌ها، یادداشت‌ها، چک‌این‌ها، Thought Records، تست‌ها، پیش‌بینی‌ها و... — متعلق به توست. می‌توانی هر زمان آن‌ها را به فایل JSON صادر کنی یا کامل حذف کنی.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={exportAll} disabled={exporting} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> {exporting ? "در حال صادرات..." : "صادرات کامل (JSON)"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <ShieldOff className="w-4 h-4" /> حذف کامل حساب
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>حذف کامل و بازگشت‌ناپذیر</AlertDialogTitle>
                <AlertDialogDescription>
                  همه داده‌هایت برای همیشه پاک می‌شود و از حساب خارج می‌شوی. این عمل قابل بازگشت نیست. پیشنهاد می‌شود ابتدا یک خروجی JSON بگیری.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>انصراف</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAll} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                  {deleting ? "در حال حذف..." : "بله، همه را حذف کن"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      <Card className="p-5 space-y-2">
        <h2 className="font-semibold">درباره</h2>
        <p className="text-sm text-muted-foreground">
          به‌طور پیش‌فرض اپلیکیشن از <strong>Lovable AI</strong> استفاده می‌کند که نیازی به کلید ندارد.
          اگر می‌خواهید از سرویس دیگری استفاده کنید، کلید خود را وارد کنید — این کلید فقط در مرورگر خود شما ذخیره می‌شود و به سرور ارسال نمی‌شود مگر هنگام فراخوانی AI.
        </p>
      </Card>
    </div>
  );
}
