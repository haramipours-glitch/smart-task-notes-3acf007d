import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Moon, Coffee, AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { computeHours, sleepDebt, effectiveDebt, RECOMMENDED_HOURS, type SleepLog } from "@/lib/sleep";

export default function SleepView() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [today, setToday] = useState({
    bedtime: "", wake_time: "", quality: 3, awakenings: 0, caffeine_cutoff_hour: 14, notes: "",
  });

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase.from("sleep_logs").select("*").eq("user_id", user!.id)
      .gte("sleep_date", cutoff).order("sleep_date", { ascending: false });
    setLogs((data as any) || []);
    // prefill today's row if exists
    const todayKey = new Date().toISOString().slice(0, 10);
    const existing = (data || []).find((l: any) => l.sleep_date === todayKey);
    if (existing) {
      setToday({
        bedtime: existing.bedtime || "",
        wake_time: existing.wake_time || "",
        quality: existing.quality ?? 3,
        awakenings: existing.awakenings ?? 0,
        caffeine_cutoff_hour: existing.caffeine_cutoff_hour ?? 14,
        notes: existing.notes || "",
      });
    }
  }

  async function save() {
    if (!user) return;
    const hours = computeHours(today.bedtime || null, today.wake_time || null);
    const todayKey = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("sleep_logs").upsert({
      user_id: user.id,
      sleep_date: todayKey,
      bedtime: today.bedtime || null,
      wake_time: today.wake_time || null,
      hours,
      quality: today.quality,
      awakenings: today.awakenings,
      caffeine_cutoff_hour: today.caffeine_cutoff_hour,
      notes: today.notes || null,
    }, { onConflict: "user_id,sleep_date" });
    if (error) toast.error(error.message);
    else { toast.success("ثبت شد"); load(); }
  }

  const debt7 = sleepDebt(logs, 7);
  const effDebt7 = effectiveDebt(logs, 7);
  const avgHours = logs.length > 0
    ? logs.filter((l) => l.hours).reduce((s, l) => s + (l.hours || 0), 0) / logs.filter((l) => l.hours).length
    : 0;
  const avgQuality = logs.length > 0
    ? logs.filter((l) => l.quality).reduce((s, l) => s + (l.quality || 0), 0) / logs.filter((l) => l.quality).length
    : 0;

  // Chart data: last 14 days
  const chartData = [...logs]
    .filter((l) => l.hours != null)
    .slice(0, 14)
    .reverse()
    .map((l) => ({
      date: new Date(l.sleep_date).toLocaleDateString("fa-IR", { month: "numeric", day: "numeric" }),
      hours: l.hours,
      quality: l.quality,
    }));

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2"><Moon className="w-7 h-7" /> خواب</h1>
        <p className="text-muted-foreground text-sm">کیفیت خوابت روی بار شناختی، خلق و تمرکز فردا اثر مستقیم دارد.</p>
      </div>

      {/* Today form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ثبت خواب امشب</CardTitle>
          <CardDescription>هدف: {RECOMMENDED_HOURS} ساعت در شبانه‌روز</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ساعت خواب</Label>
              <Input type="time" value={today.bedtime} onChange={(e) => setToday({ ...today, bedtime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>ساعت بیدار شدن</Label>
              <Input type="time" value={today.wake_time} onChange={(e) => setToday({ ...today, wake_time: e.target.value })} />
            </div>
          </div>
          {today.bedtime && today.wake_time && (
            <div className="text-sm text-muted-foreground">
              مدت: <strong className="text-foreground">{computeHours(today.bedtime, today.wake_time)} ساعت</strong>
            </div>
          )}
          <div className="space-y-2">
            <Label>کیفیت خواب: {today.quality}/5</Label>
            <Slider value={[today.quality]} onValueChange={(v) => setToday({ ...today, quality: v[0] })} min={1} max={5} step={1} />
          </div>
          <div className="space-y-2">
            <Label>تعداد بیداری شبانه: {today.awakenings}</Label>
            <Slider value={[today.awakenings]} onValueChange={(v) => setToday({ ...today, awakenings: v[0] })} min={0} max={10} step={1} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Coffee className="w-4 h-4" /> آخرین کافئین: ساعت {today.caffeine_cutoff_hour}</Label>
            <Slider value={[today.caffeine_cutoff_hour]} onValueChange={(v) => setToday({ ...today, caffeine_cutoff_hour: v[0] })} min={6} max={22} step={1} />
            {today.caffeine_cutoff_hour > 16 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> کافئین بعد از ساعت ۱۶ روی کیفیت خواب اثر منفی دارد.
              </p>
            )}
          </div>
          <Textarea rows={2} placeholder="یادداشت (اختیاری)" value={today.notes} onChange={(e) => setToday({ ...today, notes: e.target.value })} />
          <Button onClick={save} className="w-full">ذخیره</Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{avgHours.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">میانگین ساعت</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{avgQuality.toFixed(1)}/5</div>
          <div className="text-xs text-muted-foreground">میانگین کیفیت</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${debt7 > 4 ? "text-destructive" : debt7 < 0 ? "text-primary" : ""}`}>
            {debt7 > 0 ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            {Math.abs(debt7).toFixed(1)}h
          </div>
          <div className="text-xs text-muted-foreground">{debt7 > 0 ? "بدهی" : "مازاد"} ۷ روزه</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className={`text-2xl font-bold ${effDebt7 > 6 ? "text-destructive" : ""}`}>{effDebt7.toFixed(1)}h</div>
          <div className="text-xs text-muted-foreground">بدهی مؤثر (با کیفیت)</div>
        </CardContent></Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">روند ۱۴ روز اخیر</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 12]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <ReferenceLine y={RECOMMENDED_HOURS} stroke="hsl(var(--primary))" strokeDasharray="4 4" label={{ value: "هدف", fontSize: 10, fill: "hsl(var(--primary))" }} />
                <Line type="monotone" dataKey="hours" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent logs */}
      <div className="space-y-2">
        {logs.slice(0, 10).map((l) => (
          <Card key={l.id}>
            <CardContent className="p-3 text-sm flex justify-between items-center">
              <div>
                <div className="font-medium">{new Date(l.sleep_date).toLocaleDateString("fa-IR")}</div>
                <div className="text-xs text-muted-foreground">
                  {l.hours}h · کیفیت {l.quality}/5 · {l.awakenings} بیداری
                </div>
              </div>
              {l.bedtime && l.wake_time && <div className="text-xs text-muted-foreground">{l.bedtime} → {l.wake_time}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
