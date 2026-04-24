import { NavLink, useLocation } from "react-router-dom";
import { Home, ListTodo, FileText, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app/home", label: "خانه", icon: Home },
  { to: "/app/today", label: "تسک‌ها", icon: ListTodo },
  { to: "/app/notes", label: "نوت‌ها", icon: FileText },
  { to: "/app/calendar", label: "تقویم", icon: Calendar },
];

export function BottomTabBar() {
  const loc = useLocation();
  if (!loc.pathname.startsWith("/app")) return null;

  return (
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
