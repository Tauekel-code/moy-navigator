import "server-only";
import { getLocalDb, nowIso, newId, type SqlValue } from "./db";
import { logLocalHistory } from "./history-log";
import { mapAction, mapActionContext, mapActionResult } from "@/lib/database/mappers";
import { expandOccurrences } from "@/lib/recurrence/rrule";
import { minutesBetween } from "@/lib/dates";
import type { Action, ActionInput, ActionType, ActionWithDetails, ActionStatus } from "@/types/action";
import type { ActionFilters } from "@/lib/database/cloud/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function normalizeRow(row: Row): Row {
  return {
    ...row,
    all_day: !!row.all_day,
    is_archived: !!row.is_archived,
    has_context: !!row.has_context,
    has_result: !!row.has_result,
  };
}

const ROW_SELECT = `
  select a.*,
    p.id as project_id, p.name as project_name, p.color as project_color,
    c.id as contact_id, c.name as contact_name,
    la.name as life_area_name, la.color as life_area_color,
    g.title as goal_title,
    (select count(*) from action_context ac where ac.action_id = a.id) as has_context,
    (select count(*) from action_results ar where ar.action_id = a.id) as has_result,
    (select count(*) from reminders r where r.action_id = a.id) as reminder_count
  from actions a
  left join action_projects apj on apj.action_id = a.id and apj.is_primary = 1
  left join projects p on p.id = apj.project_id
  left join action_contacts acn on acn.action_id = a.id and acn.is_primary = 1
  left join contacts c on c.id = acn.contact_id
  left join life_areas la on la.id = a.life_area_id
  left join goals g on g.id = a.goal_id
`;

