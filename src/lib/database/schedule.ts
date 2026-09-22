import type { SupabaseClient } from "@supabase/supabase-js";
import { updateActionFields, listActionsForRange } from "./actions";
import { editRecurringOccurrence } from "./recurrence";
import { recalculateRemindersForAction } from "./reminders";
import { addCalendarDays } from "@/lib/dates";
import { timeRangesOverlap } from "@/lib/schedule/free-slots";
import type { Action, RescheduleScope } from "@/types/action";

export { computeFreeSlots } from "@/lib/schedule/free-slots";

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

export type PostponeShortcut = "15m" | "30m" | "1h" | "tonight" | "tomorrow";

export function resolvePostponeShortcut(
  shortcut: PostponeShortcut,
  currentDate: string,
  currentTime: string | null,
): { date: string; time: string | null } {
  const now = new Date();
  switch (shortcut) {
    case "15m":
    case "30m":
    case "1h": {
      const minutes = shortcut === "15m" ? 15 : shortcut === "30m" ? 30 : 60;
      const base = currentTime
        ? new Date(`${currentDate}T${currentTime}:00`)
        : now;
      const shifted = new Date(base.getTime() + minutes * 60_000);
      const hh = String(shifted.getHours()).padStart(2, "0");
      const mm = String(shifted.getMinutes()).padStart(2, "0");
      return { date: currentDate, time: `${hh}:${mm}` };
    }
    case "tonight":
      return { date: currentDate, time: "19:00" };
    case "tomorrow":
      return { date: addCalendarDays(currentDate, 1), time: currentTime };
  }
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

