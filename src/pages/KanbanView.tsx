import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Flag, Calendar, Circle, Loader2, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PRIORITY_META, type Priority } from "@/lib/priority";
import { haptic } from "@/lib/haptics";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
  useSensor, useSensors, useDroppable, closestCorners,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Status = "todo" | "in_progress" | "done";
type Task = {
  id: string; title: string; priority: Priority; due_date: string | null;
  status: Status; completed: boolean; parent_id: string | null;
};

const COLUMNS: { id: Status; label: string; icon: any; accent: string }[] = [
  { id: "todo", label: "To Do", icon: Circle, accent: "border-t-muted-foreground/40" },
  { id: "in_progress", label: "In Progress", icon: Loader2, accent: "border-t-primary" },
  { id: "done", label: "Done", icon: CheckCircle2, accent: "border-t-emerald-500" },
];
const COL_ORDER: Status[] = ["todo", "in_progress", "done"];

export default function KanbanView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState<Record<Status, string>>({ todo: "", in_progress: "", done: "" });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("tasks").select("*").is("parent_id", null).order("position");
    setTasks(((data || []) as unknown) as Task[]);
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`kanban-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const grouped = useMemo(() => {
    const g: Record<Status, Task[]> = { todo: [], in_progress: [], done: [] };
    tasks.forEach(t => { (g[t.status] ||= []).push(t); });
    return g;
  }, [tasks]);

  const addCard = async (status: Status) => {
    const title = newTitle[status].trim();
    if (!title || !user) return;
    const completed = status === "done";
    const { data, error } = await supabase.from("tasks").insert({
      user_id: user.id, title, status, completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).select().single();
    if (error) return toast.error(error.message);
    if (data) setTasks(prev => [...prev, data as any]);
    setNewTitle(s => ({ ...s, [status]: "" }));
  };

  const moveTask = async (taskId: string, newStatus: Status) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t || t.status === newStatus) return;
    const completed = newStatus === "done";
    setTasks(prev => prev.map(x => x.id === taskId ? { ...x, status: newStatus, completed } : x));
    const { error } = await supabase.from("tasks").update({
      status: newStatus, completed,
      completed_at: completed ? new Date().toISOString() : null,
    } as any).eq("id", taskId);
    if (error) toast.error(error.message);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    // over can be column id or another task id
    const targetCol: Status | undefined =
      (COLUMNS.find(c => c.id === overIdStr)?.id) ||
      tasks.find(t => t.id === overIdStr)?.status;
    if (!targetCol) return;
    moveTask(activeIdStr, targetCol);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div dir="rtl" className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Kanban</h1>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={grouped[col.id]}
              newValue={newTitle[col.id]}
              setNewValue={(v) => setNewTitle(s => ({ ...s, [col.id]: v }))}
              onAdd={() => addCard(col.id)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  column, tasks, newValue, setNewValue, onAdd,
}: {
  column: typeof COLUMNS[number];
  tasks: Task[];
  newValue: string;
  setNewValue: (v: string) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const Icon = column.icon;
  return (
    <div
      ref={setNodeRef}
      className={`bg-muted/30 rounded-xl border-t-4 ${column.accent} p-3 min-h-[400px] transition ${isOver ? "bg-primary/5 ring-2 ring-primary/30" : ""}`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${column.id === "in_progress" ? "animate-spin" : ""}`} />
          <h2 className="font-semibold">{column.label}</h2>
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
        </div>
      </div>

      <div className="flex gap-1 mb-3">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder="+ کارت جدید"
          className="h-8 text-sm bg-background"
        />
        <Button size="icon" variant="ghost" onClick={onAdd} className="h-8 w-8">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map(t => <SortableTaskCard key={t.id} task={t} />)}
          {tasks.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">
              اینجا رها کن
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const navigate = useNavigate();
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        dragHandleProps={{ ...attributes, ...listeners }}
        onOpen={() => navigate(`/app/tasks/${task.id}`)}
      />
    </div>
  );
}

function TaskCard({ task, dragging, dragHandleProps, onOpen }: {
  task: Task; dragging?: boolean; dragHandleProps?: any; onOpen?: () => void;
}) {
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.none;
  return (
    <Card className={`p-3 border-s-4 ${pm.borderClass} ${dragging ? "shadow-lg" : "hover:shadow-soft"}`}>
      <div className="flex items-start gap-1.5">
        <button
          {...(dragHandleProps || {})}
          className="cursor-grab active:cursor-grabbing px-0.5 text-muted-foreground/60 hover:text-foreground touch-none shrink-0"
          aria-label="drag"
          onClick={(e) => e.stopPropagation()}
        >
          ⋮⋮
        </button>
        <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-end">
          <p className={`text-sm font-medium hover:underline ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {task.priority !== "none" && (
              <Badge variant="outline" className={`text-[10px] gap-1 ${pm.bgClass} ${pm.textClass}`}>
                <Flag className="w-2.5 h-2.5" /> {pm.label}
              </Badge>
            )}
            {task.due_date && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Calendar className="w-2.5 h-2.5" />
                {format(new Date(task.due_date), "MMM d")}
              </Badge>
            )}
          </div>
        </button>
      </div>
    </Card>
  );
}
