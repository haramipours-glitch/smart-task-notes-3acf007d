import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CalendarDays, ListTodo, Clock, Flag, ArrowUpDown, Calendar, Check, ChevronDown, Maximize2, Plus } from "lucide-react";
import { toPersianDigits } from "@/lib/persianDigits";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

type Range = "today" | "tomorrow" | "week";
type SortKey = "time" | "priority" | "created";

type Task = {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  completed: boolean;
};

const SORT_KEY = "home_range_sort_v1";
const RANGE_KEY = "home_range_tab_v1";
const OPEN_KEY = "home_range_open_v1";

function priorityRank(p: string) {
  return p === "urgent" ? 0 : p === "high" ? 1 : p === "medium" ? 2 : p === "low" ? 3 : 4;
}

function priorityBadge(p: string) {
  const cls =
    p === "urgent" ? "bg-red-600/20 text-red-700 dark:text-red-300" :
    p === "high" ? "bg-destructive/15 text-destructive" :
    p === "medium" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
    p === "low" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" :
    "bg-muted text-muted-foreground";
  const label = p === "urgent" ? "فوق فوری" : p === "high" ? "فوری" : p === "medium" ? "متوسط" : p === "low" ? "پایین" : "بدون";
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function timeLabel(iso: string | null) {
  if (!iso) return "بدون زمان";
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const same = d.toDateString() === new Date().toDateString();
  const t = d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  if (same) return t;
  const day = d.toLocaleDateString("fa-IR", { weekday: "short", day: "numeric", month: "short" });
  return `${day} · ${t}`;
}

export function HomeRangeTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>(() => {
    try { return (localStorage.getItem(RANGE_KEY) as Range) || "today"; } catch { return "today"; }
  });
  const [sort, setSort] = useState<SortKey>(() => {
    try { return (localStorage.getItem(SORT_KEY) as SortKey) || "time"; } catch { return "time"; }
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<boolean>(() => {
    try { const v = localStorage.getItem(OPEN_KEY); return v === null ? true : v === "1"; } catch { return true; }
  });
  const toggleOpen = (v: boolean) => {
    haptic("light");
    setOpen(v);
    try { localStorage.setItem(OPEN_KEY, v ? "1" : "0"); } catch {}
  };

  const bounds = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    if (range === "today") end.setDate(end.getDate() + 1);
    else if (range === "tomorrow") { start.setDate(start.getDate() + 1); end.setDate(end.getDate() + 2); }
    else end.setDate(end.getDate() + 7);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [range]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    supabase.from("tasks")
      .select("id,title,priority,due_date,created_at,completed")
      .eq("user_id", user.id)
      .eq("completed", false)
      .gte("due_date", bounds.start)
      .lt("due_date", bounds.end)
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { toast.error("خطا در بارگذاری تسک‌ها"); setTasks([]); }
        else setTasks((data as Task[]) || []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, bounds.start, bounds.end]);

  const sorted = useMemo(() => {
    const arr = [...tasks];
    if (sort === "time") {
      arr.sort((a, b) => {
        const at = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bt = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return at - bt;
      });
    } else if (sort === "priority") {
      arr.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
    } else {
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return arr;
  }, [tasks, sort]);

  const changeRange = (r: Range) => {
    haptic("light");
    setRange(r);
    try { localStorage.setItem(RANGE_KEY, r); } catch {}
  };
  const changeSort = (s: SortKey) => {
    haptic("light");
    setSort(s);
    try { localStorage.setItem(SORT_KEY, s); } catch {}
  };

  const toggleDone = async (id: string) => {
    haptic("success");
    setTasks((arr) => arr.filter((t) => t.id !== id));
    await supabase.from("tasks").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", id);
  };

  const sortLabel = sort === "time" ? "زمان" : sort === "priority" ? "اولویت" : "جدیدترین";

  const countLabel = sorted.length > 0 ? toPersianDigits(sorted.length) : "۰";

  return (
    <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
      <Collapsible open={open} onOpenChange={toggleOpen}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-start hover:opacity-80 transition">
              <ChevronDown className={`w-4 h-4 transition-transform ${open ? "" : "-rotate-90"}`} />
              <ListTodo className="w-4 h-4 text-blue-500" />
              <span>برنامه‌ی بازه‌ی زمانی</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-300 font-normal">
                {countLabel}
              </span>
            </CollapsibleTrigger>
            <div className="flex items-center gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label="افزودن تسک به این بازه"
                onClick={(e) => {
                  e.stopPropagation();
                  haptic("light");
                  const d = new Date();
                  if (range === "tomorrow") d.setDate(d.getDate() + 1);
                  d.setHours(9, 0, 0, 0);
                  navigate(`/app/new/task?due_date=${encodeURIComponent(d.toISOString())}`);
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label="نمایش کامل"
                onClick={(e) => {
                  e.stopPropagation();
                  haptic("light");
                  const path = range === "today" ? "/app/today" : range === "tomorrow" ? "/app/tomorrow" : "/app/next7";
                  navigate(path);
                }}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={() => haptic("light")}>
                  <ArrowUpDown className="w-3 h-3" /> مرتب: {sortLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">مرتب‌سازی</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => changeSort("time")}>
                  <Clock className="w-3.5 h-3.5 ms-1" /> زمان
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeSort("priority")}>
                  <Flag className="w-3.5 h-3.5 ms-1" /> اولویت
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeSort("created")}>
                  <Calendar className="w-3.5 h-3.5 ms-1" /> جدیدترین
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </CardTitle>
        </CardHeader>
        <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
          <CardContent>
            <Tabs value={range} onValueChange={(v) => changeRange(v as Range)}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="today" className="text-xs gap-1">
                  <ListTodo className="w-3.5 h-3.5" /> امروز
                </TabsTrigger>
                <TabsTrigger value="tomorrow" className="text-xs gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> فردا
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs gap-1">
                  <Calendar className="w-3.5 h-3.5" /> هفته
                </TabsTrigger>
              </TabsList>
              <TabsContent value={range} className="mt-3">
                {loading ? (
                  <p className="text-xs text-muted-foreground text-center py-6">در حال بارگذاری…</p>
                ) : sorted.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                    هیچ تسکی در این بازه نیست. 🌿
                  </p>
                ) : (
                  <ul className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                    {sorted.map((t) => (
                      <li key={t.id}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border/60 hover:bg-accent/30 transition">
                        <button
                          onClick={() => toggleDone(t.id)}
                          className="w-5 h-5 rounded-full border-2 border-muted-foreground/40 hover:border-emerald-500 flex items-center justify-center shrink-0"
                          aria-label="انجام شد"
                        >
                          <Check className="w-3 h-3 opacity-0 hover:opacity-100" />
                        </button>
                        <button
                          onClick={() => { haptic("light"); navigate(`/app/tasks/${t.id}`); }}
                          className="flex-1 text-end min-w-0"
                        >
                          <div className="text-sm font-medium break-words line-clamp-2">{t.title}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5 justify-end">
                            <Clock className="w-3 h-3" />
                            <span>{toPersianDigits(timeLabel(t.due_date))}</span>
                          </div>
                        </button>
                        {priorityBadge(t.priority)}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
