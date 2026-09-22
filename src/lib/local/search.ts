import "server-only";
import { getLocalDb } from "./db";
import { mapAction } from "@/lib/database/mappers";
import type { Action } from "@/types/action";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export interface SearchResult {
  actions: Action[];
  projects: { id: string; name: string }[];
  contacts: { id: string; name: string }[];
}

// SQLite LIKE/lower() не понимают регистр кириллицы без ICU-расширения,
// поэтому текстовый поиск делаем в JS (сравнение через toLowerCase()),
// а не через SQL LIKE — так "клиент" находит и "Клиент".
function includesCi(haystack: string | null | undefined, needle: string): boolean {
  return !!haystack && haystack.toLowerCase().includes(needle);
}

export async function globalSearch(userId: string, query: string): Promise<SearchResult> {
  const db = getLocalDb();
  const needle = query.toLowerCase();

  const actionRows = db.prepare("select * from actions where user_id = ? and is_archived = 0").all(userId) as Row[];
  const contextRows = db.prepare("select c.* from action_context c join actions a on a.id = c.action_id where a.user_id = ?").all(userId) as Row[];
  const resultRows = db.prepare("select r.* from action_results r join actions a on a.id = r.action_id where a.user_id = ?").all(userId) as Row[];
  const allProjects = db.prepare("select id, name from projects where user_id = ?").all(userId) as Row[];
  const allContacts = db.prepare("select id, name from contacts where user_id = ?").all(userId) as Row[];

  const matchedActionIds = new Set<string>();
  for (const row of actionRows) {
    if (includesCi(row.title, needle)) matchedActionIds.add(row.id);
  }
  for (const row of contextRows) {
    const fields = [row.why_text, row.goal_text, row.dont_forget_text, row.main_argument, row.questions_text, row.preparation_text, row.next_step];
    if (fields.some((f) => includesCi(f, needle))) matchedActionIds.add(row.action_id);
  }
  for (const row of resultRows) {
    if (includesCi(row.result_text, needle)) matchedActionIds.add(row.action_id);
  }

  const actionsById = new Map(actionRows.map((r) => [r.id, r]));
  const actions = Array.from(matchedActionIds)
    .map((id) => actionsById.get(id))
    .filter((row): row is Row => !!row)
    .slice(0, 30)
    .map((row) => mapAction({ ...row, all_day: !!row.all_day, is_archived: !!row.is_archived }));

  const projects = allProjects.filter((p) => includesCi(p.name, needle)).slice(0, 10);
  const contacts = allContacts.filter((c) => includesCi(c.name, needle)).slice(0, 10);

  return {
    actions: actions.sort((a, b) => (b.actionDate ?? "").localeCompare(a.actionDate ?? "")),
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
    contacts: contacts.map((c) => ({ id: c.id, name: c.name })),
  };
}
