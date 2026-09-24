"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { describePlanSummary } from "@/lib/planner/day-planner";
import type { DailyPlan, DailyPlanSuggestion } from "@/types/daily-plan";

interface Props {
  date: string;
  onOpenAction: (id: string) => void;
}

/**
 * Раздел 11-12 ТЗ: AI-алгоритм предлагает план дня, пользователь принимает
 * или меняет его — ничего не сохраняется и не считается выполненным
 * без подтверждения (раздел 33).
 */
export function DailyPlanPanel({ date, onOpenAction }: Props) {
  const { show } = useToast();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [suggestion, setSuggestion] = useState<DailyPlanSuggestion | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ plan: DailyPlan | null; suggestion: DailyPlanSuggestion | null }>(`/api/daily-plan/${date}`);
      setPlan(res.plan);
      setSuggestion(res.suggestion);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function handleAccept() {
    if (!suggestion) return;
    setSaving(true);
    try {
      const items = [
        ...suggestion.required.map((a) => ({ actionId: a.id, isRequired: true })),
        ...suggestion.optional.map((a) => ({ actionId: a.id, isRequired: false })),
      ];
      await api.post(`/api/daily-plan/${date}`, { items, status: "accepted" });
      show("План дня принят", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Не удалось сохранить план", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setPlan(null);
    await load();
  }

  if (loading) return null;

  if (!suggestion && !plan) return null;

  return (
    <div className="border border-border rounded-xl mb-4 overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-surface-muted">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Sparkles size={15} className="text-accent" />
          {plan ? `План дня принят` : "AI предлагает план дня"}
        </span>
        <span className="flex items-center gap-2 text-xs text-foreground-muted">
          {suggestion && !plan && describePlanSummary(suggestion)}
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-border space-y-3">
          {plan ? (
            <>
              <p className="text-xs text-foreground-muted">{plan.items.length} задач в принятом плане</p>
              <div className="space-y-1">
                {plan.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.action && onOpenAction(item.action.id)}
                    className="w-full text-left text-sm px-2.5 py-1.5 rounded-lg hover:bg-surface-muted flex items-center gap-2"
                  >
                    {item.isRequired && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-muted text-foreground-muted">обязательно</span>}
                    {item.action?.title}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw size={13} /> Пересобрать план
              </Button>
            </>
          ) : suggestion ? (
            <>
              {suggestion.required.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">Обязательные</p>
                  {suggestion.required.map((a) => (
                    <p key={a.id} className="text-sm px-2.5 py-1">
                      {a.startTime && <span className="text-foreground-muted mr-1.5">{a.startTime}</span>}
                      {a.title}
                    </p>
                  ))}
                </div>
              )}
              {suggestion.optional.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">Гибкие задачи, которые поместятся</p>
                  {suggestion.optional.map((a) => (
                    <p key={a.id} className="text-sm px-2.5 py-1">
                      {a.title}
                    </p>
                  ))}
                </div>
              )}
              {suggestion.overflow.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-600 mb-1">Не помещаются сегодня — стоит перенести</p>
                  {suggestion.overflow.map((a) => (
                    <p key={a.id} className="text-sm px-2.5 py-1 text-foreground-muted">
                      {a.title}
                    </p>
                  ))}
                </div>
              )}
              <Button size="sm" onClick={handleAccept} disabled={saving}>
                {saving ? "Сохраняем…" : "Принять план"}
              </Button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
