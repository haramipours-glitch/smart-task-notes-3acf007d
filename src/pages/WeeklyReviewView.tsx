import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { callAI } from "@/lib/ai";
import { toast } from "sonner";
import { fa } from "@/lib/persianDigits";
import { formatDate } from "@/lib/jalali";
import {
  CalendarRange, CheckCircle2, AlertCircle, Timer, HeartPulse,
  Target, Sparkles, TrendingUp, TrendingDown, Brain, BookOpen, Copy,
} from "lucide-react";

type WeekData = {
  startISO: string;
  endISO: string;
  tasksCompleted: number;
  tasksCreated: number;
  tasksOverdue: number;
  topPriorityCompleted: number;
  pomoMinutes: number;
  pomoSessions: number;
  habitLogs: number;
  habitsTracked: number;
  checkins: any[];
  abcCount: number;
  thoughtCount: number;
  decisionCount: number;
  bestDay: { date: string; count: number } | null;
  worstDay: { date: string; count: number } | null;
  avgMood: number | null;
  avgEnergy: number | null;
  avgFocus: number | null;
  avgSleep: number | null;
  avgStress: number | null;
};

function startOfWeek(d: Date) {
  // Saturday-start week (common in Persian calendar)
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = (day + 1) % 7; // days since Saturday
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function WeeklyReviewView() {
  const { user } = useAuth();
  const [data, setData] = useState<WeekData | null>(null);
  const [offset, setOffset] = useState(0); // 0 = this week, 1 = last week
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const start = startOfWeek(new Date(Date.now() - offset * 7 * 86400000));
      const end = new Date(start.getTime() + 7 * 86400000);
      const startISO = start.toISOString();
      const endISO = end.toISOString();
      const startDate = startISO.slice(0, 10);
      const endDate = endISO.slice(0, 10);

      const [completed, created, overdue, topDone, pomo, habitLogs, habits, checkins, abc, thoughts, decisions] = await Promise.all([
        supabase.from("tasks").select("completed_at").eq("user_id", user.id).eq("completed", true)
          .gte("completed_at", startISO).lt("completed_at", endISO),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id)
          .gte("created_at", startISO).lt("created_at", endISO),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id)
          .eq("completed", false).lt("due_date", new Date().toISOString()),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id)
          .eq("completed", true).eq("priority", "high")
          .gte("completed_at", startISO).lt("completed_at", endISO),
        supabase.from("pomodoro_sessions").select("duration_minutes,completed").eq("user_id", user.id)
          .gte("started_at", startISO).lt("started_at", endISO),
        supabase.from("habit_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id)
          .gte("log_date", startDate).lt("log_date", endDate),
        supabase.from("habits").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("daily_checkins").select("*").eq("user_id", user.id)
          .gte("checkin_date", startDate).lt("checkin_date", endDate),
        supabase.from("abc_records").select("id", { count: "exact", head: true }).eq("user_id", user.id)
          .gte("created_at", startISO).lt("created_at", endISO),
        supabase.from("thought_records").select("id", { count: "exact", head: true }).eq("user_id", user.id)
          .gte("created_at", startISO).lt("created_at", endISO),
        supabase.from("decision_journal").select("id", { count: "exact", head: true }).eq("user_id", user.id)
          .gte("created_at", startISO).lt("created_at", endISO),
      ]);

      // Day-level breakdown for best/worst day
      const byDay: Record<string, number> = {};
      (completed.data || []).forEach((t: any) => {
        const d = t.completed_at?.slice(0, 10);
        if (d) byDay[d] = (byDay[d] || 0) + 1;
      });
      const days = Object.entries(byDay);
      const bestDay = days.length ? days.reduce((a, b) => (a[1] > b[1] ? a : b)) : null;
      const worstDay = days.length ? days.reduce((a, b) => (a[1] < b[1] ? a : b)) : null;

      const pomoSessions = (pomo.data || []).filter((p: any) => p.completed);
      const pomoMinutes = pomoSessions.reduce((s: number, p: any) => s + (p.duration_minutes || 0), 0);

      const checkinList = checkins.data || [];
      const avg = (key: string): number | null => {
        const vals = checkinList.map((c: any) => c[key]).filter((v: any) => v != null);
        if (!vals.length) return null;
        return vals.reduce((s: number, v: number) => s + Number(v), 0) / vals.length;
      };

      setData({
        startISO,
        endISO,
        tasksCompleted: (completed.data || []).length,
        tasksCreated: created.count || 0,
        tasksOverdue: overdue.count || 0,
        topPriorityCompleted: topDone.count || 0,
        pomoMinutes,
        pomoSessions: pomoSessions.length,
        habitLogs: habitLogs.count || 0,
        habitsTracked: habits.count || 0,
        checkins: checkinList,
        abcCount: abc.count || 0,
        thoughtCount: thoughts.count || 0,
        decisionCount: decisions.count || 0,
        bestDay: bestDay ? { date: bestDay[0], count: bestDay[1] } : null,
        worstDay: worstDay ? { date: worstDay[0], count: worstDay[1] } : null,
        avgMood: avg("mood"),
        avgEnergy: avg("energy"),
        avgFocus: avg("focus"),
        avgSleep: avg("sleep_hours"),
        avgStress: avg("stress"),
      });
      setAiText(""); // reset on week change
    })();
  }, [user, offset]);

  const generateReview = async () => {
    if (!data) return;
    setAiLoading(true);
    try {
      const snapshot = {
        period: { start: data.startISO.slice(0, 10), end: data.endISO.slice(0, 10) },
        tasks: {
          completed: data.tasksCompleted,
          created: data.tasksCreated,
          overdue_now: data.tasksOverdue,
          high_priority_completed: data.topPriorityCompleted,
          best_day: data.bestDay,
          worst_day: data.worstDay,
        },
        focus: { pomodoro_minutes: data.pomoMinutes, sessions: data.pomoSessions },
        habits: { logs: data.habitLogs, tracked: data.habitsTracked },
        checkins: {
          count: data.checkins.length,
          avg_mood: data.avgMood,
          avg_energy: data.avgEnergy,
          avg_focus: data.avgFocus,
          avg_sleep_hours: data.avgSleep,
          avg_stress: data.avgStress,
        },
        mind_health: {
          abc_records: data.abcCount,
          thought_records: data.thoughtCount,
          decisions_logged: data.decisionCount,
        },
      };
      const res = await callAI("chat" as any, JSON.stringify(snapshot, null, 2),
        "این آمار هفتگی کاربر است. یک گزارش بازنگری هفتگی فارسی و عمیق بنویس (۴۰۰-۶۰۰ کلمه) با ساختار:\n\n## 🌟 خلاصه هفته\n۲-۳ جمله شخصی با اشاره به اعداد واقعی.\n\n## ✅ پیروزی‌ها\n۳-۴ بولت از موفقیت‌ها.\n\n## ⚠️ نقاط ضعف یا چالش‌ها\n۲-۳ بولت صادقانه اما بدون قضاوت.\n\n## 🔍 الگوها و بینش\nاگر بین خواب/مود/بهره‌وری ارتباطی هست اشاره کن.\n\n## 🎯 ۳ تمرین کوچک هفته آینده\nسه گام عملی، خاص و قابل اندازه‌گیری.\n\nبا اعداد فارسی، لحن گرم اما واقع‌بین. بدون عنوان H1.");
      setAiText(res.text || "");
    } catch (e: any) {
      toast.error(e.message || "خطا در تولید گزارش");
    } finally {
      setAiLoading(false);
    }
  };

  const copyReview = async () => {
    if (!aiText) return;
    try { await navigator.clipboard.writeText(aiText); toast.success("کپی شد"); }
    catch { toast.error("کپی نشد"); }
  };

  if (!data) return <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>;

  const periodLabel = `${formatDate(new Date(data.startISO), "YYYY/MM/DD")} → ${formatDate(new Date(new Date(data.endISO).getTime() - 86400000), "YYYY/MM/DD")}`;

  return (
    <div dir="rtl" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">بازنگری هفتگی</h1>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </div>
        </div>
        <Tabs value={String(offset)} onValueChange={(v) => setOffset(Number(v))}>
          <TabsList>
            <TabsTrigger value="0">این هفته</TabsTrigger>
            <TabsTrigger value="1">هفته قبل</TabsTrigger>
            <TabsTrigger value="2">۲ هفته پیش</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
          <div className="text-2xl font-bold">{fa(data.tasksCompleted)}</div>
          <div className="text-xs text-muted-foreground">تسک تکمیل‌شده</div>
        </Card>
        <Card className="p-4">
          <Target className="w-5 h-5 text-amber-500 mb-2" />
          <div className="text-2xl font-bold">{fa(data.topPriorityCompleted)}</div>
          <div className="text-xs text-muted-foreground">اولویت بالا انجام‌شده</div>
        </Card>
        <Card className="p-4">
          <Timer className="w-5 h-5 text-primary mb-2" />
          <div className="text-2xl font-bold">{fa(Math.round(data.pomoMinutes))}</div>
          <div className="text-xs text-muted-foreground">دقیقه تمرکز ({fa(data.pomoSessions)} جلسه)</div>
        </Card>
        <Card className="p-4">
          <AlertCircle className="w-5 h-5 text-destructive mb-2" />
          <div className="text-2xl font-bold">{fa(data.tasksOverdue)}</div>
          <div className="text-xs text-muted-foreground">معوقه فعلی</div>
        </Card>
      </div>

      {/* Best/Worst day */}
      {(data.bestDay || data.worstDay) && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">روزهای کلیدی</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.bestDay && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <div>
                  <div className="text-xs text-muted-foreground">پربارترین روز</div>
                  <div className="font-semibold">{formatDate(new Date(data.bestDay.date), "dddd D MMM")}</div>
                </div>
                <Badge variant="outline" className="ms-auto">{fa(data.bestDay.count)} تسک</Badge>
              </div>
            )}
            {data.worstDay && data.worstDay.date !== data.bestDay?.date && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-rose-500" />
                <div>
                  <div className="text-xs text-muted-foreground">کم‌بارترین روز</div>
                  <div className="font-semibold">{formatDate(new Date(data.worstDay.date), "dddd D MMM")}</div>
                </div>
                <Badge variant="outline" className="ms-auto">{fa(data.worstDay.count)} تسک</Badge>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Wellbeing averages */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-primary" /> میانگین چک‌این‌ها
          </h3>
          <Badge variant="outline">{fa(data.checkins.length)} روز ثبت‌شده</Badge>
        </div>
        {data.checkins.length === 0 ? (
          <p className="text-sm text-muted-foreground">این هفته چک‌ین روزانه ثبت نشده.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <Stat label="روحیه" value={data.avgMood} suffix="/۱۰" />
            <Stat label="انرژی" value={data.avgEnergy} suffix="/۱۰" />
            <Stat label="تمرکز" value={data.avgFocus} suffix="/۱۰" />
            <Stat label="خواب" value={data.avgSleep} suffix=" ساعت" />
            <Stat label="استرس" value={data.avgStress} suffix="/۱۰" tone="warn" />
          </div>
        )}
      </Card>

      {/* Mind health activity */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" /> فعالیت سلامت ذهن
        </h3>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="p-3 rounded-lg bg-muted/40 text-center">
            <div className="text-xl font-bold">{fa(data.thoughtCount)}</div>
            <div className="text-xs text-muted-foreground">ثبت افکار</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 text-center">
            <div className="text-xl font-bold">{fa(data.abcCount)}</div>
            <div className="text-xs text-muted-foreground">ABC</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 text-center">
            <div className="text-xl font-bold">{fa(data.decisionCount)}</div>
            <div className="text-xs text-muted-foreground">ژورنال تصمیم</div>
          </div>
        </div>
      </Card>

      {/* AI weekly narrative */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> روایت هفتگی AI
          </h3>
          <div className="flex gap-2">
            {aiText && (
              <Button size="sm" variant="ghost" onClick={copyReview}>
                <Copy className="w-3.5 h-3.5 me-1" /> کپی
              </Button>
            )}
            <Button size="sm" onClick={generateReview} disabled={aiLoading}>
              {aiLoading ? "در حال نوشتن..." : aiText ? "تولید مجدد" : "تولید گزارش"}
            </Button>
          </div>
        </div>
        {aiText ? (
          <div
            dir="rtl"
            className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-8 text-end"
            style={{ unicodeBidi: "plaintext" }}
          >
            {aiText}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            یک روایت شخصی از هفته‌ات با تحلیل الگوها و ۳ تمرین برای هفته آینده.
          </p>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: number | null; suffix?: string; tone?: "warn" }) {
  if (value == null) {
    return (
      <div className="p-3 rounded-lg bg-muted/40 text-center">
        <div className="text-xl font-bold text-muted-foreground">—</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    );
  }
  const display = value.toFixed(1).replace(/\.0$/, "");
  return (
    <div className={`p-3 rounded-lg text-center ${tone === "warn" ? "bg-amber-500/10" : "bg-muted/40"}`}>
      <div className="text-xl font-bold">{fa(display)}{suffix && <span className="text-xs text-muted-foreground ms-1">{suffix}</span>}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
