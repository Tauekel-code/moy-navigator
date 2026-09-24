import type { SupabaseClient } from "@supabase/supabase-js";

/** Общий журналист истории для goal_history/idea_history — то же самое, что lib/history/log.ts делает для action_history. */
export async function logGenericHistory(
  supabase: SupabaseClient,
  table: "goal_history" | "idea_history",
  idColumn: "goal_id" | "idea_id",
  params: { id: string; userId: string; eventType: string; oldValue?: unknown; newValue?: unknown },
) {
  const { error } = await supabase.from(table).insert({
    [idColumn]: params.id,
    user_id: params.userId,
    event_type: params.eventType,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
  });
  if (error) throw error;
}
