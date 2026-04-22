import { isSameDay, format } from "date-fns";
import { formatDate, toPersianDigits, type CalendarSystem } from "@/lib/jalali";

type Task = { id: string; title: string; due_date: string | null; priority: string; description?: string | null };

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function DayView({
  date, tasks, system, onSlotClick,
}: {
  date: Date;
  tasks: Task[];
  system: CalendarSystem;
  onSlotClick?: (hour: number) => void;
}) {
  const dayTasks = tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), date));
  const noTime = dayTasks.filter((t) => !t.due_date || new Date(t.due_date!).getHours() === 0);

  return (
    <div className="space-y-2">
      <div className="text-center">
        <div className="text-lg font-bold">
          {system === "jalali" ? formatDate(date, "EEEE d MMMM yyyy", "jalali") : format(date, "EEEE, MMMM d, yyyy")}
        </div>
        <div className="text-xs text-muted-foreground">
          {system === "jalali" ? format(date, "EEEE, MMMM d") : formatDate(date, "EEEE d MMMM yyyy", "jalali")}
        </div>
      </div>

      <div className="border rounded-md divide-y">
        {HOURS.map((h) => {
          const slot = dayTasks.filter((t) => t.due_date && new Date(t.due_date).getHours() === h);
          return (
            <button
              key={h}
              onClick={() => onSlotClick?.(h)}
              className="w-full grid grid-cols-[60px_1fr] gap-2 p-2 text-right hover:bg-accent/40 transition min-h-[44px]"
            >
              <div className="text-xs text-muted-foreground tabular-nums">
                {toPersianDigits(String(h).padStart(2, "0"))}:۰۰
              </div>
              <div className="space-y-1">
                {slot.map((t) => (
                  <div key={t.id} className="bg-primary/20 text-primary text-xs rounded px-2 py-1 truncate">
                    {t.title}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
