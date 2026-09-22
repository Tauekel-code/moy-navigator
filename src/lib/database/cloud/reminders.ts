import type { SupabaseClient } from "@supabase/supabase-js";
import { mapReminder } from "../mappers";
import { computeReminderTriggerAt } from "@/lib/reminders/compute";
import type { Reminder, ReminderInput } from "@/types/reminder";

export async function listRemindersForAction(supabase: SupabaseClient, actionId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("action_id", actionId)
    .order("trigger_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapReminder);
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
  const triggerAt = computeReminderTriggerAt(input, actionDate, actionTime, timezone);

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      action_id: actionId,
      user_id: userId,
      offset_unit: input.offsetUnit,
      offset_value: input.offsetValue,
      trigger_at: triggerAt.toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapReminder(data);
}

export async function removeReminder(supabase: SupabaseClient, reminderId: string): Promise<void> {
  const { error } = await supabase.from("reminders").delete().eq("id", reminderId);
  if (error) throw error;
}

export interface DueReminder {
  reminderId: string;
  actionId: string;
  actionTitle: string;
  actionDate: string | null;
  startTime: string | null;
}

/**
 * Раздел 48 ТЗ: клиентский опрос "созревших" напоминаний, пока вкладка
 * открыта — работает поверх обычного клиента (RLS разрешает читать и
 * обновлять только свои строки), дополняет cron для случаев, когда он
 * недоступен (например, бесплатный план Vercel — раз в сутки).
 */
export async function checkDueReminders(supabase: SupabaseClient, userId: string): Promise<DueReminder[]> {
  const now = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("reminders")
    .select("id, action_id, trigger_at, action:actions(title, action_date, start_time, status, is_archived)")
    .eq("user_id", userId)
    .eq("is_sent", false)
    .lte("trigger_at", now);
  if (error) throw error;

  const result: DueReminder[] = [];

  for (const row of due ?? []) {
    const action = (row as unknown as { action: { title: string; action_date: string | null; start_time: string | null; status: string; is_archived: boolean } | null }).action;
    if (!action || action.status === "cancelled" || action.is_archived) {
      await supabase.from("reminders").update({ is_sent: true, sent_at: now }).eq("id", row.id);
      continue;
    }

    await supabase.from("reminders").update({ is_sent: true, sent_at: now }).eq("id", row.id);
    await supabase.from("notifications_log").insert({
      user_id: userId,
      action_id: row.action_id,
      reminder_id: row.id,
      notification_type: "reminder",
      channel: "in_app",
      payload: { title: action.title },
    });

    result.push({ reminderId: row.id, actionId: row.action_id, actionTitle: action.title, actionDate: action.action_date, startTime: action.start_time });
  }

  return result;
}

/**
 * Раздел 26 ТЗ: при переносе действия относительные напоминания
 * автоматически пересчитываются на основе того же смещения.
 */
export async function recalculateRemindersForAction(
  supabase: SupabaseClient,
  actionId: string,
  newDate: string | null,
  newTime: string | null,
  timezone: string,
): Promise<void> {
  const { data: reminders, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("action_id", actionId)
    .eq("is_sent", false);
  if (error) throw error;

  for (const reminder of reminders ?? []) {
    if (reminder.offset_unit === "absolute") continue; // не трогаем осознанно заданное время
    if (!newDate) continue;

    const triggerAt = computeReminderTriggerAt(
      { offsetUnit: reminder.offset_unit, offsetValue: reminder.offset_value },
      newDate,
      newTime,
      timezone,
    );

    await supabase.from("reminders").update({ trigger_at: triggerAt.toISOString() }).eq("id", reminder.id);
  }
}
