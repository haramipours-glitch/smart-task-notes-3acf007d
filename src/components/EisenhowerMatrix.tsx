import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";
import { computeQuadrant, QUADRANT_META, QUADRANT_TO_META, type Quadrant } from "@/lib/eisenhower";
import { formatDate } from "@/lib/jalali";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
  closestCenter, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";

type Task = {
  id: string; title: string; priority: "none" | "low" | "medium" | "high";
  due_date: string | null; completed: boolean; folder_id: string | null;
  parent_id: string | null; quadrant: number | null;
};

export function EisenhowerMatrix({ scope, onOpenTask }: {
  scope: "inbox" | "today" | "next7" | "smart" | "folder" | "tag";
  onOpenTask?: (taskId: string) => void;
}) {
  const { user } = useAuth();
  const params = useParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("tasks").select("id,title,priority,due_date,completed,folder_id,parent_id,quadrant");
    let list = ((data || []) as Task[]).filter(t => !t.parent_id && !t.completed);
    if (scope === "folder" && params.id) list = list.filter(t => t.folder_id === params.id);
    else if (scope === "today") {
      const s = startOfDay(new Date()).getTime(); const e = endOfDay(new Date()).getTime();
      list = list.filter(t => t.due_date && new Date(t.due_date).getTime() >= s && new Date(t.due_date).getTime() <= e);
    } else if (scope === "next7") {
      const s = startOfDay(new Date()).getTime(); const e = endOfDay(addDays(new Date(), 7)).getTime();
      list = list.filter(t => t.due_date && new Date(t.due_date).getTime() >= s && new Date(t.due_date).getTime() <= e);
    } else if (scope === "smart") {
      list = list.filter(t => t.priority === "high");
    } else if (scope === "inbox") {
      list = list.filter(t => !t.folder_id);
    }
    setTasks(list);
  };

  useEffect(() => { load(); }, [user, scope, params.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`matrix-rt-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const grouped = useMemo(() => {
    const g: Record<Quadrant, Task[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const t of tasks) g[computeQuadrant(t)].push(t);
    return g;
  }, [tasks]);

  const moveToQuadrant = async (taskId: string, q: Quadrant) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    const meta = QUADRANT_TO_META(q);
    const patch: any = { quadrant: q, priority: meta.priority };
    if (meta.daysOffset !== null) {
      patch.due_date = addDays(new Date(), meta.daysOffset).toISOString();
    }
    setTasks(prev => prev.map(x => x.id === taskId ? { ...x, ...patch } : x));
    const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
    if (error) toast.error(error.message);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    if (overId.startsWith("q:")) {
      const q = Number(overId.slice(2)) as Quadrant;
      moveToQuadrant(String(active.id), q);
    }
  };

  const toggleDone = async (t: Task) => {
    setTasks(prev => prev.filter(x => x.id !== t.id));
    await supabase.from("tasks").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", t.id);
  };

  // AI: schedule Q2 tasks into upcoming empty calendar slots
  const planQ2 = async () => {
    if (!user) return;
    const q2 = grouped[2].filter(t => !t.due_date);
    if (q2.length === 0) {
      toast.info("کارهای ربع ۲ همه دارای سررسید هستند");
      return;
    }
    setPlanning(true);
    try {
      // Get already scheduled times in next 14 days
      const start = startOfDay(new Date()).toISOString();
      const end = endOfDay(addDays(new Date(), 14)).toISOString();
      const { data: scheduled } = await supabase.from("tasks")
        .select("due_date").gte("due_date", start).lte("due_date", end);
      const taken = new Set((scheduled || []).map((s: any) => s.due_date?.slice(0, 13)));

      let slot = addDays(startOfDay(new Date()), 1);
      slot.setHours(10, 0, 0, 0);
      const updates: Array<PromiseLike<any>> = [];
      for (const t of q2) {
        // find next free slot at 10am or 14pm
        let attempts = 0;
        while (taken.has(slot.toISOString().slice(0, 13)) && attempts < 30) {
          slot = addDays(slot, 1);
          attempts++;
        }
        taken.add(slot.toISOString().slice(0, 13));
        updates.push(supabase.from("tasks").update({ due_date: slot.toISOString() }).eq("id", t.id));
        slot = addDays(slot, 1);
      }
      await Promise.all(updates);
      toast.success(`${q2.length} کار ربع ۲ در تقویم قرار گرفت ✨`);
      load();
    } catch (e: any) {
      toast.error(e.message || "خطا در برنامه‌ریزی");
    } finally {
      setPlanning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          کارها رو بین ربع‌ها بکش. اولویت و سررسید خودکار تنظیم می‌شه.
        </p>
        <Button size="sm" onClick={planQ2} disabled={planning} className="gap-1">
          <Sparkles className="w-4 h-4" />
          {planning ? "..." : "برنامه‌ریزی ربع ۲"}
        </Button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {([1, 2, 3, 4] as Quadrant[]).map((q) => (
            <QuadrantBox key={q} q={q} tasks={grouped[q]} onToggle={toggleDone} onOpen={onOpenTask} />
          ))}
        </div>
        <DragOverlay>
          {activeId ? (
            <Card className="p-2 shadow-lg opacity-90">
              <p className="text-sm">{tasks.find(t => t.id === activeId)?.title}</p>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function QuadrantBox({ q, tasks, onToggle, onOpen }: {
  q: Quadrant; tasks: Task[]; onToggle: (t: Task) => void; onOpen?: (id: string) => void;
}) {
  const meta = QUADRANT_META[q];
  const { setNodeRef, isOver } = useDroppable({ id: `q:${q}` });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 p-3 min-h-[200px] transition ${meta.bgClass} ${meta.borderClass} ${isOver ? "ring-2 ring-current scale-[1.01]" : ""}`}
    >
      <div className={`flex items-center justify-between mb-2 ${meta.textClass}`}>
        <div>
          <div className="font-bold flex items-center gap-1.5">
            <span>{meta.emoji}</span> {meta.label}
          </div>
          <div className="text-[11px] opacity-70">{meta.subtitle}</div>
        </div>
        <Badge variant="outline" className="text-xs">{tasks.length}</Badge>
      </div>
      <div className="space-y-1.5">
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} onToggle={onToggle} onOpen={onOpen} />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground/60 text-center py-4">— خالی —</p>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ task, onToggle, onOpen }: {
  task: Task; onToggle: (t: Task) => void; onOpen?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <Card
      ref={setNodeRef}
      className={`p-2 bg-card/80 backdrop-blur ${isDragging ? "opacity-30" : ""}`}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggle(task)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        />
        {/* Drag handle: only this region initiates drag, so click-to-open works on the title */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing px-1 text-muted-foreground/60 hover:text-foreground touch-none"
          aria-label="drag"
          title="بکش برای جابجایی"
        >
          ⋮⋮
        </button>
        <button
          type="button"
          onClick={() => onOpen?.(task.id)}
          className="flex-1 min-w-0 text-end"
        >
          <p className="text-sm truncate hover:underline">{task.title}</p>
          {task.due_date && (
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
              <CalIcon className="w-2.5 h-2.5" />
              {formatDate(new Date(task.due_date), "yyyy/MM/dd")}
            </div>
          )}
        </button>
      </div>
    </Card>
  );
}
