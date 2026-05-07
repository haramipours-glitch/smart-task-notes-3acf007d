import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Check, Trash2, FolderInput, Network, Pencil, Copy, Flag } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/taskTypes";

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
    <Sheet open={!!task} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-6">
        <SheetHeader>
          <SheetTitle className="text-start text-base truncate">{task.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-3 space-y-1">
          <Item icon={Check} label={task.completed ? "بازگشایی" : "تکمیل"} onClick={onComplete} />
          <Item icon={Pencil} label="ویرایش / جزئیات" onClick={onEdit} />
          <Item icon={FolderInput} label="انتقال به…" onClick={onMove} />
          <Item icon={Network} label="تبدیل به زیرتسکِ…" onClick={onMakeChild} />
          <Item
            icon={Copy}
            label="کپی عنوان"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(task.title);
                toast.success("کپی شد");
              } catch {}
            }}
          />
          <Item icon={Trash2} label="حذف" onClick={onDelete} danger />
        </div>
      </SheetContent>
    </Sheet>
  );
}
