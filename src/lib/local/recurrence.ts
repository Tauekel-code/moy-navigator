import "server-only";
import { getLocalDb, nowIso, newId, type SqlValue } from "./db";
import { logLocalHistory } from "./history-log";
import { mapAction } from "@/lib/database/mappers";
import { buildRRuleString } from "@/lib/recurrence/rrule";
import { addCalendarDays, minutesBetween } from "@/lib/dates";
import type { Action, ActionInput, RescheduleScope } from "@/types/action";
import type { RecurrenceRuleInput } from "@/types/recurrence";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function createRecurringAction(userId: string, input: ActionInput, recurrence: RecurrenceRuleInput): Promise<Action> {
  if (!input.actionDate) throw new Error("Повторяющееся действие обязано иметь дату первого вхождения");

  const db = getLocalDb();
  const rruleString = buildRRuleString(recurrence);
  const ruleId = newId();
  const now = nowIso();

  db.prepare(
    "insert into recurrence_rules (id, user_id, freq, interval, rrule_string, dtstart, dtstart_time, until_date, count, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(ruleId, userId, recurrence.freq, recurrence.interval, rruleString, input.actionDate, input.startTime, recurrence.untilDate ?? null, recurrence.count ?? null, now);

  const id = newId();
  const duration = input.startTime && input.endTime ? minutesBetween(input.startTime, input.endTime) : (input.durationMinutes ?? null);

  db.prepare(
    `insert into actions (id, user_id, title, type, action_date, start_time, end_time, duration_minutes, all_day, timezone, priority, status, deadline_at, recurrence_rule_id, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, input.title, input.type, input.actionDate, input.startTime, input.endTime, duration, input.allDay ? 1 : 0, input.timezone, input.priority, input.status, input.deadlineAt ?? null, ruleId, now, now);

  if (input.projectId) db.prepare("insert into action_projects (action_id, project_id, is_primary, created_at) values (?, ?, 1, ?)").run(id, input.projectId, now);
  if (input.contactId) db.prepare("insert into action_contacts (action_id, contact_id, is_primary, created_at) values (?, ?, 1, ?)").run(id, input.contactId, now);

  logLocalHistory({ actionId: id, userId, eventType: "created", newValue: { title: input.title, recurrence: rruleString } });

  const row = db.prepare("select * from actions where id = ?").get(id) as Row;
  return mapAction({ ...row, all_day: !!row.all_day, is_archived: !!row.is_archived });
}

interface OccurrencePatch {
  title?: string;
  actionDate?: string;
  startTime?: string | null;
  endTime?: string | null;
  priority?: Action["priority"];
  status?: Action["status"];
}

export async function editRecurringOccurrence(
  userId: string,
  masterActionId: string,
  occurrenceDate: string,
  scope: RescheduleScope,
  patch: OccurrencePatch,
): Promise<{ targetActionId: string }> {
  const db = getLocalDb();
  const master = db.prepare("select * from actions where id = ?").get(masterActionId) as Row;
  const now = nowIso();

  if (scope === "all" || (scope === "this_and_future" && occurrenceDate === master.action_date)) {
    const fields: string[] = [];
    const values: SqlValue[] = [];
    const set = (col: string, val: SqlValue) => {
      fields.push(`${col} = ?`);
      values.push(val);
    };
    if (patch.title !== undefined) set("title", patch.title);
    if (patch.startTime !== undefined) set("start_time", patch.startTime);
    if (patch.endTime !== undefined) set("end_time", patch.endTime);
    if (patch.priority !== undefined) set("priority", patch.priority);
    if (patch.status !== undefined) set("status", patch.status);
    set("updated_at", now);

    db.prepare(`update actions set ${fields.join(", ")} where id = ?`).run(...values, masterActionId);
    logLocalHistory({ actionId: masterActionId, userId, eventType: "updated", oldValue: master, newValue: patch });
    return { targetActionId: masterActionId };
  }

  if (scope === "this") {
    const override = JSON.stringify({
      title: patch.title,
      startTime: patch.startTime,
      endTime: patch.endTime,
      priority: patch.priority,
      status: patch.status,
    });
    const existing = db
      .prepare("select id from action_occurrence_exceptions where action_id = ? and original_date = ?")
      .get(masterActionId, occurrenceDate) as Row | undefined;

    if (existing) {
      db.prepare("update action_occurrence_exceptions set is_cancelled = 0, override = ? where id = ?").run(override, existing.id);
    } else {
      db.prepare(
        "insert into action_occurrence_exceptions (id, action_id, original_date, is_cancelled, override, created_at) values (?, ?, ?, 0, ?, ?)",
      ).run(newId(), masterActionId, occurrenceDate, override, now);
    }

    logLocalHistory({
      actionId: masterActionId,
      userId,
      eventType: patch.actionDate ? "rescheduled" : "updated",
      newValue: { occurrenceDate, ...patch },
    });

    return { targetActionId: masterActionId };
  }

  // this_and_future: обрезаем старую серию и создаём новую
  const dayBefore = addCalendarDays(occurrenceDate, -1);
  const oldRule = db.prepare("select * from recurrence_rules where id = ?").get(master.recurrence_rule_id) as Row;

  db.prepare("update recurrence_rules set until_date = ? where id = ?").run(dayBefore, oldRule.id);

  const newRuleId = newId();
  db.prepare(
    "insert into recurrence_rules (id, user_id, freq, interval, rrule_string, dtstart, dtstart_time, until_date, count, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, null, ?)",
  ).run(
    newRuleId,
    userId,
    oldRule.freq,
    oldRule.interval,
    oldRule.rrule_string,
    occurrenceDate,
    patch.startTime !== undefined ? patch.startTime : oldRule.dtstart_time,
    oldRule.until_date,
    now,
  );

  const newActionId = newId();
  db.prepare(
    `insert into actions (id, user_id, title, type, action_date, start_time, end_time, duration_minutes, all_day, timezone, priority, status, deadline_at, recurrence_rule_id, series_root_id, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?, ?, ?)`,
  ).run(
    newActionId,
    userId,
    patch.title ?? master.title,
    master.type,
    occurrenceDate,
    patch.startTime !== undefined ? patch.startTime : master.start_time,
    patch.endTime !== undefined ? patch.endTime : master.end_time,
    master.duration_minutes,
    master.all_day,
    master.timezone,
    patch.priority ?? master.priority,
    patch.status ?? "planned",
    newRuleId,
    master.series_root_id ?? master.id,
    now,
    now,
  );

  const projLinks = db.prepare("select * from action_projects where action_id = ?").all(masterActionId) as Row[];
  for (const link of projLinks) {
    db.prepare("insert into action_projects (action_id, project_id, is_primary, created_at) values (?, ?, ?, ?)").run(newActionId, link.project_id, link.is_primary, now);
  }
  const contactLinks = db.prepare("select * from action_contacts where action_id = ?").all(masterActionId) as Row[];
  for (const link of contactLinks) {
    db.prepare("insert into action_contacts (action_id, contact_id, is_primary, created_at) values (?, ?, ?, ?)").run(newActionId, link.contact_id, link.is_primary, now);
  }

  logLocalHistory({ actionId: newActionId, userId, eventType: "created", newValue: { splitFrom: masterActionId, occurrenceDate } });

  return { targetActionId: newActionId };
}

export async function cancelOccurrence(userId: string, masterActionId: string, occurrenceDate: string) {
  const db = getLocalDb();
  const existing = db
    .prepare("select id from action_occurrence_exceptions where action_id = ? and original_date = ?")
    .get(masterActionId, occurrenceDate) as Row | undefined;

  if (existing) {
    db.prepare("update action_occurrence_exceptions set is_cancelled = 1 where id = ?").run(existing.id);
  } else {
    db.prepare(
      "insert into action_occurrence_exceptions (id, action_id, original_date, is_cancelled, override, created_at) values (?, ?, ?, 1, null, ?)",
    ).run(newId(), masterActionId, occurrenceDate, nowIso());
  }

  logLocalHistory({ actionId: masterActionId, userId, eventType: "cancelled", newValue: { occurrenceDate } });
}
