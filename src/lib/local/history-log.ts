import "server-only";
import { getLocalDb, nowIso, newId } from "./db";
import type { ActionEventType } from "@/types/history";

export function logLocalHistory(params: {
  actionId: string;
  userId: string;
  eventType: ActionEventType;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const db = getLocalDb();
  db.prepare(
    "insert into action_history (id, action_id, user_id, event_type, old_value, new_value, created_at) values (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    newId(),
    params.actionId,
    params.userId,
    params.eventType,
    params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
    params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
    nowIso(),
  );
}
