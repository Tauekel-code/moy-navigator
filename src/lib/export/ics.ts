import { createEvents, type EventAttributes, type DateArray } from "ics";
import type { Action } from "@/types/action";

/** Раздел 39: экспорт ICS для совместимости с календарными приложениями. */
export function actionsToIcs(actions: Action[]): string {
  const events: EventAttributes[] = actions
    .filter((a) => a.actionDate)
    .map((a): EventAttributes => {
      const [year, month, day] = a.actionDate!.split("-").map(Number);

      const start: DateArray = a.startTime
        ? (() => {
            const [h, m] = a.startTime!.split(":").map(Number);
            return [year, month, day, h, m];
          })()
        : [year, month, day];

      return {
        start,
        title: a.title,
        duration: a.durationMinutes ? { minutes: a.durationMinutes } : { days: 1 },
        description: `Тип: ${a.type}. Приоритет: ${a.priority}. Статус: ${a.status}.`,
        status: a.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
      };
    });

  const { error, value } = createEvents(events);
  if (error) throw error;
  return value ?? "";
}
