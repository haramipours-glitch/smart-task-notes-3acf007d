import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, ListTodo, FileText, Calendar, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddSheet } from "@/components/QuickAddSheet";

const items = [
  { to: "/app/home", label: "خانه", icon: Home },
  { to: "/app/tasks/today", label: "تسک‌ها", icon: ListTodo },
  { to: "/app/notes", label: "نوت‌ها", icon: FileText },
  { to: "/app/calendar", label: "تقویم", icon: Calendar },
];

export function BottomTabBar() {
  const [quickOpen, setQuickOpen] = useState(false);
  const loc = useLocation();

  // Hide on auth/index pages
  if (!loc.pathname.startsWith("/app")) return null;

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="نوار پایین"
      >
        <div className="grid grid-cols-5 h-14 relative">
          {items.slice(0, 2).map((it) => (
            <TabItem key={it.to} {...it} />
          ))}

          {/* Center FAB */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => setQuickOpen(true)}
              className="w-12 h-12 -mt-5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="افزودن سریع"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {items.slice(2).map((it) => (
            <TabItem key={it.to} {...it} />
          ))}
        </div>
      </nav>

      <QuickAddSheet open={quickOpen} onOpenChange={setQuickOpen} />
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
