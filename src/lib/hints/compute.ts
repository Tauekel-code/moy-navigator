import type { Action } from "@/types/action";
import type { Goal } from "@/types/goal";
import type { Idea } from "@/types/idea";

export type Hint =
  | { kind: "task_without_goal"; actionId: string; title: string; suggestedGoalId: string; suggestedGoalTitle: string }
  | { kind: "similar_ideas"; keepId: string; mergeId: string; keepText: string; mergeText: string }
  | { kind: "overloaded_day"; date: string; hours: number };

const OVERLOAD_MINUTES = 8 * 60;

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function similarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / Math.min(wa.size, wb.size);
}

/**
 * Раздел 32 ТЗ: подсказки — только предложения на основе простых правил
 * (не LLM). Ничего не применяется само: решение всегда за пользователем (раздел 33).
 */
export function computeHints(input: { todayActions: Action[]; tomorrowActions: Action[]; tomorrow: string; goals: Goal[]; ideas: Idea[] }): Hint[] {
  const hints: Hint[] = [];
  const activeGoals = input.goals.filter((g) => g.status === "active");

  // 1. Задача без цели: предлагаем цель из той же сферы, иначе первую с общими словами в названии
  for (const a of input.todayActions) {
    if (a.goalId || a.status === "completed" || a.status === "cancelled") continue;
    const candidate =
      activeGoals.find((g) => a.lifeAreaId && g.lifeAreaId === a.lifeAreaId) ??
      activeGoals.find((g) => similarity(a.title, g.title) >= 0.5) ??
      (activeGoals.length === 1 ? activeGoals[0] : undefined);
    if (candidate) {
      hints.push({ kind: "task_without_goal", actionId: a.id.split("::")[0], title: a.title, suggestedGoalId: candidate.id, suggestedGoalTitle: candidate.title });
    }
    if (hints.length >= 3) break;
  }

  // 2. Похожие идеи
  const open = input.ideas.filter((i) => i.status === "new" || i.status === "reviewing");
  outer: for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      if (similarity(open[i].text, open[j].text) >= 0.6) {
        const [newer, older] = open[i].createdAt > open[j].createdAt ? [open[i], open[j]] : [open[j], open[i]];
        hints.push({ kind: "similar_ideas", keepId: older.id, mergeId: newer.id, keepText: older.text, mergeText: newer.text });
        break outer;
      }
    }
  }

  // 3. Перегруженный завтрашний день
  const minutes = input.tomorrowActions
    .filter((a) => a.status !== "cancelled")
    .reduce((sum, a) => sum + (a.durationMinutes ?? 30), 0);
  if (minutes > OVERLOAD_MINUTES) {
    hints.push({ kind: "overloaded_day", date: input.tomorrow, hours: Math.round(minutes / 6) / 10 });
  }

  return hints;
}
