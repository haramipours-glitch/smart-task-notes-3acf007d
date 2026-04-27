import { useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";

export function BottomTabBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const lastTapRef = useRef<number>(0);

  if (!loc.pathname.startsWith("/app")) return null;

  // Single tap → toggle sidebar; double-tap (within 300ms) → go Home
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      navigate("/app");
    } else {
      lastTapRef.current = now;
      // Delay single-tap action so a fast 2nd tap can cancel it
      setTimeout(() => {
        if (lastTapRef.current && Date.now() - lastTapRef.current >= 290) {
          toggleSidebar();
          lastTapRef.current = 0;
        }
      }, 300);
    }
  };

  const btnClass =
    "md:hidden fixed z-50 h-10 w-10 rounded-full bg-card/90 backdrop-blur border border-border shadow-md flex items-center justify-center text-foreground/80 active:scale-95 transition";

  return (
    <>
      <button
        type="button"
        onClick={handleTap}
        aria-label="منو (دو بار تاچ = خانه)"
        title="یک تاچ: منو • دو تاچ: خانه"
        className={`${btnClass} left-2`}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <Menu className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={handleTap}
        aria-label="منو (دو بار تاچ = خانه)"
        title="یک تاچ: منو • دو تاچ: خانه"
        className={`${btnClass} right-2`}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <Menu className="w-4 h-4" />
      </button>
    </>
  );
}
