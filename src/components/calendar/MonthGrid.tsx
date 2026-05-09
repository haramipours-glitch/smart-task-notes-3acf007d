import { format, eachDayOfInterval, isSameDay, isSameMonth, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { formatDate, toPersianDigits, WEEKDAY_SHORT_FA, type CalendarSystem } from "@/lib/jalali";
import { isHoliday, type Holiday } from "@/lib/holidays";
import { computePhase, type CycleProfile, type CycleLog, PHASE_META } from "@/lib/cycle";
type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type Task = { id: string; title: string; due_date: string | null; priority: string };

const PRIORITY_COLOR: Record<string, string> = {
  high: "hsl(var(--destructive))",
  medium: "hsl(var(--primary))",
  low: "hsl(var(--muted-foreground))",
  none: "hsl(var(--muted-foreground) / 0.4)",
};

export default function MonthGrid({
  month, tasks, holidays, system, onDayClick, cycleProfile, cycleLogs,
}: {
  month: Date;
  tasks: Task[];
  holidays: Holiday[];
  system: CalendarSystem;
  onDayClick: (d: Date) => void;
  cycleProfile?: CycleProfile | null;
  cycleLogs?: CycleLog[];
}) {
  const weekStartsOn: WeekStartsOn = system === "jalali" ? 6 : 0;
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn }),
  });
  return (
    <div>
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
          const phase = cycleProfile && cycleLogs ? computePhase(d, cycleLogs, cycleProfile) : null;
          const phaseColor = phase && phase.phase !== "unknown" ? PHASE_META[phase.phase].color : null;
          return (
            <button
              key={d.toISOString()}
              onClick={() => onDayClick(d)}
              style={phaseColor ? { borderColor: `${phaseColor}55`, background: `${phaseColor}${phase?.predicted ? "10" : "20"}` } : undefined}
              className={`aspect-square border rounded-md p-1 text-xs flex flex-col text-end transition hover:bg-accent/50 hover:border-primary/40
                ${isSameMonth(d, month) ? "" : "opacity-30"}
                ${isSameDay(d, new Date()) ? "ring-2 ring-primary" : ""}
                ${isOff && !phaseColor ? "bg-rose-500/5 border-rose-500/30" : ""}`}
            >
              <div className={`font-medium flex items-center justify-between ${isOff ? "text-rose-500" : ""}`}>
                <span>{dayLabel}</span>
                {dayHolidays.length > 0 && (
                  <span className="text-[8px]">{dayHolidays[0].country_code === "IR" ? "🇮🇷" : "🇦🇺"}</span>
                )}
              </div>
              <div className="flex-1 overflow-hidden space-y-0.5 mt-0.5">
                {dayHolidays.slice(0, 1).map((h) => (
                  <div key={h.id} className="text-[9px] text-rose-500 truncate" title={h.local_name || h.name}>
                    {h.local_name || h.name}
                  </div>
                ))}
                {dayTasks.length > 0 && (
                  <div className="flex items-center gap-1 mt-auto">
                    <div className="flex gap-0.5">
                      {dayTasks.slice(0, 3).map((t) => (
                        <span key={t.id} className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.none }} />
                      ))}
                    </div>
                    <span className="text-[9px] text-muted-foreground">{toPersianDigits(dayTasks.length)}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
