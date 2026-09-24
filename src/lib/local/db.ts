import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { LOCAL_USER_ID } from "@/lib/config";

const DB_DIR = join(process.cwd(), ".local-data");
const DB_PATH = join(DB_DIR, "app.db");

const SCHEMA = `
create table if not exists user_profiles (
  id text primary key,
  display_name text,
  timezone text not null default 'UTC',
  language text not null default 'ru',
  time_format text not null default '24',
  week_start integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create table if not exists projects (
  id text primary key,
  user_id text not null,
  name text not null,
  description text,
  status text not null default 'active',
  color text default '#6366f1',
  icon text,
  created_at text not null,
  updated_at text not null,
  completed_at text,
  archived_at text
);

create table if not exists contacts (
  id text primary key,
  user_id text not null,
  name text not null,
  phone text,
  email text,
  company text,
  note text,
  created_at text not null,
  updated_at text not null,
  archived_at text
);

create table if not exists recurrence_rules (
  id text primary key,
  user_id text not null,
  freq text not null,
  interval integer not null default 1,
  rrule_string text not null,
  dtstart text not null,
  dtstart_time text,
  until_date text,
  count integer,
  created_at text not null
);

create table if not exists actions (
  id text primary key,
  user_id text not null,
  title text not null,
  type text not null default 'task',
  action_date text,
  start_time text,
  end_time text,
  duration_minutes integer,
  all_day integer not null default 0,
  timezone text,
  priority text not null default 'normal',
  status text not null default 'planned',
  deadline_at text,
  recurrence_rule_id text,
  series_root_id text,
  is_archived integer not null default 0,
  archived_at text,
  completed_at text,
  cancelled_at text,
  created_at text not null,
  updated_at text not null
);
create index if not exists idx_actions_user_date on actions(user_id, action_date);
create index if not exists idx_actions_recurrence on actions(recurrence_rule_id);

create table if not exists action_occurrence_exceptions (
  id text primary key,
  action_id text not null,
  original_date text not null,
  is_cancelled integer not null default 0,
  override text,
  created_at text not null,
  unique(action_id, original_date)
);

create table if not exists action_context (
  action_id text primary key,
  why_text text,
  goal_text text,
  dont_forget_text text,
  main_argument text,
  questions_text text,
  preparation_text text,
  next_step text,
  links text not null default '[]',
  updated_at text not null
);

create table if not exists action_results (
  action_id text primary key,
  result_text text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists action_history (
  id text primary key,
  action_id text not null,
  user_id text not null,
  event_type text not null,
  old_value text,
  new_value text,
  created_at text not null
);
create index if not exists idx_action_history_action on action_history(action_id, created_at);

create table if not exists reminders (
  id text primary key,
  action_id text not null,
  user_id text not null,
  offset_unit text not null,
  offset_value integer,
  trigger_at text not null,
  is_sent integer not null default 0,
  sent_at text,
  created_at text not null
);
create index if not exists idx_reminders_pending on reminders(trigger_at, is_sent);

create table if not exists action_projects (
  action_id text not null,
  project_id text not null,
  is_primary integer not null default 1,
  created_at text not null,
  primary key (action_id, project_id)
);

create table if not exists action_contacts (
  action_id text not null,
  contact_id text not null,
  is_primary integer not null default 1,
  created_at text not null,
  primary key (action_id, contact_id)
);

create table if not exists related_actions (
  id text primary key,
  action_id text not null,
  related_action_id text not null,
  relation_order integer not null default 0,
  created_at text not null,
  unique (action_id, related_action_id)
);

create table if not exists daily_reviews (
  id text primary key,
  user_id text not null,
  review_date text not null,
  planned_count integer not null default 0,
  completed_count integer not null default 0,
  postponed_count integer not null default 0,
  cancelled_count integer not null default 0,
  overdue_count integer not null default 0,
  in_progress_count integer not null default 0,
  main_result text,
  what_failed text,
  important_tomorrow text,
  personal_note text,
  sent_to_telegram_at text,
  created_at text not null,
  updated_at text not null,
  unique (user_id, review_date)
);

create table if not exists notification_settings (
  user_id text primary key,
  in_app_enabled integer not null default 1,
  telegram_enabled integer not null default 0,
  morning_plan_enabled integer not null default 1,
  morning_plan_time text not null default '08:00',
  evening_review_enabled integer not null default 1,
  evening_review_time text not null default '21:00',
  overdue_notify integer not null default 1,
  conflict_notify integer not null default 1,
  default_reminder_offsets text not null default '[{"unit":"minutes","value":30}]',
  updated_at text not null
);

create table if not exists notifications_log (
  id text primary key,
  user_id text not null,
  action_id text,
  reminder_id text,
  notification_type text not null,
  channel text not null,
  payload text,
  is_read integer not null default 0,
  created_at text not null
);
create index if not exists idx_notifications_log_user on notifications_log(user_id, created_at);

-- ===== «Мой личный навигатор» (Дополнение к ТЗ) =====

create table if not exists life_areas (
  id text primary key,
  user_id text not null,
  name text not null,
  description text,
  color text default '#6366f1',
  icon text,
  sort_order integer not null default 0,
  is_archived integer not null default 0,
  archived_at text,
  created_at text not null,
  updated_at text not null
);

create table if not exists life_area_scores (
  id text primary key,
  life_area_id text not null,
  user_id text not null,
  score integer not null,
  desired_score integer,
  scored_at text not null,
  comment text,
  created_at text not null
);
create index if not exists idx_life_area_scores_area on life_area_scores(life_area_id, scored_at);

create table if not exists goals (
  id text primary key,
  user_id text not null,
  life_area_id text,
  title text not null,
  description text,
  goal_type text not null default 'one_time',
  metric_type text not null default 'text',
  metric_unit text,
  current_value real,
  target_value real,
  start_date text not null,
  deadline text,
  priority text not null default 'normal',
  status text not null default 'active',
  criteria text,
  notes text,
  is_archived integer not null default 0,
  archived_at text,
  completed_at text,
  created_at text not null,
  updated_at text not null
);
create index if not exists idx_goals_life_area on goals(life_area_id);

create table if not exists goal_scores (
  id text primary key,
  goal_id text not null,
  user_id text not null,
  value real not null,
  recorded_at text not null,
  comment text,
  created_at text not null
);
create index if not exists idx_goal_scores_goal on goal_scores(goal_id, recorded_at);

create table if not exists subgoals (
  id text primary key,
  goal_id text not null,
  user_id text not null,
  title text not null,
  deadline text,
  status text not null default 'planned',
  metric_value real,
  metric_target real,
  metric_unit text,
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  completed_at text
);
create index if not exists idx_subgoals_goal on subgoals(goal_id);

create table if not exists goal_history (
  id text primary key,
  goal_id text not null,
  user_id text not null,
  event_type text not null,
  old_value text,
  new_value text,
  created_at text not null
);
create index if not exists idx_goal_history_goal on goal_history(goal_id, created_at);

create table if not exists ideas (
  id text primary key,
  user_id text not null,
  text text not null,
  status text not null default 'new',
  source text not null default 'text',
  life_area_id text,
  goal_id text,
  project_id text,
  converted_action_id text,
  converted_goal_id text,
  notes text,
  is_archived integer not null default 0,
  archived_at text,
  created_at text not null,
  updated_at text not null
);
create index if not exists idx_ideas_user on ideas(user_id, status);

create table if not exists idea_history (
  id text primary key,
  idea_id text not null,
  user_id text not null,
  event_type text not null,
  old_value text,
  new_value text,
  created_at text not null
);
create index if not exists idx_idea_history_idea on idea_history(idea_id, created_at);

create table if not exists daily_plans (
  id text primary key,
  user_id text not null,
  plan_date text not null,
  status text not null default 'proposed',
  generated_at text not null,
  accepted_at text,
  created_at text not null,
  updated_at text not null,
  unique (user_id, plan_date)
);

create table if not exists daily_plan_items (
  id text primary key,
  daily_plan_id text not null,
  action_id text not null,
  user_id text not null,
  sort_order integer not null default 0,
  is_required integer not null default 0,
  included integer not null default 1,
  created_at text not null,
  unique (daily_plan_id, action_id)
);
create index if not exists idx_daily_plan_items_plan on daily_plan_items(daily_plan_id);
`;

