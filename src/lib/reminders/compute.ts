import { combineDateTimeToInstant } from "@/lib/dates";
import type { ReminderInput, ReminderOffsetUnit } from "@/types/reminder";

const UNIT_TO_MS: Record<Exclude<ReminderOffsetUnit, "absolute">, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 7 * 86_400_000,
  months: 30 * 86_400_000, // приблизительно; для точных месяцев напоминание пересчитывается от даты действия
};

/**
 * Вычисляет момент срабатывания напоминания (раздел 24, 26 ТЗ).
 * Для относительных напоминаний — от времени действия (или начала дня,
 * если у действия нет времени) минус смещение.
 * Для абсолютных — берётся указанный пользователем момент напрямую.
 */
export function computeReminderTriggerAt(
  input: ReminderInput,
  actionDate: string | null,
  actionTime: string | null,
  timezone: string,
): Date {
  if (input.offsetUnit === "absolute") {
    if (!input.absoluteAt) throw new Error("Для произвольного напоминания нужна конкретная дата/время");
    return new Date(input.absoluteAt);
  }

  if (!actionDate) {
    throw new Error("У действия без даты нельзя вычислить относительное напоминание");
  }

  const anchor = combineDateTimeToInstant(actionDate, actionTime, timezone);
  const offsetMs = (input.offsetValue ?? 0) * UNIT_TO_MS[input.offsetUnit];
  return new Date(anchor.getTime() - offsetMs);
}

/**
 * Раздел 26: при переносе действия относительные напоминания
 * пересчитываются автоматически на основе того же смещения.
 * Абсолютные напоминания (offsetUnit === 'absolute') не трогаем —
 * пользователь указал конкретный момент осознанно.
 */
export function recalculateReminderOnReschedule(
  offsetUnit: ReminderOffsetUnit,
  offsetValue: number | null,
  newActionDate: string | null,
  newActionTime: string | null,
  timezone: string,
): Date | null {
  if (offsetUnit === "absolute") return null; // не меняется
  if (!newActionDate) return null;

  return computeReminderTriggerAt(
    { offsetUnit, offsetValue },
    newActionDate,
    newActionTime,
    timezone,
  );
}
