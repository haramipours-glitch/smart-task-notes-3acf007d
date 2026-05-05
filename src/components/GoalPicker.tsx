import { useEffect, useState } from "react";
import { Target, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Goal = { id: string; title: string; color: string | null };

export function GoalPicker({
  value,
  onChange,
  size = "sm",
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  size?: "sm" | "xs";
}) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("goals")
      .select("id,title,color")
      .order("created_at", { ascending: false })
      .then(({ data }) => setGoals((data || []) as any));
  }, [user]);

  const current = goals.find((g) => g.id === value);
  const label = current ? current.title : "بدون هدف";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`justify-start gap-1.5 ${size === "xs" ? "h-7 text-[11px]" : "h-9 text-xs"} w-full`}
        >
          <Target className="w-3.5 h-3.5 shrink-0" style={{ color: current?.color || undefined }} />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1 max-h-[40vh] overflow-y-auto" align="start">
        <button
          onClick={() => onChange(null)}
          className={`w-full text-end p-2 rounded text-sm hover:bg-accent flex items-center justify-between ${value === null ? "bg-accent" : ""}`}
        >
          <span>بدون هدف</span>
          {value === null && <Check className="w-3.5 h-3.5" />}
        </button>
        {goals.map((g) => (
          <button
            key={g.id}
            onClick={() => onChange(g.id)}
            className={`w-full text-end p-2 rounded text-sm hover:bg-accent flex items-center justify-between gap-2 ${value === g.id ? "bg-accent" : ""}`}
          >
            <span className="flex items-center gap-2 truncate">
              <Target className="w-3.5 h-3.5 shrink-0" style={{ color: g.color || undefined }} />
              <span className="truncate">{g.title}</span>
            </span>
            {value === g.id && <Check className="w-3.5 h-3.5 shrink-0" />}
          </button>
        ))}
        {goals.length === 0 && (
          <p className="text-xs text-muted-foreground p-2 text-center">هنوز هدفی نساختی</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
