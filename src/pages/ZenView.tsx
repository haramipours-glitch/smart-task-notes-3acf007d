import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { X, Play, Pause, RotateCcw, Volume2, VolumeX, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AMBIENT_SOUNDS } from "@/lib/ambientSounds";
import { toPersianDigits } from "@/lib/jalali";

type Task = { id: string; title: string; description: string | null; completed: boolean };

export default function ZenView() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const initialTaskId = params.get("task");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState<string | null>(initialTaskId);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [soundId, setSoundId] = useState<string>("none");
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("tasks")
      .select("id,title,description,completed")
      .eq("completed", false)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(50)
      .then(({ data }) => { if (data) setTasks(data as any); });
  }, [user]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s > 0) return s - 1;
        setMinutes((m) => {
          if (m > 0) return m - 1;
          setRunning(false);
          if (mode === "work") {
            toast.success("جلسه تمرکز تمام شد! 🎉");
            if (user) supabase.from("pomodoro_sessions").insert({
              user_id: user.id, duration_minutes: 25, completed: true,
              ended_at: new Date().toISOString(), task_id: taskId,
            });
            setMode("break"); setSeconds(0);
            return 5;
          }
          setMode("work"); setSeconds(0);
          return 25;
        });
        return 59;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, mode, user, taskId]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    if (soundId === "none") { a.pause(); return; }
    const sound = AMBIENT_SOUNDS.find((s) => s.id === soundId);
    if (!sound) return;
    if (a.src !== sound.url) a.src = sound.url;
    a.loop = true;
    a.play().catch(() => {});
  }, [soundId, volume]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const reset = () => { setRunning(false); setMinutes(mode === "work" ? 25 : 5); setSeconds(0); };

  const completeTask = async () => {
    if (!taskId) return;
    await supabase.from("tasks").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", taskId);
    toast.success("تسک کامل شد!");
    setTaskId(null);
  };

  const currentTask = tasks.find((t) => t.id === taskId);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-background to-muted flex flex-col">
      <audio ref={audioRef} />
      <div className="absolute top-4 right-4 z-10">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)} aria-label="بستن">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="w-full max-w-md">
          <Select value={taskId ?? ""} onValueChange={(v) => setTaskId(v || null)}>
            <SelectTrigger className="bg-card/50 backdrop-blur border-muted text-center">
              <SelectValue placeholder="یک تسک انتخاب کنید..." />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentTask && (
          <div className="text-center max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-3">{currentTask.title}</h1>
            {currentTask.description && (
              <p className="text-muted-foreground text-sm md:text-base">{currentTask.description}</p>
            )}
          </div>
        )}

        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            {mode === "work" ? "تمرکز عمیق" : "استراحت"}
          </div>
          <div className="text-8xl md:text-9xl font-bold tabular-nums text-primary leading-none">
            {toPersianDigits(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`)}
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <Button size="lg" className="rounded-full w-16 h-16" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </Button>
          <Button size="lg" variant="outline" className="rounded-full w-16 h-16" onClick={reset}>
            <RotateCcw className="w-5 h-5" />
          </Button>
          {currentTask && (
            <Button size="lg" variant="outline" className="rounded-full w-16 h-16" onClick={completeTask} title="تکمیل تسک">
              <Check className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="border-t bg-card/30 backdrop-blur px-6 py-3 flex items-center justify-center gap-3 flex-wrap">
        {soundId === "none" ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
        <Select value={soundId} onValueChange={setSoundId}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">بدون صدا</SelectItem>
            {AMBIENT_SOUNDS.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.emoji} {s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="range" min={0} max={1} step={0.05} value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-32 accent-primary"
          disabled={soundId === "none"}
        />
      </div>
    </div>
  );
}
