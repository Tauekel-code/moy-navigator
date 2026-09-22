import "server-only";
import { getLocalDb, type SqlValue } from "./db";
import { mapHistoryEntry } from "@/lib/database/mappers";
import type { ActionHistoryEntry } from "@/types/history";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function parseJsonField(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function listHistoryForAction(actionId: string): Promise<ActionHistoryEntry[]> {
  const db = getLocalDb();
  const rows = db.prepare("select * from action_history where action_id = ? order by created_at desc").all(actionId) as Row[];
  return rows.map((r) => mapHistoryEntry({ ...r, old_value: parseJsonField(r.old_value), new_value: parseJsonField(r.new_value) }));
}

export async function listHistoryForUser(
  userId: string,
  opts: { page?: number; pageSize?: number; from?: string; to?: string } = {},
): Promise<{ entries: ActionHistoryEntry[]; total: number }> {
  const db = getLocalDb();
  const page = opts.page ?? 0;
  const pageSize = opts.pageSize ?? 50;

  const clauses = ["h.user_id = ?"];
  const params: SqlValue[] = [userId];
  if (opts.from) {
    clauses.push("h.created_at >= ?");
    params.push(opts.from);
  }
  if (opts.to) {
    clauses.push("h.created_at <= ?");
    params.push(opts.to);
  }
  const where = clauses.join(" and ");

  const total = (db.prepare(`select count(*) as c from action_history h where ${where}`).get(...params) as Row).c as number;

  const rows = db
    .prepare(
      `select h.*, a.title as action_title from action_history h left join actions a on a.id = h.action_id
       where ${where} order by h.created_at desc limit ? offset ?`,
    )
    .all(...params, pageSize, page * pageSize) as Row[];

  const entries = rows.map((r) => mapHistoryEntry({ ...r, old_value: parseJsonField(r.old_value), new_value: parseJsonField(r.new_value) }));

  return { entries, total };
}
