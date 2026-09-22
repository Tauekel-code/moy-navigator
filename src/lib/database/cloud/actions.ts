import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAction, mapActionContext, mapActionResult, mapRecurrenceRule, mapOccurrenceException } from "../mappers";
import { logActionHistory } from "@/lib/history/log";
import { expandOccurrences } from "@/lib/recurrence/rrule";
import { minutesBetween } from "@/lib/dates";
import type { Action, ActionInput, ActionType, ActionWithDetails, ActionStatus } from "@/types/action";
import type { OccurrenceException } from "@/types/recurrence";

const ACTION_SELECT = `
  *,
  action_projects!left ( is_primary, project:projects ( id, name, color ) ),
  action_contacts!left ( is_primary, contact:contacts ( id, name ) ),
  action_context!left ( action_id ),
  action_results!left ( action_id ),
  reminders!left ( id, is_sent )
`;

type ActionRow = Record<string, unknown> & {
  action_projects?: { is_primary: boolean; project: { id: string; name: string; color: string } }[];
  action_contacts?: { is_primary: boolean; contact: { id: string; name: string } }[];
  action_context?: unknown[] | unknown;
  action_results?: unknown[] | unknown;
  reminders?: { id: string; is_sent: boolean }[];
};

function flattenActionRow(row: ActionRow): Action {
  const primaryProject = (row.action_projects ?? []).find((p) => p.is_primary) ?? row.action_projects?.[0];
  const primaryContact = (row.action_contacts ?? []).find((c) => c.is_primary) ?? row.action_contacts?.[0];

  return mapAction({
    ...row,
    project_id: primaryProject?.project?.id ?? null,
    project_name: primaryProject?.project?.name ?? null,
    project_color: primaryProject?.project?.color ?? null,
    contact_id: primaryContact?.contact?.id ?? null,
    contact_name: primaryContact?.contact?.name ?? null,
    has_context: Array.isArray(row.action_context) ? row.action_context.length > 0 : !!row.action_context,
    has_result: Array.isArray(row.action_results) ? row.action_results.length > 0 : !!row.action_results,
    reminder_count: Array.isArray(row.reminders) ? row.reminders.length : 0,
  });
}

export async function createAction(
  supabase: SupabaseClient,
  userId: string,
  input: ActionInput,
): Promise<Action> {
  const duration =
    input.startTime && input.endTime ? minutesBetween(input.startTime, input.endTime) : input.durationMinutes;

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
    newValue: { title: input.title, actionDate: input.actionDate, startTime: input.startTime },
  });

  return mapAction(data);
}

export async function getActionById(supabase: SupabaseClient, id: string): Promise<ActionWithDetails | null> {
  const { data, error } = await supabase.from("actions").select(ACTION_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const action = flattenActionRow(data);

  const [{ data: ctxRow }, { data: resultRow }] = await Promise.all([
    supabase.from("action_context").select("*").eq("action_id", id).maybeSingle(),
    supabase.from("action_results").select("*").eq("action_id", id).maybeSingle(),
  ]);

  return {
    ...action,
    context: ctxRow ? mapActionContext(ctxRow) : null,
    result: resultRow ? mapActionResult(resultRow) : null,
  };
}

/** Базовое обновление полей действия (используется для нерегулярных действий и scope='all'). */
export async function updateActionFields(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  patch: Partial<{
    title: string;
    type: ActionType;
    actionDate: string | null;
    startTime: string | null;
    endTime: string | null;
    allDay: boolean;
    priority: Action["priority"];
    deadlineAt: string | null;
    projectId: string | null;
    contactId: string | null;
  }>,
  eventType: "updated" | "rescheduled" = "updated",
): Promise<Action> {
  const { data: before, error: beforeErr } = await supabase.from("actions").select("*").eq("id", id).single();
  if (beforeErr) throw beforeErr;

  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.type !== undefined) dbPatch.type = patch.type;
  if (patch.actionDate !== undefined) dbPatch.action_date = patch.actionDate;
  if (patch.startTime !== undefined) dbPatch.start_time = patch.startTime;
  if (patch.endTime !== undefined) dbPatch.end_time = patch.endTime;
  if (patch.allDay !== undefined) dbPatch.all_day = patch.allDay;
  if (patch.priority !== undefined) dbPatch.priority = patch.priority;
  if (patch.deadlineAt !== undefined) dbPatch.deadline_at = patch.deadlineAt;

  if (patch.startTime !== undefined || patch.endTime !== undefined) {
    const st = patch.startTime ?? before.start_time;
    const et = patch.endTime ?? before.end_time;
    dbPatch.duration_minutes = st && et ? minutesBetween(st, et) : before.duration_minutes;
  }

  const { data, error } = await supabase.from("actions").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;

  if (patch.projectId !== undefined) {
    await supabase.from("action_projects").delete().eq("action_id", id);
    if (patch.projectId) {
      await supabase.from("action_projects").insert({ action_id: id, project_id: patch.projectId, is_primary: true });
    }
  }
  if (patch.contactId !== undefined) {
    await supabase.from("action_contacts").delete().eq("action_id", id);
    if (patch.contactId) {
      await supabase.from("action_contacts").insert({ action_id: id, contact_id: patch.contactId, is_primary: true });
    }
  }

  await logActionHistory(supabase, {
    actionId: id,
    userId,
    eventType,
    oldValue: before,
    newValue: dbPatch,
  });

  return mapAction(data);
}

