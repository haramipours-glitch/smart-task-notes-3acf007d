import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, ScatterChart, Scatter, ReferenceLine, ZAxis } from "recharts";

export default function PredictionView() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [today_data, setTodayData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    predicted_work_hours: "", predicted_productivity: 5, predicted_completion_pct: 70, hardest_part: "",
    actual_work_hours: "", actual_productivity: 5, actual_completion_pct: 70, evening_reflection: "",
  });

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const [{ data: t }, { data: h }] = await Promise.all([
      supabase.from("predictions").select("*").eq("user_id", user!.id).eq("prediction_date", today).maybeSingle(),
      supabase.from("predictions").select("*").eq("user_id", user!.id)
        .gte("prediction_date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).order("prediction_date"),
    ]);
    setTodayData(t);
    if (t) setForm({
      predicted_work_hours: t.predicted_work_hours ?? "", predicted_productivity: t.predicted_productivity ?? 5,
      predicted_completion_pct: t.predicted_completion_pct ?? 70, hardest_part: t.hardest_part ?? "",
      actual_work_hours: t.actual_work_hours ?? "", actual_productivity: t.actual_productivity ?? 5,
      actual_completion_pct: t.actual_completion_pct ?? 70, evening_reflection: t.evening_reflection ?? "",
    });
    setHistory(h || []);
  }

  async function saveMorning() {
    const { error } = await supabase.from("predictions").upsert({
      user_id: user!.id, prediction_date: today,
      predicted_work_hours: form.predicted_work_hours ? Number(form.predicted_work_hours) : null,
      predicted_productivity: form.predicted_productivity,
      predicted_completion_pct: form.predicted_completion_pct,
      hardest_part: form.hardest_part || null,
    }, { onConflict: "user_id,prediction_date" });
    if (error) toast.error(error.message); else { toast.success("پیش‌بینی صبح ثبت شد"); load(); }
  }

  async function saveEvening() {
    const { error } = await supabase.from("predictions").update({
      actual_work_hours: form.actual_work_hours ? Number(form.actual_work_hours) : null,
      actual_productivity: form.actual_productivity,
      actual_completion_pct: form.actual_completion_pct,
      evening_reflection: form.evening_reflection || null,
    }).eq("user_id", user!.id).eq("prediction_date", today);
    if (error) toast.error(error.message); else { toast.success("واقعیت شب ثبت شد"); load(); }
  }

  // Calibration analysis
  const calibrated = history.filter((h) => h.predicted_work_hours != null && h.actual_work_hours != null);
  const avgBias = calibrated.length
    ? calibrated.reduce((s, h) => s + ((h.predicted_work_hours - h.actual_work_hours) / Math.max(0.5, h.actual_work_hours)), 0) / calibrated.length * 100
    : null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">دفترچه پیش‌بینی</h1>
        <p className="text-muted-foreground text-sm">صبح پیش‌بینی، شب واقعیت. کالیبره کن قضاوتت را.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">صبح · پیش‌بینی روز</CardTitle>
          <CardDescription>قبل از شروع روز کاری پر کن</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ساعت کار مفید تخمینی</Label>
            <Input type="number" step="0.5" min="0" max="14" value={form.predicted_work_hours}
              onChange={(e) => setForm({ ...form, predicted_work_hours: e.target.value })} className="w-32" />
          </div>
          <div className="space-y-2">
            <Label>بهره‌وری تخمینی: {form.predicted_productivity}/10</Label>
            <Slider value={[form.predicted_productivity]} onValueChange={(v) => setForm({ ...form, predicted_productivity: v[0] })} max={10} step={1} />
          </div>
          <div className="space-y-2">
            <Label>احتمال تکمیل وظیفه اصلی: {form.predicted_completion_pct}%</Label>
            <Slider value={[form.predicted_completion_pct]} onValueChange={(v) => setForm({ ...form, predicted_completion_pct: v[0] })} max={100} step={5} />
          </div>
          <div className="space-y-2">
            <Label>سخت‌ترین بخش روز</Label>
            <Input value={form.hardest_part} onChange={(e) => setForm({ ...form, hardest_part: e.target.value })} />
          </div>
          <Button onClick={saveMorning}>ذخیره پیش‌بینی</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">شب · واقعیت روز</CardTitle>
          <CardDescription>پایان روز پر کن — مقایسه با تخمین صبح</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ساعت کار مفید واقعی</Label>
            <Input type="number" step="0.5" min="0" max="14" value={form.actual_work_hours}
              onChange={(e) => setForm({ ...form, actual_work_hours: e.target.value })} className="w-32" />
          </div>
          <div className="space-y-2">
            <Label>بهره‌وری واقعی: {form.actual_productivity}/10</Label>
            <Slider value={[form.actual_productivity]} onValueChange={(v) => setForm({ ...form, actual_productivity: v[0] })} max={10} step={1} />
          </div>
          <div className="space-y-2">
            <Label>درصد تکمیل واقعی: {form.actual_completion_pct}%</Label>
            <Slider value={[form.actual_completion_pct]} onValueChange={(v) => setForm({ ...form, actual_completion_pct: v[0] })} max={100} step={5} />
          </div>
          <div className="space-y-2">
            <Label>تأمل شبانه</Label>
            <Textarea value={form.evening_reflection} onChange={(e) => setForm({ ...form, evening_reflection: e.target.value })} rows={2} />
          </div>
          <Button onClick={saveEvening}>ذخیره واقعیت</Button>
        </CardContent>
      </Card>

      {avgBias != null && (
        <Card className="bg-muted/30">
          <CardContent className="p-5 text-sm">
            <strong>منحنی کالیبراسیون (n = {calibrated.length}):</strong>{" "}
            {Math.abs(avgBias) < 10 ? "تخمین تو دقیق است." :
              avgBias > 0 ? `تو Overestimator هستی — به طور میانگین ${avgBias.toFixed(0)}% بیشتر از واقعیت تخمین می‌زنی.` :
              `تو Underestimator هستی — به طور میانگین ${Math.abs(avgBias).toFixed(0)}% کمتر از واقعیت تخمین می‌زنی.`}
          </CardContent>
        </Card>
      )}

      {calibrated.length > 2 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">روند: تخمین vs واقعیت</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={calibrated.map((h) => ({ date: h.prediction_date.slice(5), predicted: h.predicted_work_hours, actual: h.actual_work_hours }))}>
                  <XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="predicted" name="تخمین" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="actual" name="واقعیت" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">منحنی Calibration</CardTitle>
              <CardDescription>هر نقطه یک روز · خط مورب = پیش‌بینی کامل</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ScatterChart>
                  <XAxis type="number" dataKey="predicted" name="تخمین" fontSize={11} domain={[0, 'auto']} label={{ value: "تخمین (ساعت)", position: "bottom", fontSize: 10 }} />
                  <YAxis type="number" dataKey="actual" name="واقعیت" fontSize={11} domain={[0, 'auto']} label={{ value: "واقعیت", angle: -90, position: "left", fontSize: 10 }} />
                  <ZAxis range={[60, 60]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 12, y: 12 }]} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Scatter data={calibrated.map((h) => ({ predicted: h.predicted_work_hours, actual: h.actual_work_hours }))} fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
