import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TaskWidget, WidgetScope, WidgetSort, WidgetDateFilter,
  SCOPE_LABELS, SORT_LABELS, DATE_LABELS,
  createWidget, updateWidget,
} from "@/lib/widgets";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Folder = { id: string; name: string };
type Tag = { id: string; name: string };

export function WidgetEditor({ open, onOpenChange, widget, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  widget: TaskWidget | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📋");
  const [scope, setScope] = useState<WidgetScope>("all");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tagId, setTagId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<WidgetSort>("created_desc");
  const [dateFilter, setDateFilter] = useState<WidgetDateFilter>("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase.from("folders").select("id,name").order("name").then(({ data }) => setFolders(data || []));
    supabase.from("tags").select("id,name").order("name").then(({ data }) => setTags(data || []));
    if (widget) {
      setName(widget.name);
      setIcon(widget.icon || "📋");
      setScope(widget.scope);
      setFolderId(widget.folder_id);
      setTagId(widget.tag_id);
      setSortBy(widget.sort_by);
      setDateFilter(widget.date_filter);
      setShowCompleted(widget.show_completed);
    } else {
      setName(""); setIcon("📋"); setScope("all"); setFolderId(null); setTagId(null);
      setSortBy("created_desc"); setDateFilter("all"); setShowCompleted(false);
    }
  }, [open, widget]);

  const save = async () => {
    if (!user || !name.trim()) { toast.error("نام را وارد کن"); return; }
    const patch = {
      name: name.trim(), icon, scope,
      folder_id: scope === "folder" ? folderId : null,
      tag_id: scope === "tag" ? tagId : null,
      sort_by: sortBy, date_filter: dateFilter, show_completed: showCompleted,
    };
    if (widget) await updateWidget(widget.id, patch as any);
    else await createWidget(user.id, patch as any);
    toast.success(widget ? "ویرایش شد" : "ویجت ساخته شد");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{widget ? "ویرایش ویجت" : "ساخت ویجت جدید"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="w-16">
              <Label className="text-xs">آیکون</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="text-center" maxLength={2} />
            </div>
            <div className="flex-1">
              <Label className="text-xs">نام ویجت</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلا: کارهای فوری" />
            </div>
          </div>

          <div>
            <Label className="text-xs">منبع تسک‌ها</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as WidgetScope)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SCOPE_LABELS) as WidgetScope[]).map((s) => (
                  <SelectItem key={s} value={s}>{SCOPE_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {scope === "folder" && (
            <div>
              <Label className="text-xs">انتخاب فولدر</Label>
              <Select value={folderId || ""} onValueChange={setFolderId}>
                <SelectTrigger><SelectValue placeholder="انتخاب کن..." /></SelectTrigger>
                <SelectContent>
                  {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === "tag" && (
            <div>
              <Label className="text-xs">انتخاب تگ</Label>
              <Select value={tagId || ""} onValueChange={setTagId}>
                <SelectTrigger><SelectValue placeholder="انتخاب کن..." /></SelectTrigger>
                <SelectContent>
                  {tags.map((t) => <SelectItem key={t.id} value={t.id}>#{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">فیلتر تاریخ اضافه</Label>
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as WidgetDateFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(DATE_LABELS) as WidgetDateFilter[]).map((d) => (
                  <SelectItem key={d} value={d}>{DATE_LABELS[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">ترتیب نمایش</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as WidgetSort)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as WidgetSort[]).map((s) => (
                  <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>نمایش کارهای انجام‌شده</Label>
            <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button onClick={save}>{widget ? "ذخیره" : "ساخت"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
