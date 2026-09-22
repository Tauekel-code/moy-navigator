import "server-only";
import { getLocalDb } from "./db";
import type { NotificationLogEntry } from "@/types/notification";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function mapLog(row: Row): NotificationLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    actionId: row.action_id,
    reminderId: row.reminder_id,
    notificationType: row.notification_type,
    channel: row.channel,
    payload: row.payload ? JSON.parse(row.payload) : null,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

export async function listNotifications(userId: string, limit = 30): Promise<NotificationLogEntry[]> {
  const db = getLocalDb();
  const rows = db
    .prepare("select * from notifications_log where user_id = ? and channel = 'in_app' order by created_at desc limit ?")
    .all(userId, limit) as Row[];
  return rows.map(mapLog);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const db = getLocalDb();
  const row = db
    .prepare("select count(*) as c from notifications_log where user_id = ? and channel = 'in_app' and is_read = 0")
    .get(userId) as Row;
  return row.c as number;
}

export async function markNotificationRead(id: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("update notifications_log set is_read = 1 where id = ?").run(id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("update notifications_log set is_read = 1 where user_id = ? and is_read = 0").run(userId);
}