export async function createAction(userId: string, input: ActionInput): Promise<Action> {
  const db = getLocalDb();
  const id = newId();
  const now = nowIso();
  const duration = input.startTime && input.endTime ? minutesBetween(input.startTime, input.endTime) : (input.durationMinutes ?? null);

  db.prepare(
    `insert into actions (id, user_id, title, type, action_date, start_time, end_time, duration_minutes, all_day, timezone, priority, status, deadline_at, life_area_id, goal_id, subgoal_id, idea_id, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    input.title,
    input.type,
    input.actionDate,
    input.startTime,
    input.endTime,
    duration,
    input.allDay ? 1 : 0,
    input.timezone,
    input.priority,
    input.status,
    input.deadlineAt ?? null,
    input.lifeAreaId ?? null,
    input.goalId ?? null,
    input.subgoalId ?? null,
    input.ideaId ?? null,
    now,
    now,
  );

  if (input.projectId) {
    db.prepare("insert into action_projects (action_id, project_id, is_primary, created_at) values (?, ?, 1, ?)").run(id, input.projectId, now);
  }
  if (input.contactId) {
    db.prepare("insert into action_contacts (action_id, contact_id, is_primary, created_at) values (?, ?, 1, ?)").run(id, input.contactId, now);
  }

  logLocalHistory({ actionId: id, userId, eventType: "created", newValue: { title: input.title, actionDate: input.actionDate } });

  const row = db.prepare(`${ROW_SELECT} where a.id = ?`).get(id) as Row;
  return mapAction(normalizeRow(row));
}

export async function getActionById(id: string): Promise<ActionWithDetails | null> {
  const db = getLocalDb();
  const row = db.prepare(`${ROW_SELECT} where a.id = ?`).get(id) as Row | undefined;
  if (!row) return null;

  const action = mapAction(normalizeRow(row));
  const ctxRow = db.prepare("select * from action_context where action_id = ?").get(id) as Row | undefined;
  const resultRow = db.prepare("select * from action_results where action_id = ?").get(id) as Row | undefined;

  return {
    ...action,
    context: ctxRow ? mapActionContext({ ...ctxRow, links: JSON.parse(ctxRow.links ?? "[]") }) : null,
    result: resultRow ? mapActionResult(resultRow) : null,
  };
}

export async function updateActionFields(
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
    lifeAreaId: string | null;
    goalId: string | null;
    subgoalId: string | null;
    actualMinutes: number | null;
  }>,
  eventType: "updated" | "rescheduled" = "updated",
): Promise<Action> {
  const db = getLocalDb();
  const before = db.prepare("select * from actions where id = ?").get(id) as Row;
  const now = nowIso();

  const fields: string[] = [];
  const values: SqlValue[] = [];
  const set = (col: string, val: SqlValue) => {
    fields.push(`${col} = ?`);
    values.push(val);
  };

  if (patch.title !== undefined) set("title", patch.title);
  if (patch.type !== undefined) set("type", patch.type);
  if (patch.actionDate !== undefined) set("action_date", patch.actionDate);
  if (patch.startTime !== undefined) set("start_time", patch.startTime);
  if (patch.endTime !== undefined) set("end_time", patch.endTime);
  if (patch.allDay !== undefined) set("all_day", patch.allDay ? 1 : 0);
  if (patch.priority !== undefined) set("priority", patch.priority);
  if (patch.deadlineAt !== undefined) set("deadline_at", patch.deadlineAt);
  if (patch.lifeAreaId !== undefined) set("life_area_id", patch.lifeAreaId);
  if (patch.goalId !== undefined) set("goal_id", patch.goalId);
  if (patch.subgoalId !== undefined) set("subgoal_id", patch.subgoalId);
  if (patch.actualMinutes !== undefined) set("actual_minutes", patch.actualMinutes);

  if (patch.startTime !== undefined || patch.endTime !== undefined) {
    const st = patch.startTime ?? before.start_time;
    const et = patch.endTime ?? before.end_time;
    set("duration_minutes", st && et ? minutesBetween(st, et) : before.duration_minutes);
  }

  set("updated_at", now);
  db.prepare(`update actions set ${fields.join(", ")} where id = ?`).run(...values, id);

  if (patch.projectId !== undefined) {
    db.prepare("delete from action_projects where action_id = ?").run(id);
    if (patch.projectId) db.prepare("insert into action_projects (action_id, project_id, is_primary, created_at) values (?, ?, 1, ?)").run(id, patch.projectId, now);
  }
  if (patch.contactId !== undefined) {
    db.prepare("delete from action_contacts where action_id = ?").run(id);
    if (patch.contactId) db.prepare("insert into action_contacts (action_id, contact_id, is_primary, created_at) values (?, ?, 1, ?)").run(id, patch.contactId, now);
  }

  logLocalHistory({ actionId: id, userId, eventType, oldValue: before, newValue: patch });

  const row = db.prepare(`${ROW_SELECT} where a.id = ?`).get(id) as Row;
  return mapAction(normalizeRow(row));
}

export async function setActionStatus(id: string, userId: string, status: ActionStatus): Promise<Action> {
  const db = getLocalDb();
  const before = db.prepare("select status from actions where id = ?").get(id) as Row;
  const now = nowIso();

  const fields = ["status = ?", "updated_at = ?"];
  const values: SqlValue[] = [status, now];
  if (status === "completed") {
    fields.push("completed_at = ?");
    values.push(now);
  }
  if (status === "cancelled") {
    fields.push("cancelled_at = ?");
    values.push(now);
  }

  db.prepare(`update actions set ${fields.join(", ")} where id = ?`).run(...values, id);

  logLocalHistory({
    actionId: id,
    userId,
    eventType: status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "status_changed",
    oldValue: { status: before?.status },
    newValue: { status },
  });

  const row = db.prepare(`${ROW_SELECT} where a.id = ?`).get(id) as Row;
  return mapAction(normalizeRow(row));
}

export async function archiveAction(id: string, userId: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("update actions set is_archived = 1, archived_at = ? where id = ?").run(nowIso(), id);
  logLocalHistory({ actionId: id, userId, eventType: "archived" });
}

export async function restoreAction(id: string, userId: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("update actions set is_archived = 0, archived_at = null where id = ?").run(id);
  logLocalHistory({ actionId: id, userId, eventType: "restored" });
}

export async function permanentlyDeleteAction(id: string): Promise<void> {
  const db = getLocalDb();
  db.exec("begin");
  try {
    db.prepare("delete from action_context where action_id = ?").run(id);
    db.prepare("delete from action_results where action_id = ?").run(id);
    db.prepare("delete from action_history where action_id = ?").run(id);
    db.prepare("delete from reminders where action_id = ?").run(id);
    db.prepare("delete from action_projects where action_id = ?").run(id);
    db.prepare("delete from action_contacts where action_id = ?").run(id);
    db.prepare("delete from related_actions where action_id = ? or related_action_id = ?").run(id, id);
    db.prepare("delete from action_occurrence_exceptions where action_id = ?").run(id);
    db.prepare("delete from actions where id = ?").run(id);
    db.exec("commit");
  } catch (err) {
    db.exec("rollback");
    throw err;
  }
}

export async function upsertActionContext(
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
  const db = getLocalDb();
  const now = nowIso();
  const existing = db.prepare("select action_id from action_context where action_id = ?").get(actionId);

  if (existing) {
    db.prepare(
      `update action_context set why_text=?, goal_text=?, dont_forget_text=?, main_argument=?, questions_text=?, preparation_text=?, next_step=?, links=?, updated_at=? where action_id=?`,
    ).run(
      patch.whyText ?? null,
      patch.goalText ?? null,
      patch.dontForgetText ?? null,
      patch.mainArgument ?? null,
      patch.questionsText ?? null,
      patch.preparationText ?? null,
      patch.nextStep ?? null,
      JSON.stringify(patch.links ?? []),
      now,
      actionId,
    );
  } else {
    db.prepare(
      `insert into action_context (action_id, why_text, goal_text, dont_forget_text, main_argument, questions_text, preparation_text, next_step, links, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      actionId,
      patch.whyText ?? null,
      patch.goalText ?? null,
      patch.dontForgetText ?? null,
      patch.mainArgument ?? null,
      patch.questionsText ?? null,
      patch.preparationText ?? null,
      patch.nextStep ?? null,
      JSON.stringify(patch.links ?? []),
      now,
    );
  }
}

