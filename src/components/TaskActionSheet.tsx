import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Check, Trash2, FolderInput, Network, Pencil, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/taskTypes";
import ShareDialog from "@/components/ShareDialog";

interface Props {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onDelete: () => void;
  onMove: () => void;
  onMakeChild: () => void;
  onEdit: () => void;
}

export default function TaskActionSheet({
  task,
  onOpenChange,
  onComplete,
  onDelete,
  onMove,
  onMakeChild,
  onEdit,
}: Props) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [shareOpen, setShareOpen] = useState(false);

  if (!task) return null;
  const Item = ({ icon: Icon, label, onClick, danger }: any) => (
    <button
      onClick={() => {
        onClick();
        onOpenChange(false);
      }}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent active:scale-[0.98] transition text-start ${
        danger ? "text-destructive" : ""
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </button>
  );
  return (
    <>
      <Sheet open={!!task && !shareOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-6">
          <SheetHeader>
            <SheetTitle className="text-start text-base truncate">{task.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-1">
            <Item icon={Check} label={task.completed ? T("بازگشایی", "Reopen") : T("تکمیل", "Complete")} onClick={onComplete} />
            <Item icon={Pencil} label={T("ویرایش / جزئیات", "Edit / details")} onClick={onEdit} />
            <Item icon={Share2} label={T("اشتراک‌گذاری…", "Share…")} onClick={() => setShareOpen(true)} />
            <Item icon={FolderInput} label={T("انتقال به…", "Move to…")} onClick={onMove} />
            <Item icon={Network} label={T("تبدیل به زیرتسکِ…", "Make subtask of…")} onClick={onMakeChild} />
            <Item
              icon={Copy}
              label={T("کپی عنوان", "Copy title")}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(task.title);
                  toast.success(T("کپی شد", "Copied"));
                } catch {}
              }}
            />
            <Item icon={Trash2} label={T("حذف", "Delete")} onClick={onDelete} danger />
          </div>
        </SheetContent>
      </Sheet>

      <ShareDialog
        open={shareOpen}
        onOpenChange={(v) => { setShareOpen(v); if (!v) onOpenChange(false); }}
        resourceType="task"
        resourceId={task.id}
        resourceTitle={task.title}
      />
    </>
  );
}
