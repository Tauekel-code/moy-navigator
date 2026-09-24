import "server-only";
import { getLocalDb, nowIso, newId } from "./db";
import { mapDailyPlan, mapDailyPlanItem, mapAction } from "@/lib/database/mappers";
import type { DailyPlan } from "@/types/daily-plan";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function getDailyPlan(userId: string, planDate: string): Promise<DailyPlan | null> {
  const db = getLocalDb();
  const planRow = db.prepare("select * from daily_plans where user_id = ? and plan_date = ?").get(userId, planDate) as Row | undefined;
  if (!planRow) return null;

  const itemRows = db
    .prepare(
      `select dpi.id as item_id, dpi.daily_plan_id, dpi.action_id, dpi.sort_order, dpi.is_required, dpi.included, a.*
       from daily_plan_items dpi
       join actions a on a.id = dpi.action_id
       where dpi.daily_plan_id = ? order by dpi.sort_order asc`,
    )
    .all(planRow.id) as Row[];

  const items = itemRows.map((row) => ({
    ...mapDailyPlanItem({ ...row, id: row.item_id }),
    action: mapAction({ ...row, id: row.action_id, all_day: !!row.all_day, is_archived: !!row.is_archived }),
  }));

  return mapDailyPlan(planRow, items);
}

/** Раздел 12: пользователь принимает (или меняет) предложенный AI план. */
export async function saveDailyPlan(
  userId: string,
  planDate: string,
  items: { actionId: string; isRequired: boolean; included?: boolean }[],
  status: "accepted" | "modified" = "accepted",
): Promise<DailyPlan> {
  const db = getLocalDb();
  const now = nowIso();

  const existing = db.prepare("select id from daily_plans where user_id = ? and plan_date = ?").get(userId, planDate) as Row | undefined;
  let planId: string;

  if (existing) {
    planId = existing.id;
    db.prepare("update daily_plans set status = ?, accepted_at = ?, updated_at = ? where id = ?").run(status, now, now, planId);
    db.prepare("delete from daily_plan_items where daily_plan_id = ?").run(planId);
  } else {
    planId = newId();
    db.prepare(
      "insert into daily_plans (id, user_id, plan_date, status, generated_at, accepted_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(planId, userId, planDate, status, now, now, now, now);
  }

  items.forEach((item, index) => {
    db.prepare(
      "insert into daily_plan_items (id, daily_plan_id, action_id, user_id, sort_order, is_required, included, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(newId(), planId, item.actionId, userId, index, item.isRequired ? 1 : 0, item.included === false ? 0 : 1, now);
  });

  return (await getDailyPlan(userId, planDate))!;
}
