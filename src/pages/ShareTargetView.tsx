import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * PWA Web Share Target landing route.
 * Receives shared text from Android (browser-based PWA install) via the share sheet
 * and forwards to the new-task page with the title prefilled.
 */
export default function ShareTargetView() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const title = params.get("title") || "";
    const text = params.get("text") || "";
    const url = params.get("url") || "";
    const combined = [title, text, url].filter(Boolean).join(" — ").trim();
    const next = new URLSearchParams();
    if (combined) next.set("title", combined.slice(0, 200));
    navigate(`/app/new/task?${next.toString()}`, { replace: true });
  }, [params, navigate]);

  return (
    <div className="p-12 flex items-center justify-center" dir="rtl">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      <span className="ms-2 text-sm text-muted-foreground">در حال آماده‌سازی…</span>
    </div>
  );
}
