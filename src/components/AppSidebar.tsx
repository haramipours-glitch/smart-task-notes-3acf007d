import { useEffect, useState } from "react";
import {
  Inbox, Calendar as CalIcon, CalendarDays, Filter, FolderTree, Tag, FileText,
  Target, Timer, Calendar, Plus, ChevronRight, ChevronDown, LogOut, Sparkles, Settings, LayoutGrid,
  Brain, TrendingUp, Moon, HeartPulse, Activity, MessageCircleQuestion, Zap, Clock4, Heart, ShieldAlert, BookOpen, Sun,
  ListTodo, BrainCircuit, Wrench, GripVertical, RotateCcw,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import FolderAIChat from "@/components/FolderAIChat";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Folder = { id: string; name: string; parent_id: string | null; color: string };
type TagT = { id: string; name: string; color: string };

type NavItem = { url: string; icon: any; label: string };
type Section = { id: string; title: string; icon: any; defaultOpen: boolean; items: NavItem[] };

const SECTIONS: Section[] = [
  {
    id: "tasks", title: "کارها و برنامه‌ریزی", icon: ListTodo, defaultOpen: true,
    items: [
      { url: "/app/inbox", icon: Inbox, label: "Inbox" },
      { url: "/app/today", icon: CalIcon, label: "امروز" },
      { url: "/app/next7", icon: CalendarDays, label: "۷ روز آینده" },
      { url: "/app/smart", icon: Filter, label: "Smart Lists" },
      { url: "/app/calendar", icon: Calendar, label: "تقویم" },
      { url: "/app/kanban", icon: LayoutGrid, label: "Kanban" },
      { url: "/app/goals", icon: Target, label: "اهداف" },
      { url: "/app/habits", icon: Target, label: "عادت‌ها" },
      { url: "/app/pomodoro", icon: Timer, label: "Pomodoro" },
    ],
  },
  {
    id: "notes", title: "نوت‌ها و دانش", icon: FileText, defaultOpen: false,
    items: [
      { url: "/app/notes", icon: FileText, label: "نوت‌ها" },
      { url: "/app/review", icon: Brain, label: "مرور (SR)" },
    ],
  },
  {
    id: "self", title: "خودشناسی و بینش", icon: HeartPulse, defaultOpen: false,
    items: [
      { url: "/app/self", icon: HeartPulse, label: "خودشناسی" },
      { url: "/app/insights", icon: TrendingUp, label: "بینش هفتگی" },
      { url: "/app/checkin", icon: Activity, label: "Check-in روزانه" },
      { url: "/app/values", icon: Heart, label: "ارزش‌ها (ACT)" },
      { url: "/app/meq", icon: Sun, label: "Chronotype" },
      { url: "/app/prediction", icon: Clock4, label: "پیش‌بینی" },
    ],
  },
  {
    id: "mind", title: "سلامت ذهن", icon: BrainCircuit, defaultOpen: false,
    items: [
      { url: "/app/thoughts", icon: BookOpen, label: "ثبت افکار (CBT)" },
      { url: "/app/abc", icon: Zap, label: "مدل ABC" },
      { url: "/app/socratic", icon: MessageCircleQuestion, label: "چت سقراطی" },
      { url: "/app/zen", icon: Moon, label: "حالت ذن" },
      { url: "/app/crisis", icon: ShieldAlert, label: "بحران / SOS" },
    ],
  },
  {
    id: "settings", title: "ابزار و تنظیمات", icon: Wrench, defaultOpen: false,
    items: [{ url: "/app/settings", icon: Settings, label: "تنظیمات" }],
  },
];

// Default order: folders → tags → tasks → notes → self → mind → settings
const DEFAULT_ORDER = ["__folders", "__tags", "tasks", "notes", "self", "mind", "settings"];
const ORDER_KEY = "sidebar_order_v1";

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // ensure all known ids present (in case of new sections later)
        const merged = [...parsed.filter((x) => DEFAULT_ORDER.includes(x))];
        DEFAULT_ORDER.forEach((id) => { if (!merged.includes(id)) merged.push(id); });
        return merged;
      }
    }
  } catch {}
  return DEFAULT_ORDER;
}

