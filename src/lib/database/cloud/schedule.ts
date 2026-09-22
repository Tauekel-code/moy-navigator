import type { SupabaseClient } from "@supabase/supabase-js";
import { updateActionFields, listActionsForRange } from "./actions";
import { editRecurringOccurrence } from "./recurrence";
import { recalculateRemindersForAction } from "./reminders";
import { timeRangesOverlap } from "@/lib/schedule/free-slots";
import type { Action, RescheduleScope } from "@/types/action";

export { computeFreeSlots } from "@/lib/schedule/free-slots";
export { resolvePostponeShortcut, type PostponeShortcut } from "@/lib/schedule/postpone";

export interface RescheduleTarget {
  actionId: string; // "master" id либо "master::occurrenceDate" для виртуального вхождения
  isRecurring: boolean;
}

function parseVirtualId(id: string): { masterId: string; occurrenceDate: string | null } {
  const idx = id.indexOf("::");
  if (idx === -1) return { masterId: id, occurrenceDate: null };
  return { masterId: id.slice(0, idx), occurrenceDate: id.slice(idx + 2) };
}

/** Раздел 20-21, 26: перенос действия (drag&drop / кнопка "Перенести") с пересчётом напоминаний. */
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
  const { masterId, occurrenceDate } = parseVirtualId(actionId);
  const effectiveOccurrenceDate = currentOccurrenceDate ?? occurrenceDate;

  const { data: master, error } = await supabase.from("actions").select("recurrence_rule_id").eq("id", masterId).single();
  if (error) throw error;

  if (master.recurrence_rule_id && effectiveOccurrenceDate) {
    const result = await editRecurringOccurrence(supabase, userId, masterId, effectiveOccurrenceDate, scope, {
      actionDate: newDate,
      startTime: newTime,
    });
    await recalculateRemindersForAction(supabase, result.targetActionId, newDate, newTime, timezone);
    return result;
  }

  await updateActionFields(supabase, masterId, userId, { actionDate: newDate, startTime: newTime }, "rescheduled");
  await recalculateRemindersForAction(supabase, masterId, newDate, newTime, timezone);
  return { targetActionId: masterId };
}

/** Раздел 41 ТЗ: конфликт времени — только предупреждение, не запрет. */
export async function findTimeConflicts(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeActionId?: string,
): Promise<Action[]> {
  const dayActions = await listActionsForRange(supabase, userId, date, date);

  return dayActions.filter((a) => {
    if (a.id === excludeActionId) return false;
    if (!a.startTime || !a.endTime) return false;
    if (a.status === "cancelled") return false;
    return timeRangesOverlap(startTime, endTime, a.startTime, a.endTime);
  });
}

