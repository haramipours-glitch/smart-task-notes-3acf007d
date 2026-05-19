import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { BidiText } from "@/components/BidiText";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2, FileText, Clock, ChevronDown, ArrowRight, Ban, Folder as FolderIcon, Tag as TagIcon, Check } from "lucide-react";
import { PRIORITY_META, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { RecurrenceEditor } from "@/components/RecurrenceEditor";
import { TaskAIPanel } from "@/components/TaskAIPanel";
import { NoteEditorTabs } from "@/components/NoteEditorTabs";
import { TaskStepLists } from "@/components/TaskStepLists";
import { TaskSubtasksInline } from "@/components/TaskSubtasksInline";
import { TaskAttachments } from "@/components/TaskAttachments";
import { DueDatePicker } from "@/components/DueDatePicker";

import { Switch } from "@/components/ui/switch";
import { pushUndo } from "@/lib/undoStack";
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
  const [folders, setFolders] = useState<{ id: string; name: string; parent_id: string | null; color: string | null }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [taskTagIds, setTaskTagIds] = useState<string[]>([]);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const hasTimeBlock = !!(t.start_at || t.end_at || t.estimated_minutes);
  const [timeBlockOpen, setTimeBlockOpen] = useState<boolean>(hasTimeBlock);
  const isMobileView = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  const [secOpen, setSecOpen] = useState<{ cls: boolean; sch: boolean; brk: boolean }>(() => ({
    cls: !isMobileView,
    sch: !isMobileView,
    brk: !isMobileView,
  }));
  const toggleSec = (k: "cls" | "sch" | "brk") => setSecOpen(s => ({ ...s, [k]: !s[k] }));

  useEffect(() => { setT(task); }, [task.id]);

  useEffect(() => {
    supabase.from("notes").select("id,title,content").eq("task_id", task.id)
      .order("updated_at", { ascending: false }).then(({ data }) => {
        setTaskNotes((data || []) as any);
      });
    supabase.from("task_tags").select("tag_id").eq("task_id", task.id).then(({ data }) => {
      setTaskTagIds((data || []).map((r: any) => r.tag_id));
    });
  }, [task.id]);

  useEffect(() => {
    if (!user) return;
    supabase.from("folders").select("id,name,parent_id,color").order("position").then(({ data }) => {
      setFolders((data || []) as any);
    });
    supabase.from("tags").select("id,name,color").order("name").then(({ data }) => {
      setTags((data || []) as any);
    });
  }, [user]);

  const folderName = (id: string | null): string => {
    if (!id) return "بدون فولدر";
    const f = folders.find(x => x.id === id);
    if (!f) return "—";
    const parent = f.parent_id ? folders.find(x => x.id === f.parent_id) : null;
    return parent ? `${parent.name} / ${f.name}` : f.name;
  };

  const toggleTag = async (tagId: string) => {
    if (!user) return;
    if (taskTagIds.includes(tagId)) {
      setTaskTagIds(taskTagIds.filter(x => x !== tagId));
      await supabase.from("task_tags").delete().eq("task_id", t.id).eq("tag_id", tagId);
    } else {
      setTaskTagIds([...taskTagIds, tagId]);
      await supabase.from("task_tags").insert({ task_id: t.id, tag_id: tagId, user_id: user.id });
    }
  };

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
        const { data: snap } = await supabase.from("notes").select("*").eq("id", n.id).maybeSingle();
        await supabase.from("notes").delete().eq("id", n.id);
        setTaskNotes(prev => prev.filter(x => x.id !== n.id));
        if (activeNote?.id === n.id) setActiveNote(null);
        if (snap) {
          pushUndo({
            label: `نوت «${snap.title || "بدون عنوان"}» حذف شد`,
            undo: async () => {
              await supabase.from("notes").insert(snap as any);
              const { data } = await supabase.from("notes").select("id,title,content").eq("task_id", task.id)
                .order("updated_at", { ascending: false });
              setTaskNotes((data || []) as any);
            },
          });
        }
      },
    });
  };

  const body = (
    <div className="mt-2 task-detail-sections">
      <div className="px-1 pb-4 border-b border-border/40">
        <AutoTextarea
          value={t.title}
          onChange={(e) => setT({ ...t, title: e.target.value })}
          onBlur={() => save({ title: t.title })}
          minHeight={36}
          maxHeight={220}
          rows={1}
          dir="auto"
          placeholder="عنوان تسک"
          className="text-xl font-semibold leading-snug border-none bg-transparent px-0 py-0 focus-visible:ring-0 break-words whitespace-pre-wrap"
        />
        <div data-rich-selection onContextMenu={(e) => e.preventDefault()} style={{ WebkitTouchCallout: "none" } as any} className="mt-1">
          <AutoTextarea
            placeholder="توضیحات..."
            value={t.description || ""}
            onChange={(e) => setT({ ...t, description: e.target.value })}
            onBlur={() => save({ description: t.description })}
            minHeight={40}
            maxHeight={360}
            className="border-none bg-transparent focus-visible:ring-0 px-0 text-sm text-muted-foreground"
          />
        </div>
      </div>

            {/* ── Block 1: Classification (priority / folder / tags) ── */}
            <Collapsible open={secOpen.cls} onOpenChange={(v) => setSecOpen(s => ({ ...s, cls: v }))} asChild>
            <section className="border-b border-border/40 py-3 px-1">
              <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-expanded={secOpen.cls}
                aria-controls="td-section-cls"
                className="w-full flex items-center gap-2 py-1 min-h-9 rounded hover:bg-accent/30 transition group -mx-1 px-1"
              >
                <h3 className="text-[12px] font-medium text-muted-foreground/80 flex-1 text-start">دسته‌بندی</h3>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-300 ${secOpen.cls ? "rotate-0" : "-rotate-90"}`} />
              </button>
              </CollapsibleTrigger>
              <CollapsibleContent id="td-section-cls" className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="space-y-3 pt-3">

              {/* Priority chips — inline, no nested card */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRIORITY_ORDER.map((p) => {
                  const m = PRIORITY_META[p];
                  const active = t.priority === p;
                  return (
                    <button key={p} onClick={() => save({ priority: p })}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${active ? `${m.bgClass} ${m.textClass}` : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}>
                      {m.emoji} {m.label}
                    </button>
                  );
                })}
                {t.priority !== "none" && (
                  <button onClick={() => save({ priority: "none" as any })}
                    className="px-2 py-1 rounded-full text-[11px] text-muted-foreground/70 hover:bg-muted">
                    ×
                  </button>
                )}
                <label className="ms-auto flex items-center gap-1.5 cursor-pointer" title="تسک اجتنابی">
                  <Ban className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] text-muted-foreground">اجتناب</span>
                  <Switch checked={!!t.is_avoidance} onCheckedChange={(v) => save({ is_avoidance: !!v } as any)} />
                </label>
              </div>


              {/* Folder + Tags */}
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="justify-start gap-1.5 h-9 text-xs bg-background">
                      <FolderIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{folderName(t.folder_id)}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-1 max-h-[40vh] overflow-y-auto" align="start">
                    <button
                      onClick={() => save({ folder_id: null })}
                      className={`w-full text-end p-2 rounded text-sm hover:bg-accent ${t.folder_id === null ? "bg-accent" : ""}`}
                    >بدون فولدر (Inbox)</button>
                    {folders.filter(f => !f.parent_id).map(f => {
                      const children = folders.filter(c => c.parent_id === f.id);
                      return (
                        <div key={f.id}>
                          <button
                            onClick={() => save({ folder_id: f.id })}
                            className={`w-full text-end p-2 rounded text-sm hover:bg-accent flex items-center gap-2 ${t.folder_id === f.id ? "bg-accent" : ""}`}
                          >
                            <FolderIcon className="w-3.5 h-3.5" style={{ color: f.color || undefined }} />
                            {f.name}
                          </button>
                          {children.map(c => (
                            <button key={c.id}
                              onClick={() => save({ folder_id: c.id })}
                              className={`w-full text-end p-2 ps-6 rounded text-xs hover:bg-accent flex items-center gap-2 ${t.folder_id === c.id ? "bg-accent" : ""}`}
                            >
                              <FolderIcon className="w-3 h-3" style={{ color: c.color || undefined }} />
                              {c.name}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                    {folders.length === 0 && <p className="text-xs text-muted-foreground p-2 text-center">فولدری نداری</p>}
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="justify-start gap-1.5 h-9 text-xs bg-background">
                      <TagIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {taskTagIds.length === 0 ? "بدون تگ" : `${taskTagIds.length} تگ`}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-1 max-h-[40vh] overflow-y-auto" align="start">
                    {tags.length === 0 && <p className="text-xs text-muted-foreground p-2 text-center">تگی نداری</p>}
                    {tags.map(tg => {
                      const active = taskTagIds.includes(tg.id);
                      return (
                        <button key={tg.id} onClick={() => toggleTag(tg.id)}
                          className={`w-full text-end p-2 rounded text-sm hover:bg-accent flex items-center justify-between gap-2 ${active ? "bg-accent" : ""}`}>
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: tg.color || "hsl(var(--muted-foreground))" }} />
                            {tg.name}
                          </span>
                          {active && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              </div>
              </div>
              </CollapsibleContent>
            </section>
            </Collapsible>

            {/* ── Block 2: Schedule (due / time-block / recurrence) ── */}
            <Collapsible open={secOpen.sch} onOpenChange={(v) => setSecOpen(s => ({ ...s, sch: v }))} asChild>
            <section className="rounded-2xl border bg-muted/20 p-2 sm:p-3 space-y-2 sm:space-y-2.5">
              <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-expanded={secOpen.sch}
                aria-controls="td-section-sch"
                className="w-full flex items-center gap-1.5 px-1 -mx-1 py-1 min-h-11 sm:min-h-0 rounded hover:bg-accent/40 transition"
              >
                <span className="w-1 h-3.5 rounded-full bg-primary/60" />
                <h3 className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase flex-1 text-start">زمان‌بندی</h3>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${secOpen.sch ? "rotate-0" : "-rotate-90"}`} />
              </button>
              </CollapsibleTrigger>
              <CollapsibleContent id="td-section-sch" className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="space-y-3 sm:space-y-2.5 pt-2 sm:pt-1">

              <DueDatePicker
                label="سررسید"
                value={t.due_date}
                reminderValue={t.reminder_at}
                onReminderChange={(iso) => save({ reminder_at: iso })}
                onChange={(iso) => {
                  const newDue = iso ? new Date(iso) : null;
                  const patch: Partial<Task> = { due_date: iso };
                  if (t.reminder_at && newDue && t.due_date) {
                    const delta = newDue.getTime() - new Date(t.due_date).getTime();
                    patch.reminder_at = new Date(new Date(t.reminder_at).getTime() + delta).toISOString();
                  }
                  save(patch);
                }}
              />

              <Collapsible open={timeBlockOpen} onOpenChange={setTimeBlockOpen}>
                <div className="rounded-lg border border-primary/30 bg-primary/5">
                  <CollapsibleTrigger aria-expanded={timeBlockOpen} aria-controls="td-timeblock" className="w-full flex items-center justify-between p-3 min-h-11 text-sm font-medium text-primary">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Time Block
                      {hasTimeBlock && <span className="text-[10px] text-muted-foreground ms-1">(فعال)</span>}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${timeBlockOpen ? "" : "-rotate-90"}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent id="td-timeblock">
                    <div className="px-3 pb-3 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground">شروع</label>
                          <Input type="datetime-local"
                            className="h-10 sm:h-9 text-xs"
                            value={t.start_at ? t.start_at.slice(0, 16) : ""}
                            onChange={(e) => save({ start_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">پایان</label>
                          <Input type="datetime-local"
                            className="h-10 sm:h-9 text-xs"
                            value={t.end_at ? t.end_at.slice(0, 16) : ""}
                            onChange={(e) => save({ end_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="text-[10px] text-muted-foreground whitespace-nowrap">مدت تخمینی (دقیقه):</label>
                        <Input type="number" placeholder="—"
                          value={t.estimated_minutes ?? ""}
                          onChange={(e) => save({ estimated_minutes: e.target.value ? Number(e.target.value) : null } as any)}
                          className="h-10 sm:h-8 w-24 text-xs" />
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
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <RecurrenceEditor
                value={t.recurrence_rule}
                onChange={(rule) => save({ recurrence_rule: rule } as any)}
              />
              </div>
              </CollapsibleContent>
            </section>
            </Collapsible>

            {/* ── Block 3: Breakdown (subtasks + steps) ── */}
            <Collapsible open={secOpen.brk} onOpenChange={(v) => setSecOpen(s => ({ ...s, brk: v }))} asChild>
            <section className="rounded-2xl border bg-muted/20 p-2 sm:p-3 space-y-2 sm:space-y-2.5">
              <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-expanded={secOpen.brk}
                aria-controls="td-section-brk"
                className="w-full flex items-center gap-1.5 px-1 -mx-1 py-1 min-h-11 sm:min-h-0 rounded hover:bg-accent/40 transition"
              >
                <span className="w-1 h-3.5 rounded-full bg-primary/60" />
                <h3 className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase flex-1 text-start">خرد کردن کار</h3>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${secOpen.brk ? "rotate-0" : "-rotate-90"}`} />
              </button>
              </CollapsibleTrigger>
              <CollapsibleContent id="td-section-brk" className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="space-y-3 sm:space-y-2.5 pt-2 sm:pt-1">

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
              </div>
              </CollapsibleContent>
            </section>
            </Collapsible>

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

  const noteEditorBody = activeNote && (
    <div className="space-y-3 mt-2">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setActiveNote(null)} className="gap-1">
          <ArrowRight className="w-4 h-4" />
          بازگشت به تسک
        </Button>
      </div>
      <Input
        value={activeNote.title}
        onChange={(e) => saveNote(activeNote.id, { title: e.target.value })}
        className="border-none focus-visible:ring-0 px-0 text-lg font-semibold"
        dir="auto"
      />
      <NoteEditorTabs
        noteId={activeNote.id}
        markdown={activeNote.content || ""}
        onChange={(md) => saveNote(activeNote.id, { content: md })}
      />
    </div>
  );

  return (
    <>
      {mode === "page" ? (
        <div className="w-full px-1 sm:px-2 md:px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">{activeNote ? "ویرایش نوت" : "جزئیات تسک"}</h1>
            {!activeNote && (
              <Button size="sm" onClick={() => setAiOpen(true)} className="gap-1">
                <Sparkles className="w-4 h-4" /> AI
              </Button>
            )}
          </div>
          {activeNote ? noteEditorBody : body}
        </div>
      ) : (
        <Sheet open={true} onOpenChange={(v) => !v && onClose()}>
          <SheetContent className="w-full sm:max-w-full overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                <span>{activeNote ? "ویرایش نوت" : "جزئیات تسک"}</span>
                {!activeNote && (
                  <Button size="sm" onClick={() => setAiOpen(true)} className="gap-1">
                    <Sparkles className="w-4 h-4" /> AI
                  </Button>
                )}
              </SheetTitle>
            </SheetHeader>
            {activeNote ? noteEditorBody : body}
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
