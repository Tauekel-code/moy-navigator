import "server-only";
import { getLocalDb, nowIso, newId, type SqlValue } from "./db";
import { mapProject } from "@/lib/database/mappers";
import type { Project, ProjectInput } from "@/types/project";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function listProjects(userId: string, includeArchived = false): Promise<Project[]> {
  const db = getLocalDb();
  const clause = includeArchived ? "" : "and status != 'archived'";
  const rows = db
    .prepare(
      `select p.*, (select count(*) from action_projects apj where apj.project_id = p.id) as actions_count
       from projects p where p.user_id = ? ${clause} order by p.created_at desc`,
    )
    .all(userId) as Row[];

  return rows.map(mapProject);
}

export async function getProjectById(id: string): Promise<Project | null> {
  const db = getLocalDb();
  const row = db.prepare("select * from projects where id = ?").get(id) as Row | undefined;
  return row ? mapProject(row) : null;
}

export async function createProject(userId: string, input: ProjectInput): Promise<Project> {
  const db = getLocalDb();
  const id = newId();
  const now = nowIso();

  db.prepare(
    "insert into projects (id, user_id, name, description, status, color, icon, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(id, userId, input.name, input.description, input.status, input.color, input.icon, now, now);

  const row = db.prepare("select * from projects where id = ?").get(id) as Row;
  return mapProject(row);
}

export async function updateProject(id: string, patch: Partial<ProjectInput>): Promise<Project> {
  const db = getLocalDb();
  const now = nowIso();

  const fields: string[] = ["updated_at = ?"];
  const values: SqlValue[] = [now];
  if (patch.name !== undefined) {
    fields.push("name = ?");
    values.push(patch.name);
  }
  if (patch.description !== undefined) {
    fields.push("description = ?");
    values.push(patch.description);
  }
  if (patch.status !== undefined) {
    fields.push("status = ?");
    values.push(patch.status);
    if (patch.status === "completed") {
      fields.push("completed_at = ?");
      values.push(now);
    }
    if (patch.status === "archived") {
      fields.push("archived_at = ?");
      values.push(now);
    }
  }
  if (patch.color !== undefined) {
    fields.push("color = ?");
    values.push(patch.color);
  }
  if (patch.icon !== undefined) {
    fields.push("icon = ?");
    values.push(patch.icon);
  }

  db.prepare(`update projects set ${fields.join(", ")} where id = ?`).run(...values, id);

  const row = db.prepare("select * from projects where id = ?").get(id) as Row;
  return mapProject(row);
}

export async function deleteProject(id: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("delete from action_projects where project_id = ?").run(id);
  db.prepare("delete from projects where id = ?").run(id);
}
