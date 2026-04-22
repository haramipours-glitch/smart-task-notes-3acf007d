// Task widgets — saved task views with custom filters/sort
import { supabase } from "@/integrations/supabase/client";

export type WidgetScope = "all" | "today" | "next7" | "inbox" | "folder" | "tag" | "smart";
export type WidgetSort = "created_desc" | "created_asc" | "due_asc" | "due_desc" | "priority" | "title";
export type WidgetDateFilter = "all" | "today" | "overdue" | "this_week" | "this_month" | "no_date";

export type TaskWidget = {
  id: string;
  user_id: string;
  name: string;
  scope: WidgetScope;
  folder_id: string | null;
  tag_id: string | null;
  sort_by: WidgetSort;
  date_filter: WidgetDateFilter;
  show_completed: boolean;
  position: number;
  icon: string | null;
  color: string | null;
};

export const SORT_LABELS: Record<WidgetSort, string> = {
  created_desc: "جدیدترین",
  created_asc: "قدیمی‌ترین",
  due_asc: "نزدیک‌ترین سررسید",
  due_desc: "دورترین سررسید",
  priority: "اولویت",
  title: "حروف الفبا",
};

export const SCOPE_LABELS: Record<WidgetScope, string> = {
  all: "همه تسک‌ها",
  today: "امروز",
  next7: "۷ روز آینده",
  inbox: "Inbox",
  folder: "یک فولدر خاص",
  tag: "یک تگ خاص",
  smart: "هوشمند (مهم)",
};

export const DATE_LABELS: Record<WidgetDateFilter, string> = {
  all: "بدون فیلتر",
  today: "امروز",
  overdue: "گذشته",
  this_week: "این هفته",
  this_month: "این ماه",
  no_date: "بدون تاریخ",
};

export async function listWidgets(): Promise<TaskWidget[]> {
  const { data } = await supabase
    .from("task_widgets")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  return (data || []) as TaskWidget[];
}

export async function createWidget(
  userId: string,
  patch: Partial<TaskWidget> & { name: string }
): Promise<TaskWidget | null> {
  const { data } = await supabase
    .from("task_widgets")
    .insert({ user_id: userId, ...patch })
    .select()
    .single();
  return (data as TaskWidget) || null;
}

export async function updateWidget(id: string, patch: Partial<TaskWidget>) {
  await supabase.from("task_widgets").update(patch).eq("id", id);
}

export async function deleteWidget(id: string) {
  await supabase.from("task_widgets").delete().eq("id", id);
}

// Apply widget filters to a list of tasks
export function applyWidgetFilters<T extends {
  completed: boolean;
  due_date: string | null;
  priority: string;
  title: string;
  folder_id: string | null;
  created_at?: string;
  parent_id?: string | null;
}>(
  tasks: T[],
  widget: TaskWidget,
  taskTagsMap?: Record<string, string[]>
): T[] {
  let list = tasks.filter((t) => !t.parent_id);

  if (!widget.show_completed) list = list.filter((t) => !t.completed);

  // Scope
  if (widget.scope === "inbox") list = list.filter((t) => !t.folder_id);
  else if (widget.scope === "folder" && widget.folder_id)
    list = list.filter((t) => t.folder_id === widget.folder_id);
  else if (widget.scope === "tag" && widget.tag_id && taskTagsMap)
    list = list.filter((t: any) => (taskTagsMap[t.id] || []).includes(widget.tag_id!));
  else if (widget.scope === "smart") list = list.filter((t) => t.priority === "high");

  // Date filter
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
  const startWeek = new Date(startToday); startWeek.setDate(startWeek.getDate() - startWeek.getDay());
  const endWeek = new Date(startWeek); endWeek.setDate(endWeek.getDate() + 7);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const inRange = (d: string | null, s: Date, e: Date) =>
    d && new Date(d).getTime() >= s.getTime() && new Date(d).getTime() <= e.getTime();

  if (widget.scope === "today" || widget.date_filter === "today")
    list = list.filter((t) => inRange(t.due_date, startToday, endToday));
  else if (widget.scope === "next7")
    list = list.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date).getTime();
      return d >= startToday.getTime() && d <= startToday.getTime() + 7 * 86400000;
    });
  else if (widget.date_filter === "overdue")
    list = list.filter((t) => t.due_date && new Date(t.due_date).getTime() < startToday.getTime());
  else if (widget.date_filter === "this_week")
    list = list.filter((t) => inRange(t.due_date, startWeek, endWeek));
  else if (widget.date_filter === "this_month")
    list = list.filter((t) => inRange(t.due_date, startMonth, endMonth));
  else if (widget.date_filter === "no_date")
    list = list.filter((t) => !t.due_date);

  // Sort
  const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };
  list.sort((a, b) => {
    switch (widget.sort_by) {
      case "created_asc":
        return (a.created_at || "").localeCompare(b.created_at || "");
      case "due_asc":
        return (a.due_date || "9999").localeCompare(b.due_date || "9999");
      case "due_desc":
        return (b.due_date || "0000").localeCompare(a.due_date || "0000");
      case "priority":
        return (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4);
      case "title":
        return a.title.localeCompare(b.title);
      case "created_desc":
      default:
        return (b.created_at || "").localeCompare(a.created_at || "");
    }
  });
  return list;
}
