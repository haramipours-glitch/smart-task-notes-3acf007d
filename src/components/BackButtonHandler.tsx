// Hardware/browser back button handler.
// - On non-root routes: history.back() works natively (we just keep state sane)
// - On root route ("/app/today" or default landing): show exit confirmation toast
//   Browser cannot truly "exit", but PWA installed apps will close on the back-forward cancel.
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

const ROOT_PREFIXES = ["/app/today", "/app/inbox", "/app/widget"];

export default function BackButtonHandler() {
  const loc = useLocation();
  const lastBackAt = useRef<number>(0);

  useEffect(() => {
    // Push a sentinel state so first back press is captured by us on root
    const isRoot = ROOT_PREFIXES.some((p) => loc.pathname.startsWith(p));
    if (isRoot) {
      window.history.pushState({ __sentinel: true }, "");
    }

    const onPop = (_e: PopStateEvent) => {
      const stillRoot = ROOT_PREFIXES.some((p) => window.location.pathname.startsWith(p));
      if (stillRoot) {
        const now = Date.now();
        if (now - lastBackAt.current < 2000) {
          // Allow real back (will likely close PWA)
          window.history.back();
          return;
        }
        lastBackAt.current = now;
        // Re-add sentinel so next back is captured again
        window.history.pushState({ __sentinel: true }, "");
        toast("برای خروج، یک‌بار دیگر دکمه برگشت را بزن", { duration: 1800 });
      }
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [loc.pathname]);

  return null;
}
