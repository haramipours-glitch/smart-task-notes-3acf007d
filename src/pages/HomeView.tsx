import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, ListTodo, Heart, Timer, Sparkles, Loader2, RefreshCw,
  Brain, Target, Calendar, FileText, Trello, Repeat, BookOpen, BarChart3,
  Settings, Compass, Lightbulb, Quote, Inbox, CalendarDays, SlidersHorizontal, Check,
} from "lucide-react";
import { toast } from "sonner";
import { markdownToHtml } from "@/lib/markdown";
import { toPersianDigits } from "@/lib/persianDigits";
import { getQuoteForHour } from "@/lib/hourlyQuotes";
import { HourlyStoryCard } from "@/components/HourlyStoryCard";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

type Snapshot = {
  todayDue: number;
  tomorrowDue: number;
  completedToday: number;
  pomodoroMinutes: number;
  lastCheckin?: { mood: number | null; energy: number | null; focus: number | null; date: string };
  topTasks: { id: string; title: string; priority: string; due_date: string | null }[];
};

const BRIEF_KEY = "daily_brief_v1";

// All quick-access widgets — user can toggle which to show
const ALL_QUICK: { key: string; icon: any; to: string; label: string; color: string }[] = [
  { key: "inbox", icon: Inbox, to: "/app/inbox", label: "Inbox", color: "text-slate-500" },
  { key: "today", icon: ListTodo, to: "/app/today", label: "تسک‌ها", color: "text-blue-500" },
  { key: "tomorrow", icon: CalendarDays, to: "/app/tomorrow", label: "فردا", color: "text-sky-500" },
  { key: "next7", icon: CalendarDays, to: "/app/next7", label: "۷ روز", color: "text-indigo-500" },
  { key: "notes", icon: FileText, to: "/app/notes", label: "نوت‌ها", color: "text-violet-500" },
  { key: "calendar", icon: Calendar, to: "/app/calendar", label: "تقویم", color: "text-emerald-500" },
  { key: "pomodoro", icon: Timer, to: "/app/pomodoro", label: "Pomodoro", color: "text-amber-500" },
  { key: "habits", icon: Repeat, to: "/app/habits", label: "عادت‌ها", color: "text-pink-500" },
  { key: "goals", icon: Target, to: "/app/goals", label: "اهداف", color: "text-orange-500" },
  { key: "checkin", icon: Heart, to: "/app/checkin", label: "چک‌این", color: "text-rose-500" },
  { key: "thoughts", icon: Brain, to: "/app/thoughts", label: "ثبت افکار", color: "text-purple-500" },
  { key: "abc", icon: Lightbulb, to: "/app/abc", label: "ABC", color: "text-yellow-500" },
  { key: "decisions", icon: Compass, to: "/app/decisions", label: "ژورنال تصمیم", color: "text-teal-500" },
  { key: "self", icon: BookOpen, to: "/app/self", label: "خودشناسی", color: "text-fuchsia-500" },
  { key: "insights", icon: BarChart3, to: "/app/insights", label: "بینش‌ها", color: "text-green-500" },
  { key: "settings", icon: Settings, to: "/app/settings", label: "تنظیمات", color: "text-muted-foreground" },
];

const QUICK_KEY = "home_quick_widgets_v1";
const DEFAULT_QUICK = ALL_QUICK.map((q) => q.key);

function loadEnabledQuick(): string[] {
  try {
    const raw = localStorage.getItem(QUICK_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter((k: string) => ALL_QUICK.some((q) => q.key === k));
    }
  } catch {}
  return DEFAULT_QUICK;
}

