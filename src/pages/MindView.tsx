import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Activity, BookOpen, Zap, MessageCircleQuestion, Sparkles,
  TrendingUp, Heart, Brain, Flame, Calendar, ArrowLeft,
  Compass, Wind, ClipboardCheck,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart,
} from "recharts";
import { DISTORTION_LABELS } from "@/lib/distortions";
import { SCREENERS, severityColor, type ScreenerType } from "@/lib/assessments/screeners";

type Checkin = {
  checkin_date: string; mood: number | null; energy: number | null;
  focus: number | null; stress: number | null; sleep_quality: number | null;
};

const TOOLS = [
  {
    to: "/app/checkin", title: "Check-in روزانه", desc: "ثبت خلق، انرژی، تمرکز و خواب",
    icon: Activity, gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
  },
  {
    to: "/app/thoughts", title: "ثبت افکار CBT", desc: "بازسازی شناختی و کشف distortion",
    icon: BookOpen, gradient: "from-violet-500 via-purple-500 to-indigo-500",
  },
  {
    to: "/app/abc", title: "مدل ABC", desc: "محرک، باور، نتیجه — کشف الگوهای رفتاری",
    icon: Zap, gradient: "from-amber-500 via-orange-500 to-red-500",
  },
  {
    to: "/app/worry", title: "Worry / Problem-Solving", desc: "تفکیک نگرانی قابل‌حل از غیرقابل‌حل",
    icon: Wind, gradient: "from-sky-500 via-blue-500 to-indigo-500",
  },
  {
    to: "/app/values", title: "Values & Goals (ACT)", desc: "ارزش‌ها، شکاف‌ها و هدف‌های معنادار",
    icon: Compass, gradient: "from-emerald-500 via-teal-500 to-cyan-500",
  },
  {
    to: "/app/breathing", title: "تمرین تنفس ۳بعدی", desc: "۵ الگوی تنفس با راهنمای بصری ۳ بعدی",
    icon: Wind, gradient: "from-teal-500 via-cyan-500 to-sky-500",
  },
  {
    to: "/app/socratic", title: "چت سقراطی", desc: "گفت‌وگوی هدایت‌شده با AI برای چالش افکار",
    icon: MessageCircleQuestion, gradient: "from-cyan-500 via-sky-500 to-blue-500",
  },
];

