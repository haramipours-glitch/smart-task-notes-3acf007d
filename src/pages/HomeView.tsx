import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, ListTodo, Heart, Timer, Sparkles, Loader2, RefreshCw,
  Brain, Target, Calendar, FileText, Trello, Repeat, BookOpen, BarChart3,
  Settings, Compass, Lightbulb, Quote, Inbox, CalendarDays
} from "lucide-react";
import { toast } from "sonner";
import { markdownToHtml } from "@/lib/markdown";
import { toPersianDigits } from "@/lib/persianDigits";
import { getQuoteForHour } from "@/lib/hourlyQuotes";

type Snapshot = {
  todayDue: number;
  completedToday: number;
  pomodoroMinutes: number;
  lastCheckin?: { mood: number | null; energy: number | null; focus: number | null; date: string };
  topTask: { id: string; title: string; priority: string; due_date: string | null } | null;
};

const BRIEF_KEY = "daily_brief_v1";

export default function HomeView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [quote, setQuote] = useState(getQuoteForHour());

  // Refresh quote every hour
  useEffect(() => {
    const tick = () => setQuote(getQuoteForHour());
    const now = new Date();
    const msToNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;
    const t1 = setTimeout(() => {
      tick();
      const intv = setInterval(tick, 60 * 60 * 1000);
      (window as any).__quoteIntv = intv;
    }, msToNextHour);
    return () => {
      clearTimeout(t1);
      if ((window as any).__quoteIntv) clearInterval((window as any).__quoteIntv);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
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

    const [tasks, completed, pomos, checkin] = await Promise.all([
      supabase.from("tasks").select("id,title,priority,due_date,completed")
        .eq("user_id", user.id).eq("completed", false)
        .gte("due_date", todayISO).lt("due_date", tomorrowISO)
        .order("due_date", { ascending: true }).limit(50),
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("completed", true)
        .gte("completed_at", todayISO),
      supabase.from("pomodoro_sessions").select("duration_minutes")
        .eq("user_id", user.id).eq("completed", true)
        .gte("started_at", todayISO),
      supabase.from("daily_checkins").select("mood,energy,focus,checkin_date")
        .eq("user_id", user.id).order("checkin_date", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const todayList = tasks.data || [];
    const todayDue = todayList.length;

    // Find single most-important task: highest priority then earliest due
    const sorted = [...todayList].sort((a, b) => {
      const rank = (p: string) => p === "high" ? 0 : p === "medium" ? 1 : p === "low" ? 2 : 3;
      const r = rank(a.priority as string) - rank(b.priority as string);
      if (r !== 0) return r;
      const at = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bt = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return at - bt;
    });
    const top = sorted[0]
      ? { id: sorted[0].id, title: sorted[0].title, priority: sorted[0].priority as string, due_date: sorted[0].due_date as string | null }
      : null;
    const minutes = (pomos.data || []).reduce((s, p) => s + (p.duration_minutes || 0), 0);

    setSnap({
      todayDue,
      completedToday: completed.count || 0,
      pomodoroMinutes: minutes,
      lastCheckin: checkin.data ? { mood: checkin.data.mood, energy: checkin.data.energy, focus: checkin.data.focus, date: checkin.data.checkin_date } : undefined,
      topTask: top,
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
        completedToday: snap.completedToday,
        pomodoroMinutes: snap.pomodoroMinutes,
        lastCheckin: snap.lastCheckin,
        topTask: snap.topTask ? { title: snap.topTask.title, priority: snap.topTask.priority, due: snap.topTask.due_date } : null,
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
        <div className="grid grid-cols-4 gap-2">
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
    <div dir="rtl" className="max-w-5xl mx-auto p-4 md:p-8 space-y-5 pb-20">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">{greeting} 👋</h1>
        <p className="text-muted-foreground text-xs md:text-sm mt-1">
          {new Date().toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </header>

      {/* Hourly inspiration quote */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Quote className="w-5 h-5 text-primary shrink-0 mt-1" />
          <div>
            <p className="text-sm md:text-base leading-7">{quote.text}</p>
            {quote.author && <p className="text-[10px] text-muted-foreground mt-1">{quote.author}</p>}
          </div>
        </CardContent>
      </Card>

      {/* 4-column row: check-in, today due, pomodoro, completed */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard
          icon={Heart} color="text-rose-500"
          label="چک‌این"
          value={snap.lastCheckin?.mood != null ? `${toPersianDigits(snap.lastCheckin.mood)}/۱۰` : "—"}
          to="/app/checkin"
        />
        <StatCard
          icon={ListTodo} color="text-blue-500"
          label="امروز"
          value={toPersianDigits(snap.todayDue)}
          to="/app/today"
        />
        <StatCard
          icon={Timer} color="text-amber-500"
          label="Pomodoro"
          value={toPersianDigits(snap.pomodoroMinutes)}
          to="/app/pomodoro"
        />
        <StatCard
          icon={CheckCircle2} color="text-emerald-500"
          label="انجام‌شده"
          value={toPersianDigits(snap.completedToday)}
          to="/app/today"
        />
      </div>

      {/* Daily Brief — button only, no description */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">خلاصه‌ی هوشمند روز</span>
          </div>
          <div className="flex gap-1">
            <Button size="sm" onClick={() => generateBrief(!!brief)} disabled={loadingBrief}>
              {loadingBrief
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : brief
                  ? <><RefreshCw className="w-3.5 h-3.5 ms-1" /> به‌روزرسانی</>
                  : <><Sparkles className="w-3.5 h-3.5 ms-1" /> دریافت Brief</>}
            </Button>
          </div>
        </CardContent>
        {brief && (
          <CardContent className="pt-0">
            <article
              dir="rtl"
              className="prose prose-sm dark:prose-invert max-w-none leading-7
                prose-headings:text-foreground prose-headings:font-semibold
                prose-p:my-2 prose-strong:text-foreground text-end"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(brief) }}
            />
          </CardContent>
        )}
      </Card>

      {/* Today's single most-important task */}
      {snap.topTask && (
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-500" />
              مهم‌ترین تسک امروز
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => navigate(`/app/tasks/${snap.topTask!.id}`)}
              className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent/30 text-sm text-end"
            >
              <span className="flex-1 truncate font-medium">{snap.topTask.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ms-2 ${
                snap.topTask.priority === "high" ? "bg-destructive/15 text-destructive" :
                snap.topTask.priority === "medium" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                snap.topTask.priority === "low" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground"
              }`}>{labelPriority(snap.topTask.priority)}</span>
            </button>
          </CardContent>
        </Card>
      )}

      {/* Quick access — all main pages as cards */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">دسترسی سریع</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          <QuickCard icon={Inbox} to="/app/inbox" label="Inbox" color="text-slate-500" />
          <QuickCard icon={ListTodo} to="/app/today" label="تسک‌ها" color="text-blue-500" />
          <QuickCard icon={CalendarDays} to="/app/next7" label="۷ روز" color="text-indigo-500" />
          <QuickCard icon={FileText} to="/app/notes" label="نوت‌ها" color="text-violet-500" />
          <QuickCard icon={Calendar} to="/app/calendar" label="تقویم" color="text-emerald-500" />
          <QuickCard icon={Trello} to="/app/kanban" label="کانبان" color="text-cyan-500" />
          <QuickCard icon={Timer} to="/app/pomodoro" label="Pomodoro" color="text-amber-500" />
          <QuickCard icon={Repeat} to="/app/habits" label="عادت‌ها" color="text-pink-500" />
          <QuickCard icon={Target} to="/app/goals" label="اهداف" color="text-orange-500" />
          <QuickCard icon={Heart} to="/app/checkin" label="چک‌این" color="text-rose-500" />
          <QuickCard icon={Brain} to="/app/thoughts" label="ثبت افکار" color="text-purple-500" />
          <QuickCard icon={Lightbulb} to="/app/abc" label="ABC" color="text-yellow-500" />
          <QuickCard icon={Compass} to="/app/decisions" label="ژورنال تصمیم" color="text-teal-500" />
          <QuickCard icon={BookOpen} to="/app/self" label="خودشناسی" color="text-fuchsia-500" />
          <QuickCard icon={BarChart3} to="/app/insights" label="بینش‌ها" color="text-green-500" />
          <QuickCard icon={Settings} to="/app/settings" label="تنظیمات" color="text-muted-foreground" />
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, to }: any) {
  return (
    <Link to={to}>
      <Card className="hover:bg-accent/30 transition-colors h-full">
        <CardContent className="p-2.5 md:p-3 text-center">
          <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
          <div className="text-base md:text-lg font-bold leading-none">{value}</div>
          <div className="text-[10px] text-muted-foreground mt-1 truncate">{label}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickCard({ icon: Icon, to, label, color }: any) {
  return (
    <Link to={to}>
      <Card className="hover:bg-accent/30 hover:border-primary/40 transition-all h-full">
        <CardContent className="p-3 flex flex-col items-center justify-center gap-1.5 text-center">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="text-[11px] font-medium leading-tight">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

function labelPriority(p: string) {
  return p === "high" ? "بالا" : p === "medium" ? "متوسط" : p === "low" ? "پایین" : "بدون";
}
