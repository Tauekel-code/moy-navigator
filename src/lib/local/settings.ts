import "server-only";
import { getLocalDb, nowIso, type SqlValue } from "./db";
import { mapUserProfile, mapNotificationSettings } from "@/lib/database/mappers";
import type { UserProfile, UserProfileInput } from "@/types/user";
import type { NotificationSettings } from "@/types/notification";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = getLocalDb();
  const row = db.prepare("select * from user_profiles where id = ?").get(userId) as Row | undefined;
  return row ? mapUserProfile(row) : null;
}

export async function updateUserProfile(userId: string, patch: Partial<UserProfileInput>): Promise<UserProfile> {
  const db = getLocalDb();
  const now = nowIso();

  const fields: string[] = ["updated_at = ?"];
  const values: SqlValue[] = [now];
  const set = (col: string, val: SqlValue) => {
    fields.push(`${col} = ?`);
    values.push(val);
  };

  if (patch.displayName !== undefined) set("display_name", patch.displayName);
  if (patch.timezone !== undefined) set("timezone", patch.timezone);
  if (patch.language !== undefined) set("language", patch.language);
  if (patch.timeFormat !== undefined) set("time_format", patch.timeFormat);
  if (patch.weekStart !== undefined) set("week_start", patch.weekStart);

  db.prepare(`update user_profiles set ${fields.join(", ")} where id = ?`).run(...values, userId);

  const row = db.prepare("select * from user_profiles where id = ?").get(userId) as Row;
  return mapUserProfile(row);
}

export async function getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  const db = getLocalDb();
  const row = db.prepare("select * from notification_settings where user_id = ?").get(userId) as Row | undefined;
  return row ? mapNotificationSettings({ ...row, default_reminder_offsets: JSON.parse(row.default_reminder_offsets ?? "[]") }) : null;
}

export async function updateNotificationSettings(
  userId: string,
  patch: Partial<{
    inAppEnabled: boolean;
    telegramEnabled: boolean;
    morningPlanEnabled: boolean;
    morningPlanTime: string;
    eveningReviewEnabled: boolean;
    eveningReviewTime: string;
    overdueNotify: boolean;
    conflictNotify: boolean;
    defaultReminderOffsets: { unit: string; value: number }[];
  }>,
): Promise<NotificationSettings> {
  const db = getLocalDb();
  const now = nowIso();

  const fields: string[] = ["updated_at = ?"];
  const values: SqlValue[] = [now];
  const set = (col: string, val: SqlValue) => {
    fields.push(`${col} = ?`);
    values.push(val);
  };

  if (patch.inAppEnabled !== undefined) set("in_app_enabled", patch.inAppEnabled ? 1 : 0);
  if (patch.telegramEnabled !== undefined) set("telegram_enabled", patch.telegramEnabled ? 1 : 0);
  if (patch.morningPlanEnabled !== undefined) set("morning_plan_enabled", patch.morningPlanEnabled ? 1 : 0);
  if (patch.morningPlanTime !== undefined) set("morning_plan_time", patch.morningPlanTime);
  if (patch.eveningReviewEnabled !== undefined) set("evening_review_enabled", patch.eveningReviewEnabled ? 1 : 0);
  if (patch.eveningReviewTime !== undefined) set("evening_review_time", patch.eveningReviewTime);
  if (patch.overdueNotify !== undefined) set("overdue_notify", patch.overdueNotify ? 1 : 0);
  if (patch.conflictNotify !== undefined) set("conflict_notify", patch.conflictNotify ? 1 : 0);
  if (patch.defaultReminderOffsets !== undefined) set("default_reminder_offsets", JSON.stringify(patch.defaultReminderOffsets));

  db.prepare(`update notification_settings set ${fields.join(", ")} where user_id = ?`).run(...values, userId);

  const row = db.prepare("select * from notification_settings where user_id = ?").get(userId) as Row;
  return mapNotificationSettings({ ...row, default_reminder_offsets: JSON.parse(row.default_reminder_offsets ?? "[]") });
}
