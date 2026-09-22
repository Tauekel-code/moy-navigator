import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/reminders";
import * as local from "@/lib/local/reminders";
import type { Reminder, ReminderInput } from "@/types/reminder";

export type { DueReminder } from "./cloud/reminders";

export async function listRemindersForAction(supabase: SupabaseClient, actionId: string): Promise<Reminder[]> {
  return isLocalMode() ? local.listRemindersForAction(actionId) : cloud.listRemindersForAction(supabase, actionId);
}

export async function addReminder(
  supabase: SupabaseClient,
  userId: string,
  actionId: string,
  input: ReminderInput,
  actionDate: string | null,
  actionTime: string | null,
  timezone: string,
): Promise<Reminder> {
  return isLocalMode()
    ? local.addReminder(userId, actionId, input, actionDate, actionTime, timezone)
    : cloud.addReminder(supabase, userId, actionId, input, actionDate, actionTime, timezone);
}

export async function removeReminder(supabase: SupabaseClient, reminderId: string): Promise<void> {
  return isLocalMode() ? local.removeReminder(reminderId) : cloud.removeReminder(supabase, reminderId);
}

export async function recalculateRemindersForAction(
  supabase: SupabaseClient,
  actionId: string,
  newDate: string | null,
  newTime: string | null,
  timezone: string,
): Promise<void> {
  return isLocalMode()
    ? local.recalculateRemindersForAction(actionId, newDate, newTime, timezone)
    : cloud.recalculateRemindersForAction(supabase, actionId, newDate, newTime, timezone);
}

export async function checkDueReminders(supabase: SupabaseClient, userId: string) {
  return isLocalMode() ? local.checkDueReminders(userId) : cloud.checkDueReminders(supabase, userId);
}
