import { minutesBetween, formatDuration } from "@/lib/dates";
import type { Action } from "@/types/action";
import type { DailyPlanSuggestion } from "@/types/daily-plan";

const BUFFER_MINUTES = 10;
const DEFAULT_TASK_MINUTES = 30;

/**
 * Раздел 11 ТЗ: автоматический план дня. Реализовано как детерминированный
 * алгоритм (шаги 1-11 из ТЗ), а не вызов LLM — честная точка расширения:
 * при подключении реального AI-бэкенда эта функция заменяется вызовом
 * модели с тем же контрактом входа/выхода (DailyPlanSuggestion).
 * AI/алгоритм только ПРЕДЛАГАЕТ план — раздел 12: пользователь подтверждает
 * или меняет его сам, ничего не проставляется автоматически как "сделано".
 */
export function suggestDailyPlan(
  actions: Action[],
  workStartTime: string,
  workEndTime: string,
  planDate: string,
): DailyPlanSuggestion {
  // Шаг 1: задачи на дату (уже отфильтрованы вызывающим кодом по planDate)
  const dayActions = actions.filter((a) => a.status !== "cancelled" && a.status !== "completed");

  // Шаг 2: обязательные — с фиксированным временем или высоким/критичным приоритетом
  const required = dayActions.filter((a) => !!a.startTime || a.priority === "high" || a.priority === "critical");
  const flexible = dayActions.filter((a) => !required.includes(a));

  // Шаг 4-6: сортировка гибких задач — дедлайн → приоритет → связь с целью
  const priorityWeight: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
  const sortedFlexible = [...flexible].sort((a, b) => {
    const deadlineA = a.deadlineAt ?? "9999";
    const deadlineB = b.deadlineAt ?? "9999";
    if (deadlineA !== deadlineB) return deadlineA.localeCompare(deadlineB);
    const prioDiff = priorityWeight[a.priority] - priorityWeight[b.priority];
    if (prioDiff !== 0) return prioDiff;
    // связь с целью — небольшой приоритет вперёд
    return (b.goalId ? 1 : 0) - (a.goalId ? 1 : 0);
  });

  // Шаг 7: доступное время в рабочих часах за вычетом фиксированных задач
  const fixedIntervals = required
    .filter((a) => a.startTime)
    .map((a) => ({ start: a.startTime!, end: a.endTime ?? addMinutes(a.startTime!, a.durationMinutes ?? DEFAULT_TASK_MINUTES) }))
    .sort((x, y) => x.start.localeCompare(y.start));

  let cursor = workStartTime;
  let availableMinutes = 0;
  for (const interval of fixedIntervals) {
    if (interval.start > cursor) availableMinutes += minutesBetween(cursor, interval.start);
    if (interval.end > cursor) cursor = interval.end;
  }
  if (cursor < workEndTime) availableMinutes += minutesBetween(cursor, workEndTime);

  // Шаг 8-9: буферы + не перегружать день
  const usableMinutes = Math.max(availableMinutes - BUFFER_MINUTES * (sortedFlexible.length || 1), 0);

  const optional: Action[] = [];
  const overflow: Action[] = [];
  let usedMinutes = 0;

  for (const action of sortedFlexible) {
    const estMinutes = action.durationMinutes ?? DEFAULT_TASK_MINUTES;
    if (usedMinutes + estMinutes <= usableMinutes) {
      optional.push(action);
      usedMinutes += estMinutes;
    } else {
      // Шаг 10: не помещается
      overflow.push(action);
    }
  }

  const totalPlannedMinutes =
    required.reduce((sum, a) => sum + (a.durationMinutes ?? DEFAULT_TASK_MINUTES), 0) + usedMinutes;

  return {
    planDate,
    required,
    optional,
    overflow,
    freeMinutes: Math.max(availableMinutes - usedMinutes, 0),
    totalPlannedMinutes,
  };
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function describePlanSummary(suggestion: DailyPlanSuggestion): string {
  const total = suggestion.required.length + suggestion.optional.length;
  const parts = [`${total} задач в план`];
  if (suggestion.overflow.length > 0) parts.push(`${suggestion.overflow.length} не поместились`);
  parts.push(`свободно ${formatDuration(suggestion.freeMinutes)}`);
  return parts.join(" · ");
}
