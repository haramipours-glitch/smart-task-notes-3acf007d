import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, ListTodo, FileText, Calendar, Plus, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const items = [
  { to: "/app/home", label: "خانه", icon: Home },
  { to: "/app/tasks/today", label: "تسک‌ها", icon: ListTodo, match: "/app/today" },
  { to: "/app/notes", label: "نوت‌ها", icon: FileText },
  { to: "/app/calendar", label: "تقویم", icon: Calendar },
];

export function BottomTabBar() {
  const [popOpen, setPopOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();

  if (!loc.pathname.startsWith("/app")) return null;

  const go = (path: string) => {
    setPopOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Bottom nav (mobile only) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="نوار پایین"
      >
        <div className="grid grid-cols-4 h-14">
          {items.map((it) => {
            const to = it.to === "/app/tasks/today" ? "/app/today" : it.to;
            return <TabItem key={it.label} to={to} label={it.label} icon={it.icon} />;
          })}
        </div>
      </nav>

      {/* Floating + button (bottom-right, both mobile and desktop) */}
      <div
        className="fixed z-50 bottom-20 md:bottom-6 right-4 md:right-6"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Popover open={popOpen} onOpenChange={setPopOpen}>
          <PopoverTrigger asChild>
            <button
              aria-label="افزودن سریع"
              className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 flex items-center justify-center active:scale-95 transition-transform hover:bg-primary/90"
            >
              <Plus className={cn("w-7 h-7 transition-transform", popOpen && "rotate-45")} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="top"
            sideOffset={8}
            className="w-44 p-1.5"
            dir="rtl"
          >
            <button
              onClick={() => go("/app/new/task")}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-accent transition text-end"
            >
              <CheckSquare className="w-4 h-4 text-primary" />
              <span className="flex-1">تسک جدید</span>
            </button>
            <button
              onClick={() => go("/app/new/note")}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-accent transition text-end"
            >
              <FileText className="w-4 h-4 text-primary" />
              <span className="flex-1">نوت جدید</span>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}

function TabItem({ to, label, icon: Icon }: { to: string; label: string; icon: any }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </NavLink>
  );
}
