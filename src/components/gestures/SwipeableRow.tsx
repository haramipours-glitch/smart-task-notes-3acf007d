import { ReactNode, useRef, useState, TouchEvent } from "react";
import { Check, Trash2 } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Props {
  children: ReactNode;
  onComplete?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  isCompleted?: boolean;
}

const ACTION_THRESHOLD = 96;     // px past which the action commits on release
const REVEAL_MAX = 140;          // visual cap

/**
 * Touch-only horizontal swipe wrapper.
 * - Swipe LEFT  → delete (red)
 * - Swipe RIGHT → complete (green)
 * Works in RTL as well; direction is screen-relative.
 * Falls through to children for taps and vertical scrolling.
 */
export default function SwipeableRow({
  children,
  onComplete,
  onDelete,
  disabled,
  isCompleted,
}: Props) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const decided = useRef<"h" | "v" | null>(null);
  const armed = useRef(false);

  if (disabled) return <>{children}</>;

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    startX.current = t.clientX;
    startY.current = t.clientY;
    tracking.current = true;
    decided.current = null;
    armed.current = false;
    setAnimating(false);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!tracking.current) return;
    const t = e.touches[0];
    const ddx = t.clientX - startX.current;
    const ddy = t.clientY - startY.current;
    if (decided.current === null) {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
      decided.current = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
    }
    if (decided.current !== "h") return;
    const clamped = Math.max(-REVEAL_MAX, Math.min(REVEAL_MAX, ddx));
    setDx(clamped);
    if (!armed.current && Math.abs(clamped) >= ACTION_THRESHOLD) {
      armed.current = true;
      haptic("light");
    } else if (armed.current && Math.abs(clamped) < ACTION_THRESHOLD) {
      armed.current = false;
    }
  };

  const reset = () => {
    setAnimating(true);
    setDx(0);
    tracking.current = false;
  };

  const onTouchEnd = () => {
    if (!tracking.current) return;
    if (decided.current !== "h") {
      reset();
      return;
    }
    const final = dx;
    if (final >= ACTION_THRESHOLD && onComplete) {
      haptic("success");
      onComplete();
      reset();
    } else if (final <= -ACTION_THRESHOLD && onDelete) {
      haptic("warning");
      onDelete();
      reset();
    } else {
      reset();
    }
  };

  const showRight = dx > 4; // user pulled right → complete action visible on left side
  const showLeft = dx < -4; // user pulled left  → delete action visible on right side

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ touchAction: "pan-y" }}>
      {/* Underlay: complete (revealed when swiping right) */}
      {showRight && (
        <div
          className={`absolute inset-y-0 start-0 flex items-center gap-2 px-4 text-white ${
            armed.current ? "bg-emerald-600" : "bg-emerald-500/80"
          }`}
          style={{ width: Math.abs(dx) + 16 }}
          aria-hidden
        >
          <Check className="w-5 h-5" />
          <span className="text-xs font-medium">{isCompleted ? "بازگشایی" : "تکمیل"}</span>
        </div>
      )}
      {/* Underlay: delete (revealed when swiping left) */}
      {showLeft && (
        <div
          className={`absolute inset-y-0 end-0 flex items-center justify-end gap-2 px-4 text-white ${
            armed.current ? "bg-destructive" : "bg-destructive/80"
          }`}
          style={{ width: Math.abs(dx) + 16 }}
          aria-hidden
        >
          <span className="text-xs font-medium">حذف</span>
          <Trash2 className="w-5 h-5" />
        </div>
      )}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={reset}
        style={{
          transform: `translate3d(${dx}px,0,0)`,
          transition: animating ? "transform 180ms ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
