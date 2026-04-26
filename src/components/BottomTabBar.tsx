import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function BottomTabBar() {
  const loc = useLocation();
  const { toggleSidebar } = useSidebar();
  if (!loc.pathname.startsWith("/app")) return null;

  return (
    <>
      {/* Floating sidebar toggles — both corners for one-handed use */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="باز کردن منو"
        className="md:hidden fixed z-50 left-2 h-10 w-10 rounded-full bg-card/90 backdrop-blur border border-border shadow-md flex items-center justify-center text-foreground/80 active:scale-95 transition"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <Menu className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="باز کردن منو"
        className="md:hidden fixed z-50 right-2 h-10 w-10 rounded-full bg-card/90 backdrop-blur border border-border shadow-md flex items-center justify-center text-foreground/80 active:scale-95 transition"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <Menu className="w-4 h-4" />
      </button>
    </>
  );
}
