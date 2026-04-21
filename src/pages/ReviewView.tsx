import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { sm2Next, QUALITY_MAP } from "@/lib/sm2";
import { mdToHtml } from "@/lib/markdown";
import { Brain, Sparkles, ArrowRight } from "lucide-react";
import { toPersianDigits, formatDate } from "@/lib/jalali";

type Note = {
  id: string; title: string; content: string;
  sr_enabled: boolean; sr_interval: number; sr_ease: number;
  sr_reps: number; sr_due_date: string | null;
};

export default function ReviewView() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<Note[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [doneCount, setDoneCount] = useState(0);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    // Notes flagged for review (sr_enabled=true) OR with #review tag in content; due today or earlier (or never reviewed)
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("sr_enabled", true)
      .or(`sr_due_date.is.null,sr_due_date.lte.${nowIso}`)
      .order("sr_due_date", { ascending: true, nullsFirst: true })
      .limit(50);
    setQueue((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const current = queue[0];

  const grade = async (quality: number) => {
    if (!current) return;
    const next = sm2Next(
      { interval: current.sr_interval, ease: Number(current.sr_ease), reps: current.sr_reps },
      quality,
    );
    await supabase.from("notes").update({
      sr_interval: next.interval,
      sr_ease: next.ease,
      sr_reps: next.reps,
      sr_due_date: next.dueDate.toISOString(),
      sr_last_reviewed_at: new Date().toISOString(),
    }).eq("id", current.id);
    setQueue((q) => q.slice(1));
    setRevealed(false);
    setDoneCount((c) => c + 1);
  };

  const enableForRecent = async () => {
    if (!user) return;
    // Mark notes containing "#review" tag in content as SR-enabled
    const { data } = await supabase.from("notes")
      .select("id,content,sr_enabled")
      .eq("sr_enabled", false);
    const matches = (data || []).filter((n: any) => /#review\b/i.test(n.content || ""));
    if (matches.length === 0) {
      toast.info("هیچ نوتی با تگ #review پیدا نشد.");
      return;
    }
    await supabase.from("notes")
      .update({ sr_enabled: true, sr_due_date: new Date().toISOString() })
      .in("id", matches.map((m: any) => m.id));
    toast.success(`${toPersianDigits(String(matches.length))} نوت به چرخه مرور اضافه شد.`);
    load();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>;

  if (!current) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">مرور تمام شد! 🎉</h1>
          <p className="text-muted-foreground">
            {doneCount > 0
              ? `${toPersianDigits(String(doneCount))} نوت امروز مرور شد.`
              : "هیچ نوتی برای مرور وجود ندارد."}
          </p>
        </div>
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> اضافه کردن نوت‌ها به مرور</h3>
          <p className="text-sm text-muted-foreground">
            هر نوتی که حاوی <code className="px-1 py-0.5 rounded bg-muted">#review</code> باشد را وارد چرخه Spaced Repetition کن.
          </p>
          <Button onClick={enableForRecent} className="w-full">فعال‌سازی مرور برای نوت‌های #review</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">مرور با فاصله</h1>
        </div>
        <Badge variant="outline">{toPersianDigits(String(queue.length))} باقی‌مانده</Badge>
      </div>

      <Card className="p-6 min-h-[300px] flex flex-col">
        <h2 className="text-2xl font-bold mb-4">{current.title || "بدون عنوان"}</h2>
        {!revealed ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Button size="lg" onClick={() => setRevealed(true)} className="gap-2">
              نمایش محتوا <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none flex-1"
            dangerouslySetInnerHTML={{ __html: mdToHtml(current.content) }}
          />
        )}
        {current.sr_due_date && (
          <p className="text-xs text-muted-foreground mt-4">
            موعد: {formatDate(new Date(current.sr_due_date), "yyyy/MM/dd")} • فاصله فعلی: {toPersianDigits(String(current.sr_interval))} روز
          </p>
        )}
      </Card>

      {revealed && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button variant="destructive" onClick={() => grade(QUALITY_MAP.again)}>دوباره</Button>
          <Button variant="outline" onClick={() => grade(QUALITY_MAP.hard)}>سخت</Button>
          <Button variant="default" onClick={() => grade(QUALITY_MAP.good)}>خوب</Button>
          <Button variant="secondary" onClick={() => grade(QUALITY_MAP.easy)}>راحت</Button>
        </div>
      )}
    </div>
  );
}