declare global {
  var __localDb: DatabaseSync | undefined;
}

function ensureColumn(db: DatabaseSync, table: string, column: string, definition: string) {
  const cols = db.prepare(`pragma table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`alter table ${table} add column ${column} ${definition}`);
  }
}

function initDb(): DatabaseSync {
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  db.exec("pragma journal_mode = WAL;");
  db.exec("pragma foreign_keys = on;");
  db.exec(SCHEMA);

  // «Мой личный навигатор»: связь задач со сферами/целями + рабочее время профиля.
  ensureColumn(db, "actions", "life_area_id", "text");
  ensureColumn(db, "actions", "goal_id", "text");
  ensureColumn(db, "actions", "subgoal_id", "text");
  ensureColumn(db, "actions", "idea_id", "text");
  ensureColumn(db, "actions", "actual_minutes", "integer");
  ensureColumn(db, "user_profiles", "work_start_time", "text not null default '09:00'");
  ensureColumn(db, "user_profiles", "work_end_time", "text not null default '19:00'");
  ensureColumn(db, "user_profiles", "onboarding_completed_at", "text");

  const now = new Date().toISOString();
  const profileExists = db.prepare("select 1 from user_profiles where id = ?").get(LOCAL_USER_ID);
  if (!profileExists) {
    db.prepare(
      "insert into user_profiles (id, timezone, language, time_format, week_start, created_at, updated_at) values (?, 'UTC', 'ru', '24', 1, ?, ?)",
    ).run(LOCAL_USER_ID, now, now);
    db.prepare("insert into notification_settings (user_id, updated_at) values (?, ?)").run(LOCAL_USER_ID, now);
  }

  return db;
}

/** Singleton-соединение с локальной SQLite-базой (переживает горячую перезагрузку в dev-режиме). */
export function getLocalDb(): DatabaseSync {
  if (!globalThis.__localDb) {
    globalThis.__localDb = initDb();
  }
  return globalThis.__localDb;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function toBool(value: number | null | undefined): boolean {
  return !!value;
}

export function fromBool(value: boolean | undefined): number {
  return value ? 1 : 0;
}

/** Тип значения, которое node:sqlite принимает как параметр запроса. */
export type SqlValue = null | number | bigint | string | NodeJS.ArrayBufferView;

const ALL_TABLES = [
  "notifications_log",
  "action_history",
  "reminders",
  "action_occurrence_exceptions",
  "action_context",
  "action_results",
  "related_actions",
  "action_projects",
  "action_contacts",
  "daily_reviews",
  "daily_plan_items",
  "daily_plans",
  "idea_history",
  "ideas",
  "goal_history",
  "goal_scores",
  "subgoals",
  "goals",
  "life_area_scores",
  "life_areas",
  "actions",
  "recurrence_rules",
  "projects",
  "contacts",
];

/** Раздел 68 ТЗ для локального режима: "удалить аккаунт" = полностью очистить локальные данные. */
export function wipeLocalData() {
  const db = getLocalDb();
  db.exec("begin");
  try {
    for (const table of ALL_TABLES) db.exec(`delete from ${table}`);
    db.exec("commit");
  } catch (err) {
    db.exec("rollback");
    throw err;
  }
}
