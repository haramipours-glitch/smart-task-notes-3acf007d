import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Plus, Home } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useTapGestures } from "@/lib/useTapGestures";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import RecentlyDeletedSheet from "@/components/RecentlyDeletedSheet";

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
  const [trashOpen, setTrashOpen] = useState(false);

  if (!loc.pathname.startsWith("/app")) return null;

  const openSearch = () =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  const openQuickCapture = () => {
    haptic("medium");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", metaKey: true }));
  };

  const btnClass =
    "h-11 flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] text-foreground/80 active:scale-95 transition select-none";

  // Home tab: tap → home, double-tap → scroll-to-top, long-press → shortcuts
  const homeTap = useTapGestures({
    onSingleTap: () => navigate("/app/home"),
    onDoubleTap: () => { haptic("light"); scrollMainToTop(); },
    onLongPress: () => setShortcutsOpen(true),
  });
  // Menu tab: tap → toggle sidebar, double-tap → trash, long-press → shortcuts
  const menuTap = useTapGestures({
    onSingleTap: () => toggleSidebar(),
    onDoubleTap: () => { haptic("light"); setTrashOpen(true); },
    onLongPress: () => setShortcutsOpen(true),
  });
  // Add tab (replaces Search): tap → Quick Capture, long-press → Search, double-tap → trash
  const addTap = useTapGestures({
    onSingleTap: () => openQuickCapture(),
    onDoubleTap: () => { haptic("light"); setTrashOpen(true); },
    onLongPress: () => openSearch(),
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
        <button type="button" className={btnClass} aria-label="افزودن سریع" {...addTap.handlers} onClick={(e) => e.preventDefault()}>
          <Plus className="w-5 h-5 text-primary" />
          <span>افزودن</span>
        </button>
        <button type="button" className={btnClass} aria-label="خانه" {...homeTap.handlers} onClick={(e) => e.preventDefault()}>
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
                onClick={() => { setShortcutsOpen(false); navigate(s.to); }}
                className="px-3 py-3 rounded-lg bg-muted/40 hover:bg-accent text-sm text-start active:scale-[0.98] transition"
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={() => { setShortcutsOpen(false); setTrashOpen(true); }}
              className="px-3 py-3 rounded-lg bg-muted/40 hover:bg-accent text-sm text-start active:scale-[0.98] transition col-span-2"
            >
              🗑️ حذف‌شده‌های اخیر
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <RecentlyDeletedSheet open={trashOpen} onOpenChange={setTrashOpen} />
    </>
  );
}
