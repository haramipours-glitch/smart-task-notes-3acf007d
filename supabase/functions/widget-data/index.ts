// Public widget endpoint for KWGT (Kustom Widget Maker) and similar tools.
// Authentication: ?token=<user widget token> (no JWT needed).
// Returns a flat JSON shape that KWGT formulas can read easily.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token =
      url.searchParams.get("token") ||
      req.headers.get("x-widget-token") ||
      "";

    if (!token || token.length < 16) {
      return json({ error: "missing token" }, 401);
    }

    // Service role: needed to look up the token across users
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tk, error: tkErr } = await admin
      .from("widget_tokens")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();

    if (tkErr || !tk) {
      return json({ error: "invalid token" }, 401);
    }

    const userId = tk.user_id;

    // Update last_used_at (best effort)
    admin
      .from("widget_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token", token)
      .then(() => {});

    // Date window for "today"
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Tasks today (due today OR overdue and not completed)
    const { data: todayTasks } = await admin
      .from("tasks")
      .select("id,title,priority,due_date,completed,quadrant")
      .eq("user_id", userId)
      .or(
        `and(due_date.gte.${startOfDay.toISOString()},due_date.lte.${endOfDay.toISOString()}),and(due_date.lt.${startOfDay.toISOString()},completed.eq.false)`,
      )
      .order("due_date", { ascending: true })
      .limit(20);

    const tasks = todayTasks ?? [];
    const pending = tasks.filter((t) => !t.completed);
    const done = tasks.filter((t) => t.completed);
    const next = pending[0];

    // Habits + today logs
    const todayDate = startOfDay.toISOString().slice(0, 10);
    const [{ data: habits }, { data: habitLogs }] = await Promise.all([
      admin.from("habits").select("id,name,icon").eq("user_id", userId),
      admin
        .from("habit_logs")
        .select("habit_id")
        .eq("user_id", userId)
        .eq("log_date", todayDate),
    ]);
    const doneIds = new Set((habitLogs ?? []).map((h) => h.habit_id));
    const habitsTotal = (habits ?? []).length;
    const habitsDone = (habits ?? []).filter((h) => doneIds.has(h.id)).length;

    // Latest checkin
    const { data: checkin } = await admin
      .from("daily_checkins")
      .select("mood,energy,focus,stress,checkin_date")
      .eq("user_id", userId)
      .order("checkin_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Pomodoro today
    const { data: pomos } = await admin
      .from("pomodoro_sessions")
      .select("duration_minutes,completed")
      .eq("user_id", userId)
      .gte("started_at", startOfDay.toISOString());

    const pomoDoneCount = (pomos ?? []).filter((p) => p.completed).length;
    const focusMinutes = (pomos ?? [])
      .filter((p) => p.completed)
      .reduce((s, p) => s + (p.duration_minutes ?? 0), 0);

    return json({
      ok: true,
      generated_at: now.toISOString(),
      tasks: {
        total: tasks.length,
        pending: pending.length,
        done: done.length,
        next_title: next?.title ?? "",
        next_priority: next?.priority ?? "",
        next_due: next?.due_date ?? "",
        list: pending.slice(0, 5).map((t, i) => ({
          i: i + 1,
          title: t.title,
          priority: t.priority,
          due: t.due_date,
        })),
      },
      habits: {
        total: habitsTotal,
        done: habitsDone,
        percent: habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 100) : 0,
      },
      checkin: {
        mood: checkin?.mood ?? null,
        energy: checkin?.energy ?? null,
        focus: checkin?.focus ?? null,
        stress: checkin?.stress ?? null,
        date: checkin?.checkin_date ?? null,
      },
      pomodoro: {
        completed_today: pomoDoneCount,
        focus_minutes: focusMinutes,
      },
    });
  } catch (e) {
    console.error("widget-data error", e);
    return json({ error: "internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
