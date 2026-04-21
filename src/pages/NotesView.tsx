import { useEffect, useState } from "react";
import { Plus, Pin, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { RichEditor } from "@/components/RichEditor";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown";

type Note = { id: string; title: string; content: string; pinned: boolean; updated_at: string; task_id?: string | null };

export default function NotesView() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<{ html: string; md: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<Note | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notes").select("*")
      .is("task_id", null)
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
      user_id: user.id, title: "نوت جدید", content: "",
    }).select().single();
    if (error) toast.error(error.message);
    else if (data) {
      // Optimistic: show immediately
      setNotes(prev => [data as any, ...prev]);
      setSelected(data as any);
      setDraft({ html: "", md: "" });
    }
  };

  const save = async (patch: Partial<Note>) => {
    if (!selected) return;
    const updated = { ...selected, ...patch };
    setSelected(updated);
    await supabase.from("notes").update(patch).eq("id", selected.id);
  };

  // Debounced save of editor content
  useEffect(() => {
    if (!draft || !selected) return;
    const t = setTimeout(() => {
      // store as markdown for portability
      save({ content: draft.md });
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [draft?.md]);

  const del = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    await supabase.from("notes").delete().eq("id", id);
    if (selected?.id === id) { setSelected(null); setDraft(null); }
    toast.success("حذف شد");
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
            <button key={n.id} onClick={() => { setSelected(n); setDraft({ html: markdownToHtml(n.content || ""), md: n.content || "" }); }}
              className={`w-full text-right p-3 border-b hover:bg-accent/40 transition ${selected?.id === n.id ? "bg-accent/60" : ""}`}>
              <div className="flex items-center gap-1">
                {n.pinned && <Pin className="w-3 h-3 text-primary" />}
                <span className="font-medium text-sm truncate flex-1">{n.title}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1">{(n.content || "").replace(/[#*`>_\-!\[\]()]/g, "").slice(0, 80)}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground p-6 text-sm">نوتی نیست</p>}
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto">
        {selected ? (
          <div className="p-4 max-w-4xl mx-auto">
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

            <Tabs defaultValue="visual">
              <TabsList>
                <TabsTrigger value="visual">بصری</TabsTrigger>
                <TabsTrigger value="markdown">Markdown</TabsTrigger>
              </TabsList>
              <TabsContent value="visual" className="mt-3">
                <RichEditor
                  key={selected.id}
                  initialMarkdown={selected.content}
                  onChange={(html, md) => setDraft({ html, md })}
                />
              </TabsContent>
              <TabsContent value="markdown" className="mt-3">
                <Textarea
                  value={draft?.md ?? selected.content}
                  onChange={(e) => setDraft({ md: e.target.value, html: markdownToHtml(e.target.value) })}
                  className="min-h-[60vh] font-mono text-sm"
                  dir="ltr"
                />
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
