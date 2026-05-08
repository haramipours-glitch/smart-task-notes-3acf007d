import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, Home } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useTapGestures } from "@/lib/useTapGestures";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { haptic } from "@/lib/haptics";

const HOME_SHORTCUTS: { label: string; to: string }[] = [
  { label: "خانه", to: "/app/home" },
  { label: "امروز", to: "/app/today" },
  { label: "فردا", to: "/app/tomorrow" },
  { label: "۷ روز آینده", to: "/app/next7" },
  { label: "Inbox", to: "/app/inbox" },
  { label: "نوت‌ها", to: "/app/notes" },
  { label: "تقویم", to: "/app/calendar" },
];

function scrollMainToTop() {
  const main = document.querySelector("main");
  if (main) main.scrollTo({ top: 0, behavior: "smooth" });
  else window.scrollTo({ top: 0, behavior: "smooth" });
}

export function BottomTabBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  if (!loc.pathname.startsWith("/app")) return null;

  const openSearch = () =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));

  const btnClass =
    "h-11 flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] text-foreground/80 active:scale-95 transition select-none";

  const openQuickCapture = () => {
    haptic("medium");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", metaKey: true }));
  };

  // Home tab: tap → home, double-tap → scroll-to-top, long-press → shortcuts
  const homeTap = useTapGestures({
    onSingleTap: () => navigate("/app/home"),
    onDoubleTap: () => { haptic("light"); scrollMainToTop(); },
    onLongPress: () => setShortcutsOpen(true),
  });
  // Menu tab: tap → toggle sidebar, long-press → shortcuts sheet
  const menuTap = useTapGestures({
    onSingleTap: () => toggleSidebar(),
    onLongPress: () => setShortcutsOpen(true),
  });
  // Search tab: tap → search palette, long-press → Quick Capture (new task/note)
  const searchTap = useTapGestures({
    onSingleTap: () => openSearch(),
    onLongPress: () => openQuickCapture(),
  });

  return (
    <>
      <nav
        className="md:hidden fixed inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-border flex items-stretch"
        style={{ bottom: 0, paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="نوار پایین"
      >
        <button type="button" className={btnClass} aria-label="منو" {...menuTap.handlers} onClick={(e) => e.preventDefault()}>
          <Menu className="w-5 h-5" />
          <span>منو</span>
        </button>
        <button type="button" className={btnClass} aria-label="جستجو" {...searchTap.handlers} onClick={(e) => e.preventDefault()}>
          <Search className="w-5 h-5 text-primary" />
          <span>جستجو</span>
        </button>
        <button
          type="button"
          className={btnClass}
          aria-label="خانه"
          {...homeTap.handlers}
          onClick={(e) => e.preventDefault()}
        >
          <Home className="w-5 h-5" />
          <span>خانه</span>
        </button>
      </nav>

      <Sheet open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-6">
          <SheetHeader>
            <SheetTitle className="text-start text-base">میان‌بُر سریع</SheetTitle>
          </SheetHeader>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {HOME_SHORTCUTS.map((s) => (
              <button
                key={s.to}
                onClick={() => {
                  setShortcutsOpen(false);
                  navigate(s.to);
                }}
                className="px-3 py-3 rounded-lg bg-muted/40 hover:bg-accent text-sm text-start active:scale-[0.98] transition"
              >
                {s.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
