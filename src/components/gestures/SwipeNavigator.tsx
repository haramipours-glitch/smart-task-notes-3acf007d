import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Routes that participate in horizontal swipe navigation, in order.
const ROUTES = [
  "/app/home",
  "/app/today",
  "/app/tomorrow",
  "/app/next7",
  "/app/inbox",
  "/app/notes",
  "/app/calendar",
  "/app/habits",
];

const EDGE_IGNORE = 28;   // px from screen edge — let edge-swipe-to-open-menu win
const MIN_DX = 70;
const MAX_DY = 60;

/**
 * Two-finger or wide horizontal swipe inside the main content area
 * navigates between primary scope routes. Edge swipes (open menu) are excluded.
 * Mobile only.
 */
export default function SwipeNavigator() {
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return; // mobile only

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        tracking = false;
        return;
      }
      const t = e.touches[0];
      const w = window.innerWidth;
      // Skip near edges so the sidebar edge-swipe still works.
      if (t.clientX <= EDGE_IGNORE || t.clientX >= w - EDGE_IGNORE) {
        tracking = false;
        return;
      }
      // Skip if gesture begins on an interactive/scrollable element (cards, buttons, inputs).
      const el = e.target as HTMLElement | null;
      if (el?.closest("button, a, input, textarea, [role='button'], [data-no-swipe-nav], .swipe-row, [data-radix-scroll-area-viewport]")) {
        tracking = false;
        return;
      }
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (Math.abs(dx) < MIN_DX || dy > MAX_DY) return;
      const idx = ROUTES.indexOf(loc.pathname);
      if (idx === -1) return;
      // RTL-aware: swipe LEFT = next, RIGHT = previous
      const dir = dx < 0 ? 1 : -1;
      const next = ROUTES[idx + dir];
      if (next) navigate(next);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [loc.pathname, navigate]);

  return null;
}
