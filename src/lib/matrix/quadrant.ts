import { addCalendarDays } from "@/lib/dates";
import type { Action } from "@/types/action";

export type Quadrant = 1 | 2 | 3 | 4;

export const QUADRANT_INFO: Record<Quadrant, { title: string; verb: string; hint: string }> = {
  1: { title: "Срочно и важно", verb: "Выполни", hint: "Делайте сейчас" },
  2: { title: "Важно, но не срочно", verb: "Запланируй", hint: "Назначьте дату — здесь рост" },
  3: { title: "Срочно, но не важно", verb: "Делегируй", hint: "Передайте другому человеку" },
  4: { title: "Не срочно и не важно", verb: "Удали", hint: "Уберите из списка" },
};

/**
 * Матрица Эйзенхауэра. Отдельных полей не заводим — считаем по данным задачи:
 * важно = приоритет «высокий/критичный» или задача привязана к цели;
 * срочно = дедлайн или дата в ближайшие 2 дня, либо задача уже просрочена.
 * Изменить квадрат можно, поменяв приоритет (важность) или дату (срочность).
 */
export function isImportant(a: Action): boolean {
  return a.priority === "high" || a.priority === "critical" || !!a.goalId;
}

export function isUrgent(a: Action, today: string): boolean {
  if (a.status === "overdue") return true;
  if (a.deadlineAt && a.deadlineAt.slice(0, 10) <= addCalendarDays(today, 2)) return true;
  if (a.actionDate && a.actionDate <= addCalendarDays(today, 1)) return true;
  return false;
}

export function classify(a: Action, today: string): Quadrant {
  const important = isImportant(a);
  const urgent = isUrgent(a, today);
  if (urgent && important) return 1;
  if (!urgent && important) return 2;
  if (urgent && !important) return 3;
  return 4;
}
