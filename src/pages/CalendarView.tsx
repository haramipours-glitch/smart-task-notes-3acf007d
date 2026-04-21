import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getCalendarSystem, setCalendarSystem, formatDate, toPersianDigits, WEEKDAY_SHORT_FA, type CalendarSystem } from "@/lib/jalali";
import { getHolidaysForRange, isHoliday, type Holiday } from "@/lib/holidays";

export default function CalendarView() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [system, setSystem] = useState<CalendarSystem>(getCalendarSystem());

  const persistSystem = (s: CalendarSystem) => {
    setCalendarSystem(s);
    setSystem(s);
  };

  useEffect(() => {
    if (!user) return;
    const start = startOfMonth(month).toISOString();
    const end = endOfMonth(month).toISOString();
    supabase.from("tasks").select("*").gte("due_date", start).lte("due_date", end)
      .then(({ data }) => setTasks(data || []));
  }, [user, month]);

  useEffect(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    getHolidaysForRange(start, end, ["IR", "AU"]).then(setHolidays);
  }, [month]);

  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const headerLabel = system === "jalali"
    ? formatDate(month, "MMMM yyyy", "jalali")
    : `${format(month, "MMMM yyyy")}`;
  const altLabel = system === "jalali"
    ? format(month, "MMM yyyy")
    : formatDate(month, "MMMM yyyy", "jalali");

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">{headerLabel}</h1>
          <p className="text-xs text-muted-foreground">{altLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={system} onValueChange={(v) => persistSystem(v as CalendarSystem)}>
            <TabsList className="h-8">
              <TabsTrigger value="jalali" className="text-xs h-6">شمسی</TabsTrigger>
              <TabsTrigger value="gregorian" className="text-xs h-6">میلادی</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" onClick={() => setMonth(subMonths(month, 1))}><ChevronRight className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setMonth(new Date())}>امروز</Button>
            <Button size="icon" variant="outline" onClick={() => setMonth(addMonths(month, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
      <Card className="p-2">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
          {(system === "jalali" ? WEEKDAY_SHORT_FA : ["S", "M", "T", "W", "T", "F", "S"]).map((d, i) => (
            <div key={i} className="p-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const dayTasks = tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), d));
            const dayHolidays = isHoliday(d, holidays);
            const isFriday = d.getDay() === 5;
            const isOff = dayHolidays.length > 0 || (system === "jalali" && isFriday);
            const dayLabel = system === "jalali"
              ? toPersianDigits(formatDate(d, "d", "jalali"))
              : format(d, "d");
            return (
              <div
                key={d.toISOString()}
                className={`aspect-square border rounded-md p-1 text-xs flex flex-col
                  ${isSameMonth(d, month) ? "" : "opacity-30"}
                  ${isSameDay(d, new Date()) ? "ring-2 ring-primary" : ""}
                  ${isOff ? "bg-rose-500/5 border-rose-500/30" : ""}`}
              >
                <div className={`font-medium flex items-center justify-between ${isOff ? "text-rose-500" : ""}`}>
                  <span>{dayLabel}</span>
                  {dayHolidays.length > 0 && (
                    <span className="text-[8px]">{dayHolidays[0].country_code === "IR" ? "🇮🇷" : "🇦🇺"}</span>
                  )}
                </div>
                <div className="flex-1 overflow-hidden space-y-0.5 mt-0.5">
                  {dayHolidays.slice(0, 1).map(h => (
                    <div key={h.id} className="text-[9px] text-rose-500 truncate" title={h.local_name || h.name}>
                      {h.local_name || h.name}
                    </div>
                  ))}
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
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40" /> تعطیل</span>
        <span>🇮🇷 ایران</span>
        <span>🇦🇺 استرالیا</span>
      </div>
    </div>
  );
}
