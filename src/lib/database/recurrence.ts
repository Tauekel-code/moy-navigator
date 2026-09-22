import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/recurrence";
import * as local from "@/lib/local/recurrence";
import type { Action, ActionInput, RescheduleScope } from "@/types/action";
import type { RecurrenceRuleInput } from "@/types/recurrence";

export async function createRecurringAction(
  supabase: SupabaseClient,
  userId: string,
  input: ActionInput,
  recurrence: RecurrenceRuleInput,
): Promise<Action> {
  return isLocalMode() ? local.createRecurringAction(userId, input, recurrence) : cloud.createRecurringAction(supabase, userId, input, recurrence);
}

export async function editRecurringOccurrence(
  supabase: SupabaseClient,
  userId: string,
  masterActionId: string,
  occurrenceDate: string,
  scope: RescheduleScope,
  patch: Parameters<typeof cloud.editRecurringOccurrence>[5],
): Promise<{ targetActionId: string }> {
  return isLocalMode()
    ? local.editRecurringOccurrence(userId, masterActionId, occurrenceDate, scope, patch)
    : cloud.editRecurringOccurrence(supabase, userId, masterActionId, occurrenceDate, scope, patch);
}

export async function cancelOccurrence(supabase: SupabaseClient, userId: string, masterActionId: string, occurrenceDate: string) {
  return isLocalMode() ? local.cancelOccurrence(userId, masterActionId, occurrenceDate) : cloud.cancelOccurrence(supabase, userId, masterActionId, occurrenceDate);
}
