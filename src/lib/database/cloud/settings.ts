import type { SupabaseClient } from "@supabase/supabase-js";
import { mapUserProfile, mapNotificationSettings } from "../mappers";
import type { UserProfile, UserProfileInput } from "@/types/user";
import type { NotificationSettings } from "@/types/notification";

export async function getUserProfile(supabase: SupabaseClient, userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? mapUserProfile(data) : null;
}

export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<UserProfileInput>,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      display_name: patch.displayName,
      timezone: patch.timezone,
      language: patch.language,
      time_format: patch.timeFormat,
      week_start: patch.weekStart,
    })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return mapUserProfile(data);
}

export async function getNotificationSettings(supabase: SupabaseClient, userId: string): Promise<NotificationSettings | null> {
  const { data, error } = await supabase.from("notification_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? mapNotificationSettings(data) : null;
}

export async function updateNotificationSettings(
  supabase: SupabaseClient,
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
  const dbPatch: Record<string, unknown> = {};
  if (patch.inAppEnabled !== undefined) dbPatch.in_app_enabled = patch.inAppEnabled;
  if (patch.telegramEnabled !== undefined) dbPatch.telegram_enabled = patch.telegramEnabled;
  if (patch.morningPlanEnabled !== undefined) dbPatch.morning_plan_enabled = patch.morningPlanEnabled;
  if (patch.morningPlanTime !== undefined) dbPatch.morning_plan_time = patch.morningPlanTime;
  if (patch.eveningReviewEnabled !== undefined) dbPatch.evening_review_enabled = patch.eveningReviewEnabled;
  if (patch.eveningReviewTime !== undefined) dbPatch.evening_review_time = patch.eveningReviewTime;
  if (patch.overdueNotify !== undefined) dbPatch.overdue_notify = patch.overdueNotify;
  if (patch.conflictNotify !== undefined) dbPatch.conflict_notify = patch.conflictNotify;
  if (patch.defaultReminderOffsets !== undefined) dbPatch.default_reminder_offsets = patch.defaultReminderOffsets;

  const { data, error } = await supabase.from("notification_settings").update(dbPatch).eq("user_id", userId).select().single();
  if (error) throw error;
  return mapNotificationSettings(data);
}
