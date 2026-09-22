import {
  addDays,
  addMonths,
  addWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  format as fnsFormat,
  parse as fnsParse,
  isValid,
} from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { ru } from "date-fns/locale";

// -----------------------------------------------------------------------
// Раздел 66 ТЗ: дата без времени — это календарная дата, она НЕ должна
// сдвигаться из-за часового пояса. Поэтому мы никогда не создаём
// `new Date("2027-09-15")` (это UTC-полночь, которая может "съехать" на
// соседний день при форматировании в другом часовом поясе) и работаем с
// YYYY-MM-DD как с обычной строкой везде, где это только дата.
// Временные метки (дедлайн, срабатывание напоминания, created_at) —
// это настоящие моменты времени и ОБЯЗАНЫ учитывать timezone пользователя.
// -----------------------------------------------------------------------

export const DATE_FORMAT = "yyyy-MM-dd";

/** Сегодняшняя календарная дата в часовом поясе пользователя, как YYYY-MM-DD. */
export function todayInTz(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, DATE_FORMAT);
}

/** Парсит YYYY-MM-DD в "наивный" локальный Date (без сдвига по TZ), только для отображения/арифметики над календарными датами. */
export function parseCalendarDate(dateStr: string): Date {
  const d = fnsParse(dateStr, DATE_FORMAT, new Date());
  if (!isValid(d)) throw new Error(`Некорректная дата: ${dateStr}`);
  return d;
}

export function formatCalendarDate(date: Date): string {
  return fnsFormat(date, DATE_FORMAT);
}

export function addCalendarDays(dateStr: string, days: number): string {
  return formatCalendarDate(addDays(parseCalendarDate(dateStr), days));
}

export function formatHuman(dateStr: string, pattern = "d MMMM yyyy"): string {
  return fnsFormat(parseCalendarDate(dateStr), pattern, { locale: ru });
}

export function weekdayLabel(dateStr: string): string {
  return fnsFormat(parseCalendarDate(dateStr), "EEEE", { locale: ru });
}

/**
 * Собирает календарную дату + локальное время + часовой пояс пользователя
 * в конкретный момент времени (UTC ISO), например для дедлайна или
 * времени срабатывания напоминания.
 */
export function combineDateTimeToInstant(
  dateStr: string,
  timeStr: string | null,
  timezone: string,
): Date {
  const time = timeStr ?? "00:00";
  const local = fnsParse(`${dateStr} ${time}`, "yyyy-MM-dd HH:mm", new Date());
  return fromZonedTime(local, timezone);
}

/** Момент времени (ISO/Date) -> календарная дата и время в часовом поясе пользователя. */
export function instantToZoned(instant: string | Date, timezone: string) {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const zoned = toZonedTime(d, timezone);
  return {
    date: fnsFormat(zoned, DATE_FORMAT),
    time: fnsFormat(zoned, "HH:mm"),
  };
}

export function formatInstant(instant: string | Date, timezone: string, pattern = "d MMM, HH:mm"): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return formatInTimeZone(d, timezone, pattern, { locale: ru });
}

export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Разница в минутах между двумя "HH:mm" (endTime - startTime), с переходом через полночь. */
export function minutesBetween(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export const WEEKDAY_SHORT_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function addMonthsToDate(dateStr: string, months: number): string {
  return formatCalendarDate(addMonths(parseCalendarDate(dateStr), months));
}

export function addWeeksToDate(dateStr: string, weeks: number): string {
  return formatCalendarDate(addWeeks(parseCalendarDate(dateStr), weeks));
}

/** Сетка месяца с выравниванием по неделям (для календаря, неделя начинается с понедельника). */
export function monthGrid(dateStr: string): { date: string; inMonth: boolean }[] {
  const anchor = parseCalendarDate(dateStr);
  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((d) => ({
    date: formatCalendarDate(d),
    inMonth: isSameMonth(d, anchor),
  }));
}

export function weekDates(dateStr: string): string[] {
  const anchor = parseCalendarDate(dateStr);
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => formatCalendarDate(addDays(start, i)));
}

export function monthLabel(dateStr: string): string {
  return fnsFormat(parseCalendarDate(dateStr), "LLLL yyyy", { locale: ru });
}