function SortableBlock({ id, children }: { id: string; children: (handleProps: any) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners)}
    </div>
  );
}

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const { signOut, user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<TagT[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newFolder, setNewFolder] = useState("");
  const [newTag, setNewTag] = useState("");
  const [openFolderDlg, setOpenFolderDlg] = useState(false);
  const [openTagDlg, setOpenTagDlg] = useState(false);
  const [aiFolder, setAiFolder] = useState<Folder | null>(null);
  const [order, setOrder] = useState<string[]>(loadOrder);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("sidebar_sections_v1");
      if (raw) return JSON.parse(raw);
    } catch {}
    const init: Record<string, boolean> = Object.fromEntries(SECTIONS.map((s) => [s.id, s.defaultOpen]));
    init.__folders = true;
    init.__tags = false;
    return init;
  });
  const setSection = (id: string, open: boolean) => {
    setOpenSections((s) => {
      const n = { ...s, [id]: open };
      try { localStorage.setItem("sidebar_sections_v1", JSON.stringify(n)); } catch {}
      return n;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = order.indexOf(String(active.id));
    const newI = order.indexOf(String(over.id));
    if (oldI < 0 || newI < 0) return;
    const next = arrayMove(order, oldI, newI);
    setOrder(next);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(next)); } catch {}
  };

  const resetOrder = () => {
    setOrder(DEFAULT_ORDER);
    try { localStorage.removeItem(ORDER_KEY); } catch {}
    toast.success("ترتیب بازنشانی شد");
  };

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

  const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };

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
              <div className="flex items-center w-full gap-1" style={{ paddingInlineStart: depth * 12 }}>
                {has ? (
                  <button onClick={(e) => { e.preventDefault(); setExpanded((s) => ({ ...s, [f.id]: !open })); }}
                    className="p-0.5 hover:bg-muted rounded">
                    {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                ) : <span className="w-4" />}
                <NavLink to={`/app/folder/${f.id}`} onClick={closeOnMobile}
                  className="flex items-center gap-2 flex-1 truncate"
                  activeClassName="text-primary font-medium">
                  <FolderTree className="w-4 h-4" style={{ color: f.color }} />
                  {!collapsed && <span className="truncate">{f.name}</span>}
                </NavLink>
                {!collapsed && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAiFolder(f); }}
                    className="p-1 hover:bg-muted rounded opacity-60 hover:opacity-100 transition"
                    title="چت AI روی این فولدر"
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                  </button>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {has && open && renderTree(f.id, depth + 1)}
        </div>
      );
    });
  };

  const renderSection = (section: Section, dragHandle: any) => {
    const isOpen = openSections[section.id] ?? section.defaultOpen;
    const SectionIcon = section.icon;
    return (
      <SidebarGroup>
        <Collapsible open={isOpen || collapsed} onOpenChange={(v) => setSection(section.id, v)}>
          {!collapsed && (
            <SidebarGroupLabel className="flex items-center justify-between pr-1 group">
              {dragHandle && (
                <button {...dragHandle} className="cursor-grab active:cursor-grabbing p-0.5 opacity-30 hover:opacity-80 transition" title="جابجا کن">
                  <GripVertical className="w-3 h-3" />
                </button>
              )}
              <CollapsibleTrigger className="flex items-center gap-2 flex-1 hover:bg-sidebar-accent/50 rounded transition">
                <SectionIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{section.title}</span>
                <ChevronDown className={`w-3.5 h-3.5 mr-auto text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
          )}
          <CollapsibleContent forceMount={collapsed ? true : undefined}>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} onClick={closeOnMobile} className="flex items-center gap-2"
                        activeClassName="bg-accent text-accent-foreground font-medium">
                        <item.icon className="w-4 h-4" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    );
  };

  const renderFolders = (dragHandle: any) => (
    <SidebarGroup>
      <Collapsible open={(openSections["__folders"] ?? true) || collapsed} onOpenChange={(v) => setSection("__folders", v)}>
        {!collapsed && (
          <SidebarGroupLabel className="flex justify-between items-center pr-1">
            {dragHandle && (
              <button {...dragHandle} className="cursor-grab active:cursor-grabbing p-0.5 opacity-30 hover:opacity-80 transition">
                <GripVertical className="w-3 h-3" />
              </button>
            )}
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 hover:bg-sidebar-accent/50 rounded transition">
              <FolderTree className="w-3.5 h-3.5 text-muted-foreground" />
              <span>فولدرها</span>
              <ChevronDown className={`w-3.5 h-3.5 mr-auto text-muted-foreground transition-transform ${(openSections["__folders"] ?? true) ? "" : "-rotate-90"}`} />
            </CollapsibleTrigger>
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
        )}
        <CollapsibleContent forceMount={collapsed ? true : undefined}>
          <SidebarGroupContent>
            <SidebarMenu>{renderTree(null)}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );

  const renderTags = (dragHandle: any) => (
    <SidebarGroup>
      <Collapsible open={(openSections["__tags"] ?? false) || collapsed} onOpenChange={(v) => setSection("__tags", v)}>
        {!collapsed && (
          <SidebarGroupLabel className="flex justify-between items-center pr-1">
            {dragHandle && (
              <button {...dragHandle} className="cursor-grab active:cursor-grabbing p-0.5 opacity-30 hover:opacity-80 transition">
                <GripVertical className="w-3 h-3" />
              </button>
            )}
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 hover:bg-sidebar-accent/50 rounded transition">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <span>تگ‌ها</span>
              <ChevronDown className={`w-3.5 h-3.5 mr-auto text-muted-foreground transition-transform ${(openSections["__tags"] ?? false) ? "" : "-rotate-90"}`} />
            </CollapsibleTrigger>
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
        )}
        <CollapsibleContent forceMount={collapsed ? true : undefined}>
          <SidebarGroupContent>
            <SidebarMenu>
              {tags.map((t) => (
                <SidebarMenuItem key={t.id}>
                  <SidebarMenuButton asChild>
                    <NavLink to={`/app/tag/${t.id}`} onClick={closeOnMobile} className="flex items-center gap-2"
                      activeClassName="bg-accent text-accent-foreground font-medium">
                      <Tag className="w-4 h-4" style={{ color: t.color }} />
                      {!collapsed && <span className="truncate">{t.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );

  const renderBlock = (id: string, dragHandle: any) => {
    if (id === "__folders") return renderFolders(dragHandle);
    if (id === "__tags") return renderTags(dragHandle);
    const sec = SECTIONS.find((s) => s.id === id);
    if (!sec) return null;
    return renderSection(sec, dragHandle);
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
        {collapsed ? (
          // collapsed: render in default order, no drag
          DEFAULT_ORDER.map((id) => <div key={id}>{renderBlock(id, null)}</div>)
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              {order.map((id) => (
                <SortableBlock key={id} id={id}>
                  {(handleProps) => renderBlock(id, handleProps)}
                </SortableBlock>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        {!collapsed && (
          <Button variant="ghost" size="sm" onClick={resetOrder} className="justify-start text-xs opacity-70">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="ml-2">بازنشانی ترتیب</span>
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => { signOut(); toast.success("خروج موفق"); }} className="justify-start">
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">خروج</span>}
        </Button>
      </SidebarFooter>
      {aiFolder && (
        <FolderAIChat
          open={!!aiFolder}
          onOpenChange={(v) => !v && setAiFolder(null)}
          folderId={aiFolder.id}
          folderName={aiFolder.name}
        />
      )}
    </Sidebar>
  );
}
