import "server-only";
import { getLocalDb, nowIso, newId, type SqlValue } from "./db";
import { logLocalGoalHistory } from "./history-log";
import { mapGoal, mapSubgoal, mapGoalHistoryEntry } from "@/lib/database/mappers";
import type { Goal, GoalInput, GoalScoreInput, Subgoal, SubgoalInput } from "@/types/goal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const ROW_SELECT = `
  select g.*,
    la.name as life_area_name, la.color as life_area_color,
    (select count(*) from actions a where a.goal_id = g.id and a.is_archived = 0) as tasks_count,
    (select count(*) from actions a where a.goal_id = g.id and a.is_archived = 0 and a.status = 'completed') as tasks_completed_count,
    (select count(*) from subgoals sg where sg.goal_id = g.id) as subgoals_count,
    (select count(*) from subgoals sg where sg.goal_id = g.id and sg.status = 'completed') as subgoals_completed_count
  from goals g
  left join life_areas la on la.id = g.life_area_id
`;

export interface GoalFilters {
  lifeAreaId?: string;
  status?: string[];
  includeArchived?: boolean;
}

export async function listGoals(userId: string, filters: GoalFilters = {}): Promise<Goal[]> {
  const db = getLocalDb();
  const clauses = ["g.user_id = ?", "g.is_archived = ?"];
  const params: SqlValue[] = [userId, filters.includeArchived ? 1 : 0];

  if (filters.lifeAreaId) {
    clauses.push("g.life_area_id = ?");
    params.push(filters.lifeAreaId);
  }
  if (filters.status?.length) {
    clauses.push(`g.status in (${filters.status.map(() => "?").join(",")})`);
    params.push(...filters.status);
  }

  const rows = db.prepare(`${ROW_SELECT} where ${clauses.join(" and ")} order by g.created_at desc`).all(...params) as Row[];
  return rows.map(mapGoal);
}

export async function getGoalById(id: string): Promise<Goal | null> {
  const db = getLocalDb();
  const row = db.prepare(`${ROW_SELECT} where g.id = ?`).get(id) as Row | undefined;
  return row ? mapGoal(row) : null;
}

export async function createGoal(userId: string, input: GoalInput): Promise<Goal> {
  const db = getLocalDb();
  const id = newId();
  const now = nowIso();

  db.prepare(
    `insert into goals (id, user_id, life_area_id, title, description, goal_type, metric_type, metric_unit, current_value, target_value, start_date, deadline, priority, status, criteria, notes, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    input.lifeAreaId,
    input.title,
    input.description,
    input.goalType,
    input.metricType,
    input.metricUnit,
    input.currentValue,
    input.targetValue,
    input.startDate,
    input.deadline,
    input.priority,
    input.status,
    input.criteria,
    input.notes,
    now,
    now,
  );

  logLocalGoalHistory({ goalId: id, userId, eventType: "created", newValue: { title: input.title } });

  const row = db.prepare(`${ROW_SELECT} where g.id = ?`).get(id) as Row;
  return mapGoal(row);
}

export async function updateGoal(id: string, userId: string, patch: Partial<GoalInput>): Promise<Goal> {
  const db = getLocalDb();
  const before = db.prepare("select * from goals where id = ?").get(id) as Row;
  const now = nowIso();

  const fields: string[] = ["updated_at = ?"];
  const values: SqlValue[] = [now];
  const set = (col: string, val: SqlValue) => {
    fields.push(`${col} = ?`);
    values.push(val);
  };

  if (patch.lifeAreaId !== undefined) set("life_area_id", patch.lifeAreaId);
  if (patch.title !== undefined) set("title", patch.title);
  if (patch.description !== undefined) set("description", patch.description);
  if (patch.goalType !== undefined) set("goal_type", patch.goalType);
  if (patch.metricType !== undefined) set("metric_type", patch.metricType);
  if (patch.metricUnit !== undefined) set("metric_unit", patch.metricUnit);
  if (patch.currentValue !== undefined) set("current_value", patch.currentValue);
  if (patch.targetValue !== undefined) set("target_value", patch.targetValue);
  if (patch.startDate !== undefined) set("start_date", patch.startDate);
  if (patch.deadline !== undefined) set("deadline", patch.deadline);
  if (patch.priority !== undefined) set("priority", patch.priority);
  if (patch.criteria !== undefined) set("criteria", patch.criteria);
  if (patch.notes !== undefined) set("notes", patch.notes);

  let eventType: "updated" | "status_changed" | "progress_updated" = "updated";
  if (patch.status !== undefined && patch.status !== before.status) {
    set("status", patch.status);
    if (patch.status === "completed") set("completed_at", now);
    eventType = "status_changed";
  }
  if (patch.currentValue !== undefined && patch.currentValue !== before.current_value) {
    eventType = "progress_updated";
  }

  db.prepare(`update goals set ${fields.join(", ")} where id = ?`).run(...values, id);
  logLocalGoalHistory({ goalId: id, userId, eventType, oldValue: before, newValue: patch });

  const row = db.prepare(`${ROW_SELECT} where g.id = ?`).get(id) as Row;
  return mapGoal(row);
}

