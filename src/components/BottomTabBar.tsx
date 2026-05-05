import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, Home } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function BottomTabBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();

  if (!loc.pathname.startsWith("/app")) return null;

  const openSearch = () =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));

  const btnClass =
    "h-11 flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] text-foreground/80 active:scale-95 transition";

  return (
    <nav
      className="md:hidden fixed inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-border flex items-stretch"
      style={{ bottom: 0, paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="نوار پایین"
    >
      <button type="button" onClick={toggleSidebar} className={btnClass} aria-label="منو">
        <Menu className="w-5 h-5" />
        <span>منو</span>
      </button>
      <button type="button" onClick={openSearch} className={btnClass} aria-label="جستجو">
        <Search className="w-5 h-5 text-primary" />
        <span>جستجو</span>
      </button>
      <button type="button" onClick={() => navigate("/app")} className={btnClass} aria-label="خانه">
        <Home className="w-5 h-5" />
        <span>خانه</span>
      </button>
    </nav>
  );
}
