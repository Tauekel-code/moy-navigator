import { z } from "zod";

export const actionTypeSchema = z.enum(["meeting", "task", "call", "work", "personal", "travel", "reminder", "other"]);
export const actionPrioritySchema = z.enum(["low", "normal", "high", "critical"]);
export const actionStatusSchema = z.enum(["planned", "in_progress", "completed", "overdue", "cancelled"]);

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const quickAddSchema = z.object({
  title: z.string().trim().min(1, "Название обязательно").max(300),
  date: z.string().regex(dateRegex).nullable().optional(),
  time: z.string().regex(timeRegex).nullable().optional(),
});

export const actionInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  type: actionTypeSchema,
  actionDate: z.string().regex(dateRegex).nullable(),
  startTime: z.string().regex(timeRegex).nullable(),
  endTime: z.string().regex(timeRegex).nullable(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  allDay: z.boolean().default(false),
  timezone: z.string().nullable().optional(),
  priority: actionPrioritySchema,
  status: actionStatusSchema,
  deadlineAt: z.string().datetime().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
});

export const actionUpdateSchema = actionInputSchema.partial();

export const recurrenceInputSchema = z.object({
  freq: z.enum(["daily", "weekdays", "weekly", "every_n_days", "monthly", "yearly", "custom"]),
  interval: z.number().int().positive().max(365).default(1),
  byWeekday: z.array(z.number().int().min(0).max(6)).optional(),
  untilDate: z.string().regex(dateRegex).nullable().optional(),
  count: z.number().int().positive().max(999).nullable().optional(),
});

export const rescheduleSchema = z.object({
  newDate: z.string().regex(dateRegex),
  newTime: z.string().regex(timeRegex).nullable(),
  scope: z.enum(["this", "this_and_future", "all"]).default("this"),
  occurrenceDate: z.string().regex(dateRegex).optional(),
});

export const postponeSchema = z.object({
  shortcut: z.enum(["15m", "30m", "1h", "tonight", "tomorrow"]).optional(),
  date: z.string().regex(dateRegex).optional(),
  time: z.string().regex(timeRegex).nullable().optional(),
  scope: z.enum(["this", "this_and_future", "all"]).default("this"),
  occurrenceDate: z.string().regex(dateRegex).optional(),
});

export const contextInputSchema = z.object({
  whyText: z.string().max(2000).nullable().optional(),
  goalText: z.string().max(2000).nullable().optional(),
  dontForgetText: z.string().max(2000).nullable().optional(),
  mainArgument: z.string().max(2000).nullable().optional(),
  questionsText: z.string().max(2000).nullable().optional(),
  preparationText: z.string().max(2000).nullable().optional(),
  nextStep: z.string().max(2000).nullable().optional(),
  links: z.array(z.string().max(500)).optional(),
});

export const resultInputSchema = z.object({
  resultText: z.string().trim().min(1).max(4000),
});

export const reminderInputSchema = z.object({
  offsetUnit: z.enum(["minutes", "hours", "days", "weeks", "months", "absolute"]),
  offsetValue: z.number().int().positive().nullable(),
  absoluteAt: z.string().datetime().nullable().optional(),
});

export const projectInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["active", "completed", "archived"]).default("active"),
  color: z.string().max(20).default("#6366f1"),
  icon: z.string().max(50).nullable().optional(),
});

export const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().max(200).nullable().optional().or(z.literal("")),
  company: z.string().max(200).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export const dailyReviewNotesSchema = z.object({
  mainResult: z.string().max(2000).nullable().optional(),
  whatFailed: z.string().max(2000).nullable().optional(),
  importantTomorrow: z.string().max(2000).nullable().optional(),
  personalNote: z.string().max(2000).nullable().optional(),
});

export const userProfileSchema = z.object({
  displayName: z.string().max(200).nullable().optional(),
  timezone: z.string().max(100).optional(),
  language: z.enum(["ru", "kk", "en"]).optional(),
  timeFormat: z.enum(["12", "24"]).optional(),
  weekStart: z.number().int().min(0).max(6).optional(),
});

export const notificationSettingsSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  telegramEnabled: z.boolean().optional(),
  morningPlanEnabled: z.boolean().optional(),
  morningPlanTime: z.string().regex(timeRegex).optional(),
  eveningReviewEnabled: z.boolean().optional(),
  eveningReviewTime: z.string().regex(timeRegex).optional(),
  overdueNotify: z.boolean().optional(),
  conflictNotify: z.boolean().optional(),
  defaultReminderOffsets: z.array(z.object({ unit: z.string(), value: z.number() })).optional(),
});
