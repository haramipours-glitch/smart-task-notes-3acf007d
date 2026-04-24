import { eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, format } from "date-fns";
import { formatDate, toPersianDigits, type CalendarSystem } from "@/lib/jalali";
import { isHoliday, type Holiday } from "@/lib/holidays";

type Task = { id: string; title: string; due_date: string | null; priority: string };

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function WeekView({
  date, tasks, holidays, system, onDayClick, onSlotClick,
}: {
  date: Date;
  tasks: Task[];
  holidays: Holiday[];
  system: CalendarSystem;
  onDayClick: (d: Date) => void;
  onSlotClick?: (d: Date, hour: number) => void;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(date), end: endOfWeek(date) });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header row */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-border sticky top-0 z-10">
          <div className="bg-card" />
          {days.map((d) => {
            const off = isHoliday(d, holidays).length > 0 || (system === "jalali" && d.getDay() === 5);
            return (
              <button
                key={d.toISOString()}
                onClick={() => onDayClick(d)}
                className={`bg-card p-1 text-center text-xs hover:bg-accent ${off ? "text-rose-500" : ""} ${isSameDay(d, new Date()) ? "bg-primary/10" : ""}`}
              >
                <div className="font-semibold">
                  {system === "jalali" ? toPersianDigits(formatDate(d, "d", "jalali")) : format(d, "d")}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {system === "jalali" ? formatDate(d, "EEEEEE", "jalali") : format(d, "EEE")}
                </div>
              </button>
            );
          })}
        </div>
        {/* Hour grid */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-border">
          {HOURS.map((h) => (
            <div key={`row-${h}`} className="contents">
              <div className="bg-card text-[10px] text-muted-foreground p-1 text-center border-t">
                {toPersianDigits(String(h).padStart(2, "0"))}
              </div>
              {days.map((d) => {
                const slotTasks = tasks.filter((t) => {
                  if (!t.due_date) return false;
                  const dt = new Date(t.due_date);
                  return isSameDay(dt, d) && dt.getHours() === h;
                });
                return (
                  <button
                    key={`${d.toISOString()}-${h}`}
                    onClick={() => onSlotClick?.(d, h)}
                    className="bg-card border-t min-h-[36px] p-0.5 text-end hover:bg-accent/30 transition"
                  >
                    {slotTasks.map((t) => (
                      <div key={t.id} className="bg-primary/20 text-primary text-[10px] truncate rounded px-1 mb-0.5">
                        {t.title}
                      </div>
                    ))}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
