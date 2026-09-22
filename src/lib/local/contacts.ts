import "server-only";
import { getLocalDb, nowIso, newId, type SqlValue } from "./db";
import { mapContact, mapAction } from "@/lib/database/mappers";
import type { Contact, ContactInput } from "@/types/contact";
import type { Action } from "@/types/action";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function listContacts(userId: string, includeArchived = false): Promise<Contact[]> {
  const db = getLocalDb();
  const clause = includeArchived ? "" : "and archived_at is null";
  const rows = db
    .prepare(
      `select c.*, (select count(*) from action_contacts acn where acn.contact_id = c.id) as actions_count
       from contacts c where c.user_id = ? ${clause} order by c.name asc`,
    )
    .all(userId) as Row[];

  return rows.map(mapContact);
}

export async function getContactById(id: string): Promise<Contact | null> {
  const db = getLocalDb();
  const row = db.prepare("select * from contacts where id = ?").get(id) as Row | undefined;
  return row ? mapContact(row) : null;
}

export async function getContactInteractionHistory(contactId: string): Promise<Action[]> {
  const db = getLocalDb();
  const rows = db
    .prepare(
      `select a.* from actions a
       join action_contacts acn on acn.action_id = a.id
       where acn.contact_id = ? order by a.action_date desc`,
    )
    .all(contactId) as Row[];

  return rows.map((r) => mapAction({ ...r, all_day: !!r.all_day, is_archived: !!r.is_archived }));
}

export async function createContact(userId: string, input: ContactInput): Promise<Contact> {
  const db = getLocalDb();
  const id = newId();
  const now = nowIso();

  db.prepare(
    "insert into contacts (id, user_id, name, phone, email, company, note, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(id, userId, input.name, input.phone, input.email, input.company, input.note, now, now);

  const row = db.prepare("select * from contacts where id = ?").get(id) as Row;
  return mapContact(row);
}

export async function updateContact(id: string, patch: Partial<ContactInput>): Promise<Contact> {
  const db = getLocalDb();
  const now = nowIso();

  const fields: string[] = ["updated_at = ?"];
  const values: SqlValue[] = [now];
  const set = (col: string, val: SqlValue) => {
    fields.push(`${col} = ?`);
    values.push(val);
  };

  if (patch.name !== undefined) set("name", patch.name);
  if (patch.phone !== undefined) set("phone", patch.phone);
  if (patch.email !== undefined) set("email", patch.email);
  if (patch.company !== undefined) set("company", patch.company);
  if (patch.note !== undefined) set("note", patch.note);

  db.prepare(`update contacts set ${fields.join(", ")} where id = ?`).run(...values, id);

  const row = db.prepare("select * from contacts where id = ?").get(id) as Row;
  return mapContact(row);
}

export async function archiveContact(id: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("update contacts set archived_at = ? where id = ?").run(nowIso(), id);
}

export async function deleteContact(id: string): Promise<void> {
  const db = getLocalDb();
  db.prepare("delete from action_contacts where contact_id = ?").run(id);
  db.prepare("delete from contacts where id = ?").run(id);
}
