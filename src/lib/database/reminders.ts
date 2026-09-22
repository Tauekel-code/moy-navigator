import type { SupabaseClient } from "@supabase/supabase-js";
import { mapReminder } from "./mappers";
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
