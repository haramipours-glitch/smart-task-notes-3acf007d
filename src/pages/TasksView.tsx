import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import { Plus, Calendar, Trash2, Sparkles, ChevronRight, ChevronDown, Flag } from "lucide-react";
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
import { callAI } from "@/lib/ai";

type Task = {
  id: string; title: string; description: string | null; priority: "none" | "low" | "medium" | "high";
  due_date: string | null; completed: boolean; folder_id: string | null; reminder_at: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
};
type Subtask = { id: string; title: string; completed: boolean; task_id: string };

const PRIORITY_COLORS = {
  high: "text-priority-high", medium: "text-priority-medium",
  low: "text-priority-low", none: "text-priority-none",
};

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
    setTasks((data || []) as any);

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
    await supabase.from("tasks").update({
      completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : null,
    }).eq("id", t.id);
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
          return (
            <Card key={t.id} className="p-3 hover:shadow-soft transition-shadow animate-fade-in">
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
                      <Flag className={`w-3 h-3 ${PRIORITY_COLORS[t.priority]}`} />
                    )}
                    {t.due_date && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(t.due_date), "MMM d, HH:mm")}
                      </Badge>
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

      {selected && <TaskDetail task={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const { user } = useAuth();
  const [t, setT] = useState(task);
  const [subs, setSubs] = useState<Subtask[]>([]);
  const [newSub, setNewSub] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    supabase.from("subtasks").select("*").eq("task_id", task.id).order("position").then(({ data }) => {
      setSubs((data || []) as any);
    });
  }, [task.id]);

  const save = async (patch: Partial<Task>) => {
    setT({ ...t, ...patch });
    await supabase.from("tasks").update(patch).eq("id", t.id);
  };

  const addSub = async () => {
    if (!newSub.trim() || !user) return;
    const { data } = await supabase.from("subtasks").insert({
      task_id: t.id, user_id: user.id, title: newSub,
    }).select().single();
    if (data) setSubs([...subs, data as any]);
    setNewSub("");
  };

  const aiBreakdown = async () => {
    if (!user) return;
    setAiLoading(true);
    try {
      const r = await callAI("breakdown", t.title);
      const items: string[] = r.data?.subtasks || [];
      if (!items.length) throw new Error("نتیجه خالی");
      const rows = items.map((title) => ({ task_id: t.id, user_id: user.id, title }));
      const { data, error } = await supabase.from("subtasks").insert(rows).select();
      if (error) throw error;
      setSubs([...subs, ...((data || []) as any)]);
      toast.success("Subtasks ساخته شد ✨");
    } catch (e: any) { toast.error(e.message); }
    finally { setAiLoading(false); }
  };

  return (
    <Sheet open={true} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>جزئیات تسک</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <Input value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })}
            onBlur={() => save({ title: t.title })} className="text-lg font-semibold" />
          <Textarea placeholder="توضیحات..." value={t.description || ""}
            onChange={(e) => setT({ ...t, description: e.target.value })}
            onBlur={() => save({ description: t.description })} rows={3} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">اولویت</label>
              <Select value={t.priority} onValueChange={(v: any) => save({ priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">هیچ</SelectItem>
                  <SelectItem value="low">پایین</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="high">بالا</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">تکرار</label>
              <Select value={t.recurrence} onValueChange={(v: any) => save({ recurrence: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون</SelectItem>
                  <SelectItem value="daily">روزانه</SelectItem>
                  <SelectItem value="weekly">هفتگی</SelectItem>
                  <SelectItem value="monthly">ماهانه</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Subtasks</label>
              <Button size="sm" variant="outline" onClick={aiBreakdown} disabled={aiLoading} className="gap-1">
                <Sparkles className="w-3 h-3" /> AI Breakdown
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
