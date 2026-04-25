import { NavLink, useLocation } from "react-router-dom";
import { Home, ListTodo, FileText, Calendar, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

const items = [
  { to: "/app/home", label: "خانه", icon: Home },
  { to: "/app/today", label: "تسک‌ها", icon: ListTodo },
  { to: "/app/notes", label: "نوت‌ها", icon: FileText },
  { to: "/app/calendar", label: "تقویم", icon: Calendar },
];

export function BottomTabBar() {
  const loc = useLocation();
  const { toggleSidebar } = useSidebar();
  if (!loc.pathname.startsWith("/app")) return null;

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="نوار پایین"
      >
        <div className="grid grid-cols-4 h-14">
          {items.map((it) => (
            <TabItem key={it.label} to={it.to} label={it.label} icon={it.icon} />
          ))}
        </div>
      </nav>

      {/* Floating sidebar toggles — both corners for one-handed use */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="باز کردن منو"
        className="md:hidden fixed z-50 left-2 h-9 w-9 rounded-full bg-card/90 backdrop-blur border border-border shadow-md flex items-center justify-center text-foreground/80 active:scale-95 transition"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 60px)" }}
      >
        <Menu className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="باز کردن منو"
        className="md:hidden fixed z-50 right-2 h-9 w-9 rounded-full bg-card/90 backdrop-blur border border-border shadow-md flex items-center justify-center text-foreground/80 active:scale-95 transition"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 60px)" }}
      >
        <Menu className="w-4 h-4" />
      </button>
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
