import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Plus, Trash2, ListChecks, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { BidiText } from "@/components/BidiText";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type StepStyle = "numbered" | "checkbox" | "bullet" | "arrow";

const STYLE_OPTIONS: { value: StepStyle; label: string; preview: string }[] = [
  { value: "numbered", label: "شماره‌دار", preview: "1. 2. 3." },
  { value: "checkbox", label: "چک‌باکس", preview: "☐ ☑" },
  { value: "bullet",   label: "نقطه",     preview: "• • •" },
  { value: "arrow",    label: "فلش",      preview: "→ → →" },
];

type StepList = {
  id: string; title: string; style: StepStyle; position: number;
};
type Step = {
  id: string; list_id: string; text: string; completed: boolean; position: number;
};

export function TaskStepLists({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const [lists, setLists] = useState<StepList[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [newListTitle, setNewListTitle] = useState("");
  const [newListStyle, setNewListStyle] = useState<StepStyle>("checkbox");
  const [newStep, setNewStep] = useState<Record<string, string>>({});

  const load = async () => {
    const { data: ls } = await supabase
      .from("task_step_lists" as any)
      .select("*")
      .eq("task_id", taskId)
      .order("position");
    const lists = (ls || []) as unknown as StepList[];
    setLists(lists);
    if (lists.length) {
      const { data: st } = await supabase
        .from("task_steps" as any)
        .select("*")
        .in("list_id", lists.map((l) => l.id))
        .order("position");
      setSteps(((st || []) as unknown) as Step[]);
    } else {
      setSteps([]);
    }
  };

  useEffect(() => { load(); }, [taskId]);

  const addList = async () => {
    if (!user) return;
    const title = newListTitle.trim() || "مراحل";
    const { data, error } = await supabase
      .from("task_step_lists" as any)
      .insert({
        user_id: user.id,
        task_id: taskId,
        title,
        style: newListStyle,
        position: lists.length,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setLists((prev) => [...prev, data as any]);
    setNewListTitle("");
  };

  const updateList = async (id: string, patch: Partial<StepList>) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    await supabase.from("task_step_lists" as any).update(patch).eq("id", id);
  };

  const deleteList = async (id: string) => {
    setLists((prev) => prev.filter((l) => l.id !== id));
    setSteps((prev) => prev.filter((s) => s.list_id !== id));
    await supabase.from("task_step_lists" as any).delete().eq("id", id);
  };

  const addStep = async (listId: string) => {
    if (!user) return;
    const text = (newStep[listId] || "").trim();
    if (!text) return;
    const listSteps = steps.filter((s) => s.list_id === listId);
    const { data, error } = await supabase
      .from("task_steps" as any)
      .insert({
        user_id: user.id,
        list_id: listId,
        text,
        position: listSteps.length,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setSteps((prev) => [...prev, data as any]);
    setNewStep((s) => ({ ...s, [listId]: "" }));
  };

  const updateStep = async (id: string, patch: Partial<Step>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    await supabase.from("task_steps" as any).update(patch).eq("id", id);
  };

  const deleteStep = async (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("task_steps" as any).delete().eq("id", id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-1">
          <ListChecks className="w-4 h-4" /> مراحل (Steps)
        </label>
      </div>

      {/* New list creator */}
      <Card className="p-2 space-y-2 bg-muted/30">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="عنوان لیست مراحل..."
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            className="h-8 text-xs flex-1"
            dir="auto"
          />
          <Select value={newListStyle} onValueChange={(v) => setNewListStyle(v as StepStyle)}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STYLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label} <span className="text-muted-foreground ms-1">{o.preview}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={addList} className="h-8 gap-1">
            <Plus className="w-3 h-3" /> لیست
          </Button>
        </div>
      </Card>

      {lists.map((list) => {
        const listSteps = steps
          .filter((s) => s.list_id === list.id)
          .sort((a, b) => a.position - b.position);
        return (
          <Card key={list.id} className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={list.title}
                onChange={(e) => updateList(list.id, { title: e.target.value })}
                className="flex-1 h-7 text-sm font-medium"
                dir="auto"
              />
              <Select
                value={list.style}
                onValueChange={(v) => updateList(list.id, { style: v as StepStyle })}
              >
                <SelectTrigger className="h-7 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteList(list.id)}
                className="h-7 w-7"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>

            <ul className="space-y-1">
              {listSteps.map((s, idx) => (
                <li key={s.id} className="flex items-start gap-2 group">
                  <StepBullet style={list.style} index={idx} completed={s.completed}
                    onToggle={() => updateStep(s.id, { completed: !s.completed })} />
                  <AutoTextarea
                    value={s.text}
                    onChange={(e) => updateStep(s.id, { text: e.target.value })}
                    className={`text-sm flex-1 border-none bg-transparent focus-visible:ring-1 px-1 py-1 leading-relaxed ${
                      s.completed ? "line-through text-muted-foreground" : ""
                    }`}
                    minHeight={28}
                    maxHeight={400}
                    dir="auto"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteStep(s.id)}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </li>
              ))}
              {listSteps.length === 0 && (
                <li className="text-xs text-muted-foreground/60 px-1">— هیچ مرحله‌ای نیست —</li>
              )}
            </ul>

            <div className="flex items-center gap-2">
              <Input
                value={newStep[list.id] || ""}
                onChange={(e) => setNewStep((st) => ({ ...st, [list.id]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addStep(list.id)}
                placeholder="+ مرحله جدید..."
                className="h-7 text-xs flex-1"
                dir="auto"
              />
              <Button size="icon" variant="ghost" onClick={() => addStep(list.id)} className="h-7 w-7">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        );
      })}

      {lists.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          هنوز لیست مراحلی ندارید. یکی اضافه کن.
        </p>
      )}
    </div>
  );
}

function StepBullet({
  style, index, completed, onToggle,
}: {
  style: StepStyle; index: number; completed: boolean; onToggle: () => void;
}) {
  if (style === "checkbox") {
    return (
      <div className="pt-1.5">
        <Checkbox checked={completed} onCheckedChange={onToggle} />
      </div>
    );
  }
  // For non-checkbox styles, clicking the bullet still toggles completion.
  let glyph: string;
  if (style === "numbered") glyph = `${index + 1}.`;
  else if (style === "bullet") glyph = "•";
  else glyph = "→"; // arrow
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`pt-1 w-6 text-sm tabular-nums text-muted-foreground hover:text-foreground select-none ${
        completed ? "line-through opacity-60" : ""
      }`}
      title="تیک کامل/ناتمام"
    >
      {glyph}
    </button>
  );
}
