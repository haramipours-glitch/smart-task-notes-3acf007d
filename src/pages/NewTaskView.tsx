import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { TaskDetail } from "@/components/TaskDetail";
import type { Task, ConfirmState } from "@/lib/taskTypes";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

/**
 * Full-screen "new task" page that auto-creates a draft task in the DB on mount,
 * then renders the entire TaskDetail UI (subtasks, steps, attachments, notes, time-block, recurrence, AI).
 * If the user leaves with an empty title, the draft is deleted.
 */
export default function NewTaskView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [draft, setDraft] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const createdRef = useRef(false);
  const savedRef = useRef(false);

  // Create the draft once
  useEffect(() => {
    if (!user || createdRef.current) return;
    createdRef.current = true;
    const parentId = params.get("parent_id");
    const tagId = params.get("tag_id");
    const folderId = params.get("folder_id");
    const dueDate = params.get("due_date");
    const initialTitle = params.get("title") || "تسک جدید";
    (async () => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: initialTitle,
          folder_id: parentId ? null : folderId,
          parent_id: parentId,
          due_date: dueDate,
          priority: "none" as const,
        })
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data && tagId) {
        await supabase.from("task_tags").insert({ task_id: data.id, tag_id: tagId, user_id: user.id });
      }
      setDraft(data as any);
    })();
  }, [user]);

  // Cleanup: if user leaves without giving the task a real title, delete it.
  useEffect(() => {
    return () => {
      const d = draftRef.current;
      if (!d) return;
      const isEmpty = !d.title?.trim() || d.title.trim() === "تسک جدید";
      if (isEmpty) {
        supabase.from("tasks").delete().eq("id", d.id).then(() => {});
      }
    };
    // eslint-disable-next-line
  }, []);
  const draftRef = useRef<Task | null>(null);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  const finish = async () => {
    if (!draft) return;
    if (!draft.title?.trim()) {
      toast.error("عنوان الزامی است");
      return;
    }
    setBusy(true);
    // mark as not-empty so cleanup won't delete it
    draftRef.current = { ...draft, title: draft.title || "بدون عنوان" };
    setBusy(false);
    toast.success("تسک ذخیره شد");
    navigate(-1);
  };

  if (!draft) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="w-full pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b flex items-center justify-between gap-2 p-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          <ArrowRight className="w-4 h-4" /> برگشت
        </Button>
        <h1 className="text-base font-bold flex-1 text-center">تسک جدید (تمام صفحه)</h1>
        <Button onClick={finish} disabled={busy} size="sm" className="gap-1">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          ذخیره
        </Button>
      </div>

      <TaskDetail
        task={draft}
        mode="page"
        onClose={() => navigate(-1)}
        onChanged={() => {
          // refetch fresh draft to keep ref updated
          supabase.from("tasks").select("*").eq("id", draft.id).single()
            .then(({ data }) => { if (data) setDraft(data as any); });
        }}
        setConfirm={setConfirm}
      />

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "task" ? "حذف تسک؟" : confirm?.kind === "note" ? "حذف نوت؟" : "حذف زیرتسک؟"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئنی می‌خوای «{confirm?.title}» را حذف کنی؟
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
    </div>
  );
}
