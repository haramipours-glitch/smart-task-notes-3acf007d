import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Clock, ListChecks } from "lucide-react";
import PomodoroTimer from "@/components/PomodoroTimer";

type SessionRow = { duration_minutes: number; task_id: string | null; ended_at: string | null; tasks?: { title: string } | null };

export default function PomodoroView() {
  const { user } = useAuth();
  const [today, setToday] = useState<SessionRow[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    supabase.from("pomodoro_sessions")
      .select("duration_minutes, task_id, ended_at, tasks(title)")
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("started_at", start.toISOString())
      .order("ended_at", { ascending: false })
      .then(({ data }) => setToday((data as any) || []));
  }, [user, refreshTick]);

  const totalMin = today.reduce((s, r) => s + (r.duration_minutes || 0), 0);
  const taskTotals = new Map<string, { title: string; min: number }>();
  let freeMin = 0;
  for (const r of today) {
    if (r.task_id && r.tasks) {
      const cur = taskTotals.get(r.task_id) || { title: r.tasks.title, min: 0 };
      cur.min += r.duration_minutes;
      taskTotals.set(r.task_id, cur);
    } else freeMin += r.duration_minutes;
  }

  return (
    <div dir="rtl" className="p-4 md:p-6 max-w-md mx-auto space-y-4">
      <Card className="p-6">
        <PomodoroTimer onSessionComplete={() => setRefreshTick(t => t + 1)} />
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> امروز
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-bold tabular-nums text-primary text-center">
            {totalMin} <span className="text-sm font-normal text-muted-foreground">دقیقه تمرکز</span>
          </div>
          <div className="text-xs text-muted-foreground text-center">{today.length} جلسه کامل</div>

          {(taskTotals.size > 0 || freeMin > 0) && (
            <div className="border-t pt-3 mt-3 space-y-1.5">
              <div className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                <ListChecks className="w-3 h-3" /> تفکیک
              </div>
              {Array.from(taskTotals.entries()).map(([id, v]) => (
                <div key={id} className="flex justify-between text-sm">
                  <span className="truncate flex-1 ms-2">{v.title}</span>
                  <span className="tabular-nums text-muted-foreground">{v.min}د</span>
                </div>
              ))}
              {freeMin > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">بدون تسک</span>
                  <span className="tabular-nums text-muted-foreground">{freeMin}د</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
