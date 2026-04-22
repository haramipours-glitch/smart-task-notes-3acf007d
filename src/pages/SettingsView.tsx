import { useEffect, useState, useMemo } from "react";
import { Sparkles, Save, Trash2, Languages, Download, ShieldOff, Settings2, Bell, Moon, Palette } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getAILanguage, setAILanguage, type AILanguage } from "@/lib/ai";
import {
  loadAISettings, saveAISettings, defaultConfig,
  PROVIDER_INFO, OPERATIONS, MODEL_DESCRIPTIONS,
  type Provider, type ProviderConfig, type AIPerOpSettings,
} from "@/lib/aiSettings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { loadSettings, saveSettings, ensureNotificationPermission, type UserSettings } from "@/lib/reminders";

function ProviderEditor({ value, onChange }: { value: ProviderConfig; onChange: (c: ProviderConfig) => void }) {
  const info = PROVIDER_INFO[value.provider];
  const onProvider = (p: Provider) => {
    const i = PROVIDER_INFO[p];
    onChange({ provider: p, apiKey: value.apiKey, model: i.defaultModel, baseUrl: i.baseUrl });
  };
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">سرویس</Label>
        <Select value={value.provider} onValueChange={(v) => onProvider(v as Provider)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PROVIDER_INFO) as Provider[]).map((p) => (
              <SelectItem key={p} value={p}>{PROVIDER_INFO[p].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">مدل</Label>
        {info.models.length > 0 ? (
          <Select value={value.model} onValueChange={(v) => onChange({ ...value, model: v })}>
            <SelectTrigger><SelectValue placeholder={info.defaultModel} /></SelectTrigger>
            <SelectContent>
              {info.models.map((m) => (
                <SelectItem key={m} value={m}>
                  <div className="flex flex-col items-start">
                    <span className="font-mono text-xs">{m}</span>
                    {MODEL_DESCRIPTIONS[m] && (
                      <span className="text-[10px] text-muted-foreground">{MODEL_DESCRIPTIONS[m]}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} placeholder="نام مدل" />
        )}
      </div>
      {value.provider !== "lovable" && (
        <div className="space-y-1.5">
          <Label className="text-xs">API Key</Label>
          <Input type="password" value={value.apiKey} placeholder="sk-..." onChange={(e) => onChange({ ...value, apiKey: e.target.value })} autoComplete="off" />
        </div>
      )}
      {value.provider === "custom" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Base URL</Label>
          <Input value={value.baseUrl || ""} placeholder="https://your-endpoint/v1" onChange={(e) => onChange({ ...value, baseUrl: e.target.value })} />
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">{info.help}</p>
    </div>
  );
}

export default function SettingsView() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AIPerOpSettings>({ default: defaultConfig(), perOp: {} });
  const [lang, setLang] = useState<AILanguage>("fa");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reminders, setReminders] = useState<UserSettings | null>(null);

  useEffect(() => {
    setSettings(loadAISettings());
    setLang(getAILanguage());
    if (user) loadSettings(user.id).then(setReminders);
  }, [user]);

  const updateReminder = async (patch: Partial<UserSettings>) => {
    if (!user || !reminders) return;
    const next = { ...reminders, ...patch };
    setReminders(next);
    try {
      await saveSettings(user.id, patch);
    } catch (e: any) {
      toast.error("ذخیره نشد: " + e.message);
    }
  };

  const enableNotifs = async () => {
    const ok = await ensureNotificationPermission();
    if (ok) {
      await updateReminder({ notifications_enabled: true });
      toast.success("نوتیفیکیشن فعال شد");
    } else {
      toast.error("اجازه نوتیف داده نشد");
    }
  };

  useEffect(() => {
    if (!reminders?.theme) return;
    const root = document.documentElement;
    if (reminders.theme === "dark") root.classList.add("dark");
    else if (reminders.theme === "light") root.classList.remove("dark");
    else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) root.classList.add("dark"); else root.classList.remove("dark");
    }
  }, [reminders?.theme]);

  const grouped = useMemo(() => {
    const m: Record<string, typeof OPERATIONS> = {};
    for (const op of OPERATIONS) (m[op.group] ||= []).push(op);
    return m;
  }, []);

  const onLangChange = (v: AILanguage) => {
    setLang(v);
    setAILanguage(v);
    toast.success("زبان AI ذخیره شد");
  };

  const save = () => {
    saveAISettings(settings);
    toast.success("تنظیمات ذخیره شد");
  };

  const reset = () => {
    const fresh = { default: defaultConfig(), perOp: {} };
    setSettings(fresh);
    saveAISettings(fresh);
    toast.success("بازنشانی شد");
  };

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

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> تنظیمات
        </h1>
        <p className="text-sm text-muted-foreground mt-1">پیکربندی هوش مصنوعی برای هر عملیات به‌صورت جداگانه</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">زبان پاسخ‌های AI</h2>
        </div>
        <Select value={lang} onValueChange={(v) => onLangChange(v as AILanguage)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fa">🇮🇷 فارسی</SelectItem>
            <SelectItem value="en">🇬🇧 English</SelectItem>
            <SelectItem value="auto">🌐 خودکار</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">پیش‌فرض سراسری AI</h2>
        </div>
        <p className="text-xs text-muted-foreground">این provider/model برای هر عملیاتی که override جداگانه نداشته باشد استفاده می‌شود.</p>
        <ProviderEditor value={settings.default} onChange={(c) => setSettings({ ...settings, default: c })} />
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Override برای هر عملیات</h2>
        </div>
        <p className="text-xs text-muted-foreground">برای هر یک از ۱۴ عملیات AI می‌توانی provider+model مستقل تعیین کنی. اگر سوییچ خاموش باشد، پیش‌فرض سراسری استفاده می‌شود.</p>
        <Accordion type="multiple" className="w-full">
          {Object.entries(grouped).map(([group, ops]) => (
            <AccordionItem key={group} value={group}>
              <AccordionTrigger className="text-sm">{group} ({ops.length})</AccordionTrigger>
              <AccordionContent className="space-y-4">
                {ops.map((op) => {
                  const enabled = !!settings.perOp[op.key];
                  const cfg = settings.perOp[op.key] || settings.default;
                  return (
                    <div key={op.key} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{op.label}</div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] text-muted-foreground">override</Label>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(on) => {
                              const next = { ...settings, perOp: { ...settings.perOp } };
                              if (on) next.perOp[op.key] = { ...settings.default };
                              else delete next.perOp[op.key];
                              setSettings(next);
                            }}
                          />
                        </div>
                      </div>
                      {enabled && (
                        <ProviderEditor
                          value={cfg}
                          onChange={(c) => setSettings({ ...settings, perOp: { ...settings.perOp, [op.key]: c } })}
                        />
                      )}
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="flex gap-2 pt-2">
          <Button onClick={save} className="gap-2"><Save className="w-4 h-4" /> ذخیره همه</Button>
          <Button variant="outline" onClick={reset} className="gap-2"><Trash2 className="w-4 h-4" /> بازنشانی</Button>
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
