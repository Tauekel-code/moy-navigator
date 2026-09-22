import type { Action, ActionContext, ActionResult } from "@/types/action";
import type { Project } from "@/types/project";
import type { Contact } from "@/types/contact";
import type { Reminder } from "@/types/reminder";
import type { RecurrenceRule, OccurrenceException } from "@/types/recurrence";
import type { DailyReview } from "@/types/review";
import type { ActionHistoryEntry } from "@/types/history";
import type { NotificationSettings, TelegramConnection } from "@/types/notification";
import type { UserProfile } from "@/types/user";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export function mapAction(row: Row): Action {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    type: row.type,
    actionDate: row.action_date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    allDay: row.all_day,
    timezone: row.timezone,
    priority: row.priority,
    status: row.status,
    deadlineAt: row.deadline_at,
    recurrenceRuleId: row.recurrence_rule_id,
    seriesRootId: row.series_root_id,
    isArchived: row.is_archived,
    archivedAt: row.archived_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    projectId: row.project_id ?? undefined,
    projectName: row.project_name ?? undefined,
    projectColor: row.project_color ?? undefined,
    contactId: row.contact_id ?? undefined,
    contactName: row.contact_name ?? undefined,
    hasContext: row.has_context ?? undefined,
    hasResult: row.has_result ?? undefined,
    reminderCount: row.reminder_count ?? undefined,
    isRecurring: !!row.recurrence_rule_id,
  };
}

export function mapActionContext(row: Row): ActionContext {
  return {
    actionId: row.action_id,
    whyText: row.why_text,
    goalText: row.goal_text,
    dontForgetText: row.dont_forget_text,
    mainArgument: row.main_argument,
    questionsText: row.questions_text,
    preparationText: row.preparation_text,
    nextStep: row.next_step,
    links: row.links ?? [],
    updatedAt: row.updated_at,
  };
}

export function mapActionResult(row: Row): ActionResult {
  return {
    actionId: row.action_id,
    resultText: row.result_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProject(row: Row): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    status: row.status,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
    actionsCount: row.actions_count ?? undefined,
  };
}

export function mapContact(row: Row): Contact {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    company: row.company,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    actionsCount: row.actions_count ?? undefined,
  };
}

export function mapReminder(row: Row): Reminder {
  return {
    id: row.id,
    actionId: row.action_id,
    userId: row.user_id,
    offsetUnit: row.offset_unit,
    offsetValue: row.offset_value,
    triggerAt: row.trigger_at,
    isSent: row.is_sent,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

export function mapRecurrenceRule(row: Row): RecurrenceRule {
  return {
    id: row.id,
    userId: row.user_id,
    freq: row.freq,
    interval: row.interval,
    rruleString: row.rrule_string,
    dtstart: row.dtstart,
    dtstartTime: row.dtstart_time,
    untilDate: row.until_date,
    count: row.count,
    createdAt: row.created_at,
  };
}

export function mapOccurrenceException(row: Row): OccurrenceException {
  return {
    id: row.id,
    actionId: row.action_id,
    originalDate: row.original_date,
    isCancelled: row.is_cancelled,
    override: row.override,
    createdAt: row.created_at,
  };
}

export function mapDailyReview(row: Row): DailyReview {
  return {
    id: row.id,
    userId: row.user_id,
    reviewDate: row.review_date,
    plannedCount: row.planned_count,
    completedCount: row.completed_count,
    postponedCount: row.postponed_count,
    cancelledCount: row.cancelled_count,
    overdueCount: row.overdue_count,
    inProgressCount: row.in_progress_count,
    mainResult: row.main_result,
    whatFailed: row.what_failed,
    importantTomorrow: row.important_tomorrow,
    personalNote: row.personal_note,
    sentToTelegramAt: row.sent_to_telegram_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapHistoryEntry(row: Row): ActionHistoryEntry {
  return {
    id: row.id,
    actionId: row.action_id,
    userId: row.user_id,
    eventType: row.event_type,
    oldValue: row.old_value,
    newValue: row.new_value,
    createdAt: row.created_at,
    actionTitle: row.action_title ?? undefined,
  };
}

export function mapNotificationSettings(row: Row): NotificationSettings {
  return {
    userId: row.user_id,
    inAppEnabled: row.in_app_enabled,
    telegramEnabled: row.telegram_enabled,
    morningPlanEnabled: row.morning_plan_enabled,
    morningPlanTime: row.morning_plan_time,
    eveningReviewEnabled: row.evening_review_enabled,
    eveningReviewTime: row.evening_review_time,
    overdueNotify: row.overdue_notify,
    conflictNotify: row.conflict_notify,
    defaultReminderOffsets: row.default_reminder_offsets ?? [],
    updatedAt: row.updated_at,
  };
}

export function mapTelegramConnection(row: Row): TelegramConnection {
  return {
    userId: row.user_id,
    telegramChatId: row.telegram_chat_id,
    telegramUsername: row.telegram_username,
    connectCode: row.connect_code,
    connectCodeExpiresAt: row.connect_code_expires_at,
    status: row.status,
    connectedAt: row.connected_at,
  };
}

export function mapUserProfile(row: Row): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    timezone: row.timezone,
    language: row.language,
    timeFormat: row.time_format,
    weekStart: row.week_start,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
