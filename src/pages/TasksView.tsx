import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import { Plus, Calendar, Trash2, ChevronRight, ChevronDown, Flag, GripVertical, CornerDownRight, FolderInput } from "lucide-react";
import { MoveToDialog } from "@/components/MoveToDialog";
import { FolderDeleteDialog } from "@/components/FolderDeleteDialog";
import { startItemDrag } from "@/lib/dragToFolder";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BidiText } from "@/components/BidiText";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PRIORITY_META } from "@/lib/priority";
import { FolderKanban } from "@/components/FolderKanban";
import { EisenhowerMatrix } from "@/components/EisenhowerMatrix";
import { Countdown } from "@/components/Countdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { describeRule, nextOccurrence } from "@/lib/recurrence";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
  closestCenter, useSensor, useSensors,
  SortableTaskRow, ChildDropZone, RootDropZone,
} from "@/components/TaskDnDHelpers";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

import { TaskFilterSheet, DEFAULT_FILTERS, type TaskFilters } from "@/components/TaskFilterSheet";
import { QuickAddTask } from "@/components/QuickAddTask";
import type { Task, ConfirmState } from "@/lib/taskTypes";


export default function TasksView({ scope }: { scope: "inbox" | "today" | "tomorrow" | "next7" | "smart" | "folder" | "tag" }) {
  const { user } = useAuth();
  const params = useParams();
  const [layout, setLayout] = useState<"compact" | "comfortable">("comfortable");
  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings").select("task_card_layout").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.task_card_layout) setLayout(data.task_card_layout as any); });
  }, [user]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState("");
  // selected task removed — clicks navigate to /app/tasks/:id
  const [folderName, setFolderName] = useState("");
  const [tagName, setTagName] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [quickSub, setQuickSub] = useState<Record<string, string>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [moveTask, setMoveTask] = useState<Task | null>(null);
  const [delFolderOpen, setDelFolderOpen] = useState(false);
  const navigate = useNavigate();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [taskTagsMap, setTaskTagsMap] = useState<Record<string, string[]>>({});

  // Load task->tags mapping for tag filtering
  useEffect(() => {
    if (!user) return;
    supabase.from("task_tags").select("task_id,tag_id").then(({ data }) => {
      const m: Record<string, string[]> = {};
      (data || []).forEach((row: any) => {
        (m[row.task_id] ||= []).push(row.tag_id);
      });
      setTaskTagsMap(m);
    });
  }, [user, allTasks.length]);

  const title = {
    inbox: "Inbox", today: "امروز", tomorrow: "فردا", next7: "۷ روز آینده",
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
    } else if (scope === "tomorrow") {
      const s = startOfDay(addDays(new Date(), 1)).getTime();
      const e = endOfDay(addDays(new Date(), 1)).getTime();
      list = list.filter(t => t.due_date && new Date(t.due_date).getTime() >= s && new Date(t.due_date).getTime() <= e);
    } else if (scope === "next7") {
      const s = startOfDay(new Date()).getTime(); const e = endOfDay(addDays(new Date(), 7)).getTime();
      list = list.filter(t => t.due_date && new Date(t.due_date).getTime() >= s && new Date(t.due_date).getTime() <= e);
    } else if (scope === "smart") {
      list = list.filter(t => t.priority === "high" && !t.completed);
    } else if (scope === "folder") {
      list = list.filter(t => t.folder_id === params.id);
    }

    // Apply advanced filters
    if (!filters.show_completed) list = list.filter(t => !t.completed);
    if (filters.folder_ids.length) list = list.filter(t => t.folder_id && filters.folder_ids.includes(t.folder_id));
    if (filters.priorities.length) list = list.filter(t => filters.priorities.includes(t.priority as string));
    if (filters.tag_ids.length) {
      list = list.filter(t => {
        const tgs = taskTagsMap[t.id] || [];
        return filters.tag_ids.some(id => tgs.includes(id));
      });
    }

    // Apply sort
    list = [...list];
    switch (filters.sort) {
      case "due_asc":
        list.sort((a, b) => (a.due_date ? new Date(a.due_date).getTime() : Infinity) - (b.due_date ? new Date(b.due_date).getTime() : Infinity));
        break;
      case "due_desc":
        list.sort((a, b) => (b.due_date ? new Date(b.due_date).getTime() : -Infinity) - (a.due_date ? new Date(a.due_date).getTime() : -Infinity));
        break;
      case "created_desc":
        list.sort((a, b) => new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime());
        break;
      case "alpha":
        list.sort((a, b) => a.title.localeCompare(b.title, "fa"));
        break;
      case "priority":
      default:
        list.sort((a, b) => (PRIORITY_META[a.priority]?.rank ?? 3) - (PRIORITY_META[b.priority]?.rank ?? 3));
    }
    return list;
  }, [allTasks, scope, params.id, filters, taskTagsMap]);

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

    // Recurring task: instead of marking complete, roll forward to next occurrence
    if (newCompleted && t.recurrence_rule && user) {
      const base = t.due_date ? new Date(t.due_date) : new Date();
      const next = nextOccurrence(t.recurrence_rule, base);
      if (next) {
        // Shift reminder by the same delta as the due date
        let nextReminderIso: string | null = null;
        if (t.reminder_at && t.due_date) {
          const delta = next.getTime() - new Date(t.due_date).getTime();
          nextReminderIso = new Date(new Date(t.reminder_at).getTime() + delta).toISOString();
        } else if (t.reminder_at) {
          nextReminderIso = next.toISOString();
        }
        const patch: any = {
          due_date: next.toISOString(),
          reminder_at: nextReminderIso,
          completed: false,
          completed_at: null,
        };
        setAllTasks(prev => prev.map(x => x.id === t.id ? { ...x, ...patch } : x));
        await supabase.from("tasks").update(patch).eq("id", t.id);
        toast.success(`نمونه بعدی به ${format(next, "yyyy-MM-dd HH:mm")} منتقل شد 🔁`);
        return;
      }
    }

    setAllTasks(prev => prev.map(x => x.id === t.id ? { ...x, completed: newCompleted } : x));
    await supabase.from("tasks").update({
      completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null,
    }).eq("id", t.id);
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

  // Compute progress including nested descendants
  const getProgress = (id: string): { done: number; total: number } => {
    const subs = childrenMap[id] || [];
    if (!subs.length) return { done: 0, total: 0 };
    let done = 0, total = 0;
    for (const s of subs) {
      total += 1;
      if (s.completed) done += 1;
      const child = getProgress(s.id);
      done += child.done;
      total += child.total;
    }
    return { done, total };
  };

  const quickAddSub = async (parent: Task) => {
    const title = (quickSub[parent.id] || "").trim();
    if (!title || !user) return;
    const { data, error } = await supabase.from("tasks").insert({
      user_id: user.id, title, parent_id: parent.id, priority: "none" as const,
    }).select().single();
    if (error) return toast.error(error.message);
    if (data) {
      setAllTasks(prev => [data as any, ...prev]);
      setQuickSub(s => ({ ...s, [parent.id]: "" }));
      setExpanded(s => ({ ...s, [parent.id]: true }));
    }
  };

  // Drag & drop: drop a task onto another → set as child; drop in same parent zone → reorder
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeTask = allTasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Drop targets we support:
    //  - "child:<taskId>"   → make activeTask a child of <taskId>
    //  - "root"             → make activeTask top-level (in current scope)
    //  - "<taskId>"         → reorder above this sibling (or move to same parent if different)
    if (overId.startsWith("child:")) {
      const newParent = overId.slice(6);
      if (newParent === activeId) return;
      // prevent cycles
      let p: string | null = newParent;
      while (p) {
        if (p === activeId) { toast.error("نمی‌توان داخل خودش انداخت"); return; }
        const pt = allTasks.find(x => x.id === p);
        p = pt?.parent_id || null;
      }
      setAllTasks(prev => prev.map(t => t.id === activeId ? { ...t, parent_id: newParent } : t));
      setExpanded(s => ({ ...s, [newParent]: true }));
      const { error } = await supabase.from("tasks").update({ parent_id: newParent }).eq("id", activeId);
      if (error) toast.error(error.message);
      return;
    }
    if (overId === "root") {
      setAllTasks(prev => prev.map(t => t.id === activeId ? { ...t, parent_id: null } : t));
      const { error } = await supabase.from("tasks").update({ parent_id: null }).eq("id", activeId);
      if (error) toast.error(error.message);
      return;
    }
    // Reorder: find sibling list of overId
    const overTask = allTasks.find(t => t.id === overId);
    if (!overTask) return;
    const siblings = overTask.parent_id
      ? (childrenMap[overTask.parent_id] || [])
      : topLevel;
    const fromIdx = siblings.findIndex(s => s.id === activeId);
    const toIdx = siblings.findIndex(s => s.id === overId);
    // Move into siblings parent if different
    if (activeTask.parent_id !== overTask.parent_id) {
      setAllTasks(prev => prev.map(t => t.id === activeId ? { ...t, parent_id: overTask.parent_id } : t));
      await supabase.from("tasks").update({ parent_id: overTask.parent_id }).eq("id", activeId);
      return;
    }
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = arrayMove(siblings, fromIdx, toIdx);
    // Persist new positions
    const updates = reordered.map((s, i) =>
      supabase.from("tasks").update({ position: i }).eq("id", s.id)
    );
    setAllTasks(prev => {
      const map = new Map(reordered.map((s, i) => [s.id, i]));
      return [...prev].sort((a, b) => {
        const ai = map.get(a.id); const bi = map.get(b.id);
        if (ai !== undefined && bi !== undefined) return ai - bi;
        return 0;
      }).map(t => map.has(t.id) ? { ...t, position: map.get(t.id)! } : t);
    });
    await Promise.all(updates);
  };

  const renderTask = (t: Task, depth = 0) => {
    const subs = childrenMap[t.id] || [];
    const open = expanded[t.id];
    const pm = PRIORITY_META[t.priority] || PRIORITY_META.none;
    const prog = getProgress(t.id);
    const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
    return (
      <div key={t.id}>
        <SortableTaskRow id={t.id}>
          {(dragHandle) => (
            <Card className={`${layout === "compact" ? "p-2" : "p-3"} hover:shadow-soft transition-shadow animate-fade-in border-s-4 ${pm.borderClass}`}
              style={{ marginInlineStart: depth * 16 }}>
              {/* Row 1: handle + checkbox + TITLE (wide) */}
              <div dir="rtl" className="flex items-start gap-2">
                <button {...dragHandle} className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0" aria-label="drag">
                  <GripVertical className="w-4 h-4" />
                </button>
                {subs.length > 0 ? (
                  <button onClick={() => setExpanded((s) => ({ ...s, [t.id]: !open }))} className="mt-0.5 text-muted-foreground hover:text-foreground shrink-0">
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                ) : <span className="w-4 shrink-0" />}
                <Checkbox checked={t.completed} onCheckedChange={() => toggleTask(t)} className="mt-1 shrink-0" />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                  if (t.title.startsWith("چک‌این روزانه")) { navigate("/app/checkin"); return; }
                  navigate(`/app/tasks/${t.id}`);
                }}>
                  <BidiText
                    as="p"
                    text={t.title}
                    className={`${layout === "compact" ? "text-sm" : "text-base"} font-medium leading-snug break-words ${t.completed ? "line-through text-muted-foreground" : ""}`}
                  />
                </div>
              </div>

              {/* Row 2: badges + small action icons (below, small) */}
              <div className="flex items-center justify-between gap-1 mt-1.5 ms-12 flex-wrap">
                <div className="flex items-center gap-1 flex-wrap min-w-0">
                  {t.priority !== "none" && (
                    <Badge variant="outline" className={`text-[10px] gap-0.5 px-1.5 py-0 h-5 ${pm.bgClass} ${pm.textClass}`}>
                      <Flag className="w-2.5 h-2.5" /> {pm.label}
                    </Badge>
                  )}
                  {t.due_date && (
                    <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0 h-5">
                      <Calendar className="w-2.5 h-2.5" />
                      {format(new Date(t.due_date), "MMM d, HH:mm")}
                    </Badge>
                  )}
                  {t.due_date && !t.completed && <Countdown target={t.due_date} className="text-[10px]" />}
                  {t.recurrence_rule && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">🔁 {describeRule(t.recurrence_rule)}</Badge>
                  )}
                  {prog.total > 0 && (
                    <span className="text-[10px] text-muted-foreground">{prog.done}/{prog.total}</span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <ChildDropZone parentId={t.id} />
                  <Button
                    size="icon" variant="ghost"
                    onClick={() => setMoveTask(t)}
                    title="انتقال"
                    draggable
                    onDragStart={(e) => startItemDrag(e, { kind: "task", id: t.id, title: t.title })}
                    className="h-6 w-6 cursor-grab active:cursor-grabbing"
                  >
                    <FolderInput className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => askDeleteTask(t)} className="h-6 w-6">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {prog.total > 0 && (
                <div className="mt-1.5 ms-12 flex items-center gap-2">
                  <Progress value={pct} className="h-1 flex-1" />
                  <span className="text-[10px] text-muted-foreground w-8 text-start">{pct}%</span>
                </div>
              )}

              {/* Inline + subtask quick add */}
              <div className="mt-1.5 flex items-center gap-2 ms-12">
                <CornerDownRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <Input
                  value={quickSub[t.id] || ""}
                  onChange={(e) => setQuickSub(s => ({ ...s, [t.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && quickAddSub(t)}
                  placeholder="+ زیرتسک سریع..."
                  className="h-6 text-[11px] flex-1"
                  dir="auto"
                />
                <Button size="icon" variant="ghost" onClick={() => quickAddSub(t)} className="h-6 w-6">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          )}
        </SortableTaskRow>
        {open && subs.length > 0 && (
          <div className="mt-2 space-y-2">
            <SortableContext items={subs.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {subs.map((s) => renderTask(s, depth + 1))}
            </SortableContext>
          </div>
        )}
      </div>
    );
  };

  const isFolder = scope === "folder" && !!params.id;

  const listView = (
    <>
      <div className="flex gap-2 mb-4 items-center">
        <div className="flex-1">
          <QuickAddTask
            defaults={{
              folder_id: scope === "folder" ? params.id || null : null,
              due_date: scope === "today"
                ? new Date().toISOString()
                : scope === "next7"
                  ? addDays(new Date(), 1).toISOString()
                  : null,
              tag_id: scope === "tag" ? params.id || null : null,
            }}
            onCreated={() => load()}
          />
        </div>
        <TaskFilterSheet filters={filters} onChange={setFilters} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setActiveDragId(String(e.active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
        <RootDropZone />
        <div className="space-y-2 mt-2">
          {topLevel.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">هیچ تسکی نیست</Card>
          )}
          <SortableContext items={topLevel.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {topLevel.map((t) => renderTask(t))}
          </SortableContext>
        </div>
        <DragOverlay>
          {activeDragId ? (
            <Card className="p-3 shadow-lg opacity-90">
              <p className="text-sm font-medium">
                {allTasks.find(x => x.id === activeDragId)?.title || "..."}
              </p>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <BidiText as="h1" text={title} className="text-2xl font-bold" />
        {isFolder && (
          <Button size="sm" variant="outline" onClick={() => setDelFolderOpen(true)} className="text-destructive">
            <Trash2 className="w-3.5 h-3.5 ms-1" /> حذف فولدر
          </Button>
        )}
      </div>

      

      {isFolder ? (
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">📋 لیست</TabsTrigger>
            <TabsTrigger value="kanban">🗂 Kanban</TabsTrigger>
            <TabsTrigger value="matrix">🎯 ماتریس</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="mt-4">{listView}</TabsContent>
          <TabsContent value="kanban" className="mt-4">
            <FolderKanban folderId={params.id!} onOpenTask={(id) => navigate(`/app/tasks/${id}`)} />
          </TabsContent>
          <TabsContent value="matrix" className="mt-4">
            <EisenhowerMatrix scope={scope} onOpenTask={(id) => navigate(`/app/tasks/${id}`)} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">📋 لیست</TabsTrigger>
            <TabsTrigger value="matrix">🎯 ماتریس</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="mt-4">{listView}</TabsContent>
          <TabsContent value="matrix" className="mt-4">
            <EisenhowerMatrix scope={scope} onOpenTask={(id) => navigate(`/app/tasks/${id}`)} />
          </TabsContent>
        </Tabs>
      )}

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

      {moveTask && (
        <MoveToDialog
          open={!!moveTask}
          onOpenChange={(v) => !v && setMoveTask(null)}
          kind="task"
          itemId={moveTask.id}
          currentFolderId={moveTask.folder_id}
          onMoved={() => { load(); setMoveTask(null); }}
        />
      )}

      {isFolder && delFolderOpen && (
        <FolderDeleteDialog
          open={delFolderOpen}
          onOpenChange={setDelFolderOpen}
          folderId={params.id!}
          folderName={folderName}
          onDone={() => { setDelFolderOpen(false); navigate("/app/inbox"); }}
        />
      )}
    </div>
  );
}

