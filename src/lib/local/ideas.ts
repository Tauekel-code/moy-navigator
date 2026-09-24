import "server-only";
import { getLocalDb, nowIso, newId, type SqlValue } from "./db";
import { logLocalIdeaHistory } from "./history-log";
import { createAction } from "./actions";
import { createGoal } from "./goals";
import { mapIdea, mapIdeaHistoryEntry } from "@/lib/database/mappers";
import type { Idea, IdeaInput, IdeaStatus } from "@/types/idea";
import type { Action } from "@/types/action";
import type { Goal } from "@/types/goal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const ROW_SELECT = `
  select i.*, la.name as life_area_name, g.title as goal_title, p.name as project_name
  from ideas i
  left join life_areas la on la.id = i.life_area_id
  left join goals g on g.id = i.goal_id
  left join projects p on p.id = i.project_id
`;

export async function listIdeas(userId: string, status?: IdeaStatus[], includeArchived = false): Promise<Idea[]> {
  const db = getLocalDb();
  const clauses = ["i.user_id = ?", "i.is_archived = ?"];
  const params: SqlValue[] = [userId, includeArchived ? 1 : 0];

  if (status?.length) {
    clauses.push(`i.status in (${status.map(() => "?").join(",")})`);
    params.push(...status);
  }

  const rows = db.prepare(`${ROW_SELECT} where ${clauses.join(" and ")} order by i.created_at desc`).all(...params) as Row[];
  return rows.map(mapIdea);
}

export async function getIdeaById(id: string): Promise<Idea | null> {
  const db = getLocalDb();
  const row = db.prepare(`${ROW_SELECT} where i.id = ?`).get(id) as Row | undefined;
  return row ? mapIdea(row) : null;
}

/** Раздел 6: идея сохраняется сразу, даже без сферы/цели/времени. */
export async function createIdea(userId: string, input: IdeaInput): Promise<Idea> {
  const db = getLocalDb();
  const id = newId();
  const now = nowIso();

  db.prepare(
    "insert into ideas (id, user_id, text, source, life_area_id, goal_id, project_id, notes, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(id, userId, input.text, input.source ?? "text", input.lifeAreaId ?? null, input.goalId ?? null, input.projectId ?? null, input.notes ?? null, now, now);

  logLocalIdeaHistory({ ideaId: id, userId, eventType: "created", newValue: { text: input.text } });

  const row = db.prepare(`${ROW_SELECT} where i.id = ?`).get(id) as Row;
  return mapIdea(row);
}

export async function updateIdea(
  id: string,
  userId: string,
  patch: Partial<{ text: string; status: IdeaStatus; lifeAreaId: string | null; goalId: string | null; projectId: string | null; notes: string | null }>,
): Promise<Idea> {
  const db = getLocalDb();
  const before = db.prepare("select * from ideas where id = ?").get(id) as Row;
  const now = nowIso();

  const fields: string[] = ["updated_at = ?"];
  const values: SqlValue[] = [now];
  const set = (col: string, val: SqlValue) => {
    fields.push(`${col} = ?`);
    values.push(val);
  };

  if (patch.text !== undefined) set("text", patch.text);
  if (patch.status !== undefined) set("status", patch.status);
  if (patch.lifeAreaId !== undefined) set("life_area_id", patch.lifeAreaId);
  if (patch.goalId !== undefined) set("goal_id", patch.goalId);
  if (patch.projectId !== undefined) set("project_id", patch.projectId);
  if (patch.notes !== undefined) set("notes", patch.notes);

  db.prepare(`update ideas set ${fields.join(", ")} where id = ?`).run(...values, id);

  logLocalIdeaHistory({
    ideaId: id,
    userId,
    eventType: patch.status && patch.status !== before.status ? "status_changed" : "updated",
    oldValue: before,
    newValue: patch,
  });

  const row = db.prepare(`${ROW_SELECT} where i.id = ?`).get(id) as Row;
  return mapIdea(row);
}

export async function archiveIdea(id: string, userId: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("update ideas set is_archived = 1, archived_at = ? where id = ?").run(nowIso(), id);
  logLocalIdeaHistory({ ideaId: id, userId, eventType: "archived" });
}

export async function restoreIdea(id: string, userId: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("update ideas set is_archived = 0, archived_at = null where id = ?").run(id);
  logLocalIdeaHistory({ ideaId: id, userId, eventType: "restored" });
}

export async function deleteIdea(id: string, userId: string): Promise<void> {
  const db = getLocalDb();
  logLocalIdeaHistory({ ideaId: id, userId, eventType: "deleted" });
  db.prepare("delete from ideas where id = ?").run(id);
}

/** Раздел 6: «превратить в задачу». */
export async function convertIdeaToTask(
  id: string,
  userId: string,
  overrides: { actionDate?: string | null; startTime?: string | null } = {},
): Promise<{ idea: Idea; action: Action }> {
  const db = getLocalDb();
  const idea = await getIdeaById(id);
  if (!idea) throw new Error("Идея не найдена");

  const action = await createAction(userId, {
    title: idea.text,
    type: "task",
    actionDate: overrides.actionDate ?? null,
    startTime: overrides.startTime ?? null,
    endTime: null,
    allDay: false,
    timezone: null,
    priority: "normal",
    status: "planned",
    projectId: idea.projectId,
    lifeAreaId: idea.lifeAreaId,
    goalId: idea.goalId,
    ideaId: id,
  });

  const now = nowIso();
  db.prepare("update ideas set status = 'planned', converted_action_id = ?, updated_at = ? where id = ?").run(action.id, now, id);
  logLocalIdeaHistory({ ideaId: id, userId, eventType: "converted_to_task", newValue: { actionId: action.id } });

  const updatedIdea = await getIdeaById(id);
  return { idea: updatedIdea!, action };
}

/** Раздел 6: «превратить в цель». */
export async function convertIdeaToGoal(id: string, userId: string): Promise<{ idea: Idea; goal: Goal }> {
  const db = getLocalDb();
  const idea = await getIdeaById(id);
  if (!idea) throw new Error("Идея не найдена");

  const goal = await createGoal(userId, {
    lifeAreaId: idea.lifeAreaId,
    title: idea.text,
    description: idea.notes,
    goalType: "one_time",
    metricType: "text",
    metricUnit: null,
    currentValue: null,
    targetValue: null,
    startDate: nowIso().slice(0, 10),
    deadline: null,
    priority: "normal",
    status: "active",
    criteria: null,
    notes: null,
  });

  const now = nowIso();
  db.prepare("update ideas set status = 'implemented', converted_goal_id = ?, updated_at = ? where id = ?").run(goal.id, now, id);
  logLocalIdeaHistory({ ideaId: id, userId, eventType: "converted_to_goal", newValue: { goalId: goal.id } });

  const updatedIdea = await getIdeaById(id);
  return { idea: updatedIdea!, goal };
}

export async function listIdeaHistory(ideaId: string) {
  const db = getLocalDb();
  const rows = db.prepare("select * from idea_history where idea_id = ? order by created_at desc").all(ideaId) as Row[];
  return rows.map((r) => mapIdeaHistoryEntry({ ...r, old_value: r.old_value ? JSON.parse(r.old_value) : null, new_value: r.new_value ? JSON.parse(r.new_value) : null }));
}

/** Раздел 6: раз в неделю система предлагает разобрать неразобранные идеи. */
export async function countUnreviewedIdeas(userId: string): Promise<number> {
  const db = getLocalDb();
  const row = db.prepare("select count(*) as c from ideas where user_id = ? and status = 'new' and is_archived = 0").get(userId) as Row;
  return row.c as number;
}
