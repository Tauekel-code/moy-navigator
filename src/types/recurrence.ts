export type RecurrenceFreq =
  | "daily"
  | "weekdays"
  | "weekly"
  | "every_n_days"
  | "monthly"
  | "yearly"
  | "custom";

export const RECURRENCE_FREQ_LABELS: Record<RecurrenceFreq, string> = {
  daily: "Каждый день",
  weekdays: "По будням",
  weekly: "Каждую неделю",
  every_n_days: "Каждые N дней",
  monthly: "Каждый месяц",
  yearly: "Ежегодно",
  custom: "Пользовательский вариант",
};

export interface RecurrenceRule {
  id: string;
  userId: string;
  freq: RecurrenceFreq;
  interval: number;
  rruleString: string;
  dtstart: string; // YYYY-MM-DD
  dtstartTime: string | null; // HH:mm
  untilDate: string | null;
  count: number | null;
  createdAt: string;
}

export interface RecurrenceRuleInput {
  freq: RecurrenceFreq;
  interval: number;
  byWeekday?: number[]; // 0=Mon..6=Sun (ISO), используется для weekly/custom
  untilDate?: string | null;
  count?: number | null;
}

export interface OccurrenceException {
  id: string;
  actionId: string;
  originalDate: string;
  isCancelled: boolean;
  override: Partial<{
    title: string;
    startTime: string | null;
    endTime: string | null;
    priority: string;
    status: string;
  }> | null;
  createdAt: string;
}
