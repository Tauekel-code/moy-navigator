import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/schedule";
import * as local from "@/lib/local/schedule";
import type { Action, RescheduleScope } from "@/types/action";

export { computeFreeSlots } from "@/lib/schedule/free-slots";
export { resolvePostponeShortcut, type PostponeShortcut } from "@/lib/schedule/postpone";

export async function rescheduleAction(
  supabase: SupabaseClient,
  userId: string,
  actionId: string,
  newDate: string,
  newTime: string | null,
  timezone: string,
  scope: RescheduleScope = "this",
  currentOccurrenceDate?: string,
): Promise<{ targetActionId: string }> {
  return isLocalMode()
    ? local.rescheduleAction(userId, actionId, newDate, newTime, timezone, scope, currentOccurrenceDate)
    : cloud.rescheduleAction(supabase, userId, actionId, newDate, newTime, timezone, scope, currentOccurrenceDate);
}

export async function findTimeConflicts(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeActionId?: string,
): Promise<Action[]> {
  return isLocalMode()
    ? local.findTimeConflicts(userId, date, startTime, endTime, excludeActionId)
    : cloud.findTimeConflicts(supabase, userId, date, startTime, endTime, excludeActionId);
}
