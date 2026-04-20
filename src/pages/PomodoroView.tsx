import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function PomodoroView() {
  const { user } = useAuth();
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s > 0) return s - 1;
        setMinutes((m) => {
          if (m > 0) return m - 1;
          // done
          setRunning(false);
          if (mode === "work") {
            toast.success("جلسه کاری تمام شد! استراحت ۵ دقیقه‌ای.");
            if (user) supabase.from("pomodoro_sessions").insert({
              user_id: user.id, duration_minutes: 25, completed: true, ended_at: new Date().toISOString(),
            });
            setMode("break"); setMinutes(5); setSeconds(0);
          } else {
            toast.success("استراحت تمام شد!"); setMode("work"); setMinutes(25); setSeconds(0);
          }
          return 0;
        });
        return 59;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, mode, user]);

  const reset = () => { setRunning(false); setMinutes(mode === "work" ? 25 : 5); setSeconds(0); };

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto mt-12">
      <Card className="p-8 text-center">
        <div className="text-sm text-muted-foreground mb-2">{mode === "work" ? "زمان تمرکز" : "استراحت"}</div>
        <div className="text-7xl font-bold tabular-nums my-6 text-primary">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <div className="flex gap-2 justify-center">
          <Button size="lg" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          <Button size="lg" variant="outline" onClick={reset}><RotateCcw className="w-5 h-5" /></Button>
        </div>
      </Card>
    </div>
  );
}
