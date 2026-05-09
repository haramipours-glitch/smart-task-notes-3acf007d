import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getCalendarSystem, setCalendarSystem, formatDate, type CalendarSystem } from "@/lib/jalali";
import { getHolidaysForRange, type Holiday } from "@/lib/holidays";
import MonthGrid from "@/components/calendar/MonthGrid";
import WeekView from "@/components/calendar/WeekView";
import DayView from "@/components/calendar/DayView";
import AgendaView from "@/components/calendar/AgendaView";
import DayDetailSheet from "@/components/calendar/DayDetailSheet";
import type { CycleProfile, CycleLog } from "@/lib/cycle";

type ViewMode = "month" | "week" | "day" | "agenda";

export default function CalendarView() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [tasks, setTasks] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [system, setSystem] = useState<CalendarSystem>(getCalendarSystem());
  const [detailDate, setDetailDate] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cycleProfile, setCycleProfile] = useState<CycleProfile | null>(null);
  const [cycleLogs, setCycleLogs] = useState<CycleLog[]>([]);

  // Load active cycle profile + logs (if overlay enabled)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase
        .from("user_settings")
        .select("cycle_overlay_enabled, active_cycle_profile_id")
        .eq("user_id", user.id).maybeSingle();
      if (!(s as any)?.cycle_overlay_enabled || !(s as any)?.active_cycle_profile_id) {
        setCycleProfile(null); setCycleLogs([]); return;
      }
      const pid = (s as any).active_cycle_profile_id;
      const [{ data: prof }, { data: logs }] = await Promise.all([
        supabase.from("cycle_profiles").select("*").eq("id", pid).maybeSingle(),
        supabase.from("cycle_logs").select("*").eq("profile_id", pid).order("log_date", { ascending: false }),
      ]);
      setCycleProfile(prof as any);
      setCycleLogs((logs || []) as any);
    })();
  }, [user]);

  const persistSystem = (s: CalendarSystem) => { setCalendarSystem(s); setSystem(s); };

  // Fetch range based on view
  useEffect(() => {
    if (!user) return;
    let start: Date, end: Date;
    if (view === "month") { start = startOfWeek(startOfMonth(date)); end = endOfWeek(endOfMonth(date)); }
    else if (view === "week") { start = startOfWeek(date); end = endOfWeek(date); }
    else if (view === "day") { start = new Date(date); start.setHours(0,0,0,0); end = new Date(date); end.setHours(23,59,59,999); }
    else { start = startOfMonth(date); end = endOfMonth(date); }
    supabase.from("tasks").select("*")
      .or(`and(due_date.gte.${start.toISOString()},due_date.lte.${end.toISOString()}),and(start_at.gte.${start.toISOString()},start_at.lte.${end.toISOString()})`)
      .then(({ data }) => setTasks(data || []));
    getHolidaysForRange(start, end, ["IR", "AU"]).then(setHolidays);
  }, [user, date, view, refreshKey]);

  const headerLabel = (() => {
    if (view === "day") return system === "jalali" ? formatDate(date, "d MMMM yyyy", "jalali") : format(date, "MMMM d, yyyy");
    if (view === "week") {
      const s = startOfWeek(date), e = endOfWeek(date);
      return system === "jalali"
        ? `${formatDate(s, "d MMM", "jalali")} – ${formatDate(e, "d MMM", "jalali")}`
        : `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
    }
    return system === "jalali" ? formatDate(date, "MMMM yyyy", "jalali") : format(date, "MMMM yyyy");
  })();

  const altLabel = system === "jalali" ? format(date, "MMMM yyyy") : formatDate(date, "MMMM yyyy", "jalali");

  const navigate = (dir: -1 | 1) => {
    if (view === "month") setDate(dir < 0 ? subMonths(date, 1) : addMonths(date, 1));
    else if (view === "week") setDate(dir < 0 ? subWeeks(date, 1) : addWeeks(date, 1));
    else if (view === "day") setDate(dir < 0 ? subDays(date, 1) : addDays(date, 1));
    else setDate(dir < 0 ? subMonths(date, 1) : addMonths(date, 1));
  };

  return (
    <div dir="rtl" className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">{headerLabel}</h1>
          <p className="text-xs text-muted-foreground">{altLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={system} onValueChange={(v) => persistSystem(v as CalendarSystem)}>
            <TabsList className="h-8">
              <TabsTrigger value="jalali" className="text-xs h-6">شمسی</TabsTrigger>
              <TabsTrigger value="gregorian" className="text-xs h-6">میلادی</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" onClick={() => navigate(-1)}><ChevronRight className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setDate(new Date())}>امروز</Button>
            <Button size="icon" variant="outline" onClick={() => navigate(1)}><ChevronLeft className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)} className="mb-3">
        <TabsList>
          <TabsTrigger value="month">ماهانه</TabsTrigger>
          <TabsTrigger value="week">هفتگی</TabsTrigger>
          <TabsTrigger value="day">روزانه</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
        </TabsList>

        <TabsContent value="month">
          <Card className="p-2">
            <MonthGrid month={date} tasks={tasks} holidays={holidays} system={system}
              cycleProfile={cycleProfile} cycleLogs={cycleLogs}
              onDayClick={(d) => setDetailDate(d)} />
          </Card>
        </TabsContent>

        <TabsContent value="week">
          <Card className="p-2">
            <WeekView date={date} tasks={tasks} holidays={holidays} system={system}
              onDayClick={(d) => { setDate(d); setView("day"); }}
              onSlotClick={(d) => setDetailDate(d)} />
          </Card>
        </TabsContent>

        <TabsContent value="day">
          <Card className="p-3">
            <DayView date={date} tasks={tasks} system={system}
              onSlotClick={() => setDetailDate(date)}
              onTaskClick={(id) => nav(`/app/tasks/${id}`)} />
          </Card>
        </TabsContent>

        <TabsContent value="agenda">
          <Card className="p-3">
            <AgendaView start={startOfMonth(date)} end={endOfMonth(date)} tasks={tasks}
              holidays={holidays} system={system} />
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40" /> تعطیل</span>
        <span>🇮🇷 ایران</span>
        <span>🇦🇺 استرالیا</span>
      </div>

      <DayDetailSheet
        date={detailDate}
        open={!!detailDate}
        onOpenChange={(v) => !v && setDetailDate(null)}
        tasks={tasks}
        holidays={holidays}
        system={system}
        onTaskCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
