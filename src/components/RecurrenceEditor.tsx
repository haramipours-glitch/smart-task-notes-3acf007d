import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import type { RecurrenceRule } from "@/lib/recurrence";
import { describeRule } from "@/lib/recurrence";

const WEEKDAYS: { key: NonNullable<RecurrenceRule["byweekday"]>[number]; label: string }[] = [
  { key: "SA", label: "ش" }, { key: "SU", label: "ی" }, { key: "MO", label: "د" },
  { key: "TU", label: "س" }, { key: "WE", label: "چ" }, { key: "TH", label: "پ" },
  { key: "FR", label: "ج" },
];

export function RecurrenceEditor({
  value, onChange,
}: { value: RecurrenceRule | null; onChange: (v: RecurrenceRule | null) => void }) {
  const [enabled, setEnabled] = useState(!!value);
  const v: RecurrenceRule = value || { freq: "daily", interval: 1 };

  const update = (patch: Partial<RecurrenceRule>) => onChange({ ...v, ...patch });

  const toggleDay = (d: NonNullable<RecurrenceRule["byweekday"]>[number]) => {
    const cur = new Set(v.byweekday || []);
    cur.has(d) ? cur.delete(d) : cur.add(d);
    update({ byweekday: Array.from(cur) });
  };

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">تکرار</Label>
        <Button
          size="sm" variant={enabled ? "default" : "outline"}
          onClick={() => {
            const ne = !enabled;
            setEnabled(ne);
            onChange(ne ? v : null);
          }}
        >
          {enabled ? "فعال" : "غیرفعال"}
        </Button>
      </div>

      {enabled && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">دوره</Label>
              <Select value={v.freq} onValueChange={(f: any) => update({ freq: f })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">روزانه</SelectItem>
                  <SelectItem value="weekly">هفتگی</SelectItem>
                  <SelectItem value="monthly">ماهانه</SelectItem>
                  <SelectItem value="yearly">سالانه</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">هر چند {v.freq === "daily" ? "روز" : v.freq === "weekly" ? "هفته" : v.freq === "monthly" ? "ماه" : "سال"}</Label>
              <Input type="number" min={1} value={v.interval}
                onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })} />
            </div>
          </div>

          {v.freq === "weekly" && (
            <div>
              <Label className="text-xs text-muted-foreground">روزهای هفته</Label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {WEEKDAYS.map((d) => {
                  const active = v.byweekday?.includes(d.key);
                  return (
                    <button key={d.key} type="button" onClick={() => toggleDay(d.key)}
                      className={`w-8 h-8 rounded-full text-xs font-medium transition ${active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">ساعت</Label>
              <Input type="number" min={0} max={23} value={v.byhour ?? ""}
                placeholder="--"
                onChange={(e) => {
                  const n = e.target.value === "" ? undefined : Math.min(23, Math.max(0, parseInt(e.target.value) || 0));
                  update({ byhour: n });
                }} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">دقیقه</Label>
              <Input type="number" min={0} max={59} value={v.byminute ?? ""}
                placeholder="--"
                onChange={(e) => {
                  const n = e.target.value === "" ? undefined : Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                  update({ byminute: n });
                }} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground italic">📅 {describeRule(v)}</p>
        </>
      )}
    </Card>
  );
}
