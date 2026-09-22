import "server-only";
import { getLocalDb } from "./db";
import { updateActionFields, listActionsForRange } from "./actions";
import { editRecurringOccurrence } from "./recurrence";
import { recalculateRemindersForAction } from "./reminders";
import { timeRangesOverlap } from "@/lib/schedule/free-slots";
import type { Action, RescheduleScope } from "@/types/action";

function parseVirtualId(id: string): { masterId: string; occurrenceDate: string | null } {
  const idx = id.indexOf("::");
  if (idx === -1) return { masterId: id, occurrenceDate: null };
  return { masterId: id.slice(0, idx), occurrenceDate: id.slice(idx + 2) };
}

export async function rescheduleAction(
  userId: string,
  actionId: string,
  newDate: string,
  newTime: string | null,
  timezone: string,
  scope: RescheduleScope = "this",
  currentOccurrenceDate?: string,
): Promise<{ targetActionId: string }> {
  const db = getLocalDb();
  const { masterId, occurrenceDate } = parseVirtualId(actionId);
  const effectiveOccurrenceDate = currentOccurrenceDate ?? occurrenceDate;

  const master = db.prepare("select recurrence_rule_id from actions where id = ?").get(masterId) as { recurrence_rule_id: string | null };

  if (master.recurrence_rule_id && effectiveOccurrenceDate) {
    const result = await editRecurringOccurrence(userId, masterId, effectiveOccurrenceDate, scope, { actionDate: newDate, startTime: newTime });
    await recalculateRemindersForAction(result.targetActionId, newDate, newTime, timezone);
    return result;
  }

  await updateActionFields(masterId, userId, { actionDate: newDate, startTime: newTime }, "rescheduled");
  await recalculateRemindersForAction(masterId, newDate, newTime, timezone);
  return { targetActionId: masterId };
}

export async function findTimeConflicts(
  userId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeActionId?: string,
): Promise<Action[]> {
  const dayActions = await listActionsForRange(userId, date, date);

  return dayActions.filter((a) => {
    if (a.id === excludeActionId) return false;
    if (!a.startTime || !a.endTime) return false;
    if (a.status === "cancelled") return false;
    return timeRangesOverlap(startTime, endTime, a.startTime, a.endTime);
  });
}
