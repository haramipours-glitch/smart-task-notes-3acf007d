import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { BidiText } from "@/components/BidiText";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2, FileText, Clock } from "lucide-react";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/priority";
import { RecurrenceEditor } from "@/components/RecurrenceEditor";
import { TaskAIPanel } from "@/components/TaskAIPanel";
import { RichEditor } from "@/components/RichEditor";
import { TaskStepLists } from "@/components/TaskStepLists";
import { TaskSubtasksInline } from "@/components/TaskSubtasksInline";
import { TaskAttachments } from "@/components/TaskAttachments";
import type { Task, TaskNote, ConfirmState } from "@/lib/taskTypes";

export function TaskDetail({ task, onClose, onChanged, setConfirm, mode = "sheet" }: {
  task: Task;
  onClose: () => void;
  onChanged: () => void;
  setConfirm: (c: ConfirmState) => void;
  mode?: "sheet" | "page";
}) {
  const { user } = useAuth();
  const [t, setT] = useState(task);
  const [taskNotes, setTaskNotes] = useState<TaskNote[]>([]);
  const [activeNote, setActiveNote] = useState<TaskNote | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => { setT(task); }, [task.id]);

  useEffect(() => {
    supabase.from("notes").select("id,title,content").eq("task_id", task.id)
      .order("updated_at", { ascending: false }).then(({ data }) => {
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

  const body = (
    <div className="space-y-4 mt-4">
            <Input value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })}
              onBlur={() => save({ title: t.title })} className="text-lg font-semibold" dir="auto" />
            <AutoTextarea
              placeholder="توضیحات..."
              value={t.description || ""}
              onChange={(e) => setT({ ...t, description: e.target.value })}
              onBlur={() => save({ description: t.description })}
              minHeight={72}
              maxHeight={360}
            />

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
                  onChange={(e) => {
                    const newDue = e.target.value ? new Date(e.target.value) : null;
                    const patch: Partial<Task> = { due_date: newDue ? newDue.toISOString() : null };
                    if (t.reminder_at && newDue) {
                      if (t.due_date) {
                        const delta = newDue.getTime() - new Date(t.due_date).getTime();
                        patch.reminder_at = new Date(new Date(t.reminder_at).getTime() + delta).toISOString();
                      } else {
                        patch.reminder_at = newDue.toISOString();
                      }
                    }
                    save(patch);
                  }} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">یادآور</label>
                <Input type="datetime-local" value={t.reminder_at ? t.reminder_at.slice(0, 16) : ""}
                  onChange={(e) => save({ reminder_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium text-primary">
                <Clock className="w-4 h-4" /> Time Block
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">شروع</label>
                  <Input type="datetime-local"
                    value={t.start_at ? t.start_at.slice(0, 16) : ""}
                    onChange={(e) => save({ start_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">پایان</label>
                  <Input type="datetime-local"
                    value={t.end_at ? t.end_at.slice(0, 16) : ""}
                    onChange={(e) => save({ end_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground whitespace-nowrap">مدت تخمینی (دقیقه):</label>
                <Input type="number" placeholder="—"
                  value={t.estimated_minutes ?? ""}
                  onChange={(e) => save({ estimated_minutes: e.target.value ? Number(e.target.value) : null } as any)}
                  className="h-8 w-24 text-xs" />
                <div className="flex gap-1">
                  {[15, 30, 60].map(m => (
                    <button key={m} type="button"
                      onClick={() => save({ estimated_minutes: m } as any)}
                      className={`px-2 h-7 text-[10px] rounded border ${t.estimated_minutes === m ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                      {m}د
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <RecurrenceEditor
              value={t.recurrence_rule}
              onChange={(rule) => save({ recurrence_rule: rule } as any)}
            />

            <TaskSubtasksInline
              taskId={t.id}
              onOpenSubtask={(id) => {
                supabase.from("tasks").select("*").eq("id", id).single().then(({ data }) => {
                  if (data) {
                    onChanged();
                    setT(data as any);
                  }
                });
              }}
            />

            <TaskStepLists taskId={t.id} />

            <TaskAttachments taskId={t.id} />

            <div className="rounded-lg bg-accent/30 p-2 text-xs text-muted-foreground">
              💡 زیرتسک = یک تسک کامل با تاریخ و اولویت. مرحله = آیتم سبک یک لیست (شماره/چک‌باکس/نقطه/فلش).
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
                    <button className="flex-1 text-end text-sm truncate" onClick={() => setActiveNote(n)}>
                      <BidiText text={n.title} />
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
  );

  return (
    <>
      {mode === "page" ? (
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">جزئیات تسک</h1>
            <Button size="sm" onClick={() => setAiOpen(true)} className="gap-1">
              <Sparkles className="w-4 h-4" /> AI
            </Button>
          </div>
          {body}
        </div>
      ) : (
        <Sheet open={true} onOpenChange={(v) => !v && onClose()}>
          <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                <span>جزئیات تسک</span>
                <Button size="sm" onClick={() => setAiOpen(true)} className="gap-1">
                  <Sparkles className="w-4 h-4" /> AI
                </Button>
              </SheetTitle>
            </SheetHeader>
            {body}
          </SheetContent>
        </Sheet>
      )}

      {activeNote && (
        <Sheet open={true} onOpenChange={(v) => !v && setActiveNote(null)}>
          <SheetContent side="left" className="w-full sm:max-w-4xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                <Input value={activeNote.title} onChange={(e) => saveNote(activeNote.id, { title: e.target.value })}
                  className="border-none focus-visible:ring-0 px-0 text-lg font-semibold" dir="auto" />
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