export async function setActionResult(actionId: string, resultText: string) {
  const db = getLocalDb();
  const now = nowIso();
  const existing = db.prepare("select action_id from action_results where action_id = ?").get(actionId);

  if (existing) {
    db.prepare("update action_results set result_text=?, updated_at=? where action_id=?").run(resultText, now, actionId);
  } else {
    db.prepare("insert into action_results (action_id, result_text, created_at, updated_at) values (?, ?, ?, ?)").run(actionId, resultText, now, now);
  }
}

export async function listActionsForRange(
  userId: string,
  rangeStart: string,
  rangeEnd: string,
  opts: { includeArchived?: boolean } = {},
): Promise<Action[]> {
  const db = getLocalDb();
  const archivedFlag = opts.includeArchived ? 1 : 0;

  const singleRows = db
    .prepare(`${ROW_SELECT} where a.user_id = ? and a.recurrence_rule_id is null and a.is_archived = ? and a.action_date >= ? and a.action_date <= ?`)
    .all(userId, archivedFlag, rangeStart, rangeEnd) as Row[];

  const singleActions = singleRows.map((r) => mapAction(normalizeRow(r)));

  const recurringRows = db
    .prepare(`${ROW_SELECT} where a.user_id = ? and a.recurrence_rule_id is not null and a.is_archived = ?`)
    .all(userId, archivedFlag) as Row[];

  if (recurringRows.length === 0) return sortActions(singleActions);

  const ruleIds = recurringRows.map((r) => r.recurrence_rule_id);
  const placeholders = ruleIds.map(() => "?").join(",");
  const rules = db.prepare(`select * from recurrence_rules where id in (${placeholders})`).all(...ruleIds) as Row[];
  const ruleById = new Map(rules.map((r) => [r.id, r]));

  const actionIds = recurringRows.map((r) => r.id);
  const exPlaceholders = actionIds.map(() => "?").join(",");
  const exceptionRows = actionIds.length
    ? (db.prepare(`select * from action_occurrence_exceptions where action_id in (${exPlaceholders})`).all(...actionIds) as Row[])
    : [];

  const exceptionsByAction = new Map<string, Row[]>();
  for (const ex of exceptionRows) {
    const list = exceptionsByAction.get(ex.action_id) ?? [];
    list.push(ex);
    exceptionsByAction.set(ex.action_id, list);
  }

  const expanded: Action[] = [];

  for (const raw of recurringRows) {
    const base = mapAction(normalizeRow(raw));
    const rule = ruleById.get(raw.recurrence_rule_id);
    if (!rule) continue;

    const dates = expandOccurrences({ rruleString: rule.rrule_string, dtstart: rule.dtstart }, rangeStart, rangeEnd);
    const exceptions = exceptionsByAction.get(base.id) ?? [];
    const exceptionByDate = new Map(exceptions.map((e) => [e.original_date, e]));

    for (const date of dates) {
      const exception = exceptionByDate.get(date);
      if (exception?.is_cancelled) continue;

      const occurrence: Action = {
        ...base,
        actionDate: date,
        occurrenceDate: date,
        id: date === base.actionDate ? base.id : `${base.id}::${date}`,
      };

      if (exception?.override) {
        const override = JSON.parse(exception.override) as Record<string, unknown>;
        Object.assign(occurrence, {
          title: override.title ?? occurrence.title,
          startTime: override.startTime !== undefined ? override.startTime : occurrence.startTime,
          endTime: override.endTime !== undefined ? override.endTime : occurrence.endTime,
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

export async function listActionsFiltered(userId: string, filters: ActionFilters): Promise<{ actions: Action[]; total: number }> {
  const db = getLocalDb();
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? 50;

  const clauses = ["a.user_id = ?", "a.is_archived = ?"];
  const params: SqlValue[] = [userId, filters.includeArchived ? 1 : 0];

  if (filters.status?.length) {
    clauses.push(`a.status in (${filters.status.map(() => "?").join(",")})`);
    params.push(...filters.status);
  }
  if (filters.type?.length) {
    clauses.push(`a.type in (${filters.type.map(() => "?").join(",")})`);
    params.push(...filters.type);
  }
  if (filters.priority?.length) {
    clauses.push(`a.priority in (${filters.priority.map(() => "?").join(",")})`);
    params.push(...filters.priority);
  }
  if (filters.from) {
    clauses.push("a.action_date >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push("a.action_date <= ?");
    params.push(filters.to);
  }
  if (filters.search) {
    clauses.push("a.title like ?");
    params.push(`%${filters.search}%`);
  }
  if (filters.goalId) {
    clauses.push("a.goal_id = ?");
    params.push(filters.goalId);
  }
  if (filters.lifeAreaId) {
    clauses.push("a.life_area_id = ?");
    params.push(filters.lifeAreaId);
  }

  const where = clauses.join(" and ");
  const total = (db.prepare(`select count(*) as c from actions a where ${where}`).get(...params) as Row).c as number;

  const rows = db
    .prepare(`${ROW_SELECT} where ${where} order by a.action_date is null, a.action_date asc, a.start_time is null, a.start_time asc limit ? offset ?`)
    .all(...params, pageSize, page * pageSize) as Row[];

  let actions = rows.map((r) => mapAction(normalizeRow(r)));

  if (filters.projectId) actions = actions.filter((a) => a.projectId === filters.projectId);
  if (filters.contactId) actions = actions.filter((a) => a.contactId === filters.contactId);

  return { actions, total };
}
