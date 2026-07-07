import { useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";

/**
 * Detects swipe gestures from either edge of the screen to open the mobile sidebar.
 * - Swipe from left edge → right
 * - Swipe from right edge → left
 * Both gestures open the menu (handy for RTL/LTR users alike).
 */
export default function EdgeSwipeHandler() {
  const { isMobile, setOpenMobile, openMobile } = useSidebar();

  useEffect(() => {
    if (!isMobile) return;

    const EDGE_PX = 24;          // touch must start within this distance from edge
    const MIN_DELTA = 60;        // minimum horizontal movement
    const MAX_VERTICAL = 80;     // maximum vertical drift to still count as horizontal swipe

    let startX = 0;
    let startY = 0;
    let fromLeft = false;
    let fromRight = false;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (openMobile) return; // already open
      const t = e.touches[0];
      if (!t) return;
      const w = window.innerWidth;
      fromLeft = t.clientX <= EDGE_PX;
      fromRight = t.clientX >= w - EDGE_PX;
      if (!fromLeft && !fromRight) return;
      tracking = true;
      startX = t.clientX;
      startY = t.clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dy > MAX_VERTICAL) return;
      // From left edge → swipe right opens.
      // From right edge → swipe left opens.
      if (fromLeft && dx > MIN_DELTA) setOpenMobile(true);
      else if (fromRight && dx < -MIN_DELTA) setOpenMobile(true);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, openMobile, setOpenMobile]);

  return null;
}
