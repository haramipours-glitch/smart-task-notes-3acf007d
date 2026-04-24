import { useEffect, useState } from "react";
import { format, isSameDay } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Activity, FileText, ListChecks } from "lucide-react";
import { formatDate, toPersianDigits, type CalendarSystem } from "@/lib/jalali";
import { isHoliday, type Holiday } from "@/lib/holidays";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Task = { id: string; title: string; due_date: string | null; priority: string };

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function DayDetailSheet({
  date, open, onOpenChange, tasks, holidays, system, onTaskCreated,
}: {
  date: Date | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tasks: Task[];
  holidays: Holiday[];
  system: CalendarSystem;
  onTaskCreated?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkin, setCheckin] = useState<any>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newHour, setNewHour] = useState<number>(9);

  useEffect(() => {
    if (!date || !user || !open) return;
    const ds = format(date, "yyyy-MM-dd");
    supabase.from("daily_checkins").select("*").eq("checkin_date", ds).maybeSingle()
      .then(({ data }) => setCheckin(data));
  }, [date, user, open]);

  if (!date) return null;
  const dayTasks = tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), date));
  const dayHolidays = isHoliday(date, holidays);
  const isFriday = date.getDay() === 5;

  const addTask = async () => {
    if (!newTitle.trim() || !user) return;
    const dt = new Date(date);
    dt.setHours(newHour, 0, 0, 0);
    const { error } = await supabase.from("tasks").insert({
      title: newTitle, user_id: user.id, due_date: dt.toISOString(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("تسک ثبت شد");
      setNewTitle("");
      onTaskCreated?.();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-right">
          <SheetTitle className="flex items-center justify-between">
            <span>
              {system === "jalali"
                ? formatDate(date, "EEEE d MMMM yyyy", "jalali")
                : format(date, "EEEE, MMMM d, yyyy")}
            </span>
            {dayHolidays.length > 0 && (
              <span className="text-xs text-rose-500">{dayHolidays[0].country_code === "IR" ? "🇮🇷" : "🇦🇺"} {dayHolidays[0].local_name || dayHolidays[0].name}</span>
            )}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {system === "jalali" ? format(date, "EEEE, MMMM d, yyyy") : formatDate(date, "EEEE d MMMM yyyy", "jalali")}
            {(system === "jalali" && isFriday) && <span className="text-rose-500 mr-2">• تعطیل</span>}
          </p>
        </SheetHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {/* Hourly Timeline */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold flex items-center gap-2"><ListChecks className="w-4 h-4" /> خط‌زمان</h3>
            <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
              {HOURS.map((h) => {
                const slot = dayTasks.filter((t) => t.due_date && new Date(t.due_date).getHours() === h);
                return (
                  <div key={h} className="grid grid-cols-[40px_1fr] gap-2 p-1 text-xs min-h-[28px]">
                    <div className="text-muted-foreground tabular-nums">{toPersianDigits(String(h).padStart(2, "0"))}</div>
                    <div className="space-y-0.5">
                      {slot.map((t) => (
                        <div key={t.id} className="bg-primary/20 text-primary rounded px-1.5 py-0.5 truncate">{t.title}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {/* Quick Add */}
            <div className="border rounded-md p-3 space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> تسک جدید برای این روز</h3>
              <Input placeholder="عنوان تسک" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} />
              <div className="flex items-center gap-2">
                <select
                  className="flex h-9 rounded-md border bg-background px-2 text-sm flex-1"
                  value={newHour}
                  onChange={(e) => setNewHour(+e.target.value)}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{toPersianDigits(String(h).padStart(2, "0"))}:۰۰</option>
                  ))}
                </select>
                <Button onClick={addTask} size="sm">افزودن</Button>
              </div>
            </div>

            {/* Check-in */}
            <div className="border rounded-md p-3 space-y-1">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Activity className="w-4 h-4" /> Check-in</h3>
              {checkin ? (
                <div className="text-xs grid grid-cols-2 gap-1 text-muted-foreground">
                  {checkin.mood != null && <div>خلق: {toPersianDigits(checkin.mood)}/۱۰</div>}
                  {checkin.energy != null && <div>انرژی: {toPersianDigits(checkin.energy)}/۱۰</div>}
                  {checkin.focus != null && <div>تمرکز: {toPersianDigits(checkin.focus)}/۱۰</div>}
                  {checkin.stress != null && <div>استرس: {toPersianDigits(checkin.stress)}/۱۰</div>}
                  {checkin.sleep_hours != null && <div>خواب: {toPersianDigits(checkin.sleep_hours)} ساعت</div>}
                </div>
              ) : (
                <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/app/checkin")}>
                  ثبت Check-in
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
