import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Pencil, Trash2, Sparkles, FolderPlus, Copy, Palette, Share2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ShareDialog from "@/components/ShareDialog";

type Item = { id: string; name: string; color?: string };
type Kind = "folder" | "tag";

interface Props {
  item: Item | null;
  kind: Kind;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  onAIChat?: () => void;
  onAddSubfolder?: () => void;
  onChanged?: () => void;
}

const COLORS = ["#94a3b8", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];

export default function SidebarItemSheet({ item, kind, onOpenChange, onDelete, onAIChat, onAddSubfolder, onChanged }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  if (!item) return null;
  const table = kind === "folder" ? "folders" : "tags";

  const Item = ({ icon: Icon, label, onClick, danger }: any) => (
    <button
      onClick={() => { onClick(); }}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent active:scale-[0.98] transition text-start ${danger ? "text-destructive" : ""}`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </button>
  );

  const submitRename = async () => {
    const v = name.trim();
    if (!v) return;
    const { error } = await supabase.from(table).update({ name: v }).eq("id", item.id);
    if (error) toast.error(error.message);
    else { toast.success("تغییر نام شد"); setRenaming(false); onChanged?.(); onOpenChange(false); }
  };

  const setColor = async (c: string) => {
    const { error } = await supabase.from(table).update({ color: c }).eq("id", item.id);
    if (error) toast.error(error.message);
    else { onChanged?.(); }
  };

  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-6">
        <SheetHeader>
          <SheetTitle className="text-start text-base truncate flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color || "#94a3b8" }} />
            {item.name}
          </SheetTitle>
        </SheetHeader>

        {renaming ? (
          <div className="mt-3 flex items-center gap-2">
            <Input autoFocus defaultValue={item.name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitRename()} placeholder={`نام ${kind === "folder" ? "فولدر" : "تگ"}`} />
            <Button onClick={submitRename} size="sm">ذخیره</Button>
          </div>
        ) : (
          <div className="mt-3 space-y-1">
            <Item icon={Pencil} label="تغییر نام" onClick={() => { setName(item.name); setRenaming(true); }} />
            {kind === "folder" && onAIChat && (
              <Item icon={Sparkles} label="چت AI روی این فولدر" onClick={() => { onAIChat(); onOpenChange(false); }} />
            )}
            {kind === "folder" && onAddSubfolder && (
              <Item icon={FolderPlus} label="افزودن زیرفولدر" onClick={() => { onAddSubfolder(); onOpenChange(false); }} />
            )}
            <Item icon={Copy} label="کپی نام" onClick={async () => {
              try { await navigator.clipboard.writeText(item.name); toast.success("کپی شد"); } catch {}
              onOpenChange(false);
            }} />
            <div className="px-3 py-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                <Palette className="w-4 h-4" /> رنگ
              </div>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)} aria-label={c}
                    className="w-7 h-7 rounded-full ring-2 ring-transparent hover:ring-primary active:scale-90 transition"
                    style={{ backgroundColor: c, borderColor: item.color === c ? "white" : "transparent" }} />
                ))}
              </div>
            </div>
            <Item icon={Trash2} label="حذف" danger onClick={() => { onOpenChange(false); onDelete(); }} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
