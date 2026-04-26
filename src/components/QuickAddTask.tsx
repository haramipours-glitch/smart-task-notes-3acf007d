import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Maximize2, Loader2 } from "lucide-react";
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
          due_date: defaults.due_date ?? null,
          parent_id: defaults.parent_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      if (data && defaults.tag_id) {
        await supabase
          .from("task_tags")
          .insert({ task_id: data.id, tag_id: defaults.tag_id, user_id: user.id });
      }
      setTitle("");
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
    if (defaults.due_date) params.set("due_date", defaults.due_date);
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