export async function setActionStatus(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  status: ActionStatus,
): Promise<Action> {
  const { data: before } = await supabase.from("actions").select("status").eq("id", id).single();

  const patch: Record<string, unknown> = { status };
  if (status === "completed") patch.completed_at = new Date().toISOString();
  if (status === "cancelled") patch.cancelled_at = new Date().toISOString();

  const { data, error } = await supabase.from("actions").update(patch).eq("id", id).select().single();
  if (error) throw error;

  await logActionHistory(supabase, {
    actionId: id,
    userId,
    eventType: status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "status_changed",
    oldValue: { status: before?.status },
    newValue: { status },
  });

  return mapAction(data);
}

export async function archiveAction(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("actions")
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  await logActionHistory(supabase, { actionId: id, userId, eventType: "archived" });
}

export async function restoreAction(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from("actions").update({ is_archived: false, archived_at: null }).eq("id", id);
  if (error) throw error;

  await logActionHistory(supabase, { actionId: id, userId, eventType: "restored" });
}

export async function permanentlyDeleteAction(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("actions").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertActionContext(
  supabase: SupabaseClient,
  actionId: string,
  patch: Partial<{
    whyText: string | null;
    goalText: string | null;
    dontForgetText: string | null;
    mainArgument: string | null;
    questionsText: string | null;
    preparationText: string | null;
    nextStep: string | null;
    links: string[];
  }>,
) {
  const { error } = await supabase.from("action_context").upsert({
    action_id: actionId,
    why_text: patch.whyText,
    goal_text: patch.goalText,
    dont_forget_text: patch.dontForgetText,
    main_argument: patch.mainArgument,
    questions_text: patch.questionsText,
    preparation_text: patch.preparationText,
    next_step: patch.nextStep,
    links: patch.links ?? [],
  });
  if (error) throw error;
}

export async function setActionResult(supabase: SupabaseClient, actionId: string, resultText: string) {
  const { error } = await supabase
    .from("action_results")
    .upsert({ action_id: actionId, result_text: resultText, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Развёрнутый список действий для календаря/таймлайна за диапазон дат,
// с учётом повторяющихся серий и исключений (раздел 6-8, 21-22 ТЗ).
// ---------------------------------------------------------------------------

export async function listActionsForRange(
  supabase: SupabaseClient,
  userId: string,
  rangeStart: string,
  rangeEnd: string,
  opts: { includeArchived?: boolean } = {},
): Promise<Action[]> {
  let query = supabase
    .from("actions")
    .select(ACTION_SELECT)
    .eq("user_id", userId)
    .is("recurrence_rule_id", null)
    .gte("action_date", rangeStart)
    .lte("action_date", rangeEnd);

  if (!opts.includeArchived) query = query.eq("is_archived", false);

  const { data: singleRows, error } = await query;
  if (error) throw error;

  const singleActions = (singleRows ?? []).map(flattenActionRow);

  // Также действия без даты не попадают в диапазон — они показываются в бэклоге задач.

  const { data: recurringAll, error: recErr2 } = await supabase
    .from("actions")
    .select(ACTION_SELECT)
    .eq("user_id", userId)
    .not("recurrence_rule_id", "is", null)
    .eq("is_archived", !!opts.includeArchived);
  if (recErr2) throw recErr2;

  const recurringActions = recurringAll ?? [];
  if (recurringActions.length === 0) return sortActions(singleActions);

  const ruleIds = recurringActions.map((r) => r.recurrence_rule_id).filter(Boolean);
  const { data: rules, error: rulesErr } = await supabase.from("recurrence_rules").select("*").in("id", ruleIds);
  if (rulesErr) throw rulesErr;
  const ruleById = new Map((rules ?? []).map((r) => [r.id, mapRecurrenceRule(r)]));

  const actionIds = recurringActions.map((r) => r.id);
  const { data: exceptionRows, error: exErr } = await supabase
    .from("action_occurrence_exceptions")
    .select("*")
    .in("action_id", actionIds);
  if (exErr) throw exErr;

  const exceptionsByAction = new Map<string, OccurrenceException[]>();
  for (const row of exceptionRows ?? []) {
    const mapped = mapOccurrenceException(row);
    const list = exceptionsByAction.get(mapped.actionId) ?? [];
    list.push(mapped);
    exceptionsByAction.set(mapped.actionId, list);
  }

  const expanded: Action[] = [];

  for (const raw of recurringActions) {
    const base = flattenActionRow(raw);
    const rule = ruleById.get(raw.recurrence_rule_id);
    if (!rule) continue;

    const dates = expandOccurrences(rule, rangeStart, rangeEnd);
    const exceptions = exceptionsByAction.get(base.id) ?? [];
    const exceptionByDate = new Map(exceptions.map((e) => [e.originalDate, e]));

    for (const date of dates) {
      const exception = exceptionByDate.get(date);
      if (exception?.isCancelled) continue;

      const occurrence: Action = {
        ...base,
        actionDate: date,
        occurrenceDate: date,
        id: date === base.actionDate ? base.id : `${base.id}::${date}`,
      };

      if (exception?.override) {
        Object.assign(occurrence, {
          title: exception.override.title ?? occurrence.title,
          startTime: exception.override.startTime !== undefined ? exception.override.startTime : occurrence.startTime,
          endTime: exception.override.endTime !== undefined ? exception.override.endTime : occurrence.endTime,
        });
      }

      expanded.push(occurrence);
    }
  }

  return sortActions([...singleActions, ...expanded]);
}

function sortActions(actions: Action[]): Action[] {
  return [...actions].sort((a, b) => {
    const dateCompare = (a.actionDate ?? "9999").localeCompare(b.actionDate ?? "9999");
    if (dateCompare !== 0) return dateCompare;
    const timeA = a.startTime ?? (a.allDay ? "00:00" : "99:99");
    const timeB = b.startTime ?? (b.allDay ? "00:00" : "99:99");
    return timeA.localeCompare(timeB);
  });
}

export interface ActionFilters {
  status?: ActionStatus[];
  type?: ActionType[];
  priority?: string[];
  projectId?: string;
  contactId?: string;
  from?: string;
  to?: string;
  includeArchived?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listActionsFiltered(
  supabase: SupabaseClient,
  userId: string,
  filters: ActionFilters,
): Promise<{ actions: Action[]; total: number }> {
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? 50;

  let query = supabase
    .from("actions")
    .select(ACTION_SELECT, { count: "exact" })
    .eq("user_id", userId)
    .eq("is_archived", !!filters.includeArchived);

  if (filters.status?.length) query = query.in("status", filters.status);
  if (filters.type?.length) query = query.in("type", filters.type);
  if (filters.priority?.length) query = query.in("priority", filters.priority);
  if (filters.from) query = query.gte("action_date", filters.from);
  if (filters.to) query = query.lte("action_date", filters.to);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);

  query = query
    .order("action_date", { ascending: true, nullsFirst: true })
    .order("start_time", { ascending: true, nullsFirst: true })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  let actions = (data ?? []).map(flattenActionRow);

  if (filters.projectId) actions = actions.filter((a) => a.projectId === filters.projectId);
  if (filters.contactId) actions = actions.filter((a) => a.contactId === filters.contactId);

  return { actions, total: count ?? actions.length };
}
