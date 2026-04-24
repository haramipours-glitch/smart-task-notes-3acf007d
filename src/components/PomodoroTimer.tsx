import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AMBIENT_SOUNDS } from "@/lib/ambientSounds";
import { END_BELLS, playEndBell, type EndBellId } from "@/lib/pomodoroSounds";

type Props = {
  taskId?: string | null;
  defaultMinutes?: number;
  compact?: boolean;
  onSessionComplete?: () => void;
};

const PREF_KEY = "pomodoro_prefs_v1";
type Prefs = { minutes: number; bell: EndBellId; ambient: string; ambientVol: number };

function loadPrefs(): Prefs {
  try { return { minutes: 25, bell: "bell", ambient: "none", ambientVol: 30, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") }; }
  catch { return { minutes: 25, bell: "bell", ambient: "none", ambientVol: 30 }; }
}
function savePrefs(p: Prefs) { localStorage.setItem(PREF_KEY, JSON.stringify(p)); }

export default function PomodoroTimer({ taskId = null, defaultMinutes, compact = false, onSessionComplete }: Props) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs());
  const [minutes, setMinutes] = useState(defaultMinutes ?? prefs.minutes);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const totalSecRef = useRef<number>((defaultMinutes ?? prefs.minutes) * 60);

  // sync prefs to storage
  useEffect(() => { savePrefs(prefs); }, [prefs]);

  // Ambient audio: create on mount/change
  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const sound = AMBIENT_SOUNDS.find(s => s.id === prefs.ambient);
    if (sound) {
      const a = new Audio(sound.url);
      a.loop = true;
      a.volume = prefs.ambientVol / 100;
      audioRef.current = a;
    }
    return () => { audioRef.current?.pause(); audioRef.current = null; };
  }, [prefs.ambient]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = prefs.ambientVol / 100;
  }, [prefs.ambientVol]);

  // Tick
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s > 0) return s - 1;
        // s === 0 → decrement minutes
        setMinutes((m) => {
          if (m > 0) return m - 1;
          // session finished
          finishSession();
          return 0;
        });
        return 59;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const finishSession = async () => {
    setRunning(false);
    audioRef.current?.pause();
    playEndBell(prefs.bell);
    if (mode === "work") {
      const dur = Math.round(totalSecRef.current / 60);
      if (user) {
        await supabase.from("pomodoro_sessions").insert({
          user_id: user.id,
          task_id: taskId || null,
          duration_minutes: dur,
          completed: true,
          started_at: new Date(startedAtRef.current || Date.now() - dur * 60000).toISOString(),
          ended_at: new Date().toISOString(),
        });
      }
      toast.success(`${dur} دقیقه تمرکز ثبت شد ✅ — ۵ دقیقه استراحت`);
      onSessionComplete?.();
      setMode("break");
      setMinutes(5); setSeconds(0);
      totalSecRef.current = 5 * 60;
    } else {
      toast.success("استراحت تمام شد. آماده‌ای؟");
      setMode("work");
      setMinutes(prefs.minutes); setSeconds(0);
      totalSecRef.current = prefs.minutes * 60;
    }
  };

  const start = () => {
    if (!running) {
      if (minutes === 0 && seconds === 0) {
        setMinutes(mode === "work" ? prefs.minutes : 5);
        totalSecRef.current = (mode === "work" ? prefs.minutes : 5) * 60;
      } else {
        totalSecRef.current = minutes * 60 + seconds;
      }
      startedAtRef.current = Date.now();
      audioRef.current?.play().catch(() => {});
    } else {
      audioRef.current?.pause();
    }
    setRunning(!running);
  };

  const reset = () => {
    setRunning(false);
    audioRef.current?.pause();
    const m = mode === "work" ? prefs.minutes : 5;
    setMinutes(m); setSeconds(0);
    totalSecRef.current = m * 60;
  };

  const onMinutesChange = (v: number) => {
    if (running) return;
    setPrefs(p => ({ ...p, minutes: v }));
    if (mode === "work") { setMinutes(v); setSeconds(0); totalSecRef.current = v * 60; }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-xs text-muted-foreground mb-1">{mode === "work" ? "زمان تمرکز" : "استراحت"}</div>
        <div className={`tabular-nums font-bold text-primary ${compact ? "text-5xl" : "text-7xl"} my-3`}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <div className="flex gap-2 justify-center">
          <Button size={compact ? "default" : "lg"} onClick={start}>
            {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          <Button size={compact ? "default" : "lg"} variant="outline" onClick={reset}>
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {!running && mode === "work" && (
        <div className="space-y-2">
          <Label className="text-xs">مدت زمان: {prefs.minutes} دقیقه</Label>
          <Slider value={[prefs.minutes]} min={5} max={90} step={5} onValueChange={([v]) => onMinutesChange(v)} />
          <div className="flex flex-wrap gap-1 justify-center">
            {[15, 25, 45, 60].map(m => (
              <Button key={m} size="sm" variant={prefs.minutes === m ? "default" : "outline"}
                className="h-7 px-2 text-xs" onClick={() => onMinutesChange(m)}>
                {m}د
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs flex-1">صدای پایان</Label>
          <Select value={prefs.bell} onValueChange={(v) => { setPrefs(p => ({ ...p, bell: v as EndBellId })); playEndBell(v as EndBellId); }}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {END_BELLS.map(b => <SelectItem key={b.id} value={b.id}>{b.emoji} {b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs flex-1">صدای محیطی</Label>
          <Select value={prefs.ambient} onValueChange={(v) => setPrefs(p => ({ ...p, ambient: v }))}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="بدون صدا" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">🔇 بدون صدا</SelectItem>
              {AMBIENT_SOUNDS.map(s => <SelectItem key={s.id} value={s.id}>{s.emoji} {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {prefs.ambient !== "none" && (
          <div className="flex items-center gap-2">
            {prefs.ambientVol === 0 ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
            <Slider value={[prefs.ambientVol]} min={0} max={100} step={5}
              onValueChange={([v]) => setPrefs(p => ({ ...p, ambientVol: v }))} className="flex-1" />
            <span className="text-xs tabular-nums w-8 text-center">{prefs.ambientVol}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
