import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, FileText, FolderTree, Eye, MessageSquare, Pencil, Users } from "lucide-react";
import { BidiText } from "@/components/BidiText";

type Row = {
  id: string;
  resource_type: "task" | "note" | "folder";
  resource_id: string;
  permission: "view" | "comment" | "edit";
  owner_id: string;
  created_at: string;
  // joined
  title?: string;
  ownerName?: string;
};

const TYPE_META: Record<Row["resource_type"], { icon: any; route: (id: string) => string; label_fa: string; label_en: string }> = {
  task:   { icon: CheckSquare, route: (id) => `/app/tasks/${id}`, label_fa: "تسک",   label_en: "Task" },
  note:   { icon: FileText,    route: (id) => `/app/notes`,       label_fa: "نوت",   label_en: "Note" },
  folder: { icon: FolderTree,  route: (id) => `/app/folder/${id}`,label_fa: "فولدر", label_en: "Folder" },
};

const PERM_ICON = { view: Eye, comment: MessageSquare, edit: Pencil } as const;

export default function SharedWithMeView() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data: shares } = await supabase.from("shares" as any)
        .select("*").eq("recipient_id", user.id).order("created_at", { ascending: false });
      const list = (shares as any[]) || [];

      // Resolve titles per resource type
      const groups: Record<string, string[]> = { task: [], note: [], folder: [] };
      list.forEach((s: any) => groups[s.resource_type]?.push(s.resource_id));

      const titles: Record<string, string> = {};
      const ownerIds = Array.from(new Set(list.map((s: any) => s.owner_id)));

      const [t, n, f, p] = await Promise.all([
        groups.task.length ? supabase.from("tasks").select("id,title").in("id", groups.task) : Promise.resolve({ data: [] }),
        groups.note.length ? supabase.from("notes").select("id,title").in("id", groups.note) : Promise.resolve({ data: [] }),
        groups.folder.length ? supabase.from("folders").select("id,name").in("id", groups.folder) : Promise.resolve({ data: [] }),
        ownerIds.length ? supabase.from("profiles").select("id,display_name").in("id", ownerIds) : Promise.resolve({ data: [] }),
      ]);
      ((t as any).data || []).forEach((r: any) => titles[`task:${r.id}`] = r.title);
      ((n as any).data || []).forEach((r: any) => titles[`note:${r.id}`] = r.title);
      ((f as any).data || []).forEach((r: any) => titles[`folder:${r.id}`] = r.name);
      const owners: Record<string, string> = {};
      ((p as any).data || []).forEach((r: any) => owners[r.id] = r.display_name);

      setRows(list.map((s: any) => ({
        ...s,
        title: titles[`${s.resource_type}:${s.resource_id}`] || T("بدون عنوان", "Untitled"),
        ownerName: owners[s.owner_id] || T("کاربر", "User"),
      })));
      setLoading(false);
    };
    load();
    const ch = supabase.channel("shared-with-me")
      .on("postgres_changes", { event: "*", schema: "public", table: "shares" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user]);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <header className="mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">{T("به اشتراک گذاشته‌شده با من", "Shared with me")}</h1>
      </header>

      {loading && <p className="text-center text-muted-foreground py-8">{T("در حال بارگذاری…", "Loading…")}</p>}
      {!loading && rows.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          {T("هنوز چیزی با شما به اشتراک گذاشته نشده.", "Nothing has been shared with you yet.")}
        </Card>
      )}

      <div className="space-y-2">
        {rows.map((r) => {
          const meta = TYPE_META[r.resource_type];
          const Icon = meta.icon;
          const PIcon = PERM_ICON[r.permission];
          return (
            <Link key={r.id} to={meta.route(r.resource_id)}>
              <Card className="p-3 hover:bg-accent/40 transition flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <BidiText as="div" text={r.title || ""} className="font-medium text-sm truncate" />
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <span>{T(meta.label_fa, meta.label_en)}</span>
                    <span>•</span>
                    <span>{T("از", "from")} {r.ownerName}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <PIcon className="w-3 h-3" />
                  {T(
                    r.permission === "view" ? "دیدن" : r.permission === "comment" ? "تعامل" : "ویرایش",
                    r.permission === "view" ? "View" : r.permission === "comment" ? "Interact" : "Edit",
                  )}
                </Badge>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
