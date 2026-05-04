import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Maximize2, Loader2, Calendar as CalendarIcon, Ban } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { DueDatePicker } from "@/components/DueDatePicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Defaults = {
  folder_id?: string | null;
  due_date?: string | null;
  parent_id?: string | null;
  tag_id?: string | null;
};

export function QuickAddTask({
  defaults = {},
  placeholder = "+ تسک جدید...",
  onCreated,
  className = "",
}: {
  defaults?: Defaults;
  placeholder?: string;
  onCreated?: (taskId: string) => void;
  className?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [due, setDue] = useState<string | null>(defaults.due_date ?? null);
  const [avoidance, setAvoidance] = useState(false);

  const submit = async () => {
    if (!user || !title.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: title.trim(),
          folder_id: defaults.folder_id ?? null,
          due_date: due ?? defaults.due_date ?? null,
          parent_id: defaults.parent_id ?? null,
          is_avoidance: avoidance,
        } as any)
        .select()
        .single();
      if (error) throw error;
      if (data && defaults.tag_id) {
        await supabase
          .from("task_tags")
          .insert({ task_id: data.id, tag_id: defaults.tag_id, user_id: user.id });
      }
      setTitle("");
      setDue(defaults.due_date ?? null);
      setAvoidance(false);
      if (data) onCreated?.(data.id);
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally {
      setBusy(false);
    }
  };

  const goFullscreen = () => {
    const params = new URLSearchParams();
    if (title.trim()) params.set("title", title.trim());
    if (defaults.folder_id) params.set("folder_id", defaults.folder_id);
    if (due ?? defaults.due_date) params.set("due_date", (due ?? defaults.due_date)!);
    if (defaults.parent_id) params.set("parent_id", defaults.parent_id);
    if (defaults.tag_id) params.set("tag_id", defaults.tag_id);
    navigate(`/app/new/task?${params.toString()}`);
  };

  return (
    <div className={`flex gap-2 ${className}`} dir="rtl">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="flex-1"
        dir="auto"
        disabled={busy}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            title="تاریخ و گزینه‌ها"
            className={due || avoidance ? "border-primary text-primary" : ""}
          >
            <CalendarIcon className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3" align="end">
          <DueDatePicker value={due} onChange={setDue} compact />
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <label className="text-xs flex items-center gap-1.5 cursor-pointer">
              <Ban className="w-3 h-3 text-amber-600" />
              تسک اجتنابی (نباید انجام شود)
            </label>
            <Switch checked={avoidance} onCheckedChange={setAvoidance} />
          </div>
        </PopoverContent>
      </Popover>
      <Button onClick={submit} disabled={busy || !title.trim()} size="icon" title="افزودن سریع">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      </Button>
      <Button
        onClick={goFullscreen}
        variant="outline"
        size="icon"
        title="تمام‌صفحه با همه جزئیات"
      >
        <Maximize2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
