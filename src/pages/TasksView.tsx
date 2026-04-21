import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import { Plus, Calendar, Trash2, Sparkles, ChevronRight, ChevronDown, Flag, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PRIORITY_META, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import { RecurrenceEditor } from "@/components/RecurrenceEditor";
import { TaskAIPanel } from "@/components/TaskAIPanel";
import { RichEditor } from "@/components/RichEditor";
import { markdownToHtml } from "@/lib/markdown";
import { describeRule, nextOccurrence, type RecurrenceRule } from "@/lib/recurrence";

type Task = {
  id: string; title: string; description: string | null; priority: Priority;
  due_date: string | null; completed: boolean; folder_id: string | null; reminder_at: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  recurrence_rule: RecurrenceRule | null;
};
type Subtask = { id: string; title: string; completed: boolean; task_id: string };
type TaskNote = { id: string; title: string; content: string };

export default function TasksView({ scope }: { scope: "inbox" | "today" | "next7" | "smart" | "folder" | "tag" }) {
  const { user } = useAuth();
  const params = useParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState("");
  const [selected, setSelected] = useState<Task | null>(null);
  const [folderName, setFolderName] = useState("");
  const [tagName, setTagName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);

  const title = {
    inbox: "Inbox", today: "امروز", next7: "۷ روز آینده",
    smart: "Smart Lists", folder: folderName || "فولدر", tag: `#${tagName || "تگ"}`,
  }[scope];

  const load = async () => {
    if (!user) return;
    let q = supabase.from("tasks").select("*").order("position").order("created_at", { ascending: false });

    if (scope === "inbox") q = q.is("folder_id", null);
    else if (scope === "today") {
      const s = startOfDay(new Date()).toISOString();
      const e = endOfDay(new Date()).toISOString();
      q = q.gte("due_date", s).lte("due_date", e);
    } else if (scope === "next7") {
      const s = startOfDay(new Date()).toISOString();
      const e = endOfDay(addDays(new Date(), 7)).toISOString();
      q = q.gte("due_date", s).lte("due_date", e);
    } else if (scope === "smart") {
      q = q.eq("priority", "high").eq("completed", false);
    } else if (scope === "folder" && params.id) {
      q = q.eq("folder_id", params.id);
      const { data: f } = await supabase.from("folders").select("name").eq("id", params.id).single();
      if (f) setFolderName(f.name);
    } else if (scope === "tag" && params.id) {
      const { data: tt } = await supabase.from("task_tags").select("task_id").eq("tag_id", params.id);
      const ids = (tt || []).map((x: any) => x.task_id);
      q = q.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const { data: tg } = await supabase.from("tags").select("name").eq("id", params.id).single();
      if (tg) setTagName(tg.name);
    }

    const { data } = await q;
    const list = ((data || []) as unknown) as Task[];
    // Sort by priority then due date
    list.sort((a, b) => {
      const pa = PRIORITY_META[a.priority]?.rank ?? 3;
      const pb = PRIORITY_META[b.priority]?.rank ?? 3;
      if (pa !== pb) return pa - pb;
      return 0;
    });
    setTasks(list);

    if (data && data.length) {
      const { data: subs } = await supabase.from("subtasks").select("*").in("task_id", data.map((t: any) => t.id));
      const map: Record<string, Subtask[]> = {};
      (subs || []).forEach((s: any) => { (map[s.task_id] ||= []).push(s); });
      setSubtasks(map);
    } else setSubtasks({});
  };

  useEffect(() => { load(); }, [user, scope, params.id]);

  useEffect(() => {
    const ch = supabase.channel(`tasks-${scope}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "subtasks" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, scope, params.id]);

  const addTask = async () => {
    if (!newTitle.trim() || !user) return;
    const folder_id = scope === "folder" ? params.id || null : null;
    const due = scope === "today" ? new Date().toISOString()
      : scope === "next7" ? addDays(new Date(), 1).toISOString() : null;
    const { data, error } = await supabase.from("tasks").insert({
      user_id: user.id, title: newTitle, folder_id, due_date: due,
    }).select().single();
    if (error) toast.error(error.message);
    else {
      setNewTitle("");
      if (scope === "tag" && params.id && data) {
        await supabase.from("task_tags").insert({ task_id: data.id, tag_id: params.id, user_id: user.id });
      }
    }
  };

  const toggleTask = async (t: Task) => {
    const newCompleted = !t.completed;
    await supabase.from("tasks").update({
      completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null,
    }).eq("id", t.id);

    // If recurring and just completed, create the next occurrence
    if (newCompleted && t.recurrence_rule && user) {
      const base = t.due_date ? new Date(t.due_date) : new Date();
      const next = nextOccurrence(t.recurrence_rule, base);
      if (next) {
        await supabase.from("tasks").insert({
          user_id: user.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          folder_id: t.folder_id,
          due_date: next.toISOString(),
          recurrence_rule: t.recurrence_rule as any,
        });
        toast.success(`نمونه بعدی برای ${format(next, "yyyy-MM-dd HH:mm")} ساخته شد ✨`);
      }
    }
  };

  const delTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    toast.success("حذف شد");
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>

      <div className="flex gap-2 mb-4">
        <Input placeholder="+ تسک جدید..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()} className="flex-1" />
        <Button onClick={addTask}><Plus className="w-4 h-4" /></Button>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">هیچ تسکی نیست</Card>
        )}
        {tasks.map((t) => {
          const subs = subtasks[t.id] || [];
          const open = expanded[t.id];
          const pm = PRIORITY_META[t.priority] || PRIORITY_META.none;
          return (
            <Card key={t.id} className={`p-3 hover:shadow-soft transition-shadow animate-fade-in border-l-4 ${pm.borderClass}`}>
              <div className="flex items-start gap-3">
                {subs.length > 0 ? (
                  <button onClick={() => setExpanded((s) => ({ ...s, [t.id]: !open }))} className="mt-1">
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
                        {subs.filter(s => s.completed).length}/{subs.length}
                      </span>
                    )}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(t)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              {open && subs.length > 0 && (
                <div className="ml-10 mt-2 space-y-1">
                  {subs.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox checked={s.completed} onCheckedChange={async () => {
                        await supabase.from("subtasks").update({ completed: !s.completed }).eq("id", s.id);
                      }} />
                      <span className={`text-sm ${s.completed ? "line-through text-muted-foreground" : ""}`}>{s.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {selected && <TaskDetail task={selected} onClose={() => setSelected(null)} onChanged={load} />}

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف تسک؟</AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئنی می‌خوای «{confirmDelete?.title}» را حذف کنی؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDelete) await delTask(confirmDelete.id);
                setConfirmDelete(null);
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

function TaskDetail({ task, onClose, onChanged }: { task: Task; onClose: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const [t, setT] = useState(task);
  const [subs, setSubs] = useState<Subtask[]>([]);
  const [taskNotes, setTaskNotes] = useState<TaskNote[]>([]);
  const [activeNote, setActiveNote] = useState<TaskNote | null>(null);
  const [newSub, setNewSub] = useState("");
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    supabase.from("subtasks").select("*").eq("task_id", task.id).order("position").then(({ data }) => {
      setSubs((data || []) as any);
    });
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

  const addSub = async () => {
    if (!newSub.trim() || !user) return;
    const { data } = await supabase.from("subtasks").insert({
      task_id: t.id, user_id: user.id, title: newSub,
    }).select().single();
    if (data) setSubs([...subs, data as any]);
    setNewSub("");
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

  const delNote = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    setTaskNotes(taskNotes.filter(n => n.id !== id));
    if (activeNote?.id === id) setActiveNote(null);
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

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Subtasks ({subs.filter(s => s.completed).length}/{subs.length})</label>
                <Button size="sm" variant="outline" onClick={() => setAiOpen(true)} className="gap-1">
                  <Sparkles className="w-3 h-3" /> AI Subtasks
                </Button>
              </div>
              <div className="space-y-1">
                {subs.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox checked={s.completed} onCheckedChange={async () => {
                      await supabase.from("subtasks").update({ completed: !s.completed }).eq("id", s.id);
                      setSubs(subs.map(x => x.id === s.id ? { ...x, completed: !x.completed } : x));
                    }} />
                    <span className={`text-sm flex-1 ${s.completed ? "line-through text-muted-foreground" : ""}`}>{s.title}</span>
                    <Button size="icon" variant="ghost" onClick={async () => {
                      await supabase.from("subtasks").delete().eq("id", s.id);
                      setSubs(subs.filter(x => x.id !== s.id));
                    }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <Input placeholder="+ subtask" value={newSub} onChange={(e) => setNewSub(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSub()} />
                  <Button size="sm" onClick={addSub}><Plus className="w-3 h-3" /></Button>
                </div>
              </div>
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
                    <Button size="icon" variant="ghost" onClick={() => delNote(n.id)}>
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

      {/* Note editor sheet */}
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
