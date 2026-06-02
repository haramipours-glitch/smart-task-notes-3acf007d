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
import { HomeRangeTasks } from "@/components/HomeRangeTasks";
import { haptic } from "@/lib/haptics";
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
  habitsToday: { id: string; name: string; icon: string; done: boolean }[];
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
  
  { key: "mind", icon: Brain, to: "/app/mind", label: "ذهن", color: "text-purple-500" },
  { key: "checkin", icon: Heart, to: "/app/checkin", label: "چک‌این", color: "text-rose-500" },
  { key: "thoughts", icon: Brain, to: "/app/thoughts", label: "ثبت افکار", color: "text-purple-500" },
  { key: "abc", icon: Lightbulb, to: "/app/abc", label: "ABC", color: "text-yellow-500" },
  { key: "breathing", icon: Heart, to: "/app/breathing", label: "تنفس", color: "text-teal-500" },
  { key: "self", icon: BookOpen, to: "/app/self", label: "خودشناسی", color: "text-fuchsia-500" },
  
  { key: "settings", icon: Settings, to: "/app/settings", label: "تنظیمات", color: "text-muted-foreground" },
];

const QUICK_KEY = "home_quick_widgets_v1";
const FOCUS_KEY = "home_focus_mode_v1";
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

function loadFocusMode(): boolean {
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    if (raw === null) return true; // default focus mode for new users
    return raw === "1";
  } catch { return true; }
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [focusMode, setFocusMode] = useState<boolean>(loadFocusMode);
  const toggleFocus = () => {
    setFocusMode((v) => {
      const n = !v;
      try { localStorage.setItem(FOCUS_KEY, n ? "1" : "0"); } catch {}
      return n;
    });
  };

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

    const [tasks, tomorrowTasks, completed, pomos, checkin, habitsRes, habitLogsRes] = await Promise.all([
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
      supabase.from("habits").select("id,name,icon,frequency").eq("user_id", user.id),
      supabase.from("habit_logs").select("habit_id,log_date")
        .eq("user_id", user.id).eq("log_date", today.toISOString().slice(0, 10)),
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

    const todayLogs = new Set((habitLogsRes.data || []).map((l: any) => l.habit_id));
    const habitsList = (habitsRes.data || [])
      .filter((h: any) => h.frequency !== "weekly")
      .map((h: any) => ({ id: h.id, name: h.name, icon: h.icon || "🎯", done: todayLogs.has(h.id) }));

    setSnap({
      todayDue,
      tomorrowDue: tomorrowTasks.count || 0,
      completedToday: completed.count || 0,
      pomodoroMinutes: minutes,
      lastCheckin: checkin.data ? { mood: checkin.data.mood, energy: checkin.data.energy, focus: checkin.data.focus, date: checkin.data.checkin_date } : undefined,
      topTasks: top,
      habitsToday: habitsList,
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
        topTask: snap.topTasks[0] ? { title: snap.topTasks[0].title, priority: snap.topTasks[0].priority, due: snap.topTasks[0].due_date } : null,
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

  // ----- Always-visible primary cards -----
  const primaryCards = (
    <>
      {/* بازه‌ی زمانی: امروز / فردا / هفته (به‌صورت کشویی) */}
      <HomeRangeTasks />

      {/* جمله و داستان این ساعت */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
          <CardContent className="p-4 flex items-start gap-3 h-full">
            <Quote className="w-5 h-5 text-primary shrink-0 mt-1" />
            <div dir="rtl" className="text-right w-full">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">جمله‌ی این ساعت</p>
              <p className="text-sm md:text-base leading-7 whitespace-pre-wrap break-words">{quote.text}</p>
              {quote.author && <p className="text-[10px] text-muted-foreground mt-1">{quote.author}</p>}
            </div>
          </CardContent>
        </Card>
        <HourlyStoryCard />
      </div>

      {/* عادت‌های امروز */}
      {snap.habitsToday.length > 0 && (
        <Card className="border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-pink-500" />
                عادت‌های امروز
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {toPersianDigits(snap.habitsToday.filter(h => h.done).length)}/{toPersianDigits(snap.habitsToday.length)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {snap.habitsToday.map((h) => (
              <button
                key={h.id}
                onClick={async () => {
                  if (!user) return;
                  haptic(h.done ? "light" : "success");
                  const today = new Date().toISOString().slice(0, 10);
                  if (h.done) {
                    await supabase.from("habit_logs").delete().eq("habit_id", h.id).eq("log_date", today);
                  } else {
                    await supabase.from("habit_logs").insert({ habit_id: h.id, user_id: user.id, log_date: today });
                  }
                  load();
                }}
                className={`px-2.5 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition border
                  ${h.done ? "bg-pink-500/20 border-pink-500/40 text-pink-700 dark:text-pink-300" : "border-border hover:bg-accent"}`}
              >
                <span>{h.icon}</span>
                <span className="truncate max-w-[100px]">{h.name}</span>
                {h.done && <Check className="w-3 h-3" />}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Check-in سریع */}
      <Link to="/app/checkin" onClick={() => haptic("light")}>
        <Card className="border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-transparent hover:bg-accent/20 transition">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              <div>
                <p className="text-sm font-medium">Check-in روزانه</p>
                <p className="text-xs text-muted-foreground">
                  {snap.lastCheckin?.mood != null
                    ? `آخرین خلق‌و‌خو: ${toPersianDigits(snap.lastCheckin.mood)}/۱۰`
                    : "هنوز ثبت نکرده‌ای"}
                </p>
              </div>
            </div>
            <Button size="sm" variant="secondary">ثبت</Button>
          </CardContent>
        </Card>
      </Link>

      {/* Pomodoro */}
      <Link to="/app/pomodoro" onClick={() => haptic("light")}>
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent hover:bg-accent/20 transition">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Pomodoro</p>
                <p className="text-xs text-muted-foreground">
                  {snap.pomodoroMinutes > 0
                    ? `${toPersianDigits(snap.pomodoroMinutes)} دقیقه امروز`
                    : "یک تمرکز ۲۵ دقیقه‌ای شروع کن"}
                </p>
              </div>
            </div>
            <Button size="sm" variant="secondary">شروع</Button>
          </CardContent>
        </Card>
      </Link>
    </>
  );


  // ----- Extra (full) content — stats + quick access -----
  const extraContent = (
    <>
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
    </>
  );

  return (
    <div dir="rtl" className="max-w-5xl mx-auto p-4 md:p-8 space-y-5 pb-20">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{greeting} 👋</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            {new Date().toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={toggleFocus} className="h-8 text-xs gap-1"
            title={focusMode ? "نمایش کامل" : "حالت متمرکز"}>
            {focusMode ? <><Sparkles className="w-3.5 h-3.5 text-primary" /> متمرکز</> : <>کامل</>}
          </Button>
          <Link to="/app/settings" className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-pink-200/60 dark:border-pink-800/40 bg-gradient-to-l from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 hover:shadow-md transition">
            <img src="/favicon.png" alt="ARSHNAZ" className="w-7 h-7 rounded-md" width={28} height={28} loading="lazy" />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-xs font-bold bg-gradient-to-l from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">ARSHNAZ</span>
              <span className="text-[9px] text-muted-foreground">با عشق ❤️</span>
            </div>
          </Link>
        </div>
      </header>

      {primaryCards}

      {focusMode ? (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <SlidersHorizontal className="w-4 h-4" /> بیشتر
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto" dir="rtl">
            <SheetHeader>
              <SheetTitle>بیشتر</SheetTitle>
            </SheetHeader>
            <div className="space-y-5 mt-4">
              {extraContent}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        extraContent
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, to }: any) {
  return (
    <Link to={to} onClick={() => haptic("light")}>
      <Card className="group relative overflow-hidden hover:bg-accent/30 transition-all h-full border-border/60 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]">
        <div className={`absolute inset-x-0 top-0 h-0.5 ${color.replace("text-", "bg-")} opacity-60`} />
        <CardContent className="p-3 text-center">
          <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
          <div className="text-base md:text-lg font-bold leading-none">{value}</div>
          <div className="text-[10px] text-muted-foreground mt-1 break-words leading-tight">{label}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickCard({ icon: Icon, to, label, color }: any) {
  const bg = color.replace("text-", "bg-");
  return (
    <Link to={to} onClick={() => haptic("light")}>
      <Card className="group relative overflow-hidden h-full border-border/60 bg-gradient-to-br from-card to-card/40 hover:border-primary/40 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200">
        <div className={`absolute -top-6 -end-6 w-16 h-16 rounded-full ${bg} opacity-10 blur-2xl group-hover:opacity-25 transition`} />
        <CardContent className="p-3 flex flex-col items-center justify-center gap-2 text-center min-h-[88px]">
          <div className={`w-9 h-9 rounded-2xl ${bg}/15 flex items-center justify-center ring-1 ring-inset ring-border/40 group-hover:scale-110 transition-transform`}>
            <Icon className={`w-4.5 h-4.5 ${color}`} />
          </div>
          <span className="text-[11px] font-semibold leading-tight break-words line-clamp-2 w-full">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

function labelPriority(p: string) {
  return p === "urgent" ? "فوق فوری" : p === "high" ? "فوری" : p === "medium" ? "متوسط" : p === "low" ? "پایین" : "بدون";
}

// Categorized renderer for the daily AI brief. Splits markdown by H2 (## ...)
// into beautiful tiled sections — RTL, right-aligned Persian.
function BriefRenderer({ markdown }: { markdown: string }) {
  const sections = (() => {
    const lines = markdown.split(/\r?\n/);
    const out: { title: string; body: string }[] = [];
    let cur: { title: string; body: string } | null = null;
    for (const ln of lines) {
      const m = /^##\s+(.+)/.exec(ln.trim());
      if (m) {
        if (cur) out.push(cur);
        cur = { title: m[1].trim(), body: "" };
      } else if (cur) {
        cur.body += ln + "\n";
      } else if (ln.trim()) {
        // intro lines before any H2 — wrap in a default section
        cur = { title: "خلاصه", body: ln + "\n" };
      }
    }
    if (cur) out.push(cur);
    return out;
  })();

  if (sections.length === 0) {
    return (
      <article dir="rtl" className="prose prose-sm dark:prose-invert max-w-none leading-7 text-right"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }} />
    );
  }

  return (
    <div dir="rtl" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {sections.map((s, i) => (
        <div key={i}
          className="rounded-xl border border-primary/15 bg-card/60 backdrop-blur p-3 shadow-sm hover:shadow-md transition">
          <h3 className="text-[13px] font-bold text-primary mb-1.5 text-right">{s.title}</h3>
          <article
            className="prose prose-sm dark:prose-invert max-w-none leading-7 text-right
              prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-foreground"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(s.body.trim()) }} />
        </div>
      ))}
    </div>
  );
}

