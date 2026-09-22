import "server-only";
import { getLocalDb, nowIso, newId } from "./db";
import { mapReminder } from "@/lib/database/mappers";
import { computeReminderTriggerAt } from "@/lib/reminders/compute";
import type { Reminder, ReminderInput } from "@/types/reminder";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function listRemindersForAction(actionId: string): Promise<Reminder[]> {
  const db = getLocalDb();
  const rows = db.prepare("select * from reminders where action_id = ? order by trigger_at asc").all(actionId) as Row[];
  return rows.map((r) => mapReminder({ ...r, is_sent: !!r.is_sent }));
}

export async function addReminder(
  userId: string,
  actionId: string,
  input: ReminderInput,
  actionDate: string | null,
  actionTime: string | null,
  timezone: string,
): Promise<Reminder> {
  const db = getLocalDb();
  const triggerAt = computeReminderTriggerAt(input, actionDate, actionTime, timezone);
  const id = newId();

  db.prepare(
    "insert into reminders (id, action_id, user_id, offset_unit, offset_value, trigger_at, is_sent, created_at) values (?, ?, ?, ?, ?, ?, 0, ?)",
  ).run(id, actionId, userId, input.offsetUnit, input.offsetValue, triggerAt.toISOString(), nowIso());

  const row = db.prepare("select * from reminders where id = ?").get(id) as Row;
  return mapReminder({ ...row, is_sent: !!row.is_sent });
}

export async function removeReminder(reminderId: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("delete from reminders where id = ?").run(reminderId);
}

export interface DueReminder {
  reminderId: string;
  actionId: string;
  actionTitle: string;
  actionDate: string | null;
  startTime: string | null;
}

/**
 * Раздел 48 ТЗ: уведомления внутри приложения. В локальном режиме нет
 * фонового cron (раздел 77 недостижим без сервера), поэтому пока вкладка
 * открыта, клиент периодически опрашивает эту функцию — она находит
 * "созревшие" напоминания, помечает их отправленными и кладёт в
 * notifications_log, откуда их показывает колокольчик уведомлений.
 */
export async function checkDueReminders(userId: string): Promise<DueReminder[]> {
  const db = getLocalDb();
  const now = nowIso();

  const due = db
    .prepare(
      `select r.id as reminder_id, r.action_id, a.title as action_title, a.action_date, a.start_time
       from reminders r join actions a on a.id = r.action_id
       where r.user_id = ? and r.is_sent = 0 and r.trigger_at <= ? and a.status != 'cancelled' and a.is_archived = 0`,
    )
    .all(userId, now) as Row[];

  for (const row of due) {
    db.prepare("update reminders set is_sent = 1, sent_at = ? where id = ?").run(now, row.reminder_id);
    db.prepare(
      "insert into notifications_log (id, user_id, action_id, reminder_id, notification_type, channel, payload, created_at) values (?, ?, ?, ?, 'reminder', 'in_app', ?, ?)",
    ).run(newId(), userId, row.action_id, row.reminder_id, JSON.stringify({ title: row.action_title }), now);
  }

  return due.map((row) => ({
    reminderId: row.reminder_id,
    actionId: row.action_id,
    actionTitle: row.action_title,
    actionDate: row.action_date,
    startTime: row.start_time,
  }));
}

export async function recalculateRemindersForAction(actionId: string, newDate: string | null, newTime: string | null, timezone: string): Promise<void> {
  const db = getLocalDb();
  const reminders = db.prepare("select * from reminders where action_id = ? and is_sent = 0").all(actionId) as Row[];

  for (const reminder of reminders) {
    if (reminder.offset_unit === "absolute") continue;
    if (!newDate) continue;

    const triggerAt = computeReminderTriggerAt({ offsetUnit: reminder.offset_unit, offsetValue: reminder.offset_value }, newDate, newTime, timezone);
    db.prepare("update reminders set trigger_at = ? where id = ?").run(triggerAt.toISOString(), reminder.id);
  }
}
