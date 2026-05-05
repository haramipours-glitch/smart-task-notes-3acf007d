import { useEffect, useState } from "react";
import { differenceInDays, differenceInHours } from "date-fns";
import { Plus, Sparkles, Trash2, Target, ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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

export default function GoalsView() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [linkedNotes, setLinkedNotes] = useState<{ id: string; title: string; goal_id: string }[]>([]);
  const [linkedFolders, setLinkedFolders] = useState<{ id: string; name: string; goal_id: string; color: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    if (!user) return;
    const [g, t, n, f] = await Promise.all([
      supabase.from("goals").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("id,title,goal_id,goal_level,due_date,parent_id,completed").not("goal_id", "is", null),
      supabase.from("notes").select("id,title,goal_id").not("goal_id", "is", null),
      supabase.from("folders").select("id,name,goal_id,color").not("goal_id", "is", null),
    ]);
    setGoals((g.data || []) as Goal[]);
    setTasks((t.data || []) as GoalTask[]);
    setLinkedNotes((n.data || []) as any);
    setLinkedFolders((f.data || []) as any);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`goals-rt-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const createWithAI = async () => {
    if (!title.trim() || !deadline || !user) return;
    setGenerating(true);
    try {
      // 1. Call AI planner
      const { data, error } = await supabase.functions.invoke("goal-planner", {
        body: { goal: title, deadline, language: getAILanguage() },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      const plan = data as { milestones: Array<any> };

      // 2. Create goal
      const { data: goal, error: gErr } = await supabase.from("goals").insert({
        user_id: user.id, title, deadline: new Date(deadline).toISOString(),
      }).select().single();
      if (gErr) throw gErr;

      // 3. Create hierarchy of tasks
      let totalCreated = 0;
      for (const m of plan.milestones) {
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
      toast.success(`هدف با ${toPersianDigits(totalCreated)} زیرتسک ساخته شد ✨`);
      setOpen(false); setTitle(""); setDeadline("");
      load();
    } catch (e: any) {
      toast.error(e.message || "خطا در تولید برنامه");
    } finally {
      setGenerating(false);
    }
  };

  const deleteGoal = async (g: Goal) => {
    // Delete linked tasks
    await supabase.from("tasks").delete().eq("goal_id", g.id);
    await supabase.from("goals").delete().eq("id", g.id);
    toast.success("هدف حذف شد");
  };

  const goalTasks = (id: string) => tasks.filter(t => t.goal_id === id);
  const milestonesOf = (id: string) => goalTasks(id).filter(t => t.goal_level === "milestone");
  const childrenOf = (parentId: string) => tasks.filter(t => t.parent_id === parentId);

  const goalProgress = (id: string) => {
    const all = goalTasks(id);
    if (all.length === 0) return 0;
    const done = all.filter(t => t.completed).length;
    return Math.round((done / all.length) * 100);
  };

  const countdown = (deadline: string | null) => {
    if (!deadline) return null;
    const days = differenceInDays(new Date(deadline), new Date());
    if (days < 0) return { text: "گذشته", days };
    if (days === 0) {
      const h = differenceInHours(new Date(deadline), new Date());
      return { text: `${toPersianDigits(h)} ساعت باقی‌مانده`, days };
    }
    return { text: `${toPersianDigits(days)} روز باقی‌مانده`, days };
  };

  return (
    <div dir="rtl" className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" /> اهداف
        </h1>
        <Button onClick={() => setOpen(true)} className="gap-1">
          <Sparkles className="w-4 h-4" /> هدف جدید با AI
        </Button>
      </div>

      {goals.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>هنوز هدفی نساختی. روی «هدف جدید با AI» کلیک کن.</p>
        </Card>
      )}

      <div className="space-y-4">
        {goals.map((g) => {
          const ms = milestonesOf(g.id);
          const cd = countdown(g.deadline);
          const prog = goalProgress(g.id);
          return (
            <Card key={g.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold truncate">{g.title}</h2>
                  {g.description && <p className="text-sm text-muted-foreground mt-1">{g.description}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {g.deadline && (
                      <Badge variant="outline" className="text-xs">
                        ددلاین: {formatDate(new Date(g.deadline), "yyyy/MM/dd")}
                      </Badge>
                    )}
                    {cd && (
                      <Badge className={cd.days < 7 ? "bg-rose-500/20 text-rose-600" : "bg-amber-500/20 text-amber-600"}>
                        ⏳ {cd.text}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteGoal(g)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Progress value={prog} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground w-10 text-start">{toPersianDigits(prog)}%</span>
              </div>

              <div className="mt-4 space-y-2">
                {ms.map((m) => {
                  const open = expanded[m.id] ?? true;
                  const weekly = childrenOf(m.id);
                  return (
                    <div key={m.id} className="border-s-2 border-primary/30 ps-3">
                      <button
                        onClick={() => setExpanded(s => ({ ...s, [m.id]: !open }))}
                        className="flex items-center gap-1 text-sm font-medium hover:text-primary"
                      >
                        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        🏁 {m.title}
                        {m.due_date && <span className="text-[10px] text-muted-foreground me-2">({formatDate(new Date(m.due_date), "MM/dd")})</span>}
                        {m.completed && <span className="text-emerald-500">✓</span>}
                      </button>
                      {open && weekly.length > 0 && (
                        <div className="mt-1 space-y-1 ps-4">
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
                                  📅 {w.title}
                                  {w.completed && <span className="text-emerald-500">✓</span>}
                                </button>
                                {wOpen && daily.length > 0 && (
                                  <div className="ps-4 mt-1 space-y-0.5">
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
            </Card>
          );
        })}
      </div>

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
              <Input
                placeholder="مثلاً: قبولی در امتحان تخصص"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">تاریخ ددلاین</label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <p className="text-[11px] text-muted-foreground bg-muted/40 rounded p-2">
              ✨ AI هدف رو به milestone ماهانه، تسک هفتگی و کارهای روزانه می‌شکنه و خودکار می‌سازه.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>انصراف</Button>
            <Button onClick={createWithAI} disabled={generating || !title.trim() || !deadline} className="gap-1">
              <Sparkles className="w-4 h-4" />
              {generating ? "در حال تولید..." : "تولید برنامه"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
