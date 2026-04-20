import { useEffect, useState } from "react";
import { Sparkles, Key, Save, Trash2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

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
  const [s, setS] = useState<AISettings>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

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
