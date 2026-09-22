import { RRule, Weekday } from "rrule";
import { parseCalendarDate, formatCalendarDate } from "@/lib/dates";
import type { RecurrenceFreq, RecurrenceRule, RecurrenceRuleInput } from "@/types/recurrence";

const ISO_WEEKDAYS = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU];

function freqToRRule(freq: RecurrenceFreq): number {
  switch (freq) {
    case "daily":
    case "weekdays":
    case "every_n_days":
      return RRule.DAILY;
    case "weekly":
    case "custom":
      return RRule.WEEKLY;
    case "monthly":
      return RRule.MONTHLY;
    case "yearly":
      return RRule.YEARLY;
  }
}

/** Строит RFC5545 RRULE-строку (без DTSTART) из пользовательского ввода. */
export function buildRRuleString(input: RecurrenceRuleInput): string {
  const options: ConstructorParameters<typeof RRule>[0] = {
    freq: freqToRRule(input.freq),
    interval: input.freq === "weekdays" ? 1 : Math.max(1, input.interval || 1),
  };

  if (input.freq === "weekdays") {
    options.byweekday = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];
  } else if (input.byWeekday && input.byWeekday.length > 0) {
    options.byweekday = input.byWeekday.map((d) => ISO_WEEKDAYS[d] as Weekday);
  }

  if (input.untilDate) {
    options.until = parseCalendarDate(input.untilDate);
  }
  if (input.count) {
    options.count = input.count;
  }

  const rule = new RRule(options);
  // RRule.toString() включает "RRULE:" префикс — оставляем только правило
  return rule.toString().replace(/^RRULE:/, "");
}

export function describeRecurrence(rule: Pick<RecurrenceRule, "freq" | "interval">): string {
  switch (rule.freq) {
    case "daily":
      return rule.interval > 1 ? `Каждые ${rule.interval} дн.` : "Каждый день";
    case "weekdays":
      return "По будням";
    case "weekly":
      return rule.interval > 1 ? `Каждые ${rule.interval} нед.` : "Каждую неделю";
    case "every_n_days":
      return `Каждые ${rule.interval} дн.`;
    case "monthly":
      return rule.interval > 1 ? `Каждые ${rule.interval} мес.` : "Каждый месяц";
    case "yearly":
      return "Ежегодно";
    case "custom":
      return "Пользовательское повторение";
  }
}

/**
 * Разворачивает правило повторения в конкретные календарные даты в
 * пределах [rangeStart, rangeEnd] (включительно), учитывая dtstart.
 * Не создаёт записей в БД — используется на лету для календаря/таймлайна
 * и для планирования следующих напоминаний.
 */
export function expandOccurrences(
  rule: Pick<RecurrenceRule, "rruleString" | "dtstart">,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const dtstart = parseCalendarDate(rule.dtstart);
  const rr = RRule.fromString(`DTSTART:${formatCalendarDate(dtstart).replace(/-/g, "")}\nRRULE:${rule.rruleString}`);

  const start = parseCalendarDate(rangeStart);
  const end = parseCalendarDate(rangeEnd);
  end.setHours(23, 59, 59, 999);

  return rr.between(start, end, true).map((d) => formatCalendarDate(d));
}

/** Ближайшее вхождение начиная с заданной даты (включительно). */
export function nextOccurrenceOnOrAfter(
  rule: Pick<RecurrenceRule, "rruleString" | "dtstart">,
  fromDate: string,
): string | null {
  const results = expandOccurrences(rule, fromDate, formatCalendarDate(new Date(parseCalendarDate(fromDate).getTime() + 366 * 24 * 3600 * 1000)));
  return results[0] ?? null;
}
