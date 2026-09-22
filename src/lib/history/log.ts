import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionEventType } from "@/types/history";

/**
 * Раздел 31-32 ТЗ: история сохраняется постоянно и не удаляется при
 * редактировании. Каждая мутация действия обязана явно вызвать этот
 * помощник — сознательно НЕ реализовано через БД-триггер, чтобы
 * event_type отражал бизнес-смысл изменения (rescheduled/status_changed/...),
 * а не просто факт UPDATE.
 */
export async function logActionHistory(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string;
    eventType: ActionEventType;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
  },
) {
  const { error } = await supabase.from("action_history").insert({
    action_id: params.actionId,
    user_id: params.userId,
    event_type: params.eventType,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
  });

  if (error) throw error;
}
