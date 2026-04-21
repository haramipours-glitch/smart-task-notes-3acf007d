import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sun, Moon, Clock } from "lucide-react";
import { MEQ_QUESTIONS, categorize, peakWindow, CHRONOTYPE_LABELS, type Chronotype } from "@/lib/meq";

export default function MeqView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await supabase.from("chronotype").select("*").eq("user_id", user!.id).maybeSingle();
    setProfile(data);
  }

  async function pick(score: number) {
    const newA = { ...answers, [MEQ_QUESTIONS[idx].id]: score };
    setAnswers(newA);
    if (idx + 1 < MEQ_QUESTIONS.length) {
      setIdx(idx + 1);
    } else {
      // Finish
      const total = Object.values(newA).reduce((s, n) => s + n, 0);
      const cat = categorize(total);
      const { peak, trough } = peakWindow(cat);
      await supabase.from("chronotype").upsert({
        user_id: user!.id, meq_score: total, category: cat,
        peak_window_start: peak[0], peak_window_end: peak[1],
        trough_window_start: trough[0], trough_window_end: trough[1],
      }, { onConflict: "user_id" });
      setRunning(false); setIdx(0); setAnswers({}); load();
    }
  }

  if (running) {
    const q = MEQ_QUESTIONS[idx];
    const pct = ((idx + 1) / MEQ_QUESTIONS.length) * 100;
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        <div className="space-y-2">
          <Progress value={pct} className="h-1" />
          <div className="text-xs text-muted-foreground text-center">{idx + 1} از {MEQ_QUESTIONS.length}</div>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-lg font-medium">{q.q}</div>
            <div className="space-y-2">
              {q.options.map((o, i) => (
                <Button key={i} variant="outline" className="w-full justify-start text-right h-auto py-3" onClick={() => pick(o.score)}>
                  {o.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Button variant="ghost" size="sm" onClick={() => { setRunning(false); setIdx(0); setAnswers({}); }}>انصراف</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sun className="w-7 h-7 text-amber-500" />
          <Moon className="w-6 h-6 text-indigo-400" />
          Chronotype (MEQ)
        </h1>
        <p className="text-muted-foreground text-sm">الگوی زیستی روزانه‌ات. کلید تنظیم زمان‌بندی کارهای سنگین.</p>
      </div>

      {profile ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>سبک تو: {CHRONOTYPE_LABELS[profile.category as Chronotype]}</CardTitle>
              <CardDescription>امتیاز MEQ: {profile.meq_score}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    <Sun className="w-4 h-4" /> پنجره طلایی
                  </div>
                  <div className="text-2xl font-bold mt-1">{profile.peak_window_start}–{profile.peak_window_end}</div>
                  <div className="text-xs text-muted-foreground mt-1">برای Deep Work</div>
                </div>
                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-400">
                    <Moon className="w-4 h-4" /> پنجره ضعیف
                  </div>
                  <div className="text-2xl font-bold mt-1">{profile.trough_window_start}–{profile.trough_window_end}</div>
                  <div className="text-xs text-muted-foreground mt-1">برای ریکاوری</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-5 text-sm leading-relaxed">
              <strong>نکته زمان‌بندی:</strong> کار Deep در پنجره ضعیف تو حدود ۳۰٪ بار شناختی بیشتری دارد. این ساعت‌ها را برای کارهای ارتباطی، مرور، یا تمرین سبک نگه دار.
            </CardContent>
          </Card>
          <Button variant="outline" onClick={() => setRunning(true)}>انجام مجدد تست</Button>
        </>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-sm text-muted-foreground">
              <Clock className="w-4 h-4 inline ml-1" /> ۱۹ سوال · ~۵ دقیقه
            </div>
            <p className="text-sm leading-relaxed">
              تست MEQ (Horne-Östberg) الگوی زیستی روزانه تو را مشخص می‌کند. نتیجه برای کالیبراسیون پیشنهادهای زمان‌بندی استفاده می‌شود.
            </p>
            <Button onClick={() => setRunning(true)} className="w-full">شروع تست</Button>
          </CardContent>
        </Card>
      )}

      <Button variant="ghost" size="sm" onClick={() => navigate("/app/self")}>بازگشت به خودشناسی</Button>
    </div>
  );
}