const SCREENER_LIST: { type: ScreenerType; gradient: string }[] = [
  { type: "phq9", gradient: "from-rose-500 to-red-600" },
  { type: "gad7", gradient: "from-amber-500 to-orange-600" },
  { type: "who5", gradient: "from-emerald-500 to-teal-600" },
  { type: "burnout", gradient: "from-slate-500 to-zinc-700" },
];

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: any; tone: string }) {
  return (
    <div className={`rounded-2xl p-4 bg-gradient-to-br ${tone} text-white shadow-sm`}>
      <div className="flex items-center justify-between mb-2 opacity-90">
        <span className="text-xs font-medium">{label}</span>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function HeatmapCell({ intensity }: { intensity: number }) {
  // 0..1 → background opacity
  const op = intensity === 0 ? 0.06 : 0.25 + intensity * 0.65;
  return (
    <div
      className="aspect-square rounded-sm transition-transform hover:scale-125"
      style={{ background: `hsl(var(--primary) / ${op})` }}
    />
  );
}

export default function MindView() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [thoughtCount, setThoughtCount] = useState(0);
  const [topDistortions, setTopDistortions] = useState<{ key: string; n: number }[]>([]);
  const [abcCount, setAbcCount] = useState(0);
  
  const [streak, setStreak] = useState(0);
  const [latestScreeners, setLatestScreeners] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since90 = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const since30iso = new Date(Date.now() - 30 * 86400000).toISOString();
      const [{ data: ck }, { data: tr }, { count: ac }, { data: scr }] = await Promise.all([
        supabase.from("daily_checkins").select("checkin_date,mood,energy,focus,stress,sleep_quality")
          .eq("user_id", user.id).gte("checkin_date", since90).order("checkin_date"),
        supabase.from("thought_records").select("distortions,created_at")
          .eq("user_id", user.id).gte("created_at", since30iso),
        supabase.from("abc_records").select("*", { count: "exact", head: true })
          .eq("user_id", user.id).gte("created_at", since30iso),
        supabase.from("assessment_results")
          .select("assessment_type, scores, analysis, completed_at")
          .eq("user_id", user.id)
          .in("assessment_type", ["phq9", "gad7", "who5", "burnout"])
          .order("completed_at", { ascending: false }),
      ]);
      setCheckins((ck || []) as Checkin[]);
      setThoughtCount((tr || []).length);
      setAbcCount(ac || 0);
      // Latest result per screener
      const map: Record<string, any> = {};
      (scr || []).forEach((r: any) => { if (!map[r.assessment_type]) map[r.assessment_type] = r; });
      setLatestScreeners(map);
      // Top distortions
      const counts: Record<string, number> = {};
      (tr || []).forEach((r: any) => (r.distortions || []).forEach((d: string) => { counts[d] = (counts[d] || 0) + 1; }));
      setTopDistortions(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, n]) => ({ key, n })));
      const dates = new Set((ck || []).map((c: any) => c.checkin_date));
      let s = 0;
      for (let i = 0; i < 90; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        if (dates.has(d)) s++;
        else if (i > 0) break;
      }
      setStreak(s);
    })();
  }, [user]);

  const today = checkins.length ? checkins[checkins.length - 1] : null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = today?.checkin_date === todayStr;

  const trend = useMemo(() => checkins.slice(-30).map((c) => ({
    date: c.checkin_date.slice(5),
    mood: c.mood, energy: c.energy, focus: c.focus, stress: c.stress,
  })), [checkins]);

  // 90-day heatmap aligned to weeks
  const heatmap = useMemo(() => {
    const map = new Map<string, number>();
    checkins.forEach((c) => {
      const avg = [c.mood, c.energy, c.focus].filter((x): x is number => x != null);
      const v = avg.length ? avg.reduce((a, b) => a + b, 0) / avg.length / 10 : 0.4;
      map.set(c.checkin_date, v);
    });
    const days: { date: string; intensity: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days.push({ date: d, intensity: map.get(d) ?? 0 });
    }
    return days;
  }, [checkins]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in" dir="rtl">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg">
        <div className="absolute -top-12 -end-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -start-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs opacity-80 mb-2">
            <Brain className="w-4 h-4" />
            <span>سلامت روان · مرکز ذهن</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2">ذهن آرام، تصمیم بهتر</h1>
          <p className="text-sm md:text-base opacity-90 max-w-xl">
            یک نگاه به وضعیت امروز، روند ۳۰ روز، الگوهای فکری و ابزارهای CBT.
          </p>
          {isToday && today && (
            <div className="mt-5 grid grid-cols-3 gap-2 max-w-md">
              <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
                <div className="text-[10px] opacity-80">خلق</div>
                <div className="text-2xl font-bold tabular-nums">{today.mood ?? "—"}</div>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
                <div className="text-[10px] opacity-80">انرژی</div>
                <div className="text-2xl font-bold tabular-nums">{today.energy ?? "—"}</div>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
                <div className="text-[10px] opacity-80">تمرکز</div>
                <div className="text-2xl font-bold tabular-nums">{today.focus ?? "—"}</div>
              </div>
            </div>
          )}
          {!isToday && (
            <Link to="/app/checkin" className="inline-flex items-center gap-2 mt-5 bg-white text-purple-700 font-medium rounded-full px-4 py-2 text-sm hover-scale">
              ثبت Check-in امروز <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="استریک Check-in" value={`${streak} روز`} icon={Flame} tone="from-orange-500 to-red-500" />
        <StatCard label="ثبت افکار · ۳۰ روز" value={thoughtCount} icon={BookOpen} tone="from-violet-500 to-purple-600" />
        <StatCard label="ABC · ۳۰ روز" value={abcCount} icon={Zap} tone="from-amber-500 to-orange-600" />
        <StatCard label="ابزارهای ذهن" value={4} icon={Brain} tone="from-emerald-500 to-teal-600" />
      </div>

      {/* Trend chart */}
      {trend.length > 1 && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> روند ۳۰ روز اخیر</h3>
              <p className="text-xs text-muted-foreground mt-0.5">خلق، انرژی، تمرکز و استرس</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="moodG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 10]} fontSize={10} tickLine={false} axisLine={false} width={24} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="mood" stroke="hsl(var(--primary))" fill="url(#moodG)" strokeWidth={2} />
              <Line type="monotone" dataKey="energy" stroke="hsl(200 80% 55%)" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="focus" stroke="hsl(30 90% 55%)" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="stress" stroke="hsl(0 75% 60%)" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> خلق</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(200 80% 55%)" }} /> انرژی</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(30 90% 55%)" }} /> تمرکز</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(0 75% 60%)" }} /> استرس</span>
          </div>
        </div>
      )}

      {/* Heatmap */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> heatmap ۹۰ روز</h3>
            <p className="text-xs text-muted-foreground mt-0.5">میانگین خلق/انرژی/تمرکز در هر روز</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>کم</span>
            {[0, 0.3, 0.5, 0.7, 1].map((v) => <HeatmapCell key={v} intensity={v} />)}
            <span>زیاد</span>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(15,_minmax(0,_1fr))] gap-1">
          {heatmap.map((d) => (
            <div key={d.date} title={`${d.date} · ${(d.intensity * 10).toFixed(1)}/10`}>
              <HeatmapCell intensity={d.intensity} />
            </div>
          ))}
        </div>
      </div>

      {/* Top distortions */}
      {topDistortions.length > 0 && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Heart className="w-4 h-4 text-rose-500" /> الگوهای شناختی پرتکرار (۳۰ روز)</h3>
          <div className="space-y-2">
            {topDistortions.map((d) => (
              <div key={d.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <span className="text-sm">{(DISTORTION_LABELS as any)[d.key] || d.key}</span>
                <span className="text-xs font-mono bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-full">×{d.n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screeners */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-primary" /> غربالگرهای کوتاه
          <span className="text-xs font-normal text-muted-foreground">— ردیابی شخصی، نه تشخیص بالینی</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SCREENER_LIST.map(({ type, gradient }) => {
            const meta = SCREENERS[type];
            const last = latestScreeners[type];
            const sev = last?.analysis?.severity;
            return (
              <Link key={type} to={`/app/screener/${type}`}
                className={`group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${gradient} text-white shadow-sm hover-scale transition-all`}>
                <div className="text-[11px] opacity-80">{meta.title.split(" — ")[1] || meta.title}</div>
                <div className="text-lg font-bold mt-1">{meta.title.split(" — ")[0]}</div>
                {last ? (
                  <div className="mt-2">
                    <div className="text-2xl font-bold tabular-nums">{last.scores?.raw}</div>
                    <div className="text-[10px] opacity-90">{last.analysis?.severityLabel}</div>
                  </div>
                ) : (
                  <div className="text-[11px] opacity-80 mt-2">شروع تست</div>
                )}
                {sev && (
                  <div className="absolute top-2 end-2 w-2 h-2 rounded-full" style={{ background: severityColor(sev) }} />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tools grid */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> ابزارهای ذهن</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${t.gradient} text-white shadow-sm hover-scale transition-all`}
              >
                <div className="absolute -end-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl group-hover:scale-150 transition-transform duration-500" />
                <div className="relative">
                  <Icon className="w-7 h-7 mb-3 opacity-90" />
                  <h4 className="font-bold text-base mb-1">{t.title}</h4>
                  <p className="text-xs opacity-85 leading-relaxed">{t.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
