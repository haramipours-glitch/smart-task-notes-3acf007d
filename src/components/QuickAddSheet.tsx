import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Button } from "@/components/ui/button";
import { CheckSquare, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function QuickAddSheet({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"task" | "note">("task");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setTitle("");
    setBody("");
    onOpenChange(false);
  };

  const submit = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error("عنوان لازم است");
      return;
    }
    setBusy(true);
    try {
      if (tab === "task") {
        const { error } = await supabase.from("tasks").insert({
          user_id: user.id,
          title: title.trim(),
          description: body.trim() || null,
          priority: "none",
        } as any);
        if (error) throw error;
        toast.success("تسک اضافه شد");
        close();
      } else {
        const { data, error } = await supabase.from("notes").insert({
          user_id: user.id,
          title: title.trim(),
          content: body,
        }).select().single();
        if (error) throw error;
        toast.success("نوت اضافه شد");
        close();
        if (data) navigate("/app/notes");
      }
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>افزودن سریع</SheetTitle>
        </SheetHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-3">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="task" className="gap-1.5">
              <CheckSquare className="w-4 h-4" /> تسک
            </TabsTrigger>
            <TabsTrigger value="note" className="gap-1.5">
              <FileText className="w-4 h-4" /> نوت
            </TabsTrigger>
          </TabsList>

          <TabsContent value="task" className="space-y-3 mt-4">
            <Input
              autoFocus
              placeholder="عنوان تسک..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submit()}
              dir="auto"
            />
            <AutoTextarea
              placeholder="توضیحات (اختیاری)..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              minHeight={80}
              maxHeight={200}
            />
          </TabsContent>

          <TabsContent value="note" className="space-y-3 mt-4">
            <Input
              autoFocus
              placeholder="عنوان نوت..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              dir="auto"
            />
            <AutoTextarea
              placeholder="محتوا..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              minHeight={120}
              maxHeight={300}
            />
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-4 pb-safe">
          <Button variant="outline" className="flex-1" onClick={close} disabled={busy}>
            انصراف
          </Button>
          <Button className="flex-1" onClick={submit} disabled={busy || !title.trim()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "افزودن"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
