import "server-only";
import { getLocalDb, nowIso, newId } from "./db";
import type { ActionEventType, GoalEventType, IdeaEventType } from "@/types/history";

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

export function logLocalGoalHistory(params: { goalId: string; userId: string; eventType: GoalEventType; oldValue?: unknown; newValue?: unknown }) {
  const db = getLocalDb();
  db.prepare(
    "insert into goal_history (id, goal_id, user_id, event_type, old_value, new_value, created_at) values (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    newId(),
    params.goalId,
    params.userId,
    params.eventType,
    params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
    params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
    nowIso(),
  );
}

export function logLocalIdeaHistory(params: { ideaId: string; userId: string; eventType: IdeaEventType; oldValue?: unknown; newValue?: unknown }) {
  const db = getLocalDb();
  db.prepare(
    "insert into idea_history (id, idea_id, user_id, event_type, old_value, new_value, created_at) values (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    newId(),
    params.ideaId,
    params.userId,
    params.eventType,
    params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
    params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
    nowIso(),
  );
}
