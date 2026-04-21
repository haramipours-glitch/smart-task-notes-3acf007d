import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import { Plus, Calendar, Trash2, Sparkles, ChevronRight, ChevronDown, Flag, FileText, GripVertical, CornerDownRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PRIORITY_META, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import { RecurrenceEditor } from "@/components/RecurrenceEditor";
import { TaskAIPanel } from "@/components/TaskAIPanel";
import { RichEditor } from "@/components/RichEditor";
import { describeRule, nextOccurrence, type RecurrenceRule } from "@/lib/recurrence";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
  closestCenter, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Task = {
  id: string; title: string; description: string | null; priority: Priority;
  due_date: string | null; completed: boolean; folder_id: string | null; reminder_at: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  recurrence_rule: RecurrenceRule | null;
  parent_id: string | null;
};
type TaskNote = { id: string; title: string; content: string };
type ConfirmState = { kind: "task" | "note" | "subtask-row"; id: string; title: string; onConfirm: () => Promise<void> } | null;

export default function TasksView({ scope }: { scope: "inbox" | "today" | "next7" | "smart" | "folder" | "tag" }) {
  const { user } = useAuth();
  const params = useParams();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState("");
  const [selected, setSelected] = useState<Task | null>(null);
  const [folderName, setFolderName] = useState("");
  const [tagName, setTagName] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [quickSub, setQuickSub] = useState<Record<string, string>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const title = {
    inbox: "Inbox", today: "امروز", next7: "۷ روز آینده",
    smart: "Smart Lists", folder: folderName || "فولدر", tag: `#${tagName || "تگ"}`,
  }[scope];

  // Build children map
  const childrenMap = useMemo(() => {
    const m: Record<string, Task[]> = {};
    allTasks.forEach(t => {
      if (t.parent_id) (m[t.parent_id] ||= []).push(t);
    });
    return m;
  }, [allTasks]);

  const load = async () => {
    if (!user) return;
    // Always fetch ALL user's tasks for tree completeness, then filter top-level by scope
    const { data: allData } = await supabase.from("tasks").select("*").order("position").order("created_at", { ascending: false });
    const all = ((allData || []) as unknown) as Task[];
    setAllTasks(all);

    if (scope === "folder" && params.id) {
      const { data: f } = await supabase.from("folders").select("name").eq("id", params.id).single();
      if (f) setFolderName(f.name);
    } else if (scope === "tag" && params.id) {
      const { data: tg } = await supabase.from("tags").select("name").eq("id", params.id).single();
      if (tg) setTagName(tg.name);
    }
  };

  useEffect(() => { load(); }, [user, scope, params.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`tasks-rt-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "subtasks" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Filter top-level visible tasks per scope
  const topLevel = useMemo(() => {
    let list = allTasks.filter(t => !t.parent_id);
    if (scope === "inbox") list = list.filter(t => !t.folder_id);
    else if (scope === "today") {
      const s = startOfDay(new Date()).getTime(); const e = endOfDay(new Date()).getTime();
      list = list.filter(t => t.due_date && new Date(t.due_date).getTime() >= s && new Date(t.due_date).getTime() <= e);
    } else if (scope === "next7") {
      const s = startOfDay(new Date()).getTime(); const e = endOfDay(addDays(new Date(), 7)).getTime();
      list = list.filter(t => t.due_date && new Date(t.due_date).getTime() >= s && new Date(t.due_date).getTime() <= e);
    } else if (scope === "smart") {
      list = list.filter(t => t.priority === "high" && !t.completed);
    } else if (scope === "folder") {
      list = list.filter(t => t.folder_id === params.id);
    }
    list.sort((a, b) => (PRIORITY_META[a.priority]?.rank ?? 3) - (PRIORITY_META[b.priority]?.rank ?? 3));
    return list;
  }, [allTasks, scope, params.id]);

  const addTask = async (parent_id: string | null = null) => {
    if (!newTitle.trim() || !user) return;
    const folder_id = scope === "folder" ? params.id || null : null;
    const due = scope === "today" ? new Date().toISOString()
      : scope === "next7" ? addDays(new Date(), 1).toISOString() : null;
    const { data, error } = await supabase.from("tasks").insert({
      user_id: user.id, title: newTitle, folder_id: parent_id ? null : folder_id,
      due_date: parent_id ? null : due, parent_id,
    }).select().single();
    if (error) toast.error(error.message);
    else {
      setNewTitle("");
      // optimistic update so user sees it immediately
      if (data) setAllTasks((prev) => [data as any, ...prev]);
      if (scope === "tag" && params.id && data && !parent_id) {
        await supabase.from("task_tags").insert({ task_id: data.id, tag_id: params.id, user_id: user.id });
      }
    }
  };

  const toggleTask = async (t: Task) => {
    const newCompleted = !t.completed;
    setAllTasks(prev => prev.map(x => x.id === t.id ? { ...x, completed: newCompleted } : x));
    await supabase.from("tasks").update({
      completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null,
    }).eq("id", t.id);

    if (newCompleted && t.recurrence_rule && user) {
      const base = t.due_date ? new Date(t.due_date) : new Date();
      const next = nextOccurrence(t.recurrence_rule, base);
      if (next) {
        await supabase.from("tasks").insert({
          user_id: user.id, title: t.title, description: t.description, priority: t.priority,
          folder_id: t.folder_id, due_date: next.toISOString(), recurrence_rule: t.recurrence_rule as any,
        });
        toast.success(`نمونه بعدی برای ${format(next, "yyyy-MM-dd HH:mm")} ساخته شد ✨`);
      }
    }
  };

  const delTask = async (id: string) => {
    setAllTasks(prev => prev.filter(t => t.id !== id && t.parent_id !== id));
    await supabase.from("tasks").delete().eq("id", id);
    toast.success("حذف شد");
  };

  const askDeleteTask = (t: Task) => {
    const childCount = (childrenMap[t.id] || []).length;
    setConfirm({
      kind: "task",
      id: t.id,
      title: t.title,
      onConfirm: async () => { await delTask(t.id); },
    });
    // include child count info via title hack (handled in dialog body)
    (window as any).__lastChildCount = childCount;
  };

  const renderTask = (t: Task, depth = 0) => {
    const subs = childrenMap[t.id] || [];
    const open = expanded[t.id];
    const pm = PRIORITY_META[t.priority] || PRIORITY_META.none;
    return (
      <div key={t.id}>
        <Card className={`p-3 hover:shadow-soft transition-shadow animate-fade-in border-l-4 ${pm.borderClass}`}
          style={{ marginInlineStart: depth * 20 }}>
          <div className="flex items-start gap-2">
            {subs.length > 0 ? (
              <button onClick={() => setExpanded((s) => ({ ...s, [t.id]: !open }))} className="mt-1 text-muted-foreground hover:text-foreground">
                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : <span className="w-4" />}
            <Checkbox checked={t.completed} onCheckedChange={() => toggleTask(t)} className="mt-1" />
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelected(t)}>
              <p className={`font-medium ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {t.priority !== "none" && (
                  <Badge variant="outline" className={`text-xs gap-1 ${pm.bgClass} ${pm.textClass}`}>
                    <Flag className="w-3 h-3" /> {pm.label}
                  </Badge>
                )}
                {t.due_date && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(t.due_date), "MMM d, HH:mm")}
                  </Badge>
                )}
                {t.recurrence_rule && (
                  <Badge variant="outline" className="text-xs">🔁 {describeRule(t.recurrence_rule)}</Badge>
                )}
                {subs.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {subs.filter(s => s.completed).length}/{subs.length} زیرتسک
                  </span>
                )}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => askDeleteTask(t)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </Card>
        {open && subs.length > 0 && (
          <div className="mt-2 space-y-2">
            {subs.map((s) => renderTask(s, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>

      <div className="flex gap-2 mb-4">
        <Input placeholder="+ تسک جدید..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()} className="flex-1" />
        <Button onClick={() => addTask()}><Plus className="w-4 h-4" /></Button>
      </div>

      <div className="space-y-2">
        {topLevel.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">هیچ تسکی نیست</Card>
        )}
        {topLevel.map((t) => renderTask(t))}
      </div>

      {selected && <TaskDetail task={selected} onClose={() => setSelected(null)} onChanged={load} setConfirm={setConfirm} />}

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "task" ? "حذف تسک؟" : confirm?.kind === "note" ? "حذف نوت؟" : "حذف زیرتسک؟"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئنی می‌خوای «{confirm?.title}» را حذف کنی؟
              {confirm?.kind === "task" && (window as any).__lastChildCount > 0 && (
                <span className="block mt-2 text-destructive">⚠️ {(window as any).__lastChildCount} زیرتسک هم با این تسک حذف می‌شود.</span>
              )}
              <span className="block mt-2 text-xs">این عمل قابل بازگشت نیست.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirm) await confirm.onConfirm();
                setConfirm(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TaskDetail({ task, onClose, onChanged, setConfirm }: {
  task: Task; onClose: () => void; onChanged: () => void;
  setConfirm: (c: ConfirmState) => void;
}) {
  const { user } = useAuth();
  const [t, setT] = useState(task);
  const [taskNotes, setTaskNotes] = useState<TaskNote[]>([]);
  const [activeNote, setActiveNote] = useState<TaskNote | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => { setT(task); }, [task.id]);

  useEffect(() => {
    supabase.from("notes").select("id,title,content").eq("task_id", task.id).order("updated_at", { ascending: false }).then(({ data }) => {
      setTaskNotes((data || []) as any);
    });
  }, [task.id]);

  const refreshTask = async () => {
    const { data } = await supabase.from("tasks").select("*").eq("id", task.id).single();
    if (data) setT(data as any);
    onChanged();
  };

  const save = async (patch: Partial<Task>) => {
    setT({ ...t, ...patch });
    await supabase.from("tasks").update(patch as any).eq("id", t.id);
  };

  const addNote = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("notes").insert({
      user_id: user.id, task_id: t.id, title: "نوت جدید", content: "",
    }).select().single();
    if (error) return toast.error(error.message);
    if (data) {
      setTaskNotes([data as any, ...taskNotes]);
      setActiveNote(data as any);
    }
  };

  const saveNote = async (id: string, patch: Partial<TaskNote>) => {
    setTaskNotes(taskNotes.map(n => n.id === id ? { ...n, ...patch } : n));
    if (activeNote?.id === id) setActiveNote({ ...activeNote, ...patch });
    await supabase.from("notes").update(patch).eq("id", id);
  };

  const askDelNote = (n: TaskNote) => {
    setConfirm({
      kind: "note", id: n.id, title: n.title || "بدون عنوان",
      onConfirm: async () => {
        await supabase.from("notes").delete().eq("id", n.id);
        setTaskNotes(prev => prev.filter(x => x.id !== n.id));
        if (activeNote?.id === n.id) setActiveNote(null);
      },
    });
  };

  return (
    <>
      <Sheet open={true} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>جزئیات تسک</span>
              <Button size="sm" onClick={() => setAiOpen(true)} className="gap-1">
                <Sparkles className="w-4 h-4" /> AI
              </Button>
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <Input value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })}
              onBlur={() => save({ title: t.title })} className="text-lg font-semibold" />
            <Textarea placeholder="توضیحات..." value={t.description || ""}
              onChange={(e) => setT({ ...t, description: e.target.value })}
              onBlur={() => save({ description: t.description })} rows={3} />

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">اولویت</label>
              <div className="flex gap-1.5 flex-wrap">
                {PRIORITY_ORDER.map((p) => {
                  const m = PRIORITY_META[p];
                  const active = t.priority === p;
                  return (
                    <button key={p} onClick={() => save({ priority: p })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 ${active ? `${m.bgClass} ${m.textClass} ring-2 ring-current` : "hover:bg-accent border-border"}`}>
                      <span>{m.emoji}</span> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">سررسید</label>
                <Input type="datetime-local" value={t.due_date ? t.due_date.slice(0, 16) : ""}
                  onChange={(e) => save({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">یادآور</label>
                <Input type="datetime-local" value={t.reminder_at ? t.reminder_at.slice(0, 16) : ""}
                  onChange={(e) => save({ reminder_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
            </div>

            <RecurrenceEditor
              value={t.recurrence_rule}
              onChange={(rule) => save({ recurrence_rule: rule } as any)}
            />

            <div className="rounded-lg bg-accent/30 p-2 text-xs text-muted-foreground">
              💡 برای ایجاد زیرتسک، از پنل AI یا از لیست اصلی روی تسک کلیک راست/افزودن استفاده کن. زیرتسک‌ها هم خودشون یک تسک کامل هستند.
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <FileText className="w-4 h-4" /> نوت‌های این تسک ({taskNotes.length})
                </label>
                <Button size="sm" variant="outline" onClick={addNote} className="gap-1">
                  <Plus className="w-3 h-3" /> نوت جدید
                </Button>
              </div>
              <div className="space-y-2">
                {taskNotes.map((n) => (
                  <Card key={n.id} className="p-2 flex items-center gap-2">
                    <button className="flex-1 text-right text-sm truncate" onClick={() => setActiveNote(n)}>
                      {n.title}
                    </button>
                    <Button size="icon" variant="ghost" onClick={() => askDelNote(n)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </Card>
                ))}
                {taskNotes.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">نوتی نیست</p>}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {activeNote && (
        <Sheet open={true} onOpenChange={(v) => !v && setActiveNote(null)}>
          <SheetContent side="left" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                <Input value={activeNote.title} onChange={(e) => saveNote(activeNote.id, { title: e.target.value })}
                  className="border-none focus-visible:ring-0 px-0 text-lg font-semibold" />
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <RichEditor
                key={activeNote.id}
                initialMarkdown={activeNote.content || ""}
                onChange={(_html, md) => saveNote(activeNote.id, { content: md })}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <TaskAIPanel
        task={t as any}
        open={aiOpen}
        onOpenChange={setAiOpen}
        onMetaApplied={refreshTask}
      />
    </>
  );
}