export default function HomeView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [quote, setQuote] = useState(getQuoteForHour());
  const [enabledQuick, setEnabledQuick] = useState<string[]>(loadEnabledQuick);
  const [customizeOpen, setCustomizeOpen] = useState(false);

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
    const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);
    const todayISO = today.toISOString();
    const tomorrowISO = tomorrow.toISOString();
    const dayAfterISO = dayAfter.toISOString();

    const [tasks, tomorrowTasks, completed, pomos, checkin] = await Promise.all([
      supabase.from("tasks").select("id,title,priority,due_date,completed")
        .eq("user_id", user.id).eq("completed", false)
        .gte("due_date", todayISO).lt("due_date", tomorrowISO)
        .order("due_date", { ascending: true }).limit(50),
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("completed", false)
        .gte("due_date", tomorrowISO).lt("due_date", dayAfterISO),
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

    const sorted = [...todayList].sort((a, b) => {
      const rank = (p: string) => p === "urgent" ? -1 : p === "high" ? 0 : p === "medium" ? 1 : p === "low" ? 2 : 3;
      const r = rank(a.priority as string) - rank(b.priority as string);
      if (r !== 0) return r;
      const at = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bt = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return at - bt;
    });
    // Show urgent + high (and fall back to first sorted if none of those exist)
    const important = sorted.filter(t => t.priority === "urgent" || t.priority === "high").slice(0, 4);
    const top = important.length > 0
      ? important.map(t => ({ id: t.id, title: t.title, priority: t.priority as string, due_date: t.due_date as string | null }))
      : (sorted[0] ? [{ id: sorted[0].id, title: sorted[0].title, priority: sorted[0].priority as string, due_date: sorted[0].due_date as string | null }] : []);
    const minutes = (pomos.data || []).reduce((s, p) => s + (p.duration_minutes || 0), 0);

    setSnap({
      todayDue,
      tomorrowDue: tomorrowTasks.count || 0,
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

  const toggleQuick = (key: string) => {
    setEnabledQuick((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try { localStorage.setItem(QUICK_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const visibleQuick = useMemo(
    () => ALL_QUICK.filter((q) => enabledQuick.includes(q.key)),
    [enabledQuick]
  );

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
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{greeting} 👋</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            {new Date().toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link to="/app/settings" className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-pink-200/60 dark:border-pink-800/40 bg-gradient-to-l from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 hover:shadow-md transition shrink-0">
          <img src="/favicon.png" alt="ARSHNAZ" className="w-7 h-7 rounded-md" width={28} height={28} loading="lazy" />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-xs font-bold bg-gradient-to-l from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">ARSHNAZ</span>
            <span className="text-[9px] text-muted-foreground">با عشق ❤️</span>
          </div>
        </Link>
      </header>

      {/* Hourly inspiration: quote + story side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
          <CardContent className="p-4 flex items-start gap-3 h-full">
            <Quote className="w-5 h-5 text-primary shrink-0 mt-1" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">جمله‌ی این ساعت</p>
              <p className="text-sm md:text-base leading-7">{quote.text}</p>
              {quote.author && <p className="text-[10px] text-muted-foreground mt-1">{quote.author}</p>}
            </div>
          </CardContent>
        </Card>
        <HourlyStoryCard />
      </div>

      {/* 4-column row */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard icon={Heart} color="text-rose-500" label="چک‌این"
          value={snap.lastCheckin?.mood != null ? `${toPersianDigits(snap.lastCheckin.mood)}/۱۰` : "—"}
          to="/app/checkin" />
        <StatCard icon={ListTodo} color="text-blue-500" label="امروز"
          value={toPersianDigits(snap.todayDue)} to="/app/today" />
        <StatCard icon={CalendarDays} color="text-sky-500" label="فردا"
          value={toPersianDigits(snap.tomorrowDue)} to="/app/tomorrow" />
        <StatCard icon={CheckCircle2} color="text-emerald-500" label="انجام‌شده"
          value={toPersianDigits(snap.completedToday)} to="/app/today" />
      </div>

      {/* Daily Brief */}
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
            <article dir="rtl"
              className="prose prose-sm dark:prose-invert max-w-none leading-7
                prose-headings:text-foreground prose-headings:font-semibold
                prose-p:my-2 prose-strong:text-foreground text-end"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(brief) }} />
          </CardContent>
        )}
      </Card>

      {/* Top task */}
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

      {/* Quick access — customizable */}
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-sm font-semibold text-muted-foreground">دسترسی سریع</h2>
          <Sheet open={customizeOpen} onOpenChange={setCustomizeOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> سفارشی‌سازی
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto" dir="rtl">
              <SheetHeader>
                <SheetTitle>سفارشی‌سازی دسترسی سریع</SheetTitle>
              </SheetHeader>
              <p className="text-xs text-muted-foreground mt-2">
                ویجت‌هایی که می‌خواهی روی صفحه‌ی اصلی نمایش داده شوند را انتخاب کن.
              </p>
              <div className="space-y-2 mt-4">
                {ALL_QUICK.map((q) => {
                  const Icon = q.icon;
                  const on = enabledQuick.includes(q.key);
                  return (
                    <div key={q.key}
                      className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent/40 transition">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${q.color}`} />
                        <span className="text-sm">{q.label}</span>
                      </div>
                      <Switch checked={on} onCheckedChange={() => toggleQuick(q.key)} />
                    </div>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {visibleQuick.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">
            هیچ ویجتی فعال نیست. با دکمه‌ی «سفارشی‌سازی» یکی را روشن کن.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {visibleQuick.map((q) => (
              <QuickCard key={q.key} icon={q.icon} to={q.to} label={q.label} color={q.color} />
            ))}
          </div>
        )}
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
