import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, BookCheck, AlertCircle, CheckCircle2, Brain, Loader2, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { callAI } from "@/lib/ai";
import { DECISION_TEMPLATES } from "@/lib/decisionTemplates";

type Decision = {
  id: string;
  decision_title: string;
  context: string | null;
  options_considered: any;
  chosen_option: string | null;
  rationale: string | null;
  predicted_outcome: string | null;
  predicted_confidence: number | null;
  emotional_state: string | null;
  review_date: string | null;
  actual_outcome: string | null;
  outcome_rating: number | null;
  lessons_learned: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const EMPTY_FORM = {
  template_id: "blank",
  decision_title: "", context: "", options: ["", ""], chosen_option: "",
  rationale: "", predicted_outcome: "", predicted_confidence: 60,
  emotional_state: "neutral", review_date: "",
};

export default function DecisionJournalView() {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [creating, setCreating] = useState(false);
  const [reviewing, setReviewing] = useState<Decision | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [reviewForm, setReviewForm] = useState({ actual_outcome: "", outcome_rating: 3, lessons_learned: "" });
  const [biasFor, setBiasFor] = useState<Decision | null>(null);
  const [biasText, setBiasText] = useState("");
  const [biasLoading, setBiasLoading] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await supabase.from("decision_journal").select("*").eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setDecisions((data as any) || []);
  }

  function applyTemplate(id: string) {
    const t = DECISION_TEMPLATES.find(x => x.id === id) || DECISION_TEMPLATES[0];
    const reviewDate = new Date(Date.now() + t.review_in_days * 86400000).toISOString().slice(0, 10);
    setForm({
      ...EMPTY_FORM,
      template_id: id,
      context: t.context_hint,
      options: [...t.options_hint],
      rationale: t.rationale_hint,
      predicted_outcome: t.predicted_outcome_hint,
      review_date: reviewDate,
    });
  }

  async function save() {
    if (!user || !form.decision_title.trim()) { toast.error("عنوان تصمیم را وارد کن"); return; }
    const reviewDate = form.review_date || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const { error } = await supabase.from("decision_journal").insert({
      user_id: user.id,
      decision_title: form.decision_title,
      context: form.context || null,
      options_considered: form.options.filter((o) => o.trim()),
      chosen_option: form.chosen_option || null,
      rationale: form.rationale || null,
      predicted_outcome: form.predicted_outcome || null,
      predicted_confidence: form.predicted_confidence,
      emotional_state: form.emotional_state,
      review_date: reviewDate,
    });
    if (error) toast.error(error.message);
    else { toast.success("ثبت شد. تاریخ بازبینی: " + new Date(reviewDate).toLocaleDateString("fa-IR")); setForm(EMPTY_FORM); setCreating(false); load(); }
  }

  async function submitReview() {
    if (!reviewing) return;
    const { error } = await supabase.from("decision_journal").update({
      actual_outcome: reviewForm.actual_outcome || null,
      outcome_rating: reviewForm.outcome_rating,
      lessons_learned: reviewForm.lessons_learned || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", reviewing.id);
    if (error) toast.error(error.message);
    else { toast.success("بازبینی ثبت شد"); setReviewing(null); setReviewForm({ actual_outcome: "", outcome_rating: 3, lessons_learned: "" }); load(); }
  }

  async function runBiasAnalysis(d: Decision) {
    setBiasFor(d);
    setBiasText("");
    setBiasLoading(true);
    try {
      const input = `عنوان تصمیم: ${d.decision_title}
زمینه: ${d.context || "—"}
گزینه‌های بررسی‌شده: ${(d.options_considered || []).join(" | ") || "—"}
گزینه انتخاب‌شده: ${d.chosen_option || "—"}
دلیل من: ${d.rationale || "—"}
پیش‌بینی من: ${d.predicted_outcome || "—"}
اطمینانم: ${d.predicted_confidence ?? "—"}٪`;
      const r = await callAI("decision_bias_analysis" as any, input, undefined, undefined, "fa");
      setBiasText(r.text);
    } catch (e: any) {
      toast.error(e.message);
      setBiasText("خطا در تحلیل: " + e.message);
    } finally {
      setBiasLoading(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const dueForReview = decisions.filter((d) => !d.reviewed_at && d.review_date && d.review_date <= today);
  const pending = decisions.filter((d) => !d.reviewed_at && (!d.review_date || d.review_date > today));
  const reviewed = decisions.filter((d) => d.reviewed_at);

  // Calibration: predicted confidence vs actual outcome rating (1-5 → 0-100%)
  const calibrationData = useMemo(() => {
    return reviewed
      .filter(d => d.predicted_confidence != null && d.outcome_rating != null)
      .slice()
      .reverse()
      .map((d, i) => ({
        n: i + 1,
        predicted: d.predicted_confidence!,
        actual: ((d.outcome_rating! - 1) / 4) * 100,
        title: d.decision_title.slice(0, 25),
      }));
  }, [reviewed]);

  const avgGap = useMemo(() => {
    if (!calibrationData.length) return null;
    const gap = calibrationData.reduce((s, p) => s + (p.predicted - p.actual), 0) / calibrationData.length;
    return Math.round(gap);
  }, [calibrationData]);

  return (
    <div dir="rtl" className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2"><BookCheck className="w-7 h-7" /> ژورنال تصمیم</h1>
          <p className="text-muted-foreground text-sm">تصمیم‌هایت را قبل از اقدام ثبت کن. بعداً نتیجه را بسنج تا کالیبراسیون قضاوتت بهتر شود.</p>
        </div>
        {!creating && <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 ms-1" /> تصمیم جدید</Button>}
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle className="text-lg">ثبت تصمیم</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>تمپلیت آماده</Label>
              <Select value={form.template_id} onValueChange={applyTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DECISION_TEMPLATES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.emoji} {t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">با انتخاب تمپلیت، سوالات راهنما در فیلدها به‌عنوان placeholder ظاهر می‌شه.</p>
            </div>

            <div className="space-y-1.5">
              <Label>عنوان تصمیم</Label>
              <Input value={form.decision_title} onChange={(e) => setForm({ ...form, decision_title: e.target.value })} placeholder="مثلاً: قبول کردن آفر شغلی X" />
            </div>
            <div className="space-y-1.5">
              <Label>زمینه (چه چیز این تصمیم را لازم کرد؟)</Label>
              <Textarea rows={2} value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>گزینه‌های بررسی‌شده</Label>
              {form.options.map((o, i) => (
                <Input key={i} value={o} onChange={(e) => {
                  const next = [...form.options]; next[i] = e.target.value; setForm({ ...form, options: next });
                }} placeholder={`گزینه ${i + 1}`} />
              ))}
              <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, options: [...form.options, ""] })}>+ گزینه دیگر</Button>
            </div>
            <div className="space-y-1.5">
              <Label>گزینه انتخاب‌شده</Label>
              <Input value={form.chosen_option} onChange={(e) => setForm({ ...form, chosen_option: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>دلیل انتخاب</Label>
              <Textarea rows={2} value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>پیش‌بینی نتیجه</Label>
              <Textarea rows={2} value={form.predicted_outcome} onChange={(e) => setForm({ ...form, predicted_outcome: e.target.value })} placeholder="فکر می‌کنی چه اتفاقی می‌افتد؟" />
            </div>
            <div className="space-y-2">
              <Label>اطمینان از پیش‌بینی: {form.predicted_confidence}٪</Label>
              <Slider value={[form.predicted_confidence]} onValueChange={(v) => setForm({ ...form, predicted_confidence: v[0] })} min={0} max={100} step={5} />
            </div>
            <div className="space-y-1.5">
              <Label>تاریخ بازبینی</Label>
              <Input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">پیش‌فرض بر اساس نوع تمپلیت تنظیم می‌شه. می‌تونی تغییرش بدی.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>ذخیره</Button>
              <Button variant="ghost" onClick={() => { setCreating(false); setForm(EMPTY_FORM); }}>انصراف</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {dueForReview.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader><CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400"><AlertCircle className="w-4 h-4" /> آماده بازبینی ({dueForReview.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {dueForReview.map((d) => (
              <div key={d.id} className="p-3 rounded-lg bg-background/50 flex justify-between items-center">
                <div>
                  <div className="font-medium">{d.decision_title}</div>
                  <div className="text-xs text-muted-foreground">پیش‌بینی: {d.predicted_outcome?.slice(0, 60) || "—"}</div>
                </div>
                <Button size="sm" onClick={() => setReviewing(d)}>بازبینی</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">در انتظار ({pending.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pending.map((d) => (
              <div key={d.id} className="p-3 rounded-lg bg-muted/30">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-medium flex-1">{d.decision_title}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline">{d.predicted_confidence}٪</Badge>
                    <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={() => runBiasAnalysis(d)}>
                      <Brain className="w-3.5 h-3.5" /> تحلیل
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  بازبینی در {d.review_date ? new Date(d.review_date).toLocaleDateString("fa-IR") : "—"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {calibrationData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> دقت کالیبراسیون شما
            </CardTitle>
            {avgGap != null && (
              <p className="text-xs text-muted-foreground">
                {avgGap > 10 ? `معمولاً ${avgGap}٪ بیش‌از‌حد خوش‌بینی (Overconfidence).` :
                 avgGap < -10 ? `معمولاً ${Math.abs(avgGap)}٪ کم‌برآورد می‌کنی.` :
                 "کالیبراسیون شما خوب است — اطمینان و نتیجه نزدیک هم هستند."}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={calibrationData}>
                <XAxis dataKey="n" fontSize={11} />
                <YAxis domain={[0, 100]} fontSize={11} />
                <Tooltip />
                <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="predicted" name="اطمینان پیش‌بینی" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="actual" name="نتیجه واقعی" stroke="hsl(var(--chart-2, 200 70% 50%))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {reviewed.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> بازبینی‌شده</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reviewed.slice(0, 10).map((d) => (
              <div key={d.id} className="p-3 rounded-lg bg-muted/30 text-sm">
                <div className="font-medium">{d.decision_title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  امتیاز نتیجه: {d.outcome_rating}/5 · پیش‌بینی: {d.predicted_confidence}٪
                </div>
                {d.lessons_learned && <div className="text-xs mt-1.5 italic">«{d.lessons_learned}»</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={(v) => !v && setReviewing(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>بازبینی: {reviewing?.decision_title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded bg-muted/30 text-xs">
              <div><strong>پیش‌بینی:</strong> {reviewing?.predicted_outcome}</div>
              <div><strong>اطمینان:</strong> {reviewing?.predicted_confidence}٪</div>
            </div>
            <div className="space-y-1.5">
              <Label>چه اتفاقی واقعاً افتاد؟</Label>
              <Textarea rows={3} value={reviewForm.actual_outcome} onChange={(e) => setReviewForm({ ...reviewForm, actual_outcome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>چقدر از نتیجه راضی هستی؟ {reviewForm.outcome_rating}/5</Label>
              <Slider value={[reviewForm.outcome_rating]} onValueChange={(v) => setReviewForm({ ...reviewForm, outcome_rating: v[0] })} min={1} max={5} step={1} />
            </div>
            <div className="space-y-1.5">
              <Label>درس‌های آموخته‌شده</Label>
              <Textarea rows={2} value={reviewForm.lessons_learned} onChange={(e) => setReviewForm({ ...reviewForm, lessons_learned: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewing(null)}>انصراف</Button>
            <Button onClick={submitReview}>ثبت بازبینی</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bias analysis dialog */}
      <Dialog open={!!biasFor} onOpenChange={(v) => !v && setBiasFor(null)}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> تحلیل سوگیری: {biasFor?.decision_title}
            </DialogTitle>
          </DialogHeader>
          {biasLoading && (
            <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> در حال تحلیل...
            </div>
          )}
          {biasText && (
            <div className="prose prose-sm dark:prose-invert max-w-none text-end leading-7">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{biasText}</ReactMarkdown>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
