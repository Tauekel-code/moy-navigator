import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAction } from "../mappers";
import type { Action } from "@/types/action";

/** Раздел 43: связанные действия (не зависимость, просто цепочка). */
export async function listRelatedActions(supabase: SupabaseClient, actionId: string): Promise<Action[]> {
  const { data, error } = await supabase
    .from("related_actions")
    .select("relation_order, related:actions!related_actions_related_action_id_fkey(*)")
    .eq("action_id", actionId)
    .order("relation_order", { ascending: true });
  if (error) throw error;

  return (data ?? [])
    .map((row) => (row as unknown as { related: Record<string, unknown> }).related)
    .filter(Boolean)
    .map(mapAction);
}

export async function linkRelatedAction(
  supabase: SupabaseClient,
  actionId: string,
  relatedActionId: string,
  order = 0,
): Promise<void> {
  const { error } = await supabase
    .from("related_actions")
    .insert({ action_id: actionId, related_action_id: relatedActionId, relation_order: order });
  if (error) throw error;
}

export async function unlinkRelatedAction(supabase: SupabaseClient, actionId: string, relatedActionId: string): Promise<void> {
  const { error } = await supabase
    .from("related_actions")
    .delete()
    .eq("action_id", actionId)
    .eq("related_action_id", relatedActionId);
  if (error) throw error;
}
