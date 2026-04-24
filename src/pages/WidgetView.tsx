import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, Flag, Trash2, Plus, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRIORITY_META, type Priority } from "@/lib/priority";
import {
  TaskWidget, listWidgets, applyWidgetFilters, deleteWidget,
} from "@/lib/widgets";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WidgetEditor } from "@/components/WidgetEditor";
import { loadSettings, saveSettings } from "@/lib/reminders";

type Task = {
  id: string; title: string; description: string | null; priority: Priority;
  due_date: string | null; completed: boolean; folder_id: string | null;
  created_at?: string; parent_id: string | null;
};

export default function WidgetView() {
  const { user } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<TaskWidget[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTagsMap, setTaskTagsMap] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(params.id || null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TaskWidget | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [layout, setLayout] = useState<"compact" | "comfortable">("comfortable");

  const load = async () => {
    if (!user) return;
    const [w, t, tt, s] = await Promise.all([
      listWidgets(),
      supabase.from("tasks").select("*").order("position"),
      supabase.from("task_tags").select("task_id,tag_id"),
      loadSettings(user.id),
    ]);
    setWidgets(w);
    setTasks(((t.data || []) as unknown) as Task[]);
    const m: Record<string, string[]> = {};
    (tt.data || []).forEach((row: any) => {
      (m[row.task_id] ||= []).push(row.tag_id);
    });
    setTaskTagsMap(m);
    if (s) setLayout(s.task_card_layout);
    if (!activeId && w.length > 0) {
      const def = w.find((x) => x.id === s?.default_widget_id) || w[0];
      setActiveId(def.id);
    }
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`widgets-rt-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_widgets" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const active = widgets.find((w) => w.id === activeId);
  const filtered = useMemo(
    () => (active ? applyWidgetFilters(tasks as any, active, taskTagsMap) : []),
    [active, tasks, taskTagsMap]
  );

  const addQuick = async () => {
    if (!newTitle.trim() || !user) return;
    const folder_id = active?.scope === "folder" ? active.folder_id : null;
    const due = active?.scope === "today" ? new Date().toISOString() : null;
    const { data } = await supabase.from("tasks").insert({
      user_id: user.id, title: newTitle, folder_id, due_date: due,
    }).select().single();
    if (data && active?.scope === "tag" && active.tag_id) {
      await supabase.from("task_tags").insert({ task_id: data.id, tag_id: active.tag_id, user_id: user.id });
    }
    setNewTitle("");
  };

  const toggle = async (t: Task) => {
    setTasks((p) => p.map((x) => x.id === t.id ? { ...x, completed: !x.completed } : x));
    await supabase.from("tasks").update({
      completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : null,
    }).eq("id", t.id);
  };

  const setAsDefault = async () => {
    if (!user || !active) return;
    await saveSettings(user.id, { default_widget_id: active.id, default_landing: "widget" } as any);
    toast.success(`«${active.name}» به‌عنوان صفحه پیش‌فرض تنظیم شد`);
  };

  const delActive = async () => {
    if (!active) return;
    if (!confirm(`ویجت «${active.name}» حذف شود؟`)) return;
    await deleteWidget(active.id);
    setActiveId(null);
    toast.success("حذف شد");
  };

  if (widgets.length === 0) {
    return (
      <div dir="rtl" className="p-6 max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold">ویجت‌ها</h1>
        <p className="text-muted-foreground">هنوز ویجتی نساخته‌ای. اولین ویجت سفارشی خودت رو بساز.</p>
        <Button onClick={() => { setEditing(null); setEditorOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> ساخت ویجت جدید
        </Button>
        <WidgetEditor open={editorOpen} onOpenChange={setEditorOpen} widget={editing} onSaved={load} />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <Tabs value={activeId || ""} onValueChange={setActiveId} className="flex-1 min-w-0">
          <TabsList className="overflow-x-auto max-w-full flex-wrap h-auto">
            {widgets.map((w) => (
              <TabsTrigger key={w.id} value={w.id} className="text-xs">
                {w.icon || "📋"} {w.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => { setEditing(null); setEditorOpen(true); }} title="جدید">
            <Plus className="w-4 h-4" />
          </Button>
          {active && (
            <>
              <Button size="icon" variant="ghost" onClick={() => { setEditing(active); setEditorOpen(true); }} title="ویرایش">
                <SettingsIcon className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={setAsDefault} className="text-xs">پیش‌فرض</Button>
              <Button size="icon" variant="ghost" onClick={delActive} className="text-destructive" title="حذف">
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          placeholder="+ تسک سریع..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addQuick()}
        />
        <Button onClick={addQuick}><Plus className="w-4 h-4" /></Button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">تسکی برای این ویجت نیست</Card>
        )}
        {filtered.map((t: any) => (
          <TaskCard key={t.id} task={t as Task} layout={layout} onToggle={() => toggle(t as Task)} onOpen={() => navigate(`/app/inbox`)} />
        ))}
      </div>

      <WidgetEditor open={editorOpen} onOpenChange={setEditorOpen} widget={editing} onSaved={load} />
    </div>
  );
}

function TaskCard({ task, layout, onToggle, onOpen }: {
  task: Task; layout: "compact" | "comfortable"; onToggle: () => void; onOpen: () => void;
}) {
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.none;
  return (
    <Card className={`hover:shadow-soft transition-shadow border-s-4 ${pm.borderClass} ${layout === "compact" ? "p-2" : "p-3"}`}>
      <div className="flex items-start gap-2">
        <Checkbox checked={task.completed} onCheckedChange={onToggle} className="mt-1 shrink-0" />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
          <p className={`${layout === "compact" ? "text-sm" : "text-base"} font-medium leading-snug ${task.completed ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </p>
          {(task.priority !== "none" || task.due_date) && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {task.priority !== "none" && (
                <Badge variant="outline" className={`text-[10px] gap-1 px-1.5 py-0 h-5 ${pm.bgClass} ${pm.textClass}`}>
                  <Flag className="w-2.5 h-2.5" /> {pm.label}
                </Badge>
              )}
              {task.due_date && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 h-5">
                  <Calendar className="w-2.5 h-2.5" />
                  {format(new Date(task.due_date), "MMM d")}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
