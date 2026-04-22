import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, TrendingUp } from "lucide-react";

const TRIGGERS = ["دریافت پیام", "خستگی فیزیکی", "گیر کردن روی مسئله", "گرسنگی", "نویز", "فکر مزاحم", "کافئین", "کمبود خواب", "سایر"];
const CONSEQUENCES = ["باز کردن شبکه اجتماعی", "خوردن ناسالم", "تعویق", "خشم", "گریه", "ترک میز", "خوابیدن بی‌موقع", "سایر"];

export default function ABCView() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ trigger: "", belief: "", consequences: [] as string[], duration_minutes: "", regret_level: 5 });

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await supabase.from("abc_records").select("*").eq("user_id", user!.id)
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .order("created_at", { ascending: false });
    setRecords(data || []);
  }

  async function save() {
    if (!user || !form.trigger || !form.belief) { toast.error("محرک و باور را پر کن"); return; }
    const { error } = await supabase.from("abc_records").insert({
      user_id: user.id,
      trigger: form.trigger, belief: form.belief, consequences: form.consequences,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      regret_level: form.regret_level,
    });
    if (error) toast.error(error.message);
    else { toast.success("ثبت شد"); setEditing(false); setForm({ trigger: "", belief: "", consequences: [], duration_minutes: "", regret_level: 5 }); load(); }
  }

  // Pattern Detection v2 — threshold ≥7 samples & frequency ≥0.6
  // For each trigger T and consequence C: frequency = count(T→C) / count(T)
  const triggerCounts: Record<string, number> = {};
  records.forEach((r) => { triggerCounts[r.trigger] = (triggerCounts[r.trigger] || 0) + 1; });

  const map: Record<string, any> = {};
  records.forEach((r) => {
    (r.consequences || []).forEach((c: string) => {
      const key = `${r.trigger}|${c}`;
      if (!map[key]) map[key] = { trigger: r.trigger, consequence: c, count: 0, totalDur: 0, durN: 0, totalRegret: 0, regretN: 0 };
      map[key].count++;
      if (r.duration_minutes != null) { map[key].totalDur += r.duration_minutes; map[key].durN++; }
      if (r.regret_level != null) { map[key].totalRegret += r.regret_level; map[key].regretN++; }
    });
  });

  type Pattern = {
    trigger: string; consequence: string; count: number; frequency: number;
    avgDuration: number; avgRegret: number; confidence: "قوی" | "متوسط" | "ضعیف";
    sampleSize: number;
  };
  const strongPatterns: Pattern[] = [];
  const weakPatterns: Pattern[] = [];
  Object.values(map).forEach((m: any) => {
    const tCount = triggerCounts[m.trigger] || 1;
    const frequency = m.count / tCount;
    const p: Pattern = {
      trigger: m.trigger, consequence: m.consequence, count: m.count, frequency,
      avgDuration: m.durN ? m.totalDur / m.durN : 0,
      avgRegret: m.regretN ? m.totalRegret / m.regretN : 0,
      sampleSize: tCount,
      confidence: m.count >= 7 && frequency >= 0.6 ? "قوی" : m.count >= 4 ? "متوسط" : "ضعیف",
    };
    if (m.count >= 7 && frequency >= 0.6) strongPatterns.push(p);
    else if (m.count >= 3) weakPatterns.push(p);
  });
  strongPatterns.sort((a, b) => b.count - a.count);
  weakPatterns.sort((a, b) => b.count - a.count);
  const patterns = [...strongPatterns, ...weakPatterns];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">مدل ABC</h1>
          <p className="text-muted-foreground text-sm">محرک → باور → پیامد. کشف الگوهای تکراری برای پیدا کردن نقطه مداخله.</p>
        </div>
        {!editing && <Button onClick={() => setEditing(true)}><Plus className="w-4 h-4 ml-1" /> ثبت جدید</Button>}
      </div>

      {editing && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label>A — محرک</Label>
              <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v })}>
                <SelectTrigger><SelectValue placeholder="انتخاب کن" /></SelectTrigger>
                <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>B — باور لحظه‌ای</Label>
              <Textarea rows={2} value={form.belief} onChange={(e) => setForm({ ...form, belief: e.target.value })} placeholder="چه فکری در آن لحظه از ذهنت گذشت؟" />
            </div>
            <div className="space-y-2">
              <Label>C — پیامد رفتاری</Label>
              <div className="flex flex-wrap gap-2">
                {CONSEQUENCES.map((c) => (
                  <Badge key={c} variant={form.consequences.includes(c) ? "default" : "outline"} className="cursor-pointer"
                    onClick={() => setForm({ ...form, consequences: form.consequences.includes(c) ? form.consequences.filter((x) => x !== c) : [...form.consequences, c] })}>
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>D — مدت پیامد (دقیقه)</Label>
              <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="w-32" />
            </div>
            <div className="space-y-2">
              <Label>E — پشیمانی: {form.regret_level}/10</Label>
              <Slider value={[form.regret_level]} onValueChange={(v) => setForm({ ...form, regret_level: v[0] })} max={10} step={1} />
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>ذخیره</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>انصراف</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" /> الگوهای شناسایی‌شده</CardTitle>
            <CardDescription>n = {records.length} ثبت در ۳۰ روز اخیر</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {patterns.slice(0, 5).map((p, i) => {
              const conf = p.count >= 7 ? "قوی" : p.count >= 4 ? "متوسط" : "ضعیف";
              return (
                <div key={i} className="p-3 rounded-lg bg-muted/30 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span><strong>{p.trigger}</strong> → <strong className="text-primary">{p.consequence}</strong></span>
                    <Badge variant="secondary">اعتماد: {conf}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.count} بار · میانگین {p.avgDuration.toFixed(0)} دقیقه · پشیمانی {p.avgRegret.toFixed(1)}/10
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {records.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-3 text-sm flex justify-between gap-4">
              <div className="flex-1">
                <div><strong>{r.trigger}</strong> → {(r.consequences || []).join(", ")}</div>
                <div className="text-muted-foreground text-xs mt-1">«{r.belief}»</div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                {new Date(r.created_at).toLocaleDateString("fa-IR")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
