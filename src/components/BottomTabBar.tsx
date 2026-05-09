import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Plus, Home } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useTapGestures } from "@/lib/useTapGestures";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
import RecentlyDeletedSheet from "@/components/RecentlyDeletedSheet";

function scrollMainToTop() {
  const main = document.querySelector("main");
  if (main) main.scrollTo({ top: 0, behavior: "smooth" });
  else window.scrollTo({ top: 0, behavior: "smooth" });
}

export function BottomTabBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const HOME_SHORTCUTS: { label: string; to: string }[] = [
    { label: T("خانه", "Home"), to: "/app/home" },
    { label: T("امروز", "Today"), to: "/app/today" },
    { label: T("فردا", "Tomorrow"), to: "/app/tomorrow" },
    { label: T("۷ روز آینده", "Next 7 days"), to: "/app/next7" },
    { label: "Inbox", to: "/app/inbox" },
    { label: T("نوت‌ها", "Notes"), to: "/app/notes" },
    { label: T("تقویم", "Calendar"), to: "/app/calendar" },
    { label: T("اشتراک‌ها", "Shared with me"), to: "/app/shared" },
  ];

  // Allow other parts of the app to open the trash/shortcuts via global events.
  useEffect(() => {
    const open = () => setTrashOpen(true);
    const sc = () => setShortcutsOpen(true);
    window.addEventListener("lov:open-trash", open);
    window.addEventListener("lov:open-shortcuts", sc);
    return () => {
      window.removeEventListener("lov:open-trash", open);
      window.removeEventListener("lov:open-shortcuts", sc);
    };
  }, []);

  if (!loc.pathname.startsWith("/app")) return null;

  const openSearch = () =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  const openQuickCapture = () => {
    haptic("medium");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", metaKey: true }));
  };

  const btnClass =
    "h-11 flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] text-foreground/80 active:scale-95 transition select-none";

  const homeTap = useTapGestures({
    onSingleTap: () => navigate("/app/home"),
    onDoubleTap: () => { haptic("light"); scrollMainToTop(); },
    onLongPress: () => setShortcutsOpen(true),
  });
  const menuTap = useTapGestures({
    onSingleTap: () => toggleSidebar(),
    onDoubleTap: () => { haptic("light"); setTrashOpen(true); },
    onLongPress: () => setShortcutsOpen(true),
  });
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
        aria-label={T("نوار پایین", "Bottom bar")}
      >
        <button type="button" className={btnClass} aria-label={T("منو", "Menu")} {...menuTap.handlers} onClick={(e) => e.preventDefault()}>
          <Menu className="w-5 h-5" />
          <span>{T("منو", "Menu")}</span>
        </button>
        <button type="button" className={btnClass} aria-label={T("افزودن سریع", "Quick add")} {...addTap.handlers} onClick={(e) => e.preventDefault()}>
          <Plus className="w-5 h-5 text-primary" />
          <span>{T("افزودن", "Add")}</span>
        </button>
        <button type="button" className={btnClass} aria-label={T("خانه", "Home")} {...homeTap.handlers} onClick={(e) => e.preventDefault()}>
          <Home className="w-5 h-5" />
          <span>{T("خانه", "Home")}</span>
        </button>
      </nav>

      <Sheet open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-6">
          <SheetHeader>
            <SheetTitle className="text-start text-base">{T("میان‌بُر سریع", "Quick shortcuts")}</SheetTitle>
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
              {T("🗑️ حذف‌شده‌های اخیر", "🗑️ Recently deleted")}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <RecentlyDeletedSheet open={trashOpen} onOpenChange={setTrashOpen} />
    </>
  );
}
