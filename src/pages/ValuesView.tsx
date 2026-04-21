import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, X, Check, Heart } from "lucide-react";
import { CORE_VALUES } from "@/lib/values";

export default function ValuesView() {
  const { user } = useAuth();
  const [chosen, setChosen] = useState<any[]>([]);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<{ name: string; meaning: string }[]>([]);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await supabase.from("user_values").select("*").eq("user_id", user!.id).order("position");
    setChosen(data || []);
  }

  function toggleDraft(v: string) {
    if (draft.find((d) => d.name === v)) setDraft(draft.filter((d) => d.name !== v));
    else if (draft.length < 5) setDraft([...draft, { name: v, meaning: "" }]);
    else toast.error("حداکثر ۵ ارزش");
  }

  async function saveValues() {
    if (draft.length < 3) { toast.error("حداقل ۳ ارزش انتخاب کن"); return; }
    await supabase.from("user_values").delete().eq("user_id", user!.id);
    const rows = draft.map((d, i) => ({ user_id: user!.id, value_name: d.name, meaning: d.meaning || null, position: i }));
    const { error } = await supabase.from("user_values").insert(rows);
    if (error) toast.error(error.message);
    else { toast.success("ارزش‌ها ذخیره شدند"); setPicking(false); setDraft([]); load(); }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2"><Heart className="w-7 h-7 text-rose-500" /> ارزش‌های بنیادین (ACT)</h1>
          <p className="text-muted-foreground text-sm">۳-۵ ارزش که بر اساسش عمل می‌کنی، حتی با وجود فکر مزاحم.</p>
        </div>
        {!picking && <Button onClick={() => { setPicking(true); setDraft(chosen.map((c) => ({ name: c.value_name, meaning: c.meaning || "" }))); }}>
          <Plus className="w-4 h-4 ml-1" /> {chosen.length ? "ویرایش" : "انتخاب ارزش‌ها"}
        </Button>}
      </div>

      {picking ? (
        <>
          <Card>
            <CardHeader><CardTitle className="text-lg">۱. انتخاب ۳-۵ ارزش</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {CORE_VALUES.map((v) => {
                const selected = !!draft.find((d) => d.name === v);
                return (
                  <Badge key={v} variant={selected ? "default" : "outline"} className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => toggleDraft(v)}>
                    {selected && <Check className="w-3 h-3 ml-1" />} {v}
                  </Badge>
                );
              })}
            </CardContent>
          </Card>

          {draft.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">۲. این ارزش در عمل یعنی چه؟</CardTitle>
                <CardDescription>برای هر ارزش، یک رفتار مشخص بنویس</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {draft.map((d, i) => (
                  <div key={d.name} className="space-y-2">
                    <Label>{i + 1}. {d.name}</Label>
                    <Textarea value={d.meaning} rows={2}
                      onChange={(e) => { const a = [...draft]; a[i] = { ...a[i], meaning: e.target.value }; setDraft(a); }}
                      placeholder="یعنی در عمل چه کاری انجام دهم؟" />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button onClick={saveValues}>ذخیره</Button>
                  <Button variant="ghost" onClick={() => { setPicking(false); setDraft([]); }}>انصراف</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="grid gap-3">
          {chosen.map((c, i) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">{i + 1}</div>
                  <div className="flex-1">
                    <div className="font-medium">{c.value_name}</div>
                    {c.meaning && <div className="text-sm text-muted-foreground mt-1">{c.meaning}</div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {chosen.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">هنوز ارزشی انتخاب نکرده‌ای.</div>}
        </div>
      )}

      {chosen.length > 0 && !picking && (
        <Card className="bg-muted/30">
          <CardContent className="p-5 text-sm leading-relaxed">
            <strong>گسلش شناختی (ACT):</strong> در لحظات اضطراب غیرقابل کنترل، به جای جنگیدن با فکر، از خودت بپرس:
            «در ۱۵ دقیقه آینده، چه اقدام کوچکی می‌توانم انجام دهم که در راستای ارزش <strong>{chosen[0]?.value_name}</strong> باشد؟»
          </CardContent>
        </Card>
      )}
    </div>
  );
}
