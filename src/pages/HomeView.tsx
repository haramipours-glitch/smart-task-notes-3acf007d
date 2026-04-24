import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ListTodo, Heart, Timer, Sparkles, Loader2, RefreshCw, Brain, Target } from "lucide-react";
import { toast } from "sonner";
import { markdownToHtml } from "@/lib/markdown";
import { toPersianDigits } from "@/lib/persianDigits";

type Snapshot = {
  todayDue: number;
  overdue: number;
  completedToday: number;
  pomodoroMinutes: number;
  lastCheckin?: { mood: number | null; energy: number | null; focus: number | null; date: string };
  topTasks: { id: string; title: string; priority: string; due_date: string | null }[];
};

const BRIEF_KEY = "daily_brief_v1"; // {date:"YYYY-MM-DD", text}

export default function HomeView() {
  const { user } = useAuth();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);

  useEffect(() => {
    if (!user) return;
    load();
    // restore brief
    try {
      const cached = JSON.parse(localStorage.getItem(BRIEF_KEY) || "null");
      const today = new Date().toISOString().slice(0, 10);
      if (cached?.date === today && cached?.text) setBrief(cached.text);
    } catch {}
  }, [user]);

  async function load() {
    if (!user) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const todayISO = today.toISOString();
    const tomorrowISO = tomorrow.toISOString();
    const todayDate = today.toISOString().slice(0, 10);

    const [tasks, completed, pomos, checkin] = await Promise.all([
      supabase.from("tasks").select("id,title,priority,due_date,completed")
        .eq("user_id", user.id).eq("completed", false)
        .or(`due_date.lt.${tomorrowISO},priority.eq.high`)
        .order("due_date", { ascending: true, nullsFirst: false }).limit(50),
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("completed", true)
        .gte("completed_at", todayISO),
      supabase.from("pomodoro_sessions").select("duration_minutes")
        .eq("user_id", user.id).eq("completed", true)
        .gte("started_at", todayISO),
      supabase.from("daily_checkins").select("mood,energy,focus,checkin_date")
        .eq("user_id", user.id).order("checkin_date", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const all = tasks.data || [];
    const overdue = all.filter((t) => t.due_date && new Date(t.due_date) < today).length;
    const todayDue = all.filter((t) => t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) < tomorrow).length;
    const top = all.slice(0, 5).map((t) => ({ id: t.id, title: t.title, priority: t.priority as string, due_date: t.due_date as string | null }));
    const minutes = (pomos.data || []).reduce((s, p) => s + (p.duration_minutes || 0), 0);

    setSnap({
      todayDue,
      overdue,
      completedToday: completed.count || 0,
      pomodoroMinutes: minutes,
      lastCheckin: checkin.data ? { mood: checkin.data.mood, energy: checkin.data.energy, focus: checkin.data.focus, date: checkin.data.checkin_date } : undefined,
      topTasks: top,
    });
  }

  async function generateBrief(force = false) {
    if (!snap || !user) return;
    setLoadingBrief(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (!force) {
        const cached = JSON.parse(localStorage.getItem(BRIEF_KEY) || "null");
        if (cached?.date === today && cached?.text) {
          setBrief(cached.text);
          setLoadingBrief(false);
          return;
        }
      }
      const payload = {
        date: today,
        todayDue: snap.todayDue,
        overdue: snap.overdue,
        completedToday: snap.completedToday,
        pomodoroMinutes: snap.pomodoroMinutes,
        lastCheckin: snap.lastCheckin,
        topTasks: snap.topTasks.map((t) => ({ title: t.title, priority: t.priority, due: t.due_date })),
      };
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { mode: "daily_brief", input: JSON.stringify(payload), language: "fa" },
      });
      if (error) throw error;
      const text = data?.text || "";
      setBrief(text);
      localStorage.setItem(BRIEF_KEY, JSON.stringify({ date: today, text }));
    } catch (e: any) {
      toast.error(e.message || "خطا در تولید Brief");
    } finally {
      setLoadingBrief(false);
    }
  }

  if (!snap) {
    return (
      <div dir="rtl" className="max-w-5xl mx-auto p-4 md:p-8 space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "شب بخیر";
    if (h < 12) return "صبح بخیر";
    if (h < 17) return "ظهر بخیر";
    if (h < 20) return "عصر بخیر";
    return "شب بخیر";
  })();

  return (
    <div dir="rtl" className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{greeting} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </header>

      {/* خلاصه کارت‌ها */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ListTodo} color="text-blue-500" label="امروز" value={toPersianDigits(snap.todayDue)} sub="تسک سررسید" to="/app/today" />
        <StatCard icon={CheckCircle2} color="text-emerald-500" label="انجام‌شده" value={toPersianDigits(snap.completedToday)} sub="امروز" to="/app/today" />
        <StatCard icon={Timer} color="text-amber-500" label="تمرکز" value={toPersianDigits(snap.pomodoroMinutes)} sub="دقیقه Pomodoro" to="/app/pomodoro" />
        <StatCard icon={Heart} color="text-rose-500"
          label={snap.lastCheckin ? "حال" : "چک‌این"}
          value={snap.lastCheckin?.mood != null ? `${toPersianDigits(snap.lastCheckin.mood)}/۱۰` : "—"}
          sub={snap.lastCheckin ? "آخرین mood" : "ثبت نشده"}
          to="/app/checkin" />
      </div>

      {snap.overdue > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm">
              <strong className="text-destructive">{toPersianDigits(snap.overdue)} تسک</strong> از تاریخ گذشته
            </span>
            <Button asChild size="sm" variant="outline"><Link to="/app/today">مشاهده</Link></Button>
          </CardContent>
        </Card>
      )}

      {/* Daily Brief */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary" />
            خلاصه‌ی هوشمند روز
          </CardTitle>
          {brief && (
            <Button variant="ghost" size="sm" onClick={() => generateBrief(true)} disabled={loadingBrief}>
              {loadingBrief ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!brief && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-7">
                براساس تسک‌ها، چک‌این و فعالیت امروزت یک خلاصه‌ی شخصی‌سازی‌شده دریافت کن — توصیه‌ی AI برای اولویت‌دادن.
              </p>
              <Button onClick={() => generateBrief(false)} disabled={loadingBrief}>
                {loadingBrief ? <><Loader2 className="w-4 h-4 ms-2 animate-spin" /> در حال تولید…</> : <><Sparkles className="w-4 h-4 ms-2" /> دریافت Brief امروز</>}
              </Button>
            </div>
          )}
          {brief && (
            <article
              dir="rtl"
              className="prose prose-sm dark:prose-invert max-w-none leading-7
                prose-headings:text-foreground prose-headings:font-semibold
                prose-p:my-2 prose-strong:text-foreground text-end"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(brief) }}
            />
          )}
        </CardContent>
      </Card>

      {/* Top tasks */}
      {snap.topTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              مهم‌ترین تسک‌های امروز
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {snap.topTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/30 text-sm">
                <span className="flex-1 truncate">{t.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ms-2 ${
                  t.priority === "high" ? "bg-destructive/15 text-destructive" :
                  t.priority === "medium" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                  t.priority === "low" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground"
                }`}>{labelPriority(t.priority)}</span>
              </div>
            ))}
            <Button asChild variant="ghost" size="sm" className="w-full mt-2">
              <Link to="/app/today">مشاهده‌ی همه</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <Card>
        <CardHeader><CardTitle className="text-base">دسترسی سریع</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <QuickLink icon={Heart} to="/app/checkin" label="چک‌این روزانه" />
          <QuickLink icon={Brain} to="/app/thoughts" label="ثبت افکار" />
          <QuickLink icon={Sparkles} to="/app/decisions" label="ژورنال تصمیم" />
          <QuickLink icon={Timer} to="/app/pomodoro" label="Pomodoro" />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, sub, to }: any) {
  return (
    <Link to={to}>
      <Card className="hover:bg-accent/30 transition-colors h-full">
        <CardContent className="p-4">
          <Icon className={`w-5 h-5 ${color} mb-2`} />
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label} · {sub}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickLink({ icon: Icon, to, label }: any) {
  return (
    <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5">
      <Link to={to}>
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-xs">{label}</span>
      </Link>
    </Button>
  );
}

function labelPriority(p: string) {
  return p === "high" ? "بالا" : p === "medium" ? "متوسط" : p === "low" ? "پایین" : "بدون";
}
