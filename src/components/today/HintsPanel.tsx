"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import type { Hint } from "@/lib/hints/compute";

/** Раздел 32 ТЗ: умные подсказки. Предложение → пользователь принимает или закрывает (раздел 33). */
export function HintsPanel({ onChanged }: { onChanged: () => void }) {
  const { show } = useToast();
  const [hints, setHints] = useState<Hint[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const r = await api.get<{ hints: Hint[] }>("/api/hints");
      setHints(r.hints);
    } catch {
      setHints([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const keyOf = (h: Hint) => (h.kind === "task_without_goal" ? `t${h.actionId}` : h.kind === "similar_ideas" ? `i${h.mergeId}` : `o${h.date}`);
  const visible = hints.filter((h) => !dismissed.has(keyOf(h)));
  if (visible.length === 0) return null;

  function dismiss(h: Hint) {
    setDismissed(new Set([...dismissed, keyOf(h)]));
  }

  async function linkGoal(h: Extract<Hint, { kind: "task_without_goal" }>) {
    await api.patch(`/api/actions/${h.actionId}`, { goalId: h.suggestedGoalId });
    show("Задача привязана к цели", "success");
    dismiss(h);
    onChanged();
  }

  async function mergeIdeas(h: Extract<Hint, { kind: "similar_ideas" }>) {
    await api.patch(`/api/ideas/${h.keepId}`, { notes: `Объединено с: ${h.mergeText}` });
    await api.post(`/api/ideas/${h.mergeId}/archive`);
    show("Идеи объединены", "success");
    dismiss(h);
    load();
  }

  return (
    <div className="border border-border rounded-xl mb-4 divide-y divide-border">
      {visible.map((h) => (
        <div key={keyOf(h)} className="flex items-start gap-2.5 px-3.5 py-2.5">
          <Lightbulb size={15} className="text-accent shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            {h.kind === "task_without_goal" && (
              <>
                <p>
                  У задачи «{h.title}» не указана цель. Привязать к цели «{h.suggestedGoalTitle}»?
                </p>
                <div className="mt-1.5">
                  <Button size="sm" variant="outline" onClick={() => linkGoal(h)}>
                    Привязать
                  </Button>
                </div>
              </>
            )}
            {h.kind === "similar_ideas" && (
              <>
                <p>
                  Идеи похожи: «{h.keepText}» и «{h.mergeText}». Объединить?
                </p>
                <div className="mt-1.5">
                  <Button size="sm" variant="outline" onClick={() => mergeIdeas(h)}>
                    Объединить
                  </Button>
                </div>
              </>
            )}
            {h.kind === "overloaded_day" && (
              <p>
                На {h.date} запланировано {h.hours} ч задач. Предлагаю пересмотреть план.{" "}
                <Link href={`/today?date=${h.date}`} className="text-accent hover:underline">
                  Открыть день
                </Link>
              </p>
            )}
          </div>
          <button onClick={() => dismiss(h)} className="text-foreground-muted hover:text-foreground" aria-label="Скрыть">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
