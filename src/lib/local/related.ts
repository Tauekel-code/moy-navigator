import "server-only";
import { getLocalDb, nowIso, newId } from "./db";
import { mapAction } from "@/lib/database/mappers";
import type { Action } from "@/types/action";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function listRelatedActions(actionId: string): Promise<Action[]> {
  const db = getLocalDb();
  const rows = db
    .prepare(
      `select a.* from related_actions ra join actions a on a.id = ra.related_action_id
       where ra.action_id = ? order by ra.relation_order asc`,
    )
    .all(actionId) as Row[];

  return rows.map((r) => mapAction({ ...r, all_day: !!r.all_day, is_archived: !!r.is_archived }));
}

export async function linkRelatedAction(actionId: string, relatedActionId: string, order = 0): Promise<void> {
  const db = getLocalDb();
  db.prepare("insert into related_actions (id, action_id, related_action_id, relation_order, created_at) values (?, ?, ?, ?, ?)").run(
    newId(),
    actionId,
    relatedActionId,
    order,
    nowIso(),
  );
}

export async function unlinkRelatedAction(actionId: string, relatedActionId: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("delete from related_actions where action_id = ? and related_action_id = ?").run(actionId, relatedActionId);
}
