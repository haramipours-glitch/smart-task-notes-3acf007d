import { useEffect, useState } from "react";
import { Copy, RefreshCw, Smartphone, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const FUNCTION_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/widget-data`;

export default function WidgetTokenCard() {
  const { user } = useAuth();
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("widget_tokens")
        .select("token")
        .eq("user_id", user.id)
        .maybeSingle();
      setToken(data?.token ?? "");
      setLoading(false);
    })();
  }, [user]);

  const ensureToken = async () => {
    if (!user) return;
    setWorking(true);
    const { data, error } = await supabase
      .from("widget_tokens")
      .insert({ user_id: user.id })
      .select("token")
      .single();
    setWorking(false);
    if (error) {
      toast.error("خطا در ایجاد توکن");
      return;
    }
    setToken(data.token);
    toast.success("توکن ساخته شد");
  };

  const regenerate = async () => {
    if (!user) return;
    setWorking(true);
    // Delete and recreate (token has DEFAULT random value)
    await supabase.from("widget_tokens").delete().eq("user_id", user.id);
    const { data, error } = await supabase
      .from("widget_tokens")
      .insert({ user_id: user.id })
      .select("token")
      .single();
    setWorking(false);
    if (error) {
      toast.error("خطا در بازسازی");
      return;
    }
    setToken(data.token);
    toast.success("توکن جدید ساخته شد");
  };

  const fullUrl = token ? `${FUNCTION_BASE}?token=${token}` : "";

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} کپی شد`);
  };

  if (loading) return null;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">ویجت صفحه اصلی اندروید (KWGT)</h2>
          <p className="text-xs text-muted-foreground mt-1">
            با اپ رایگان <strong>KWGT</strong> از پلی استور می‌توانی تسک‌های امروز،
            عادت‌ها، Pomodoro و آخرین حال‌وهوا را روی صفحه اصلی گوشی‌ات نشان بدهی.
          </p>
        </div>
      </div>

      {!token ? (
        <Button onClick={ensureToken} disabled={working} className="w-full">
          {working ? "در حال ساخت..." : "فعال‌سازی ویجت و ساخت لینک"}
        </Button>
      ) : (
        <>
          <div className="space-y-2">
            <Label className="text-xs">لینک داده ویجت (URL)</Label>
            <div className="flex gap-2">
              <Input value={fullUrl} readOnly className="font-mono text-[10px]" />
              <Button size="icon" variant="outline" onClick={() => copy(fullUrl, "لینک")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              این لینک شخصی و مخفی است — با کسی به اشتراک نگذار.
            </p>
          </div>

          <details className="rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-medium">آموزش گام‌به‌گام KWGT</summary>
            <ol className="mt-3 space-y-2 list-decimal list-inside text-xs leading-6">
              <li>اپ <strong>KWGT Kustom Widget Maker</strong> را از Play Store نصب کن (رایگان).</li>
              <li>روی صفحه اصلی گوشی، یک ویجت <strong>KWGT</strong> اضافه کن (اندازه دلخواه).</li>
              <li>روی ویجت بزن تا ادیتور باز شود → دکمه <strong>+</strong> → <strong>Globals</strong> یا <strong>Items → Text</strong>.</li>
              <li>یک <strong>Global → Text</strong> جدید بساز و این فرمول را داخلش بنویس:
                <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto">$wg("{fullUrl}", json, "tasks/next_title")$</pre>
              </li>
              <li>برای داده‌های دیگر این مسیرها را استفاده کن:
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li><code>tasks/pending</code> — تعداد تسک‌های مانده</li>
                  <li><code>tasks/done</code> — تعداد تسک‌های انجام‌شده امروز</li>
                  <li><code>tasks/next_title</code> — عنوان تسک بعدی</li>
                  <li><code>habits/done</code> و <code>habits/total</code></li>
                  <li><code>habits/percent</code> — درصد عادت‌های امروز</li>
                  <li><code>checkin/mood</code>، <code>checkin/energy</code>، <code>checkin/focus</code></li>
                  <li><code>pomodoro/completed_today</code>، <code>pomodoro/focus_minutes</code></li>
                  <li><code>tasks/list/0/title</code> تا <code>tasks/list/4/title</code> — لیست ۵ تسک</li>
                </ul>
              </li>
              <li>در تنظیمات ویجت KWGT، <strong>Refresh interval</strong> را روی ۱۵ یا ۳۰ دقیقه بگذار.</li>
            </ol>
            <p className="mt-3 text-[11px] text-muted-foreground">
              تابع <code>$wg()$</code> در KWGT Pro کامل کار می‌کند. در نسخه رایگان از <code>$wget()$</code> استفاده کن:
              <code className="block mt-1">$wget("{fullUrl}")$</code>
              سپس با <code>$tc(reg, ..., "...")$</code> یا <code>$json()$</code> داده‌ها را پارس کن.
            </p>
          </details>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(fullUrl, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
              تست لینک
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={regenerate}
              disabled={working}
            >
              <RefreshCw className="h-3.5 w-3.5 ml-1" />
              {working ? "..." : "بازسازی توکن"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
