import { minutesBetween } from "@/lib/dates";
import type { Action } from "@/types/action";

/** Раздел 8: свободные промежутки между событиями дня — вычисляются на лету, не хранятся. Чистая функция без зависимостей от БД — безопасна для клиентских компонентов. */
export function computeFreeSlots(
  dayActions: Action[],
  dayStart = "08:00",
  dayEnd = "22:00",
): { start: string; end: string; minutes: number }[] {
  const timed = dayActions
    .filter((a) => a.startTime && a.endTime && a.status !== "cancelled")
    .sort((a, b) => a.startTime!.localeCompare(b.startTime!));

  const slots: { start: string; end: string; minutes: number }[] = [];
  let cursor = dayStart;

  for (const action of timed) {
    if (action.startTime! > cursor) {
      const minutes = minutesBetween(cursor, action.startTime!);
      if (minutes > 0) slots.push({ start: cursor, end: action.startTime!, minutes });
    }
    if (action.endTime! > cursor) cursor = action.endTime!;
  }

  if (cursor < dayEnd) {
    slots.push({ start: cursor, end: dayEnd, minutes: minutesBetween(cursor, dayEnd) });
  }

  return slots;
}

export function timeRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}