export async function archiveGoal(id: string, userId: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("update goals set is_archived = 1, archived_at = ? where id = ?").run(nowIso(), id);
  logLocalGoalHistory({ goalId: id, userId, eventType: "archived" });
}

export async function restoreGoal(id: string, userId: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("update goals set is_archived = 0, archived_at = null where id = ?").run(id);
  logLocalGoalHistory({ goalId: id, userId, eventType: "restored" });
}

export async function addGoalScore(userId: string, goalId: string, input: GoalScoreInput) {
  const db = getLocalDb();
  const now = nowIso();
  const id = newId();

  db.prepare("insert into goal_scores (id, goal_id, user_id, value, recorded_at, comment, created_at) values (?, ?, ?, ?, ?, ?, ?)").run(
    id,
    goalId,
    userId,
    input.value,
    input.recordedAt ?? now.slice(0, 10),
    input.comment ?? null,
    now,
  );
  db.prepare("update goals set current_value = ?, updated_at = ? where id = ?").run(input.value, now, goalId);
  logLocalGoalHistory({ goalId, userId, eventType: "progress_updated", newValue: { value: input.value } });

  return db.prepare("select * from goal_scores where id = ?").get(id) as Row;
}

export async function listGoalScores(goalId: string) {
  const db = getLocalDb();
  return db.prepare("select * from goal_scores where goal_id = ? order by recorded_at asc, created_at asc").all(goalId) as Row[];
}

export async function listGoalHistory(goalId: string) {
  const db = getLocalDb();
  const rows = db.prepare("select * from goal_history where goal_id = ? order by created_at desc").all(goalId) as Row[];
  return rows.map((r) => mapGoalHistoryEntry({ ...r, old_value: r.old_value ? JSON.parse(r.old_value) : null, new_value: r.new_value ? JSON.parse(r.new_value) : null }));
}

// ---------------------------------------------------------------------------
// Подцели
// ---------------------------------------------------------------------------

export async function listSubgoals(goalId: string): Promise<Subgoal[]> {
  const db = getLocalDb();
  const rows = db.prepare("select * from subgoals where goal_id = ? order by sort_order asc, created_at asc").all(goalId) as Row[];
  return rows.map(mapSubgoal);
}

export async function createSubgoal(userId: string, goalId: string, input: SubgoalInput): Promise<Subgoal> {
  const db = getLocalDb();
  const id = newId();
  const now = nowIso();
  const maxOrder = (db.prepare("select coalesce(max(sort_order), -1) as m from subgoals where goal_id = ?").get(goalId) as Row).m as number;

  db.prepare(
    "insert into subgoals (id, goal_id, user_id, title, deadline, status, metric_value, metric_target, metric_unit, sort_order, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(id, goalId, userId, input.title, input.deadline, input.status, input.metricValue, input.metricTarget, input.metricUnit, maxOrder + 1, now, now);

  const row = db.prepare("select * from subgoals where id = ?").get(id) as Row;
  return mapSubgoal(row);
}

export async function updateSubgoal(id: string, patch: Partial<SubgoalInput>): Promise<Subgoal> {
  const db = getLocalDb();
  const now = nowIso();

  const fields: string[] = ["updated_at = ?"];
  const values: SqlValue[] = [now];
  const set = (col: string, val: SqlValue) => {
    fields.push(`${col} = ?`);
    values.push(val);
  };

  if (patch.title !== undefined) set("title", patch.title);
  if (patch.deadline !== undefined) set("deadline", patch.deadline);
  if (patch.status !== undefined) {
    set("status", patch.status);
    if (patch.status === "completed") set("completed_at", now);
  }
  if (patch.metricValue !== undefined) set("metric_value", patch.metricValue);
  if (patch.metricTarget !== undefined) set("metric_target", patch.metricTarget);
  if (patch.metricUnit !== undefined) set("metric_unit", patch.metricUnit);

  db.prepare(`update subgoals set ${fields.join(", ")} where id = ?`).run(...values, id);

  const row = db.prepare("select * from subgoals where id = ?").get(id) as Row;
  return mapSubgoal(row);
}

export async function deleteSubgoal(id: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("delete from subgoals where id = ?").run(id);
}
