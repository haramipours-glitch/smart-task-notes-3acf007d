import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Card } from "@/components/ui/card";
import { ArrowRight, Loader2, Bell, Clock, FolderInput, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PRIORITY_META, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import { DueDatePicker } from "@/components/DueDatePicker";

type Folder = { id: string; name: string; color: string | null };

export default function NewTaskView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [title, setTitle] = useState(params.get("title") || "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("none");
  const [folderId, setFolderId] = useState<string | null>(params.get("folder_id"));
  const [dueIso, setDueIso] = useState<string | null>(params.get("due_date") || null);
  const [reminderAt, setReminderAt] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [estimated, setEstimated] = useState<string>("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("folders").select("id,name,color").order("position")
      .then(({ data }) => setFolders((data || []) as any));
  }, [user]);

  // Auto-set end_at from start_at + estimated
  useEffect(() => {
    if (startAt && estimated && !endAt) {
      const s = new Date(startAt);
      const e = new Date(s.getTime() + Number(estimated) * 60000);
      setEndAt(e.toISOString().slice(0, 16));
    }
  }, [startAt, estimated]);

  const submit = async (opts?: { openDetail?: boolean }) => {
    if (!user || !title.trim()) {
      toast.error("عنوان الزامی است");
      return;
    }
    setBusy(true);
    try {
      const parentId = params.get("parent_id");
      const tagId = params.get("tag_id");
      const payload: any = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        folder_id: parentId ? null : folderId,
        parent_id: parentId,
        due_date: dueIso,
        reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        estimated_minutes: estimated ? Number(estimated) : null,
      };
      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      if (error) throw error;
      if (data && tagId) {
        await supabase.from("task_tags").insert({ task_id: data.id, tag_id: tagId, user_id: user.id });
      }
      toast.success("تسک ساخته شد");
      if (opts?.openDetail && data) {
        navigate(`/app/tasks/${data.id}`, { replace: true });
      } else {
        navigate(-1);
      }
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="p-4 md:p-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          <ArrowRight className="w-4 h-4" /> برگشت
        </Button>
        <h1 className="text-lg font-bold flex-1 text-center">تسک جدید</h1>
        <div className="flex gap-1">
          <Button onClick={() => submit({ openDetail: true })} disabled={busy || !title.trim()} size="sm" variant="outline" className="gap-1">
            <Sparkles className="w-3.5 h-3.5" /> ذخیره و ادامه
          </Button>
          <Button onClick={() => submit()} disabled={busy || !title.trim()} size="sm">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "ذخیره"}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3 text-center">
        💡 برای افزودن زیرتسک، مراحل، پیوست و نوت روی «ذخیره و ادامه» بزنید.
      </p>

      <Card className="p-4 space-y-4">
        <div>
          <Input
            autoFocus
            placeholder="عنوان تسک..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submit()}
            dir="auto"
            className="text-lg font-semibold"
          />
        </div>

        <div>
          <AutoTextarea
            placeholder="توضیحات (اختیاری)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minHeight={80}
            maxHeight={240}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">اولویت</label>
          <div className="flex gap-1.5 flex-wrap">
            {PRIORITY_ORDER.map((p) => {
              const m = PRIORITY_META[p];
              const active = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 ${active ? `${m.bgClass} ${m.textClass} ring-2 ring-current` : "hover:bg-accent border-border"}`}
                >
                  <span>{m.emoji}</span> {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <FolderInput className="w-3 h-3" /> فولدر
          </label>
          <select
            value={folderId || ""}
            onChange={(e) => setFolderId(e.target.value || null)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">📥 Inbox (بدون فولدر)</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>📁 {f.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DueDatePicker value={dueIso} onChange={setDueIso} label="سررسید" compact />
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Bell className="w-3 h-3" /> یادآور
            </label>
            <Input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
          </div>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
          <div className="flex items-center gap-1 text-sm font-medium text-primary">
            <Clock className="w-4 h-4" /> Time Block (زمان‌بندی)
            <Sparkles className="w-3 h-3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">شروع</label>
              <Input type="datetime-local" value={startAt} onChange={(e) => { setStartAt(e.target.value); setEndAt(""); }} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">پایان</label>
              <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">مدت تخمینی (دقیقه)</label>
            <div className="flex gap-1.5 flex-wrap">
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setEstimated(String(m))}
                  className={`px-2.5 py-1 text-xs rounded-md border ${estimated === String(m) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                >
                  {m}د
                </button>
              ))}
              <Input
                type="number"
                placeholder="سفارشی"
                value={estimated}
                onChange={(e) => setEstimated(e.target.value)}
                className="w-20 h-8 text-xs"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              💡 با تعیین زمان شروع و مدت، تسک روی تقویم به صورت بلوکی نمایش داده می‌شود.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
