import "server-only";
import { getLocalDb } from "./db";
import { mapAction } from "@/lib/database/mappers";
import type { Action } from "@/types/action";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function listArchivedActions(userId: string, opts: { page?: number; pageSize?: number } = {}): Promise<{ actions: Action[]; total: number }> {
  const db = getLocalDb();
  const page = opts.page ?? 0;
  const pageSize = opts.pageSize ?? 50;

  const total = (db.prepare("select count(*) as c from actions where user_id = ? and is_archived = 1").get(userId) as Row).c as number;

  const rows = db
    .prepare("select * from actions where user_id = ? and is_archived = 1 order by archived_at desc limit ? offset ?")
    .all(userId, pageSize, page * pageSize) as Row[];

  return { actions: rows.map((r) => mapAction({ ...r, all_day: !!r.all_day, is_archived: !!r.is_archived })), total };
}
