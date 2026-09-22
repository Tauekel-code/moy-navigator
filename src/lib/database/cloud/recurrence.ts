import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAction, mapRecurrenceRule } from "../mappers";
import { logActionHistory } from "@/lib/history/log";
import { buildRRuleString } from "@/lib/recurrence/rrule";
import { addCalendarDays, minutesBetween } from "@/lib/dates";
import type { Action, ActionInput, RescheduleScope } from "@/types/action";
import type { RecurrenceRuleInput } from "@/types/recurrence";

/** Раздел 21-22: создание действия с правилом повторения. */
export async function createRecurringAction(
  supabase: SupabaseClient,
  userId: string,
  input: ActionInput,
  recurrence: RecurrenceRuleInput,
): Promise<Action> {
  if (!input.actionDate) throw new Error("Повторяющееся действие обязано иметь дату первого вхождения");

  const rruleString = buildRRuleString(recurrence);

  const { data: ruleRow, error: ruleErr } = await supabase
    .from("recurrence_rules")
    .insert({
      user_id: userId,
      freq: recurrence.freq,
      interval: recurrence.interval,
      rrule_string: rruleString,
      dtstart: input.actionDate,
      dtstart_time: input.startTime,
      until_date: recurrence.untilDate ?? null,
      count: recurrence.count ?? null,
    })
    .select()
    .single();
  if (ruleErr) throw ruleErr;

  const duration = input.startTime && input.endTime ? minutesBetween(input.startTime, input.endTime) : input.durationMinutes;

  const { data, error } = await supabase
    .from("actions")
    .insert({
      user_id: userId,
      title: input.title,
      type: input.type,
      action_date: input.actionDate,
      start_time: input.startTime,
      end_time: input.endTime,
      duration_minutes: duration,
      all_day: input.allDay,
      timezone: input.timezone,
      priority: input.priority,
      status: input.status,
      deadline_at: input.deadlineAt,
      recurrence_rule_id: ruleRow.id,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.projectId) {
    await supabase.from("action_projects").insert({ action_id: data.id, project_id: input.projectId, is_primary: true });
  }
  if (input.contactId) {
    await supabase.from("action_contacts").insert({ action_id: data.id, contact_id: input.contactId, is_primary: true });
  }

  await logActionHistory(supabase, {
    actionId: data.id,
    userId,
    eventType: "created",
    newValue: { title: input.title, recurrence: rruleString },
  });

  return mapAction(data);
}

interface OccurrencePatch {
  title?: string;
  actionDate?: string;
  startTime?: string | null;
  endTime?: string | null;
  priority?: Action["priority"];
  status?: Action["status"];
}

/**
 * Раздел 21: изменение повторяющегося действия с выбором области:
 * "только это" / "это и будущие" / "вся серия".
 * masterActionId — id родительского действия серии (не виртуальный id вхождения).
 * occurrenceDate — конкретная дата вхождения, которую редактирует пользователь.
 */
export async function editRecurringOccurrence(
  supabase: SupabaseClient,
  userId: string,
  masterActionId: string,
  occurrenceDate: string,
  scope: RescheduleScope,
  patch: OccurrencePatch,
): Promise<{ targetActionId: string }> {
  const { data: master, error: masterErr } = await supabase.from("actions").select("*").eq("id", masterActionId).single();
  if (masterErr) throw masterErr;

  if (scope === "all" || (scope === "this_and_future" && occurrenceDate === master.action_date)) {
    const dbPatch: Record<string, unknown> = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.startTime !== undefined) dbPatch.start_time = patch.startTime;
    if (patch.endTime !== undefined) dbPatch.end_time = patch.endTime;
    if (patch.priority !== undefined) dbPatch.priority = patch.priority;
    if (patch.status !== undefined) dbPatch.status = patch.status;

    const { error } = await supabase.from("actions").update(dbPatch).eq("id", masterActionId);
    if (error) throw error;

    await logActionHistory(supabase, {
      actionId: masterActionId,
      userId,
      eventType: "updated",
      oldValue: master,
      newValue: dbPatch,
    });

    return { targetActionId: masterActionId };
  }

  if (scope === "this") {
    const { error } = await supabase.from("action_occurrence_exceptions").upsert(
      {
        action_id: masterActionId,
        original_date: occurrenceDate,
        is_cancelled: false,
        override: {
          title: patch.title,
          startTime: patch.startTime,
          endTime: patch.endTime,
          priority: patch.priority,
          status: patch.status,
        },
      },
      { onConflict: "action_id,original_date" },
    );
    if (error) throw error;

    await logActionHistory(supabase, {
      actionId: masterActionId,
      userId,
      eventType: patch.actionDate ? "rescheduled" : "updated",
      newValue: { occurrenceDate, ...patch },
    });

    return { targetActionId: masterActionId };
  }

  // this_and_future: обрезаем старую серию и создаём новую, начиная с occurrenceDate
  const dayBefore = addCalendarDays(occurrenceDate, -1);

  const { data: oldRule, error: oldRuleErr } = await supabase
    .from("recurrence_rules")
    .select("*")
    .eq("id", master.recurrence_rule_id)
    .single();
  if (oldRuleErr) throw oldRuleErr;

  await supabase.from("recurrence_rules").update({ until_date: dayBefore }).eq("id", oldRule.id);

  const { data: newRule, error: newRuleErr } = await supabase
    .from("recurrence_rules")
    .insert({
      user_id: userId,
      freq: oldRule.freq,
      interval: oldRule.interval,
      rrule_string: oldRule.rrule_string,
      dtstart: occurrenceDate,
      dtstart_time: patch.startTime !== undefined ? patch.startTime : oldRule.dtstart_time,
      until_date: oldRule.until_date,
      count: null, // count не переносится на новую ветку — точный перерасчёт "осталось N повторений" вынесен за рамки v1
    })
    .select()
    .single();
  if (newRuleErr) throw newRuleErr;

  const newAction = {
    user_id: userId,
    title: patch.title ?? master.title,
    type: master.type,
    action_date: occurrenceDate,
    start_time: patch.startTime !== undefined ? patch.startTime : master.start_time,
    end_time: patch.endTime !== undefined ? patch.endTime : master.end_time,
    duration_minutes: master.duration_minutes,
    all_day: master.all_day,
    timezone: master.timezone,
    priority: patch.priority ?? master.priority,
    status: patch.status ?? "planned",
    deadline_at: null,
    recurrence_rule_id: newRule.id,
    series_root_id: master.series_root_id ?? master.id,
  };

  const { data: created, error: createErr } = await supabase.from("actions").insert(newAction).select().single();
  if (createErr) throw createErr;

  // переносим связи с проектом/контактом на новую ветку серии
  const { data: projLinks } = await supabase.from("action_projects").select("*").eq("action_id", masterActionId);
  for (const link of projLinks ?? []) {
    await supabase.from("action_projects").insert({ action_id: created.id, project_id: link.project_id, is_primary: link.is_primary });
  }
  const { data: contactLinks } = await supabase.from("action_contacts").select("*").eq("action_id", masterActionId);
  for (const link of contactLinks ?? []) {
    await supabase.from("action_contacts").insert({ action_id: created.id, contact_id: link.contact_id, is_primary: link.is_primary });
  }

  await logActionHistory(supabase, {
    actionId: created.id,
    userId,
    eventType: "created",
    newValue: { splitFrom: masterActionId, occurrenceDate },
  });

  return { targetActionId: created.id };
}

/** Отмена одного вхождения серии без удаления всей серии. */
export async function cancelOccurrence(supabase: SupabaseClient, userId: string, masterActionId: string, occurrenceDate: string) {
  const { error } = await supabase.from("action_occurrence_exceptions").upsert(
    { action_id: masterActionId, original_date: occurrenceDate, is_cancelled: true, override: null },
    { onConflict: "action_id,original_date" },
  );
  if (error) throw error;

  await logActionHistory(supabase, {
    actionId: masterActionId,
    userId,
    eventType: "cancelled",
    newValue: { occurrenceDate },
  });
}

export function mapRule(row: unknown) {
  return mapRecurrenceRule(row as Parameters<typeof mapRecurrenceRule>[0]);
}
