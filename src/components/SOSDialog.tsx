import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Phone, Heart, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CRISIS_RESOURCES } from "@/lib/crisisDetection";

type Step = "menu" | "breathing" | "evaluate" | "box" | "emergency" | "grounding";

const TRIGGERS = [
  { key: "anxiety", label: "اضطراب عملکردی" },
  { key: "panic", label: "حمله پنیک احتمالی" },
  { key: "fog", label: "مه مغزی / عدم تمرکز" },
  { key: "fatigue", label: "خستگی مفرط" },
  { key: "anger", label: "خشم / تحریک‌پذیری" },
];

export function SOSDialog({ trigger, autoOpenTriggerType }: { trigger?: React.ReactNode; autoOpenTriggerType?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("menu");
  const [triggerType, setTriggerType] = useState<string>("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [breathPhase, setBreathPhase] = useState<"in" | "hold" | "out">("in");
  const [breathCount, setBreathCount] = useState(0);
  const startTimeRef = useRef<number>(0);
  const stepsRef = useRef<string[]>([]);

  useEffect(() => {
    if (autoOpenTriggerType && !open) {
      setOpen(true);
      setTriggerType(autoOpenTriggerType);
      startBreathing();
    }
  }, [autoOpenTriggerType]);

  useEffect(() => {
    if (open && user) {
      supabase.from("safe_contacts").select("*").eq("user_id", user.id).then(({ data }) => setContacts(data || []));
    }
  }, [open, user]);

  // Breathing animation
  useEffect(() => {
    if (step !== "breathing" && step !== "box") return;
    const cycle = step === "box"
      ? [{ phase: "in" as const, dur: 4000 }, { phase: "hold" as const, dur: 4000 }, { phase: "out" as const, dur: 4000 }, { phase: "hold" as const, dur: 4000 }]
      : [{ phase: "in" as const, dur: 2000 }, { phase: "out" as const, dur: 6000 }];
    let i = 0;
    setBreathPhase(cycle[0].phase);
    const interval = setInterval(() => {
      i = (i + 1) % cycle.length;
      setBreathPhase(cycle[i].phase);
      if (i === 0) setBreathCount((c) => c + 1);
    }, cycle[0].dur);
    return () => clearInterval(interval);
  }, [step]);

  // Auto-advance breathing → evaluate after 2 min
  useEffect(() => {
    if (step !== "breathing") return;
    startTimeRef.current = Date.now();
    stepsRef.current.push("physiological_sigh");
    const t = setTimeout(() => setStep("evaluate"), 120000);
    return () => clearTimeout(t);
  }, [step === "breathing"]);

  function startBreathing() {
    setStep("breathing");
    setBreathCount(0);
  }

  async function logEvent(outcome: string) {
    if (!user) return;
    await supabase.from("crisis_events").insert({
      user_id: user.id, trigger_type: triggerType || "unknown",
      steps_taken: stepsRef.current, outcome,
    });
  }

  function reset() {
    setStep("menu"); setTriggerType(""); stepsRef.current = []; setBreathCount(0);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 300);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); else setOpen(true); }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" /> SOS — لحظه فشار
          </DialogTitle>
        </DialogHeader>

        {step === "menu" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">چه چیزی الان اتفاق می‌افتد؟</p>
            {TRIGGERS.map((t) => (
              <Button key={t.key} variant="outline" className="w-full justify-start"
                onClick={() => { setTriggerType(t.key); startBreathing(); }}>
                {t.label}
              </Button>
            ))}
          </div>
        )}

        {(step === "breathing" || step === "box") && (
          <div className="space-y-4 py-6">
            <div className="text-center text-sm text-muted-foreground">
              {step === "box" ? "Box Breathing — ۴ ثانیه دم، ۴ نگه‌دار، ۴ بازدم، ۴ نگه‌دار" : "Physiological Sigh — ۲ دم از بینی، ۱ بازدم طولانی از دهان"}
            </div>
            <div className="flex justify-center">
              <div className={`rounded-full bg-primary/20 transition-all duration-[2000ms] ease-in-out flex items-center justify-center`}
                style={{ width: breathPhase === "in" ? 200 : breathPhase === "out" ? 100 : 150, height: breathPhase === "in" ? 200 : breathPhase === "out" ? 100 : 150 }}>
                <Wind className="w-10 h-10 text-primary" />
              </div>
            </div>
            <div className="text-center font-medium">
              {breathPhase === "in" ? "دم" : breathPhase === "out" ? "بازدم" : "نگه‌دار"}
            </div>
            <div className="text-center text-xs text-muted-foreground">سیکل {breathCount + 1}</div>
            <Button variant="ghost" className="w-full" onClick={() => setStep("evaluate")}>الان ارزیابی</Button>
          </div>
        )}

        {step === "evaluate" && (
          <div className="space-y-3">
            <p className="text-sm">حال الانت چطور است؟</p>
            <Button className="w-full" onClick={async () => { stepsRef.current.push("better"); await logEvent("better"); setStep("grounding"); }}>
              بهتر شد
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { stepsRef.current.push("box_breathing"); setStep("box"); }}>
              بدون تغییر — Box Breathing
            </Button>
            <Button variant="destructive" className="w-full" onClick={() => { stepsRef.current.push("escalate"); setStep("emergency"); }}>
              بدتر شد — کمک می‌خواهم
            </Button>
          </div>
        )}

        {step === "grounding" && (
          <div className="space-y-3">
            <p className="font-medium">تکنیک Grounding 5-4-3-2-1:</p>
            <ul className="text-sm space-y-1 list-decimal pr-5 text-muted-foreground">
              <li>۵ چیز که می‌بینی</li>
              <li>۴ چیز که می‌توانی لمس کنی</li>
              <li>۳ صدا که می‌شنوی</li>
              <li>۲ بو که حس می‌کنی</li>
              <li>۱ مزه در دهانت</li>
            </ul>
            <Button className="w-full" onClick={close}>تمام</Button>
          </div>
        )}

        {step === "emergency" && (
          <div className="space-y-3">
            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="p-4 text-sm">
                <AlertCircle className="w-5 h-5 text-destructive inline ml-1" />
                این ممکن است نیاز به کمک فوری داشته باشد. این اپ جایگزین درمان تخصصی نیست.
              </CardContent>
            </Card>
            {CRISIS_RESOURCES.fa.map((r) => (
              <a key={r.phone} href={`tel:${r.phone}`}>
                <Button variant="outline" className="w-full justify-between">
                  <span>{r.label}</span>
                  <span className="font-mono flex items-center gap-1"><Phone className="w-3 h-3" /> {r.phone}</span>
                </Button>
              </a>
            ))}
            {contacts.map((c) => (
              <a key={c.id} href={`tel:${c.phone}`}>
                <Button variant="outline" className="w-full justify-between">
                  <span>{c.name} {c.relationship && `(${c.relationship})`}</span>
                  <span className="font-mono flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>
                </Button>
              </a>
            ))}
            <Button variant="ghost" className="w-full" onClick={async () => { await logEvent("contacted"); close(); }}>بستن</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
