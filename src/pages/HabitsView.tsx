import { useEffect, useState } from "react";
import { Plus, Flame, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { format, subDays, isSameDay } from "date-fns";
import { toast } from "sonner";

type Habit = { id: string; name: string; icon: string; color: string };
type Log = { habit_id: string; log_date: string };

export default function HabitsView() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [name, setName] = useState("");

  const load = async () => {
    if (!user) return;
    const [h, l] = await Promise.all([
      supabase.from("habits").select("*"),
      supabase.from("habit_logs").select("habit_id, log_date").gte("log_date", format(subDays(new Date(), 30), "yyyy-MM-dd")),
    ]);
    setHabits((h.data || []) as any);
    setLogs((l.data || []) as any);
  };
  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!name.trim() || !user) return;
    const { error } = await supabase.from("habits").insert({ user_id: user.id, name });
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

  const streak = (habit_id: string) => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (logs.find((l) => l.habit_id === habit_id && l.log_date === d)) s++;
      else if (i > 0) break;
    }
    return s;
  };

  return (
    <div dir="rtl" className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">عادت‌ها</h1>
      <div className="flex gap-2 mb-6">
        <Input placeholder="عادت جدید..." value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add}><Plus className="w-4 h-4" /></Button>
      </div>

      <div className="space-y-3">
        {habits.map((h) => (
          <Card key={h.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{h.icon}</span>
                <span className="font-medium">{h.name}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                  <Flame className="w-3 h-3 text-warning" /> {streak(h.id)}
                </span>
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
        ))}
        {habits.length === 0 && <Card className="p-8 text-center text-muted-foreground">هنوز عادتی نداری</Card>}
      </div>
    </div>
  );
}
