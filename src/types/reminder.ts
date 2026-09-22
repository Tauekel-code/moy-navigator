export type ReminderOffsetUnit = "minutes" | "hours" | "days" | "weeks" | "months" | "absolute";

export interface ReminderPreset {
  unit: ReminderOffsetUnit;
  value: number | null;
  label: string;
}

export const REMINDER_PRESETS: ReminderPreset[] = [
  { unit: "minutes", value: 5, label: "За 5 минут" },
  { unit: "minutes", value: 15, label: "За 15 минут" },
  { unit: "minutes", value: 30, label: "За 30 минут" },
  { unit: "hours", value: 1, label: "За 1 час" },
  { unit: "hours", value: 2, label: "За 2 часа" },
  { unit: "days", value: 1, label: "За 1 день" },
  { unit: "days", value: 2, label: "За 2 дня" },
  { unit: "weeks", value: 1, label: "За 1 неделю" },
  { unit: "months", value: 1, label: "За 1 месяц" },
];

export interface Reminder {
  id: string;
  actionId: string;
  userId: string;
  offsetUnit: ReminderOffsetUnit;
  offsetValue: number | null;
  triggerAt: string; // ISO timestamp
  isSent: boolean;
  sentAt: string | null;
  createdAt: string;
}

export interface ReminderInput {
  offsetUnit: ReminderOffsetUnit;
  offsetValue: number | null;
  absoluteAt?: string | null; // для offsetUnit === 'absolute'
}
