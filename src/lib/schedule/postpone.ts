import { addCalendarDays } from "@/lib/dates";

export type PostponeShortcut = "15m" | "30m" | "1h" | "tonight" | "tomorrow";

/** Раздел 42: быстрое откладывание — чистая функция, общая для облачного и локального режимов. */
export function resolvePostponeShortcut(
  shortcut: PostponeShortcut,
  currentDate: string,
  currentTime: string | null,
): { date: string; time: string | null } {
  const now = new Date();
  switch (shortcut) {
    case "15m":
    case "30m":
    case "1h": {
      const minutes = shortcut === "15m" ? 15 : shortcut === "30m" ? 30 : 60;
      const base = currentTime ? new Date(`${currentDate}T${currentTime}:00`) : now;
      const shifted = new Date(base.getTime() + minutes * 60_000);
      const hh = String(shifted.getHours()).padStart(2, "0");
      const mm = String(shifted.getMinutes()).padStart(2, "0");
      return { date: currentDate, time: `${hh}:${mm}` };
    }
    case "tonight":
      return { date: currentDate, time: "19:00" };
    case "tomorrow":
      return { date: addCalendarDays(currentDate, 1), time: currentTime };
  }
}
