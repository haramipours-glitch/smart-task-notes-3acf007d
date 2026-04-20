import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Inbox, Calendar as CalIcon, CalendarDays, Filter, FolderTree, Tag, FileText,
  Target, Timer, Calendar, Plus, ChevronRight, ChevronDown, LogOut, Sparkles, Settings,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

type Folder = { id: string; name: string; parent_id: string | null; color: string };
type Tag = { id: string; name: string; color: string };

const NAV_ITEMS = [
  { url: "/app/inbox", icon: Inbox, label: "Inbox" },
  { url: "/app/today", icon: CalIcon, label: "امروز" },
  { url: "/app/next7", icon: CalendarDays, label: "۷ روز آینده" },
  { url: "/app/smart", icon: Filter, label: "Smart Lists" },
  { url: "/app/calendar", icon: Calendar, label: "تقویم" },
];

const EXTRA_ITEMS = [
  { url: "/app/notes", icon: FileText, label: "نوت‌ها" },
  { url: "/app/habits", icon: Target, label: "عادت‌ها" },
  { url: "/app/pomodoro", icon: Timer, label: "Pomodoro" },
  { url: "/app/settings", icon: Settings, label: "تنظیمات" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newFolder, setNewFolder] = useState("");
  const [newTag, setNewTag] = useState("");
  const [openFolderDlg, setOpenFolderDlg] = useState(false);
  const [openTagDlg, setOpenTagDlg] = useState(false);

  const load = async () => {
    if (!user) return;
    const [f, t] = await Promise.all([
      supabase.from("folders").select("*").order("position"),
      supabase.from("tags").select("*").order("name"),
    ]);
    if (f.data) setFolders(f.data as any);
    if (t.data) setTags(t.data as any);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("sidebar")
      .on("postgres_changes", { event: "*", schema: "public", table: "folders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tags" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const createFolder = async () => {
    if (!newFolder.trim() || !user) return;
    const { error } = await supabase.from("folders").insert({ name: newFolder, user_id: user.id });
    if (error) toast.error(error.message);
    else { toast.success("فولدر ساخته شد"); setNewFolder(""); setOpenFolderDlg(false); }
  };

  const createTag = async () => {
    if (!newTag.trim() || !user) return;
    const { error } = await supabase.from("tags").insert({ name: newTag, user_id: user.id });
    if (error) toast.error(error.message);
    else { toast.success("تگ ساخته شد"); setNewTag(""); setOpenTagDlg(false); }
  };

  const renderTree = (parentId: string | null, depth = 0) => {
    const children = folders.filter((f) => f.parent_id === parentId);
    return children.map((f) => {
      const has = folders.some((x) => x.parent_id === f.id);
      const open = expanded[f.id] ?? true;
      return (
        <div key={f.id}>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <div className="flex items-center w-full" style={{ paddingInlineStart: depth * 12 }}>
                {has ? (
                  <button onClick={(e) => { e.preventDefault(); setExpanded((s) => ({ ...s, [f.id]: !open })); }}
                    className="p-0.5 hover:bg-muted rounded">
                    {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                ) : <span className="w-4" />}
                <NavLink to={`/app/folder/${f.id}`} className="flex items-center gap-2 flex-1 truncate"
                  activeClassName="text-primary font-medium">
                  <FolderTree className="w-4 h-4" style={{ color: f.color }} />
                  {!collapsed && <span className="truncate">{f.name}</span>}
                </NavLink>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {has && open && renderTree(f.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-base">TaskFlow</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="flex items-center gap-2"
                      activeClassName="bg-accent text-accent-foreground font-medium">
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex justify-between items-center">
            <span>فولدرها</span>
            <Dialog open={openFolderDlg} onOpenChange={setOpenFolderDlg}>
              <DialogTrigger asChild>
                <button className="hover:bg-muted rounded p-0.5"><Plus className="w-3 h-3" /></button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>فولدر جدید</DialogTitle></DialogHeader>
                <Input placeholder="نام فولدر" value={newFolder} onChange={(e) => setNewFolder(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createFolder()} />
                <DialogFooter><Button onClick={createFolder}>ایجاد</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderTree(null)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex justify-between items-center">
            <span>تگ‌ها</span>
            <Dialog open={openTagDlg} onOpenChange={setOpenTagDlg}>
              <DialogTrigger asChild>
                <button className="hover:bg-muted rounded p-0.5"><Plus className="w-3 h-3" /></button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>تگ جدید</DialogTitle></DialogHeader>
                <Input placeholder="نام تگ" value={newTag} onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTag()} />
                <DialogFooter><Button onClick={createTag}>ایجاد</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tags.map((t) => (
                <SidebarMenuItem key={t.id}>
                  <SidebarMenuButton asChild>
                    <NavLink to={`/app/tag/${t.id}`} className="flex items-center gap-2"
                      activeClassName="bg-accent text-accent-foreground font-medium">
                      <Tag className="w-4 h-4" style={{ color: t.color }} />
                      {!collapsed && <span className="truncate">{t.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {EXTRA_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="flex items-center gap-2"
                      activeClassName="bg-accent text-accent-foreground font-medium">
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <Button variant="ghost" size="sm" onClick={() => { signOut(); toast.success("خروج موفق"); }} className="justify-start">
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">خروج</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
