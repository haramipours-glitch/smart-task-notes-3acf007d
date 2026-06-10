import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { BidiText } from "@/components/BidiText";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Sparkles, Trash2, FileText, Clock, ArrowRight, Ban,
  Folder as FolderIcon, Tag as TagIcon, Check, Calendar as CalendarIcon,
  Flag, Repeat, ListTree, Paperclip, X, Image as ImageIcon, Music, Link as LinkIcon,
  CheckSquare, ListChecks,
} from "lucide-react";
import { PRIORITY_META, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { RecurrenceEditor } from "@/components/RecurrenceEditor";
import { TaskAIPanel } from "@/components/TaskAIPanel";
import { NoteEditorTabs } from "@/components/NoteEditorTabs";
import { TaskStepLists } from "@/components/TaskStepLists";
import { TaskSubtasksInline } from "@/components/TaskSubtasksInline";
import { TaskAttachments } from "@/components/TaskAttachments";
import { TaskDescriptionEditor } from "@/components/TaskDescriptionEditor";
import { DueDatePicker } from "@/components/DueDatePicker";
import { BucketPickerBody } from "@/components/BucketPickerInline";
import { describeRule } from "@/lib/recurrence";

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
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [t, setT] = useState(task);
  const [taskNotes, setTaskNotes] = useState<TaskNote[]>([]);
  const [activeNote, setActiveNote] = useState<TaskNote | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [folders, setFolders] = useState<{ id: string; name: string; parent_id: string | null; color: string | null }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [taskTagIds, setTaskTagIds] = useState<string[]>([]);

  // Section reveal flags – open if data exists, otherwise stay hidden until user taps rail icon
  const hasTimeBlock = !!(t.start_at || t.end_at || t.estimated_minutes);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showTimeBlock, setShowTimeBlock] = useState(hasTimeBlock);

  useEffect(() => { setT(task); }, [task.id]);

  // Auto-reveal sections that already have data so user doesn't need to tap rail icons
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [notesRes, tagsRes, subRes, stepListsRes, attachRes] = await Promise.all([
        supabase.from("notes").select("id,title,content").eq("task_id", task.id).order("updated_at", { ascending: false }),
        supabase.from("task_tags").select("tag_id").eq("task_id", task.id),
        supabase.from("subtasks").select("id", { count: "exact", head: true }).eq("task_id", task.id),
        supabase.from("task_step_lists").select("id", { count: "exact", head: true }).eq("task_id", task.id),
        supabase.from("task_attachments").select("id", { count: "exact", head: true }).eq("task_id", task.id),
      ]);
      if (cancelled) return;
      const list = (notesRes.data || []) as any;
      setTaskNotes(list);
      if (list.length > 0) setShowNotes(true);
      setTaskTagIds((tagsRes.data || []).map((r: any) => r.tag_id));
      if ((subRes.count || 0) > 0) setShowSubtasks(true);
      if ((stepListsRes.count || 0) > 0) setShowSteps(true);
      if ((attachRes.count || 0) > 0) setShowAttachments(true);
      if (hasTimeBlock) setShowTimeBlock(true);
    })();
    return () => { cancelled = true; };
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
    if (!id) return T("بدون فولدر", "No folder");
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
      user_id: user.id, task_id: t.id, title: T("نوت جدید", "New note"), content: "",
    }).select().single();
    if (error) return toast.error(error.message);
    if (data) {
      setTaskNotes([data as any, ...taskNotes]);
      setActiveNote(data as any);
      setShowNotes(true);
    }
  };

  const saveNote = async (id: string, patch: Partial<TaskNote>) => {
    setTaskNotes(taskNotes.map(n => n.id === id ? { ...n, ...patch } : n));
    if (activeNote?.id === id) setActiveNote({ ...activeNote, ...patch });
    await supabase.from("notes").update(patch).eq("id", id);
  };

  const askDelNote = (n: TaskNote) => {
    setConfirm({
      kind: "note", id: n.id, title: n.title || T("بدون عنوان", "Untitled"),
      onConfirm: async () => {
        const { data: snap } = await supabase.from("notes").select("*").eq("id", n.id).maybeSingle();
        await supabase.from("notes").delete().eq("id", n.id);
        setTaskNotes(prev => prev.filter(x => x.id !== n.id));
        if (activeNote?.id === n.id) setActiveNote(null);
        if (snap) {
          pushUndo({
            label: T(`نوت «${snap.title || "بدون عنوان"}» حذف شد`, `Note "${snap.title || "Untitled"}" deleted`),
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

  // ── Quick chip helpers ──────────────────────────────────────────────
  const formatDue = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString(isEn ? "en-US" : "fa-IR", { month: "short", day: "numeric" });
  };

  const priorityMeta = PRIORITY_META[t.priority];
  const dueLabel = formatDue(t.due_date);
  const recLabel = t.recurrence_rule ? describeRule(t.recurrence_rule) : null;

  // ── Rail icon button (MD3 tonal) ────────────────────────────────────
  const RailButton = ({
    icon: Icon, label, active, badge, onClick, accent,
  }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[52px] h-12 rounded-2xl transition active:scale-95 ${
        active
          ? accent
            ? "bg-primary/15 text-primary"
            : "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-muted/60"
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
      {badge != null && badge !== 0 && (
        <span className="absolute top-1 end-1 min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-medium flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );

  const Chip = ({ icon: Icon, children, onClick, onClear, color }: any) => (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] cursor-pointer transition ${
        color || "bg-muted/60 text-foreground/80 hover:bg-muted"
      }`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      <span className="truncate max-w-[160px]">{children}</span>
      {onClear && (
        <X
          className="w-3 h-3 opacity-60 hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
        />
      )}
    </span>
  );

  // ── Hero (title + description) ─────────────────────────────────────
  const hero = (
    <div className="px-1 pb-3">
      <AutoTextarea
        value={t.title}
        onChange={(e) => setT({ ...t, title: e.target.value })}
        onBlur={() => save({ title: t.title })}
        minHeight={44}
        maxHeight={220}
        rows={1}
        dir="auto"
        placeholder={T("عنوان تسک را اینجا بنویس…", "Write the task title here…")}
        className="text-[22px] font-semibold leading-snug bg-muted/40 border border-dashed border-primary/40 rounded-md px-3 py-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:bg-background break-words whitespace-pre-wrap tracking-tight placeholder:text-primary/60 placeholder:font-medium"
      />
      <div data-rich-selection onContextMenu={(e) => e.preventDefault()} style={{ WebkitTouchCallout: "none" } as any}>
        <TaskDescriptionEditor
          taskId={t.id}
          value={t.description || ""}
          onChange={(v) => setT({ ...t, description: v })}
          onSave={(v) => save({ description: v })}
        />
      </div>
    </div>
  );

  // ── Quick-info chips row (only what's set) ──────────────────────────
  const quickChips = (
    <div className="flex flex-wrap gap-1.5 px-1 pb-3">
      {dueLabel && (
        <Popover>
          <PopoverTrigger asChild>
            <span>
              <Chip
                icon={CalendarIcon}
                onClear={() => save({ due_date: null, reminder_at: null })}
                color="bg-primary/10 text-primary"
              >
                {dueLabel}
              </Chip>
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <DueDatePicker
              label=""
              value={t.due_date}
              reminderValue={t.reminder_at}
              onReminderChange={(iso) => save({ reminder_at: iso })}
              onChange={(iso) => save({ due_date: iso })}
            />
          </PopoverContent>
        </Popover>
      )}
      {t.priority !== "none" && (
        <Chip
          icon={Flag}
          onClick={() => save({ priority: "none" as any })}
          color={`${priorityMeta.bgClass} ${priorityMeta.textClass}`}
        >
          {priorityMeta.label}
        </Chip>
      )}
      {recLabel && (
        <Chip
          icon={Repeat}
          onClear={() => save({ recurrence_rule: null } as any)}
          color="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        >
          {recLabel}
        </Chip>
      )}
      {t.folder_id && (
        <Chip icon={FolderIcon}>{folderName(t.folder_id)}</Chip>
      )}
      {taskTagIds.length > 0 && (
        <Chip icon={TagIcon}>
          {taskTagIds.length} {T("تگ", "tags")}
        </Chip>
      )}
      {t.is_avoidance && (
        <Chip
          icon={Ban}
          onClear={() => save({ is_avoidance: false } as any)}
          color="bg-amber-500/15 text-amber-700 dark:text-amber-400"
        >
          {T("اجتنابی", "Avoidance")}
        </Chip>
      )}
    </div>
  );

  // ── Quick-create helpers ────────────────────────────────────────────
  const TAG_COLORS = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState<string>(TAG_COLORS[5]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS[3]);
  const [linkUrl, setLinkUrl] = useState("");

  const createFolderAndAssign = async () => {
    if (!user || !newFolderName.trim()) return;
    const { data, error } = await supabase
      .from("folders")
      .insert({ user_id: user.id, name: newFolderName.trim(), color: newFolderColor })
      .select().single();
    if (error) return toast.error(error.message);
    setFolders((f) => [...f, data as any]);
    setNewFolderName("");
    await save({ folder_id: (data as any).id });
    toast.success(T("فولدر ساخته شد", "Folder created"));
  };

  const createTagAndAssign = async () => {
    if (!user || !newTagName.trim()) return;
    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: user.id, name: newTagName.trim(), color: newTagColor })
      .select().single();
    if (error) return toast.error(error.message);
    setTags((tg) => [...tg, data as any]);
    setNewTagName("");
    await supabase.from("task_tags").insert({ task_id: t.id, tag_id: (data as any).id, user_id: user.id });
    setTaskTagIds([...taskTagIds, (data as any).id]);
    toast.success(T("تگ ساخته شد", "Tag created"));
  };

  const attachLink = async () => {
    if (!user || !linkUrl.trim()) return;
    const url = linkUrl.trim();
    const { error } = await supabase.from("task_attachments").insert({
      user_id: user.id,
      task_id: t.id,
      url,
      storage_path: "",
      file_name: url.replace(/^https?:\/\//, "").slice(0, 80),
      mime_type: "text/uri-list",
      kind: "file" as any,
      size_bytes: 0,
    } as any);
    if (error) return toast.error(error.message);
    setLinkUrl("");
    setShowAttachments(true);
    toast.success(T("لینک افزوده شد", "Link added"));
    window.dispatchEvent(new CustomEvent(`lov:attach-refresh:${t.id}`));
  };

  const pickFileType = (accept: string) => {
    setShowAttachments(true);
    // Defer so the section mounts first
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(`lov:attach-pick:${t.id}`, { detail: { accept } }));
    }, 50);
  };

  // ── Bottom icon rail — fixed above BottomTabBar on mobile ───────────
  const rail = (
    <div
      className="fixed md:sticky inset-x-0 z-30 md:mt-4 -mx-1 sm:-mx-2 md:-mx-4 px-2 py-1.5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border/40 shadow-[0_-2px_10px_-4px_rgba(0,0,0,0.08)]"
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {/* 1. Schedule (Date + Time block + Repeat) */}
        <Popover>
          <PopoverTrigger asChild>
            <span>
              <RailButton
                icon={CalendarIcon}
                label={T("زمان‌بندی", "Schedule")}
                active={!!t.due_date || !!t.reminder_at || hasTimeBlock || !!t.recurrence_rule}
                accent
              />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-[min(92vw,360px)] p-2" align="start" side="top">
            <Tabs defaultValue="date">
              <TabsList className="grid grid-cols-3 w-full mb-2">
                <TabsTrigger value="date" className="text-xs">{T("تاریخ", "Date")}</TabsTrigger>
                <TabsTrigger value="block" className="text-xs">{T("بازه", "Time")}</TabsTrigger>
                <TabsTrigger value="repeat" className="text-xs">{T("تکرار", "Repeat")}</TabsTrigger>
              </TabsList>
              <TabsContent value="date" className="mt-0">
                <DueDatePicker
                  label=""
                  value={t.due_date}
                  reminderValue={t.reminder_at}
                  onReminderChange={(iso) => save({ reminder_at: iso })}
                  onChange={(iso) => save({ due_date: iso })}
                />
              </TabsContent>
              <TabsContent value="block" className="mt-0 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">{T("شروع", "Start")}</label>
                    <Input type="datetime-local" className="h-9 text-xs"
                      value={t.start_at ? t.start_at.slice(0, 16) : ""}
                      onChange={(e) => save({ start_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">{T("پایان", "End")}</label>
                    <Input type="datetime-local" className="h-9 text-xs"
                      value={t.end_at ? t.end_at.slice(0, 16) : ""}
                      onChange={(e) => save({ end_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-[10px] text-muted-foreground whitespace-nowrap">{T("تخمین (دقیقه):", "Estimate:")}</label>
                  <Input type="number" placeholder="—"
                    value={t.estimated_minutes ?? ""}
                    onChange={(e) => save({ estimated_minutes: e.target.value ? Number(e.target.value) : null } as any)}
                    className="h-8 w-20 text-xs" />
                  <div className="flex gap-1">
                    {[15, 30, 60].map(m => (
                      <button key={m} type="button"
                        onClick={() => save({ estimated_minutes: m } as any)}
                        className={`px-2 h-7 text-[10px] rounded-lg border ${t.estimated_minutes === m ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="repeat" className="mt-0">
                <RecurrenceEditor
                  value={t.recurrence_rule}
                  onChange={(rule) => save({ recurrence_rule: rule } as any)}
                />
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        {/* 2. Priority */}
        <Popover>
          <PopoverTrigger asChild>
            <span>
              <RailButton icon={Flag} label={T("اولویت", "Priority")} active={t.priority !== "none"} accent />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2" align="start" side="top">
            <div className="grid grid-cols-2 gap-1.5">
              {PRIORITY_ORDER.map((p) => {
                const m = PRIORITY_META[p];
                const active = t.priority === p;
                return (
                  <button key={p} onClick={() => save({ priority: p })}
                    className={`px-2 h-9 rounded-xl text-[12px] font-medium transition ${active ? `${m.bgClass} ${m.textClass}` : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}>
                    {m.emoji} {m.label}
                  </button>
                );
              })}
            </div>
            {t.priority !== "none" && (
              <button onClick={() => save({ priority: "none" as any })}
                className="w-full mt-2 h-8 rounded-lg text-xs text-muted-foreground hover:bg-muted">
                {T("حذف اولویت", "Clear priority")}
              </button>
            )}
            <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Ban className="w-3.5 h-3.5 text-amber-600" /> {T("اجتنابی", "Avoidance")}
              </span>
              <Switch checked={!!t.is_avoidance} onCheckedChange={(v) => save({ is_avoidance: !!v } as any)} />
            </div>
          </PopoverContent>
        </Popover>

        {/* 3. Folder + quick-create */}
        <Popover>
          <PopoverTrigger asChild>
            <span>
              <RailButton icon={FolderIcon} label={T("فولدر", "Folder")} active={!!t.folder_id} />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2 max-h-[55vh] overflow-y-auto" align="start" side="top">
            <div className="flex items-center gap-1.5 mb-2 p-1.5 rounded-xl bg-muted/40">
              <span className="w-6 h-6 rounded-md shrink-0" style={{ background: newFolderColor }} />
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createFolderAndAssign()}
                placeholder={T("نام فولدر جدید…", "New folder name…")}
                className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={createFolderAndAssign} disabled={!newFolderName.trim()}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex gap-1 mb-2 px-1">
              {TAG_COLORS.map(c => (
                <button key={c} onClick={() => setNewFolderColor(c)}
                  className={`w-5 h-5 rounded-full border-2 ${newFolderColor === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
            <button
              onClick={() => save({ folder_id: null })}
              className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent ${t.folder_id === null ? "bg-accent" : ""}`}
            >{T("بدون فولدر (Inbox)", "No folder (Inbox)")}</button>
            {folders.filter(f => !f.parent_id).map(f => {
              const children = folders.filter(c => c.parent_id === f.id);
              return (
                <div key={f.id}>
                  <button
                    onClick={() => save({ folder_id: f.id })}
                    className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent flex items-center gap-2 ${t.folder_id === f.id ? "bg-accent" : ""}`}
                  >
                    <FolderIcon className="w-3.5 h-3.5" style={{ color: f.color || undefined }} />
                    {f.name}
                  </button>
                  {children.map(c => (
                    <button key={c.id}
                      onClick={() => save({ folder_id: c.id })}
                      className={`w-full text-start p-2 ps-6 rounded-lg text-xs hover:bg-accent flex items-center gap-2 ${t.folder_id === c.id ? "bg-accent" : ""}`}
                    >
                      <FolderIcon className="w-3 h-3" style={{ color: c.color || undefined }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </PopoverContent>
        </Popover>

        {/* 4. Tags + quick-create */}
        <Popover>
          <PopoverTrigger asChild>
            <span>
              <RailButton icon={TagIcon} label={T("تگ", "Tags")} active={taskTagIds.length > 0} badge={taskTagIds.length || undefined} />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2 max-h-[55vh] overflow-y-auto" align="start" side="top">
            <div className="flex items-center gap-1.5 mb-2 p-1.5 rounded-xl bg-muted/40">
              <span className="w-3 h-3 rounded-full shrink-0 ms-1" style={{ background: newTagColor }} />
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createTagAndAssign()}
                placeholder={T("نام تگ جدید…", "New tag name…")}
                className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={createTagAndAssign} disabled={!newTagName.trim()}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex gap-1 mb-2 px-1">
              {TAG_COLORS.map(c => (
                <button key={c} onClick={() => setNewTagColor(c)}
                  className={`w-5 h-5 rounded-full border-2 ${newTagColor === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
            {tags.map(tg => {
              const active = taskTagIds.includes(tg.id);
              return (
                <button key={tg.id} onClick={() => toggleTag(tg.id)}
                  className={`w-full text-start p-2 rounded-lg text-sm hover:bg-accent flex items-center justify-between gap-2 ${active ? "bg-accent" : ""}`}>
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

        {/* 5. Attachments — pick file type first */}
        <Popover>
          <PopoverTrigger asChild>
            <span>
              <RailButton icon={Paperclip} label={T("ضمیمه", "Attach")} active={showAttachments} />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start" side="top">
            <div className="grid grid-cols-2 gap-1.5">
              <AttachTypeBtn icon={ImageIcon} label={T("تصویر", "Image")} onClick={() => pickFileType("image/*")} />
              <AttachTypeBtn icon={Music} label={T("صدا", "Audio")} onClick={() => pickFileType("audio/*")} />
              <AttachTypeBtn icon={FileText} label={T("سند", "Document")} onClick={() => pickFileType("application/pdf,.doc,.docx,.txt")} />
              <AttachTypeBtn icon={Paperclip} label={T("هر فایلی", "Any file")} onClick={() => pickFileType("*/*")} />
            </div>
            <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && attachLink()}
                placeholder={T("https://…", "https://…")}
                className="h-8 text-xs"
                dir="ltr"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={attachLink} disabled={!linkUrl.trim()}>
                {T("افزودن", "Add")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* 6. Items: Subtasks or Steps */}
        <Popover>
          <PopoverTrigger asChild>
            <span>
              <RailButton
                icon={ListChecks}
                label={T("آیتم‌ها", "Items")}
                active={showSubtasks || showSteps}
              />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1.5" align="start" side="top">
            <button
              onClick={() => setShowSubtasks(s => !s)}
              className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-sm hover:bg-accent ${showSubtasks ? "bg-accent" : ""}`}
            >
              <ListTree className="w-4 h-4 text-primary" />
              <span className="flex-1 text-start">{T("زیرتسک", "Subtask")}</span>
              {showSubtasks && <Check className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setShowSteps(s => !s)}
              className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-sm hover:bg-accent ${showSteps ? "bg-accent" : ""}`}
            >
              <CheckSquare className="w-4 h-4 text-emerald-500" />
              <span className="flex-1 text-start">{T("مرحله / چک‌لیست", "Step / checklist")}</span>
              {showSteps && <Check className="w-3.5 h-3.5" />}
            </button>
          </PopoverContent>
        </Popover>

        {/* Bucket */}
        <Popover>
          <PopoverTrigger asChild>
            <span>
              <RailButton
                icon={CalendarIcon}
                label={T("بازهٔ کلی", "Bucket")}
                active={!!t.bucket_kind}
              />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start" side="top">
            <BucketPickerBody
              value={{
                kind: (t.bucket_kind as any) || null,
                calendar: (t.bucket_calendar as any) || null,
                anchor: (t.bucket_anchor as any) || null,
              }}
              onChange={(v) => save({
                bucket_kind: v.kind,
                bucket_calendar: v.calendar,
                bucket_anchor: v.anchor,
              } as any)}
            />
          </PopoverContent>
        </Popover>

        {/* AI */}
        <RailButton
          icon={Sparkles}
          label="AI"
          accent
          onClick={() => setAiOpen(true)}
        />
      </div>
    </div>
  );

  // ── Expandable inline blocks (only when toggled) ────────────────────
  const expandables = (
    <div className="space-y-4 px-1">
      {showTimeBlock && (
        <Card className="p-3 space-y-2 rounded-2xl border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {T("بازهٔ زمانی", "Time block")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">{T("شروع", "Start")}</label>
              <Input type="datetime-local"
                className="h-10 sm:h-9 text-xs"
                value={t.start_at ? t.start_at.slice(0, 16) : ""}
                onChange={(e) => save({ start_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">{T("پایان", "End")}</label>
              <Input type="datetime-local"
                className="h-10 sm:h-9 text-xs"
                value={t.end_at ? t.end_at.slice(0, 16) : ""}
                onChange={(e) => save({ end_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[10px] text-muted-foreground whitespace-nowrap">{T("مدت تخمینی (دقیقه):", "Estimate (min):")}</label>
            <Input type="number" placeholder="—"
              value={t.estimated_minutes ?? ""}
              onChange={(e) => save({ estimated_minutes: e.target.value ? Number(e.target.value) : null } as any)}
              className="h-10 sm:h-8 w-24 text-xs" />
            <div className="flex gap-1">
              {[15, 30, 60].map(m => (
                <button key={m} type="button"
                  onClick={() => save({ estimated_minutes: m } as any)}
                  className={`px-2 h-7 text-[10px] rounded-lg border ${t.estimated_minutes === m ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                  {m}{isEn ? "m" : "د"}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {showSubtasks && (
        <TaskSubtasksInline
          taskId={t.id}
          onOpenSubtask={(id) => {
            supabase.from("tasks").select("*").eq("id", id).single().then(({ data }) => {
              if (data) { onChanged(); setT(data as any); }
            });
          }}
        />
      )}

      {showSteps && <TaskStepLists taskId={t.id} />}

      {showAttachments && <TaskAttachments taskId={t.id} />}

      {showNotes && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <FileText className="w-4 h-4" /> {T("نوت‌ها", "Notes")} ({taskNotes.length})
            </label>
            <Button size="sm" variant="outline" onClick={addNote} className="gap-1 rounded-full">
              <Plus className="w-3 h-3" /> {T("جدید", "New")}
            </Button>
          </div>
          <div className="space-y-2">
            {taskNotes.map((n) => (
              <Card key={n.id} className="p-2 flex items-center gap-2 rounded-xl">
                <button className="flex-1 text-start text-sm truncate" onClick={() => setActiveNote(n)}>
                  <BidiText text={n.title} />
                </button>
                <Button size="icon" variant="ghost" onClick={() => askDelNote(n)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const body = (
    <div className="mt-2 task-detail-sections flex flex-col min-h-[60vh]">
      {hero}
      {quickChips}
      <div className="flex-1">{expandables}</div>
      {rail}
    </div>
  );

  const noteEditorBody = activeNote && (
    <div className="space-y-3 mt-2">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setActiveNote(null)} className="gap-1">
          <ArrowRight className="w-4 h-4" />
          {T("بازگشت به تسک", "Back to task")}
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
        <div className="w-full px-1 sm:px-2 md:px-4 py-3">
          {activeNote ? noteEditorBody : body}
        </div>
      ) : (
        <Sheet open={true} onOpenChange={(v) => !v && onClose()}>
          <SheetContent className="w-full sm:max-w-full overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="sr-only">
                {activeNote ? T("ویرایش نوت", "Edit note") : T("جزئیات تسک", "Task")}
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
