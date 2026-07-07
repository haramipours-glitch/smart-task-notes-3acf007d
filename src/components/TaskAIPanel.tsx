import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Loader2, Send, Check, Timer } from "lucide-react";
import PomodoroTimer from "@/components/PomodoroTimer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { callAI, getAILanguage, type AILanguage } from "@/lib/ai";
import { AILangToggle } from "@/components/AILangToggle";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PRIORITY_META, type Priority } from "@/lib/priority";
import { describeRule, type RecurrenceRule } from "@/lib/recurrence";

type TaskLite = {
  id: string; title: string; description?: string | null;
  priority: Priority; due_date: string | null; recurrence_rule?: RecurrenceRule | null;
};

type ClarifyQ = { question: string; options: string[] };

export function TaskAIPanel({
  task, open, onOpenChange, onMetaApplied,
}: {
  task: TaskLite;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMetaApplied?: () => void;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState("subtasks");
  const [globalCtx, setGlobalCtx] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLang, setAiLang] = useState<AILanguage>(getAILanguage());

  // Subtasks
  const [subSugs, setSubSugs] = useState<string[]>([]);
  const [subPicked, setSubPicked] = useState<Record<number, boolean>>({});
  const [questions, setQuestions] = useState<ClarifyQ[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Metadata
  const [meta, setMeta] = useState<{ priority?: Priority; due_date?: string; recurrence_rule?: RecurrenceRule; reason?: string } | null>(null);

  // Chat
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    if (!open) {
      setSubSugs([]); setSubPicked({}); setQuestions([]); setAnswers({});
      setMeta(null); setChat([]); setChatInput("");
    }
  }, [open]);

  const buildContext = async (): Promise<string> => {
    let ctx = `Current task:\nTitle: ${task.title}\nDescription: ${task.description || "(none)"}\nPriority: ${task.priority}\nDue: ${task.due_date || "(none)"}\nRecurrence: ${describeRule(task.recurrence_rule || null)}`;
    if (globalCtx && user) {
      const [{ data: tasks }, { data: notes }] = await Promise.all([
        supabase.from("tasks").select("title,priority,due_date,completed").limit(40),
        supabase.from("notes").select("title").limit(20),
      ]);
      ctx += `\n\nAll tasks: ${JSON.stringify(tasks || [])}`;
      ctx += `\nAll notes: ${JSON.stringify(notes || [])}`;
    }
    return ctx;
  };

  // ====== Subtasks ======
  const genSubtasks = async (extra?: string) => {
    setLoading(true);
    try {
      const ctx = await buildContext();
      const promptInput = extra
        ? `Task: "${task.title}"\nClarifications:\n${extra}`
        : `Task: "${task.title}"`;
      const r = await callAI("task_subtasks", promptInput, ctx, undefined, aiLang);
      const d = r.data;
      if (d?.mode === "questions" && d.questions?.length) {
        setQuestions(d.questions);
        setSubSugs([]); setSubPicked({});
      } else {
        setSubSugs(d?.subtasks || []);
        setSubPicked(Object.fromEntries((d?.subtasks || []).map((_: any, i: number) => [i, true])));
        setQuestions([]);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const submitAnswers = () => {
    const ans = questions.map((q, i) => `${q.question}: ${answers[i] || "—"}`).join("\n");
    genSubtasks(ans);
  };

  const addPickedSubtasks = async () => {
    if (!user) return;
    const picked = subSugs.filter((_, i) => subPicked[i]);
    if (!picked.length) return toast.error("چیزی انتخاب نشده");
    // Create child tasks (each subtask is a real task with parent_id)
    const rows = picked.map((title) => ({
      user_id: user.id, title, parent_id: task.id, priority: "none" as Priority,
    }));
    const { error } = await supabase.from("tasks").insert(rows);
    if (error) toast.error(error.message);
    else {
      toast.success(`${picked.length} زیرتسک اضافه شد ✨`);
      setSubSugs([]); setSubPicked({});
      onMetaApplied?.();
    }
  };

  // ====== Metadata ======
  const suggestMeta = async () => {
    setLoading(true);
    try {
      const ctx = await buildContext();
      const r = await callAI("task_metadata_suggest",
        `Title: ${task.title}\nDescription: ${task.description || ""}`, ctx, undefined, aiLang);
      setMeta(r.data || null);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const applyMeta = async () => {
    if (!meta) return;
    const patch: any = {};
    if (meta.priority) patch.priority = meta.priority;
    if (meta.due_date) patch.due_date = meta.due_date;
    if (meta.recurrence_rule) patch.recurrence_rule = meta.recurrence_rule;
    const { error } = await supabase.from("tasks").update(patch).eq("id", task.id);
    if (error) toast.error(error.message);
    else { toast.success("اعمال شد ✨"); onMetaApplied?.(); setMeta(null); }
  };

  // ====== Note generation ======
  const genNote = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ctx = await buildContext();
      const r = await callAI("generate_note", task.title, ctx, undefined, aiLang);
      const { error } = await supabase.from("notes").insert({
        user_id: user.id, task_id: task.id, title: task.title, content: r.text,
      });
      if (error) throw error;
      toast.success("نوت برای این تسک ساخته شد ✨");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  // ====== Chat ======
  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const newMsg = { role: "user" as const, content: chatInput };
    setChat((c) => [...c, newMsg]);
    setChatInput("");
    setLoading(true);
    try {
      const ctx = await buildContext();
      const r = await callAI("task_chat", [...chat, newMsg], ctx, undefined, aiLang);
      setChat((c) => [...c, { role: "assistant", content: r.text }]);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> AI برای این تسک
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg border bg-accent/20">
            <Label htmlFor="global-ctx" className="text-sm cursor-pointer flex-1">
              🌐 دسترسی به همه تسک‌ها و نوت‌های من
            </Label>
            <Switch id="global-ctx" checked={globalCtx} onCheckedChange={setGlobalCtx} />
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg border bg-accent/20">
            <span className="text-sm">زبان پاسخ AI</span>
            <AILangToggle value={aiLang} onChange={setAiLang} />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-3">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="subtasks">مراحل</TabsTrigger>
            <TabsTrigger value="meta">پیشنهاد</TabsTrigger>
            <TabsTrigger value="note">نوت</TabsTrigger>
            <TabsTrigger value="pomodoro"><Timer className="w-3.5 h-3.5" /></TabsTrigger>
            <TabsTrigger value="chat">چت</TabsTrigger>
          </TabsList>

          <TabsContent value="pomodoro" className="mt-4">
            <PomodoroTimer taskId={task.id} compact />
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              زمان ثبت‌شده زیر این تسک حساب می‌شود.
            </p>
          </TabsContent>

          {/* Subtasks */}
          <TabsContent value="subtasks" className="space-y-3 mt-4">
            <Button onClick={() => genSubtasks()} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              تولید مراحل (Subtasks)
            </Button>

            {questions.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">برای پیشنهاد بهتر، لطفاً پاسخ بدید:</p>
                {questions.map((q, i) => (
                  <Card key={i} className="p-3 space-y-2">
                    <p className="text-sm font-medium">{q.question}</p>
                    <div className="flex flex-wrap gap-1">
                      {q.options.map((o) => (
                        <button key={o} type="button"
                          onClick={() => setAnswers((a) => ({ ...a, [i]: o }))}
                          className={`text-xs px-2 py-1 rounded border transition ${answers[i] === o ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </Card>
                ))}
                <Button onClick={submitAnswers} disabled={loading} className="w-full" variant="secondary">
                  ارسال پاسخ‌ها
                </Button>
              </div>
            )}

            {subSugs.length > 0 && (
              <div className="space-y-2">
                {subSugs.map((s, i) => (
                  <Card key={i} className="p-2 flex gap-2 items-start cursor-pointer hover:bg-accent/30"
                    onClick={() => setSubPicked((p) => ({ ...p, [i]: !p[i] }))}>
                    <Checkbox checked={subPicked[i] || false} className="mt-0.5" />
                    <p className="text-sm flex-1">{s}</p>
                  </Card>
                ))}
                <Button onClick={addPickedSubtasks} className="w-full">
                  افزودن انتخاب‌شده‌ها
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Meta */}
          <TabsContent value="meta" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">AI بر اساس تسک، اولویت/ددلاین/تکرار پیشنهاد می‌ده.</p>
            <Button onClick={suggestMeta} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              پیشنهاد بگیر
            </Button>
            {meta && (
              <Card className="p-3 space-y-2">
                {meta.priority && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">اولویت:</span>
                    <span className={PRIORITY_META[meta.priority].textClass}>
                      {PRIORITY_META[meta.priority].emoji} {PRIORITY_META[meta.priority].label}
                    </span>
                  </div>
                )}
                {meta.due_date && (
                  <div className="text-sm"><span className="text-muted-foreground">سررسید:</span> {new Date(meta.due_date).toLocaleString("fa-IR")}</div>
                )}
                {meta.recurrence_rule && (
                  <div className="text-sm"><span className="text-muted-foreground">تکرار:</span> {describeRule(meta.recurrence_rule)}</div>
                )}
                {meta.reason && <p className="text-xs text-muted-foreground italic">💡 {meta.reason}</p>}
                <Button onClick={applyMeta} className="w-full gap-2" size="sm">
                  <Check className="w-4 h-4" /> اعمال کن
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Note */}
          <TabsContent value="note" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">یک نوت کامل برای این تسک تولید می‌کند.</p>
            <Button onClick={genNote} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              تولید نوت
            </Button>
          </TabsContent>

          {/* Chat */}
          <TabsContent value="chat" className="mt-4 flex flex-col h-[55vh]">
            <div className="flex-1 overflow-y-auto space-y-2 mb-2 pe-1">
              {chat.length === 0 && <p className="text-sm text-muted-foreground text-center mt-8">درباره این تسک سوال بپرس</p>}
              {chat.map((m, i) => (
                <div key={i} className={`p-2 rounded-lg text-sm ${m.role === "user" ? "bg-primary/10 ms-6" : "bg-muted me-6"}`}>
                  <div className="prose-note text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && <Loader2 className="w-4 h-4 animate-spin mx-auto" />}
            </div>
            <div className="flex gap-2">
              <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="بپرس..." />
              <Button size="icon" onClick={sendChat} disabled={loading}><Send className="w-4 h-4" /></Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
