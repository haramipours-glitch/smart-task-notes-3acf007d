import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Plus, X, Sparkles, Brain } from "lucide-react";
import { detectDistortions, DISTORTION_LABELS, DISTORTION_HINTS, type Distortion } from "@/lib/distortions";

const EMOTIONS = ["اضطراب", "خشم", "غم", "شرم", "گناه", "ترس", "نومیدی", "سرخوردگی"];

export default function ThoughtRecordsView() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(initial());

  function initial() {
    return {
      situation: "", automatic_thought: "",
      emotion_intensity_before: 50, emotion_intensity_after: null,
      emotions: [] as string[],
      evidence_for: [""], evidence_against: [""],
      alternative_thought: "",
      distortions: [] as Distortion[],
    };
  }

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await supabase.from("thought_records").select("*")
      .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20);
    setRecords(data || []);
  }

  function detect() {
    const text = `${form.automatic_thought} ${form.evidence_for.join(" ")}`;
    setForm({ ...form, distortions: detectDistortions(text) });
  }

  async function save() {
    if (!user || !form.situation || !form.automatic_thought) {
      toast.error("موقعیت و فکر خودکار را پر کن");
      return;
    }
    const payload = {
      user_id: user.id,
      situation: form.situation,
      automatic_thought: form.automatic_thought,
      emotion_intensity_before: form.emotion_intensity_before,
      emotion_intensity_after: form.emotion_intensity_after,
      emotions: form.emotions,
      evidence_for: form.evidence_for.filter((x: string) => x.trim()),
      evidence_against: form.evidence_against.filter((x: string) => x.trim()),
      alternative_thought: form.alternative_thought || null,
      distortions: form.distortions,
    };
    const { error } = await supabase.from("thought_records").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("ثبت شد");
      setEditing(false); setForm(initial()); load();
    }
  }

  // Monthly stats
  const distortionFreq: Record<string, number> = {};
  records.forEach((r) => (r.distortions || []).forEach((d: string) => { distortionFreq[d] = (distortionFreq[d] || 0) + 1; }));
  const avgReduction = records.filter((r) => r.emotion_intensity_after != null)
    .reduce((s, r) => s + (r.emotion_intensity_before - r.emotion_intensity_after), 0) / Math.max(1, records.filter((r) => r.emotion_intensity_after != null).length);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">ثبت افکار (CBT)</h1>
          <p className="text-muted-foreground text-sm">شکستن چرخه فکر خودکار → احساس → رفتار با فرم ساختاریافته</p>
        </div>
        {!editing && <Button onClick={() => setEditing(true)}><Plus className="w-4 h-4 ml-1" /> ثبت جدید</Button>}
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>ثبت جدید</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>۱. موقعیت — فقط فکت، بدون تفسیر</Label>
              <Textarea maxLength={200} value={form.situation} onChange={(e) => setForm({ ...form, situation: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>۲. فکر خودکار — اولین فکری که از ذهنت گذشت</Label>
              <Textarea maxLength={150} value={form.automatic_thought} onChange={(e) => setForm({ ...form, automatic_thought: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>۳. شدت احساس قبل: {form.emotion_intensity_before}/100</Label>
              <Slider value={[form.emotion_intensity_before]} onValueChange={(v) => setForm({ ...form, emotion_intensity_before: v[0] })} max={100} step={5} />
            </div>
            <div className="space-y-2">
              <Label>۴. نوع احساس</Label>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.map((e) => (
                  <Badge key={e} variant={form.emotions.includes(e) ? "default" : "outline"}
                    className="cursor-pointer" onClick={() => setForm({ ...form, emotions: form.emotions.includes(e) ? form.emotions.filter((x: string) => x !== e) : [...form.emotions, e] })}>
                    {e}
                  </Badge>
                ))}
              </div>
            </div>
            <ListField label="۵. شواهد تاییدکننده فکر" items={form.evidence_for} onChange={(items) => setForm({ ...form, evidence_for: items })} />
            <ListField label="۶. شواهد ردکننده فکر" items={form.evidence_against} onChange={(items) => setForm({ ...form, evidence_against: items })} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={detect}><Sparkles className="w-4 h-4 ml-1" /> تشخیص خطاهای شناختی</Button>
            </div>
            {form.distortions.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="font-medium text-sm">خطاهای شناسایی‌شده:</div>
                {form.distortions.map((d: Distortion) => (
                  <div key={d} className="text-sm">
                    <Badge variant="secondary">{DISTORTION_LABELS[d]}</Badge>
                    <span className="text-muted-foreground mr-2">{DISTORTION_HINTS[d]}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label>۷. فکر جایگزین متعادل</Label>
              <Textarea value={form.alternative_thought} onChange={(e) => setForm({ ...form, alternative_thought: e.target.value })} rows={2} placeholder="بر اساس هر دو دسته شواهد..." />
            </div>
            <div className="space-y-2">
              <Label>۸. شدت احساس بعد: {form.emotion_intensity_after ?? "—"}/100</Label>
              <Slider value={[form.emotion_intensity_after ?? 50]} onValueChange={(v) => setForm({ ...form, emotion_intensity_after: v[0] })} max={100} step={5} />
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>ذخیره</Button>
              <Button variant="ghost" onClick={() => { setEditing(false); setForm(initial()); }}>انصراف</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {records.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Brain className="w-5 h-5" /> تحلیل روند</CardTitle>
            <CardDescription>n = {records.length} ثبت اخیر</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!isNaN(avgReduction) && (
              <div>میانگین کاهش شدت احساس: <strong>{avgReduction.toFixed(1)} واحد</strong> {avgReduction > 25 && "— تکنیک برای تو موثر است"}</div>
            )}
            {Object.keys(distortionFreq).length > 0 && (
              <div>
                <div className="mb-2">توزیع خطاهای شناختی:</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(distortionFreq).sort((a, b) => b[1] - a[1]).map(([d, n]) => (
                    <Badge key={d} variant="outline">{DISTORTION_LABELS[d as Distortion]} · {n}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {records.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between items-start">
                <div className="font-medium">{r.situation}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fa-IR")}</div>
              </div>
              <div className="text-muted-foreground">«{r.automatic_thought}»</div>
              <div className="flex gap-2 text-xs flex-wrap">
                <span>قبل: {r.emotion_intensity_before}</span>
                {r.emotion_intensity_after != null && <span className="text-primary">→ بعد: {r.emotion_intensity_after}</span>}
                {(r.distortions || []).map((d: string) => <Badge key={d} variant="outline" className="text-xs">{DISTORTION_LABELS[d as Distortion]}</Badge>)}
              </div>
            </CardContent>
          </Card>
        ))}
        {records.length === 0 && !editing && (
          <div className="text-center py-12 text-muted-foreground text-sm">هنوز ثبتی نیست. اولین Thought Record را بساز.</div>
        )}
      </div>
    </div>
  );
}

function ListField({ label, items, onChange }: { label: string; items: string[]; onChange: (i: string[]) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input value={v} onChange={(e) => { const a = [...items]; a[i] = e.target.value; onChange(a); }} />
          <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, ""])}><Plus className="w-3 h-3 ml-1" /> افزودن</Button>
    </div>
  );
}
