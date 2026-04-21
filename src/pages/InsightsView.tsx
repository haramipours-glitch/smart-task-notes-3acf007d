import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { callAI } from "@/lib/ai";
import { TrendingUp, Sparkles, CheckCircle2, AlertCircle, Target, Brain, Activity } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { toast } from "sonner";
import { computeCognitiveLoad, loadStatus } from "@/lib/cognitiveLoad";
import { pearson, confidenceLabel } from "@/lib/correlation";

type Stats = {
  completed: number;
  created: number;
  overdue: number;
  byQuadrant: Record<number, number>;
  topPriority: number;
  cogLoad: { load: number; breakdown: any } | null;
  cogStatus: { label: string; tone: string } | null;
  correlations: { label: string; r: number; n: number; conf: string }[];
};

export default function InsightsView() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [advice, setAdvice] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const now = new Date().toISOString();

      const [completed, created, overdue, all] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true })
          .eq("completed", true).gte("completed_at", weekAgo),
        supabase.from("tasks").select("id", { count: "exact", head: true })
          .gte("created_at", weekAgo),
        supabase.from("tasks").select("id", { count: "exact", head: true })
          .eq("completed", false).lt("due_date", now),
        supabase.from("tasks").select("quadrant,priority").eq("completed", false),
      ]);

      const byQuadrant: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      let topPriority = 0;
      (all.data || []).forEach((t: any) => {
        if (t.quadrant) byQuadrant[t.quadrant] = (byQuadrant[t.quadrant] || 0) + 1;
        if (t.priority === "high") topPriority++;
      });

      setStats({
        completed: completed.count || 0,
        created: created.count || 0,
        overdue: overdue.count || 0,
        byQuadrant,
        topPriority,
      });
    })();
  }, [user]);

  const generateAdvice = async () => {
    if (!stats) return;
    setLoadingAi(true);
    try {
      const ctx = `آمار هفته اخیر:\n- تسک تکمیل‌شده: ${stats.completed}\n- تسک ساخته‌شده: ${stats.created}\n- تسک معوقه: ${stats.overdue}\n- توزیع ربع‌های آیزنهاور (فعال): Q1=${stats.byQuadrant[1]}، Q2=${stats.byQuadrant[2]}، Q3=${stats.byQuadrant[3]}، Q4=${stats.byQuadrant[4]}\n- تسک با اولویت بالا: ${stats.topPriority}`;
      const res = await callAI("chat", ctx, "بر اساس این آمار، یک تحلیل کوتاه (۳ تا ۵ بند) از وضعیت کاربر بده و ۲ تا ۳ توصیه عملی برای هفته آینده پیشنهاد کن. به فارسی، خودمانی و انگیزشی.");
      setAdvice(res.text || "");
    } catch (e: any) {
      toast.error(e.message || "خطا در تولید تحلیل");
    } finally {
      setLoadingAi(false);
    }
  };

  if (!stats) return <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>;

  const fa = (n: number) => toPersianDigits(String(n));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">بینش هفتگی</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
          <div className="text-2xl font-bold">{fa(stats.completed)}</div>
          <div className="text-xs text-muted-foreground">تکمیل‌شده</div>
        </Card>
        <Card className="p-4">
          <Sparkles className="w-5 h-5 text-primary mb-2" />
          <div className="text-2xl font-bold">{fa(stats.created)}</div>
          <div className="text-xs text-muted-foreground">ساخته‌شده</div>
        </Card>
        <Card className="p-4">
          <AlertCircle className="w-5 h-5 text-destructive mb-2" />
          <div className="text-2xl font-bold">{fa(stats.overdue)}</div>
          <div className="text-xs text-muted-foreground">معوقه</div>
        </Card>
        <Card className="p-4">
          <Target className="w-5 h-5 text-amber-500 mb-2" />
          <div className="text-2xl font-bold">{fa(stats.topPriority)}</div>
          <div className="text-xs text-muted-foreground">اولویت بالا</div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">توزیع ماتریس آیزنهاور (تسک‌های فعال)</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="font-medium">Q1 — مهم و فوری</div>
            <div className="text-2xl font-bold mt-1">{fa(stats.byQuadrant[1])}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="font-medium">Q2 — مهم، غیرفوری</div>
            <div className="text-2xl font-bold mt-1">{fa(stats.byQuadrant[2])}</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="font-medium">Q3 — فوری، غیرمهم</div>
            <div className="text-2xl font-bold mt-1">{fa(stats.byQuadrant[3])}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="font-medium">Q4 — هیچ‌کدام</div>
            <div className="text-2xl font-bold mt-1">{fa(stats.byQuadrant[4])}</div>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> تحلیل و پیشنهاد AI</h3>
          <Button size="sm" onClick={generateAdvice} disabled={loadingAi}>
            {loadingAi ? "در حال تحلیل..." : advice ? "تحلیل مجدد" : "تولید تحلیل"}
          </Button>
        </div>
        {advice && (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-7">
            {advice}
          </div>
        )}
      </Card>
    </div>
  );
}
