import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Plus, Pin, Trash2, Sparkles, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { callAI } from "@/lib/ai";

type Note = { id: string; title: string; content: string; pinned: boolean; updated_at: string };

export default function NotesView() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notes").select("*")
      .order("pinned", { ascending: false }).order("updated_at", { ascending: false });
    setNotes((data || []) as any);
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    const ch = supabase.channel("notes-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const create = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("notes").insert({
      user_id: user.id, title: "نوت جدید", content: "# عنوان\n\nمتن نوت اینجا...",
    }).select().single();
    if (error) toast.error(error.message);
    else if (data) setSelected(data as any);
  };

  const save = async (patch: Partial<Note>) => {
    if (!selected) return;
    const updated = { ...selected, ...patch };
    setSelected(updated);
    await supabase.from("notes").update(patch).eq("id", selected.id);
  };

  const del = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    if (selected?.id === id) setSelected(null);
    toast.success("حذف شد");
  };

  const aiAction = async (mode: "summarize_note" | "improve_note") => {
    if (!selected) return;
    setAiLoading(true);
    try {
      const r = await callAI(mode, selected.content);
      await save({ content: r.text });
      toast.success("انجام شد ✨");
    } catch (e: any) { toast.error(e.message); }
    finally { setAiLoading(false); }
  };

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row h-full">
      <div className="md:w-80 border-l md:border-l border-r-0 md:border-r flex flex-col bg-card/30">
        <div className="p-3 border-b space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">نوت‌ها</h2>
            <Button size="sm" onClick={create}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((n) => (
            <button key={n.id} onClick={() => setSelected(n)}
              className={`w-full text-right p-3 border-b hover:bg-accent/40 transition ${selected?.id === n.id ? "bg-accent/60" : ""}`}>
              <div className="flex items-center gap-1">
                {n.pinned && <Pin className="w-3 h-3 text-primary" />}
                <span className="font-medium text-sm truncate flex-1">{n.title}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1">{n.content.slice(0, 80)}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground p-6 text-sm">نوتی نیست</p>}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {selected ? (
          <div className="p-4 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Input value={selected.title} onChange={(e) => save({ title: e.target.value })}
                className="text-xl font-bold border-none focus-visible:ring-0 px-0" />
              <Button size="icon" variant="ghost" onClick={() => save({ pinned: !selected.pinned })}>
                <Pin className={`w-4 h-4 ${selected.pinned ? "text-primary fill-primary" : ""}`} />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => del(selected.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2 mb-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => aiAction("summarize_note")} disabled={aiLoading} className="gap-1">
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} خلاصه
              </Button>
              <Button size="sm" variant="outline" onClick={() => aiAction("improve_note")} disabled={aiLoading} className="gap-1">
                <Sparkles className="w-3 h-3" /> بهبود
              </Button>
            </div>

            <Tabs defaultValue="edit">
              <TabsList>
                <TabsTrigger value="edit">ویرایش</TabsTrigger>
                <TabsTrigger value="preview">پیش‌نمایش</TabsTrigger>
              </TabsList>
              <TabsContent value="edit">
                <Textarea value={selected.content} onChange={(e) => save({ content: e.target.value })}
                  className="min-h-[60vh] font-mono text-sm" />
              </TabsContent>
              <TabsContent value="preview">
                <Card className="p-4 prose-note min-h-[60vh]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            یک نوت انتخاب کن یا جدید بساز
          </div>
        )}
      </div>
    </div>
  );
}
