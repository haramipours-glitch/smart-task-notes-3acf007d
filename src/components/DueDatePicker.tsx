import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, X } from "lucide-react";
import { addDays, format, startOfDay } from "date-fns";

/**
 * Smart due-date picker.
 * - Quick chips: امروز / فردا / + هفته
 * - Date input (date only by default)
 * - Optional "include time" toggle — when off, due is set to 23:59 of that day
 *   (so it stays in that calendar day in any timezone display).
 *   When on, user picks an exact HH:MM.
 *
 * Value is an ISO string (or null).
 */
export function DueDatePicker({
  value,
  onChange,
  label = "سررسید",
  compact = false,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  label?: string;
  compact?: boolean;
}) {
  // Local state derived from `value`
  const [datePart, setDatePart] = useState<string>("");
  const [timePart, setTimePart] = useState<string>("");
  const [includeTime, setIncludeTime] = useState<boolean>(false);

  useEffect(() => {
    if (!value) {
      setDatePart("");
      setTimePart("");
      setIncludeTime(false);
      return;
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) return;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    setDatePart(`${y}-${m}-${day}`);
    // If time is exactly 23:59:00, treat as "no time"
    const isEndOfDayMarker = d.getHours() === 23 && d.getMinutes() === 59;
    setIncludeTime(!isEndOfDayMarker);
    setTimePart(isEndOfDayMarker ? "09:00" : `${h}:${mm}`);
  }, [value]);

  const emit = (date: string, time: string, withTime: boolean) => {
    if (!date) {
      onChange(null);
      return;
    }
    const t = withTime && time ? time : "23:59";
    const iso = new Date(`${date}T${t}`).toISOString();
    onChange(iso);
  };

  const setQuick = (offsetDays: number) => {
    const d = addDays(startOfDay(new Date()), offsetDays);
    const iso = format(d, "yyyy-MM-dd");
    setDatePart(iso);
    emit(iso, timePart || "09:00", includeTime);
  };

  const clear = () => {
    setDatePart("");
    setTimePart("");
    setIncludeTime(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {label}
        </label>
      )}

      {/* Quick chips */}
      <div className="flex gap-1.5 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant={isToday(datePart) ? "default" : "outline"}
          onClick={() => setQuick(0)}
          className="h-7 text-xs"
        >
          امروز
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isTomorrow(datePart) ? "default" : "outline"}
          onClick={() => setQuick(1)}
          className="h-7 text-xs"
        >
          فردا
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setQuick(7)}
          className="h-7 text-xs"
        >
          + هفته
        </Button>
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clear}
            className="h-7 text-xs gap-1"
          >
            <X className="w-3 h-3" /> حذف
          </Button>
        )}
      </div>

      {/* Date + optional time */}
      <div className={compact ? "space-y-2" : "grid grid-cols-2 gap-2"}>
        <Input
          type="date"
          value={datePart}
          onChange={(e) => {
            setDatePart(e.target.value);
            emit(e.target.value, timePart, includeTime);
          }}
          className="h-9"
        />
        {includeTime && (
          <Input
            type="time"
            value={timePart || "09:00"}
            onChange={(e) => {
              setTimePart(e.target.value);
              emit(datePart, e.target.value, true);
            }}
            className="h-9"
          />
        )}
      </div>

      {/* Toggle: include time */}
      <div className="flex items-center gap-2 pt-0.5">
        <Switch
          checked={includeTime}
          onCheckedChange={(v) => {
            setIncludeTime(v);
            if (datePart) emit(datePart, timePart || "09:00", v);
          }}
          id="due-time-toggle"
        />
        <label htmlFor="due-time-toggle" className="text-[11px] text-muted-foreground flex items-center gap-1 cursor-pointer">
          <Clock className="w-3 h-3" />
          {includeTime ? "ساعت دقیق فعال است" : "بدون ساعت — فقط تاریخ"}
        </label>
      </div>
    </div>
  );
}

function isToday(iso: string) {
  if (!iso) return false;
  return iso === format(startOfDay(new Date()), "yyyy-MM-dd");
}
function isTomorrow(iso: string) {
  if (!iso) return false;
  return iso === format(addDays(startOfDay(new Date()), 1), "yyyy-MM-dd");
}
