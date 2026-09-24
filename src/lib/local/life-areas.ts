import "server-only";
import { getLocalDb, nowIso, newId, type SqlValue } from "./db";
import { mapLifeArea, mapLifeAreaScore } from "@/lib/database/mappers";
import type { LifeArea, LifeAreaInput, LifeAreaScore, LifeAreaScoreInput } from "@/types/life-area";
import { DEFAULT_LIFE_AREAS } from "@/types/life-area";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const ROW_SELECT = `
  select la.*,
    (select count(*) from goals g where g.life_area_id = la.id and g.is_archived = 0) as goals_count,
    (select score from life_area_scores s where s.life_area_id = la.id order by s.scored_at desc, s.created_at desc limit 1) as latest_score,
    (select desired_score from life_area_scores s where s.life_area_id = la.id order by s.scored_at desc, s.created_at desc limit 1) as latest_desired_score,
    (select scored_at from life_area_scores s where s.life_area_id = la.id order by s.scored_at desc, s.created_at desc limit 1) as latest_score_date
  from life_areas la
`;

export async function listLifeAreas(userId: string, includeArchived = false): Promise<LifeArea[]> {
  const db = getLocalDb();
  const clause = includeArchived ? "" : "and la.is_archived = 0";
  const rows = db.prepare(`${ROW_SELECT} where la.user_id = ? ${clause} order by la.sort_order asc, la.created_at asc`).all(userId) as Row[];
  return rows.map(mapLifeArea);
}

export async function getLifeAreaById(id: string): Promise<LifeArea | null> {
  const db = getLocalDb();
  const row = db.prepare(`${ROW_SELECT} where la.id = ?`).get(id) as Row | undefined;
  return row ? mapLifeArea(row) : null;
}

export async function createLifeArea(userId: string, input: LifeAreaInput): Promise<LifeArea> {
  const db = getLocalDb();
  const id = newId();
  const now = nowIso();
  const maxOrder = (db.prepare("select coalesce(max(sort_order), -1) as m from life_areas where user_id = ?").get(userId) as Row).m as number;

  db.prepare(
    "insert into life_areas (id, user_id, name, description, color, icon, sort_order, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(id, userId, input.name, input.description, input.color, input.icon, maxOrder + 1, now, now);

  const row = db.prepare(`${ROW_SELECT} where la.id = ?`).get(id) as Row;
  return mapLifeArea(row);
}

export async function updateLifeArea(
  id: string,
  patch: Partial<LifeAreaInput & { sortOrder: number }>,
): Promise<LifeArea> {
  const db = getLocalDb();
  const now = nowIso();

  const fields: string[] = ["updated_at = ?"];
  const values: SqlValue[] = [now];
  const set = (col: string, val: SqlValue) => {
    fields.push(`${col} = ?`);
    values.push(val);
  };

  if (patch.name !== undefined) set("name", patch.name);
  if (patch.description !== undefined) set("description", patch.description);
  if (patch.color !== undefined) set("color", patch.color);
  if (patch.icon !== undefined) set("icon", patch.icon);
  if (patch.sortOrder !== undefined) set("sort_order", patch.sortOrder);

  db.prepare(`update life_areas set ${fields.join(", ")} where id = ?`).run(...values, id);

  const row = db.prepare(`${ROW_SELECT} where la.id = ?`).get(id) as Row;
  return mapLifeArea(row);
}

export async function archiveLifeArea(id: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("update life_areas set is_archived = 1, archived_at = ? where id = ?").run(nowIso(), id);
}

export async function restoreLifeArea(id: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("update life_areas set is_archived = 0, archived_at = null where id = ?").run(id);
}

/** Раздел 3: каждая новая оценка — отдельная историческая запись, старые не перезаписываются. */
export async function addLifeAreaScore(userId: string, lifeAreaId: string, input: LifeAreaScoreInput): Promise<LifeAreaScore> {
  const db = getLocalDb();
  const id = newId();
  const now = nowIso();

  db.prepare(
    "insert into life_area_scores (id, life_area_id, user_id, score, desired_score, scored_at, comment, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(id, lifeAreaId, userId, input.score, input.desiredScore ?? null, input.scoredAt ?? now.slice(0, 10), input.comment ?? null, now);

  const row = db.prepare("select * from life_area_scores where id = ?").get(id) as Row;
  return mapLifeAreaScore(row);
}

export async function listLifeAreaScores(lifeAreaId: string, opts: { from?: string; to?: string } = {}): Promise<LifeAreaScore[]> {
  const db = getLocalDb();
  const clauses = ["life_area_id = ?"];
  const params: SqlValue[] = [lifeAreaId];
  if (opts.from) {
    clauses.push("scored_at >= ?");
    params.push(opts.from);
  }
  if (opts.to) {
    clauses.push("scored_at <= ?");
    params.push(opts.to);
  }
  const rows = db.prepare(`select * from life_area_scores where ${clauses.join(" and ")} order by scored_at asc, created_at asc`).all(...params) as Row[];
  return rows.map(mapLifeAreaScore);
}

/** Раздел 34, шаг 1: базовые сферы при первом запуске. */
export async function seedDefaultLifeAreas(userId: string): Promise<LifeArea[]> {
  const db = getLocalDb();
  const existing = db.prepare("select count(*) as c from life_areas where user_id = ?").get(userId) as Row;
  if ((existing.c as number) > 0) return listLifeAreas(userId);

  const now = nowIso();
  for (let i = 0; i < DEFAULT_LIFE_AREAS.length; i++) {
    const area = DEFAULT_LIFE_AREAS[i];
    db.prepare(
      "insert into life_areas (id, user_id, name, color, icon, sort_order, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(newId(), userId, area.name, area.color, area.icon, i, now, now);
  }

  return listLifeAreas(userId);
}
