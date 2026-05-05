import { useEffect, useState } from "react";
import { Plus, Flame, Trash2, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, subDays, isSameDay, startOfWeek } from "date-fns";
import { toast } from "sonner";

type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: "daily" | "weekly";
  target_per_week: number;
};
type Log = { habit_id: string; log_date: string };

export default function HabitsView() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [target, setTarget] = useState<number>(7);

  const load = async () => {
    if (!user) return;
    const [h, l] = await Promise.all([
      supabase.from("habits").select("*"),
      supabase.from("habit_logs").select("habit_id, log_date").gte("log_date", format(subDays(new Date(), 60), "yyyy-MM-dd")),
    ]);
    setHabits((h.data || []) as any);
    setLogs((l.data || []) as any);
  };
  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!name.trim() || !user) return;
    const { error } = await supabase.from("habits").insert({
      user_id: user.id,
      name,
      frequency,
      target_per_week: frequency === "daily" ? 7 : Math.max(1, Math.min(7, target)),
    } as any);
    if (error) toast.error(error.message);
    else { setName(""); load(); }
  };

  const toggle = async (habit_id: string, date: Date) => {
    if (!user) return;
    const d = format(date, "yyyy-MM-dd");
    const exists = logs.find((l) => l.habit_id === habit_id && l.log_date === d);
    if (exists) {
      await supabase.from("habit_logs").delete().eq("habit_id", habit_id).eq("log_date", d);
    } else {
      await supabase.from("habit_logs").insert({ habit_id, user_id: user.id, log_date: d });
    }
    load();
  };

  const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));

  // Streak that respects frequency:
  // - daily: consecutive days
  // - weekly: consecutive weeks where target met
  const streak = (h: Habit) => {
    if (h.frequency === "weekly") {
      let s = 0;
      for (let w = 0; w < 52; w++) {
        const wkStart = startOfWeek(subDays(new Date(), w * 7), { weekStartsOn: 6 });
        const count = logs.filter((l) => {
          if (l.habit_id !== h.id) return false;
          const ld = new Date(l.log_date);
          const diff = (ld.getTime() - wkStart.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff < 7;
        }).length;
        if (count >= (h.target_per_week || 1)) s++;
        else if (w > 0) break;
        else break;
      }
      return s;
    }
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (logs.find((l) => l.habit_id === h.id && l.log_date === d)) s++;
      else if (i > 0) break;
      else break;
    }
    return s;
  };

  const weekProgress = (h: Habit) => {
    const wkStart = startOfWeek(new Date(), { weekStartsOn: 6 });
    const count = logs.filter((l) => {
      if (l.habit_id !== h.id) return false;
      const ld = new Date(l.log_date);
      const diff = (ld.getTime() - wkStart.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff < 7;
    }).length;
    return { count, target: h.target_per_week || 7 };
  };

  return (
    <div dir="rtl" className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">عادت‌ها</h1>
      <Card className="p-3 mb-6 space-y-2">
        <Input placeholder="عادت جدید..." value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={() => { setFrequency("daily"); setTarget(7); }}
              className={`px-3 py-1.5 text-xs ${frequency === "daily" ? "bg-primary text-primary-foreground" : ""}`}
            >روزانه</button>
            <button
              type="button"
              onClick={() => { setFrequency("weekly"); setTarget(3); }}
              className={`px-3 py-1.5 text-xs ${frequency === "weekly" ? "bg-primary text-primary-foreground" : ""}`}
            >هفتگی</button>
          </div>
          {frequency === "weekly" && (
            <div className="flex items-center gap-1 text-xs">
              <Target className="w-3 h-3" />
              <span>هدف:</span>
              <Input
                type="number"
                min={1}
                max={7}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value) || 1)}
                className="h-7 w-16 text-xs"
              />
              <span>روز/هفته</span>
            </div>
          )}
          <Button onClick={add} size="sm" className="ms-auto"><Plus className="w-4 h-4" /></Button>
        </div>
      </Card>

      <div className="space-y-3">
        {habits.map((h) => {
          const wp = weekProgress(h);
          const met = wp.count >= wp.target;
          return (
            <Card key={h.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">{h.icon}</span>
                  <span className="font-medium">{h.name}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 ms-2">
                    <Flame className={`w-3 h-3 ${streak(h) > 0 ? "text-orange-500" : "text-muted-foreground"}`} /> {streak(h)}
                  </span>
                  <Badge variant={met ? "default" : "outline"} className="text-[10px]">
                    {h.frequency === "weekly"
                      ? `${wp.count}/${wp.target} هفته`
                      : "روزانه"}
                  </Badge>
                </div>
                <Button size="icon" variant="ghost" onClick={async () => {
                  await supabase.from("habits").delete().eq("id", h.id);
                  load();
                }}><Trash2 className="w-3 h-3" /></Button>
              </div>
              <div className="flex gap-1 justify-between">
                {days.map((d) => {
                  const done = logs.some((l) => l.habit_id === h.id && isSameDay(new Date(l.log_date), d));
                  return (
                    <button key={d.toISOString()} onClick={() => toggle(h.id, d)}
                      className={`flex-1 aspect-square rounded-md flex flex-col items-center justify-center text-xs transition
                        ${done ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
                      <span>{format(d, "EEE")[0]}</span>
                      <span className="font-bold">{format(d, "d")}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
        {habits.length === 0 && <Card className="p-8 text-center text-muted-foreground">هنوز عادتی نداری</Card>}
      </div>
    </div>
  );
}
