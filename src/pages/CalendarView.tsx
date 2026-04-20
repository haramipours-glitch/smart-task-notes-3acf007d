import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CalendarView() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const start = startOfMonth(month).toISOString();
    const end = endOfMonth(month).toISOString();
    supabase.from("tasks").select("*").gte("due_date", start).lte("due_date", end)
      .then(({ data }) => setTasks(data || []));
  }, [user, month]);

  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{format(month, "MMMM yyyy")}</h1>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" onClick={() => setMonth(subMonths(month, 1))}><ChevronRight className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setMonth(new Date())}>امروز</Button>
          <Button size="icon" variant="outline" onClick={() => setMonth(addMonths(month, 1))}><ChevronLeft className="w-4 h-4" /></Button>
        </div>
      </div>
      <Card className="p-2">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="p-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const dayTasks = tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), d));
            return (
              <div key={d.toISOString()} className={`aspect-square border rounded-md p-1 text-xs flex flex-col
                ${isSameMonth(d, month) ? "" : "opacity-30"}
                ${isSameDay(d, new Date()) ? "ring-2 ring-primary" : ""}`}>
                <div className="font-medium">{format(d, "d")}</div>
                <div className="flex-1 overflow-hidden space-y-0.5">
                  {dayTasks.slice(0, 2).map((t) => (
                    <div key={t.id} className="bg-primary/20 text-primary truncate rounded px-1">{t.title}</div>
                  ))}
                  {dayTasks.length > 2 && <div className="text-muted-foreground">+{dayTasks.length - 2}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
