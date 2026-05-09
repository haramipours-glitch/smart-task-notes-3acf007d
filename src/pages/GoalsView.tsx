import { useEffect, useMemo, useState } from "react";
import { differenceInDays, differenceInHours } from "date-fns";
import {
  Plus, Sparkles, Trash2, Target, ChevronRight, ChevronDown, TrendingUp,
  Calendar as CalendarIcon, Flag, Repeat, FolderOpen, FileText, Loader2, Check, X, Edit3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatDate, toPersianDigits } from "@/lib/jalali";
import { getAILanguage } from "@/lib/ai";

type Goal = {
  id: string; title: string; description: string | null;
  deadline: string | null; status: string; progress: number; color: string | null;
};
type GoalTask = {
  id: string; title: string; goal_id: string | null;
  goal_level: string | null; due_date: string | null;
  parent_id: string | null; completed: boolean;
};
type KR = {
  id: string; goal_id: string; title: string; unit: string | null;
  start_value: number; current_value: number; target_value: number; position: number;
};
type Habit = { id: string; name: string; icon: string | null; color: string | null; goal_id: string | null };

const GRADIENTS = [
  "from-rose-500 to-orange-500",
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-yellow-500",
  "from-indigo-500 to-purple-500",
];

function gradientFor(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export default function GoalsView() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [krs, setKrs] = useState<KR[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [linkedNotes, setLinkedNotes] = useState<{ id: string; title: string; goal_id: string }[]>([]);
  const [linkedFolders, setLinkedFolders] = useState<{ id: string; name: string; goal_id: string; color: string | null }[]>([]);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [krDraft, setKrDraft] = useState<Record<string, { title: string; target: string; unit: string }>>({});

  const load = async () => {
    if (!user) return;
    const [g, t, k, h, n, f] = await Promise.all([
      supabase.from("goals").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("id,title,goal_id,goal_level,due_date,parent_id,completed").not("goal_id", "is", null),
      supabase.from("goal_key_results").select("*").order("position"),
      supabase.from("habits").select("id,name,icon,color,goal_id"),
      supabase.from("notes").select("id,title,goal_id").not("goal_id", "is", null),
      supabase.from("folders").select("id,name,goal_id,color").not("goal_id", "is", null),
    ]);
    setGoals((g.data || []) as Goal[]);
    setTasks((t.data || []) as GoalTask[]);
    setKrs((k.data || []) as any);
    setHabits((h.data || []) as any);
    setLinkedNotes((n.data || []) as any);
    setLinkedFolders((f.data || []) as any);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`goals-rt-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "goal_key_results" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const createWithAI = async () => {
    if (!title.trim() || !deadline || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("goal-planner", {
        body: { goal: title, deadline, language: getAILanguage() },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      const plan = data as { milestones: Array<any>; key_results?: Array<{ title: string; target: number; unit?: string }> };

      const { data: goal, error: gErr } = await supabase.from("goals").insert({
        user_id: user.id, title, deadline: new Date(deadline).toISOString(),
      }).select().single();
      if (gErr) throw gErr;

      let totalCreated = 0;
      for (const m of plan.milestones || []) {
        const { data: mTask } = await supabase.from("tasks").insert({
          user_id: user.id, title: m.title,
          due_date: m.target_date ? new Date(m.target_date).toISOString() : null,
          priority: "high", goal_id: goal.id, goal_level: "milestone",
        }).select().single();
        totalCreated++;
        if (!mTask) continue;
        for (const w of (m.weekly || [])) {
          const { data: wTask } = await supabase.from("tasks").insert({
            user_id: user.id, title: w.title,
            due_date: w.target_date ? new Date(w.target_date).toISOString() : null,
            priority: "medium", goal_id: goal.id, goal_level: "weekly", parent_id: mTask.id,
          }).select().single();
          totalCreated++;
          if (!wTask) continue;
          for (const d of (w.daily || [])) {
            await supabase.from("tasks").insert({
              user_id: user.id, title: d, priority: "low",
              goal_id: goal.id, goal_level: "daily", parent_id: wTask.id,
            });
            totalCreated++;
          }
        }
      }
      // Optional Key Results from AI
      if (Array.isArray(plan.key_results)) {
        for (let i = 0; i < plan.key_results.length; i++) {
          const k = plan.key_results[i];
          await supabase.from("goal_key_results").insert({
            user_id: user.id, goal_id: goal.id, title: k.title,
            target_value: Number(k.target) || 1, unit: k.unit || null, position: i,
          });
        }
      }
      toast.success(`هدف با ${toPersianDigits(totalCreated)} تسک ساخته شد ✨`);
      setOpen(false); setTitle(""); setDeadline("");
      load();
    } catch (e: any) {
      toast.error(e.message || "خطا در تولید برنامه");
    } finally {
      setGenerating(false);
    }
  };

  const deleteGoal = async (g: Goal) => {
    if (!confirm(`حذف هدف «${g.title}» و تمام زیرتسک‌ها؟`)) return;
    await supabase.from("tasks").delete().eq("goal_id", g.id);
    await supabase.from("goals").delete().eq("id", g.id);
    toast.success("هدف حذف شد");
  };

  const addKR = async (goalId: string) => {
    if (!user) return;
    const draft = krDraft[goalId];
    if (!draft?.title.trim()) return;
    await supabase.from("goal_key_results").insert({
      user_id: user.id, goal_id: goalId, title: draft.title,
      target_value: Number(draft.target) || 1, unit: draft.unit || null,
      position: krs.filter(k => k.goal_id === goalId).length,
    });
    setKrDraft(s => ({ ...s, [goalId]: { title: "", target: "", unit: "" } }));
    toast.success("Key Result اضافه شد");
  };

  const updateKR = async (id: string, patch: Partial<KR>) => {
    await supabase.from("goal_key_results").update(patch).eq("id", id);
  };

  const deleteKR = async (id: string) => {
    await supabase.from("goal_key_results").delete().eq("id", id);
  };

  const linkHabit = async (goalId: string, habitId: string) => {
    await supabase.from("habits").update({ goal_id: goalId }).eq("id", habitId);
    toast.success("عادت متصل شد");
  };

  const unlinkHabit = async (habitId: string) => {
    await supabase.from("habits").update({ goal_id: null }).eq("id", habitId);
  };

  const goalTasks = (id: string) => tasks.filter(t => t.goal_id === id);
  const milestonesOf = (id: string) => goalTasks(id).filter(t => t.goal_level === "milestone");
  const childrenOf = (parentId: string) => tasks.filter(t => t.parent_id === parentId);
  const krsOf = (id: string) => krs.filter(k => k.goal_id === id);
  const habitsOf = (id: string) => habits.filter(h => h.goal_id === id);

  const computedProgress = (id: string) => {
    const all = goalTasks(id);
    const taskRatio = all.length ? all.filter(t => t.completed).length / all.length : null;
    const ks = krsOf(id);
    const krRatios = ks.map(k => {
      const span = (k.target_value - k.start_value) || 1;
      return Math.max(0, Math.min(1, (k.current_value - k.start_value) / span));
    });
    const krAvg = krRatios.length ? krRatios.reduce((a, b) => a + b, 0) / krRatios.length : null;
    const parts = [taskRatio, krAvg].filter(v => v != null) as number[];
    if (!parts.length) return 0;
    return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
  };

  const countdown = (deadline: string | null) => {
    if (!deadline) return null;
    const days = differenceInDays(new Date(deadline), new Date());
    if (days < 0) return { text: "گذشته", days, tone: "danger" as const };
    if (days === 0) {
      const h = differenceInHours(new Date(deadline), new Date());
      return { text: `${toPersianDigits(h)} ساعت باقی`, days, tone: "danger" as const };
    }
    return {
      text: `${toPersianDigits(days)} روز باقی`,
      days,
      tone: days < 7 ? ("danger" as const) : days < 30 ? ("warn" as const) : ("ok" as const),
    };
  };

  const totalProgress = useMemo(() => {
    if (!goals.length) return 0;
    const sum = goals.reduce((a, g) => a + computedProgress(g.id), 0);
    return Math.round(sum / goals.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, tasks, krs]);

  return (
    <div dir="rtl" className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" /> اهداف
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {toPersianDigits(goals.length)} هدف فعال • میانگین پیشرفت {toPersianDigits(totalProgress)}٪
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1">
          <Sparkles className="w-4 h-4" /> هدف جدید با AI
        </Button>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <Card className="p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 grid place-items-center mb-3">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-bold text-lg mb-1">اولین هدفت رو بساز</h2>
          <p className="text-sm text-muted-foreground mb-4">AI کمکت می‌کنه هدف بزرگ رو به milestone ماهانه، تسک هفتگی و گام‌های روزانه بشکنه.</p>
          <Button onClick={() => setOpen(true)} className="gap-1">
            <Sparkles className="w-4 h-4" /> شروع کن
          </Button>
        </Card>
      )}

      {/* Goals */}
      <div className="space-y-5">
        {goals.map((g) => {
          const ms = milestonesOf(g.id);
          const cd = countdown(g.deadline);
          const prog = computedProgress(g.id);
          const ks = krsOf(id => id)(g.id) ?? krsOf(g.id);
          const linkedHabits = habitsOf(g.id);
          const lf = linkedFolders.filter(x => x.goal_id === g.id);
          const ln = linkedNotes.filter(x => x.goal_id === g.id);
          const grad = gradientFor(g.id);
          const draft = krDraft[g.id] || { title: "", target: "", unit: "" };

          return (
            <Card key={g.id} className="overflow-hidden">
              {/* Hero */}
              <div className={`relative bg-gradient-to-br ${grad} p-5 text-white`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold drop-shadow-sm break-words">{g.title}</h2>
                    {g.description && <p className="text-sm/6 opacity-90 mt-1">{g.description}</p>}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {g.deadline && (
                        <Badge className="bg-white/20 hover:bg-white/30 border-0 text-white backdrop-blur">
                          <CalendarIcon className="w-3 h-3 me-1" />
                          {formatDate(new Date(g.deadline), "yyyy/MM/dd")}
                        </Badge>
                      )}
                      {cd && (
                        <Badge className={`border-0 text-white ${
                          cd.tone === "danger" ? "bg-rose-600/80" : cd.tone === "warn" ? "bg-amber-600/80" : "bg-emerald-600/80"
                        }`}>
                          ⏳ {cd.text}
                        </Badge>
                      )}
                      <Badge className="bg-white/20 border-0 text-white">
                        {toPersianDigits(ms.length)} milestone • {toPersianDigits(ks.length)} KR
                      </Badge>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 shrink-0" onClick={() => deleteGoal(g)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {/* Progress ring */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="relative w-14 h-14 shrink-0">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" stroke="rgba(255,255,255,0.25)" strokeWidth="3" fill="none" />
                      <circle cx="18" cy="18" r="16" stroke="white" strokeWidth="3" fill="none"
                        strokeDasharray={`${prog} 100`} strokeLinecap="round" pathLength={100} />
                    </svg>
                    <div className="absolute inset-0 grid place-items-center text-xs font-bold">{toPersianDigits(prog)}٪</div>
                  </div>
                  <div className="flex-1">
                    <Progress value={prog} className="h-2 bg-white/20 [&>div]:bg-white" />
                    <div className="text-[11px] opacity-80 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> پیشرفت بر اساس تسک‌ها و Key Results
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* Key Results */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <Flag className="w-4 h-4 text-primary" /> Key Results
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {ks.length === 0 && (
                      <p className="text-xs text-muted-foreground">هنوز معیار اندازه‌گیری نداری. یه KR عددی اضافه کن تا پیشرفت خودکار محاسبه بشه.</p>
                    )}
                    {ks.map(k => {
                      const span = (k.target_value - k.start_value) || 1;
                      const pct = Math.max(0, Math.min(100, Math.round(((k.current_value - k.start_value) / span) * 100)));
                      return (
                        <div key={k.id} className="rounded-lg border p-2.5 bg-card/50">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium truncate">{k.title}</div>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteKR(k.id)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Input
                              type="number"
                              defaultValue={k.current_value}
                              onBlur={(e) => updateKR(k.id, { current_value: Number(e.target.value) || 0 })}
                              className="h-7 w-20 text-xs"
                            />
                            <span className="text-xs text-muted-foreground">/ {toPersianDigits(k.target_value)} {k.unit || ""}</span>
                            <Progress value={pct} className="flex-1 h-1.5" />
                            <span className="text-xs w-10 text-end font-mono">{toPersianDigits(pct)}٪</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add KR inline */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <Input
                        placeholder="عنوان KR"
                        value={draft.title}
                        onChange={(e) => setKrDraft(s => ({ ...s, [g.id]: { ...draft, title: e.target.value } }))}
                        className="h-8 text-xs flex-1"
                      />
                      <Input
                        placeholder="هدف"
                        type="number"
                        value={draft.target}
                        onChange={(e) => setKrDraft(s => ({ ...s, [g.id]: { ...draft, target: e.target.value } }))}
                        className="h-8 text-xs w-20"
                      />
                      <Input
                        placeholder="واحد"
                        value={draft.unit}
                        onChange={(e) => setKrDraft(s => ({ ...s, [g.id]: { ...draft, unit: e.target.value } }))}
                        className="h-8 text-xs w-20"
                      />
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => addKR(g.id)}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </section>

                {/* Milestones tree */}
                {ms.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                      🏁 Milestones
                    </h3>
                    <div className="space-y-1.5">
                      {ms.map((m) => {
                        const open = expanded[m.id] ?? true;
                        const weekly = childrenOf(m.id);
                        const wDone = weekly.filter(w => w.completed).length;
                        return (
                          <div key={m.id} className="rounded-lg border-s-2 border-primary/40 ps-3 py-1">
                            <button
                              onClick={() => setExpanded(s => ({ ...s, [m.id]: !open }))}
                              className="flex items-center gap-1.5 text-sm font-medium hover:text-primary w-full text-start"
                            >
                              {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              <span className="flex-1 truncate">{m.title}</span>
                              {weekly.length > 0 && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4">
                                  {toPersianDigits(wDone)}/{toPersianDigits(weekly.length)}
                                </Badge>
                              )}
                              {m.due_date && (
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDate(new Date(m.due_date), "MM/dd")}
                                </span>
                              )}
                              {m.completed && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                            </button>
                            {open && weekly.length > 0 && (
                              <div className="mt-1 space-y-0.5 ps-5">
                                {weekly.map((w) => {
                                  const daily = childrenOf(w.id);
                                  const wOpen = expanded[w.id] ?? false;
                                  return (
                                    <div key={w.id}>
                                      <button
                                        onClick={() => setExpanded(s => ({ ...s, [w.id]: !wOpen }))}
                                        className="flex items-center gap-1 text-xs hover:text-primary"
                                      >
                                        {wOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        <span className={w.completed ? "line-through text-muted-foreground" : ""}>📅 {w.title}</span>
                                      </button>
                                      {wOpen && daily.length > 0 && (
                                        <div className="ps-5 mt-0.5 space-y-0.5">
                                          {daily.map((d) => (
                                            <div key={d.id} className={`text-[11px] ${d.completed ? "line-through text-muted-foreground" : ""}`}>
                                              • {d.title}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Linked items */}
                <section>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Repeat className="w-4 h-4 text-primary" /> اتصال‌ها
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {linkedHabits.map(h => (
                      <Badge key={h.id} variant="secondary" className="gap-1 text-[10px] cursor-pointer" onClick={() => unlinkHabit(h.id)}>
                        {h.icon || "🎯"} {h.name} <X className="w-3 h-3" />
                      </Badge>
                    ))}
                    {lf.map(f => (
                      <Badge key={f.id} variant="outline" className="text-[10px] gap-1">
                        <FolderOpen className="w-3 h-3" /> {f.name}
                      </Badge>
                    ))}
                    {ln.map(n => (
                      <Badge key={n.id} variant="outline" className="text-[10px] gap-1">
                        <FileText className="w-3 h-3" /> {n.title}
                      </Badge>
                    ))}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Badge className="cursor-pointer text-[10px] gap-1" variant="outline">
                          <Plus className="w-3 h-3" /> اتصال عادت
                        </Badge>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-1">
                        <div className="text-[10px] text-muted-foreground px-2 py-1">انتخاب عادت</div>
                        {habits.filter(h => !h.goal_id).length === 0 && (
                          <div className="text-xs text-muted-foreground p-2">عادت آزادی باقی نمانده</div>
                        )}
                        {habits.filter(h => !h.goal_id).map(h => (
                          <button
                            key={h.id}
                            onClick={() => linkHabit(g.id, h.id)}
                            className="w-full text-start text-xs px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2"
                          >
                            <span>{h.icon || "🎯"}</span>{h.name}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>
                </section>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> هدف جدید با AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">عنوان هدف</label>
              <Input placeholder="مثلاً: قبولی در امتحان تخصص" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">تاریخ ددلاین</label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <p className="text-[11px] text-muted-foreground bg-muted/40 rounded p-2 leading-6">
              ✨ AI هدف رو به <strong>milestone ماهانه</strong>، <strong>تسک هفتگی</strong> و <strong>گام‌های روزانه</strong> می‌شکنه و در صورت امکان <strong>Key Results عددی</strong> هم پیشنهاد می‌ده.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>انصراف</Button>
            <Button onClick={createWithAI} disabled={generating || !title.trim() || !deadline} className="gap-1">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "در حال تولید..." : "تولید برنامه"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
