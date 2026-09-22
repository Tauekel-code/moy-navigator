-- ============================================================================
-- «Моё личное расписание» — базовая схема БД (Этап 1-5 ТЗ)
-- Supabase / PostgreSQL. Выполняется через Supabase CLI или SQL editor.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUM-ы
-- ----------------------------------------------------------------------------

create type action_type as enum (
  'meeting', 'task', 'call', 'work', 'personal', 'travel', 'reminder', 'other'
);

create type action_priority as enum ('low', 'normal', 'high', 'critical');

create type action_status as enum (
  'planned', 'in_progress', 'completed', 'overdue', 'cancelled'
);

create type action_event_type as enum (
  'created', 'updated', 'rescheduled', 'status_changed',
  'completed', 'cancelled', 'archived', 'restored'
);

create type recurrence_freq as enum (
  'daily', 'weekdays', 'weekly', 'every_n_days', 'monthly', 'yearly', 'custom'
);

create type reminder_offset_unit as enum (
  'minutes', 'hours', 'days', 'weeks', 'months', 'absolute'
);

create type project_status as enum ('active', 'completed', 'archived');

create type telegram_status as enum ('pending', 'connected', 'disconnected');

create type notification_type as enum (
  'reminder', 'morning_plan', 'evening_review', 'overdue',
  'conflict', 'telegram_status', 'sync_error'
);

create type notification_channel as enum ('in_app', 'telegram', 'email', 'push', 'whatsapp');

-- ----------------------------------------------------------------------------
-- Служебная функция обновления updated_at
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- user_profiles — расширение auth.users
-- ----------------------------------------------------------------------------

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  language text not null default 'ru',
  time_format text not null default '24' check (time_format in ('12', '24')),
  week_start smallint not null default 1 check (week_start between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_profiles_updated_at
  before update on user_profiles
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status project_status not null default 'active',
  color text default '#6366f1',
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  archived_at timestamptz
);

create index idx_projects_user on projects(user_id);

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- contacts
-- ----------------------------------------------------------------------------

create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  company text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index idx_contacts_user on contacts(user_id);

create trigger trg_contacts_updated_at
  before update on contacts
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- recurrence_rules — правило повторения (RFC5545 RRULE), не тысячи записей
-- ----------------------------------------------------------------------------

create table recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  freq recurrence_freq not null,
  interval int not null default 1,
  rrule_string text not null,           -- "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE"
  dtstart date not null,                -- дата первого вхождения (в локальной дате пользователя)
  dtstart_time time,                    -- время начала (может отсутствовать)
  until_date date,                      -- необязательная дата окончания серии
  count int,                            -- необязательное кол-во повторений
  created_at timestamptz not null default now()
);

create index idx_recurrence_rules_user on recurrence_rules(user_id);

-- ----------------------------------------------------------------------------
-- actions — главная сущность
-- ----------------------------------------------------------------------------

create table actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type action_type not null default 'task',
  action_date date,                     -- независима от времени
  start_time time,
  end_time time,
  duration_minutes int,
  all_day boolean not null default false,
  timezone text,                        -- IANA tz на момент создания времени
  priority action_priority not null default 'normal',
  status action_status not null default 'planned',
  deadline_at timestamptz,
  recurrence_rule_id uuid references recurrence_rules(id) on delete set null,
  -- для материализованной серии: ссылка на "родителя", когда серия была разделена
  -- операцией "это и будущие"
  series_root_id uuid references actions(id) on delete set null,
  is_archived boolean not null default false,
  archived_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_actions_user_date on actions(user_id, action_date);
create index idx_actions_user_status on actions(user_id, status);
create index idx_actions_user_archived on actions(user_id, is_archived);
create index idx_actions_deadline on actions(deadline_at) where deadline_at is not null;
create index idx_actions_recurrence on actions(recurrence_rule_id) where recurrence_rule_id is not null;

create trigger trg_actions_updated_at
  before update on actions
  for each row execute function set_updated_at();

-- Исключения для повторяющихся серий: перенос/отмена/правка ОДНОГО вхождения
create table action_occurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions(id) on delete cascade,  -- master action серии
  original_date date not null,          -- какое вхождение переопределяется
  is_cancelled boolean not null default false,
  override jsonb,                       -- переопределённые поля (title, start_time, end_time, ...)
  created_at timestamptz not null default now(),
  unique(action_id, original_date)
);

create index idx_occurrence_exceptions_action on action_occurrence_exceptions(action_id);

-- ----------------------------------------------------------------------------
-- action_context — необязательный смысловой блок
-- ----------------------------------------------------------------------------

create table action_context (
  action_id uuid primary key references actions(id) on delete cascade,
  why_text text,
  goal_text text,
  dont_forget_text text,
  main_argument text,
  questions_text text,
  preparation_text text,
  next_step text,
  links text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger trg_action_context_updated_at
  before update on action_context
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- action_results
-- ----------------------------------------------------------------------------

create table action_results (
  action_id uuid primary key references actions(id) on delete cascade,
  result_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_action_results_updated_at
  before update on action_results
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- action_history — журнал изменений (не удаляется никогда)
-- ----------------------------------------------------------------------------

create table action_history (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type action_event_type not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index idx_action_history_action on action_history(action_id, created_at desc);
create index idx_action_history_user on action_history(user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- reminders
-- ----------------------------------------------------------------------------

create table reminders (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  offset_unit reminder_offset_unit not null,
  offset_value int,                     -- null для 'absolute'
  trigger_at timestamptz not null,      -- вычисленное время срабатывания, пересчитывается при переносе
  is_sent boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_reminders_pending on reminders(trigger_at) where is_sent = false;
create index idx_reminders_action on reminders(action_id);
create index idx_reminders_user on reminders(user_id);

-- ----------------------------------------------------------------------------
-- projects/contacts join tables (many-to-many, готово к расширению)
-- ----------------------------------------------------------------------------

create table action_projects (
  action_id uuid not null references actions(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (action_id, project_id)
);

create index idx_action_projects_project on action_projects(project_id);

create table action_contacts (
  action_id uuid not null references actions(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (action_id, contact_id)
);

create index idx_action_contacts_contact on action_contacts(contact_id);

-- ----------------------------------------------------------------------------
-- related_actions — связанные действия (не зависимость, просто цепочка)
-- ----------------------------------------------------------------------------

create table related_actions (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions(id) on delete cascade,
  related_action_id uuid not null references actions(id) on delete cascade,
  relation_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (action_id, related_action_id),
  check (action_id <> related_action_id)
);

create index idx_related_actions_action on related_actions(action_id);

-- ----------------------------------------------------------------------------
-- daily_reviews — итоги дня
-- ----------------------------------------------------------------------------

create table daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_date date not null,
  planned_count int not null default 0,
  completed_count int not null default 0,
  postponed_count int not null default 0,
  cancelled_count int not null default 0,
  overdue_count int not null default 0,
  in_progress_count int not null default 0,
  main_result text,
  what_failed text,
  important_tomorrow text,
  personal_note text,
  sent_to_telegram_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, review_date)
);

create index idx_daily_reviews_user_date on daily_reviews(user_id, review_date desc);

create trigger trg_daily_reviews_updated_at
  before update on daily_reviews
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- telegram_connections
-- ----------------------------------------------------------------------------

create table telegram_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_chat_id text unique,
  telegram_username text,
  connect_code text unique,
  connect_code_expires_at timestamptz,
  status telegram_status not null default 'pending',
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_telegram_connections_updated_at
  before update on telegram_connections
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- notification_settings
-- ----------------------------------------------------------------------------

create table notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  telegram_enabled boolean not null default false,
  morning_plan_enabled boolean not null default true,
  morning_plan_time time not null default '08:00',
  evening_review_enabled boolean not null default true,
  evening_review_time time not null default '21:00',
  overdue_notify boolean not null default true,
  conflict_notify boolean not null default true,
  default_reminder_offsets jsonb not null default '[{"unit":"minutes","value":30}]',
  updated_at timestamptz not null default now()
);

create trigger trg_notification_settings_updated_at
  before update on notification_settings
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- notifications_log — факт отправки уведомления (для in-app ленты и отладки sync)
-- ----------------------------------------------------------------------------

create table notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_id uuid references actions(id) on delete cascade,
  reminder_id uuid references reminders(id) on delete set null,
  notification_type notification_type not null,
  channel notification_channel not null,
  payload jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_log_user on notifications_log(user_id, created_at desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table user_profiles enable row level security;
alter table projects enable row level security;
alter table contacts enable row level security;
alter table recurrence_rules enable row level security;
alter table actions enable row level security;
alter table action_occurrence_exceptions enable row level security;
alter table action_context enable row level security;
alter table action_results enable row level security;
alter table action_history enable row level security;
alter table reminders enable row level security;
alter table action_projects enable row level security;
alter table action_contacts enable row level security;
alter table related_actions enable row level security;
alter table daily_reviews enable row level security;
alter table telegram_connections enable row level security;
alter table notification_settings enable row level security;
alter table notifications_log enable row level security;

-- user_profiles
create policy "own profile" on user_profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- прямые таблицы с user_id
create policy "own projects" on projects for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own contacts" on contacts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own recurrence_rules" on recurrence_rules for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own actions" on actions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own action_history" on action_history for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own reminders" on reminders for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own daily_reviews" on daily_reviews for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own telegram_connections" on telegram_connections for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own notification_settings" on notification_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own notifications_log" on notifications_log for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- дочерние таблицы без user_id: проверка через родительский action
create policy "own action_occurrence_exceptions" on action_occurrence_exceptions for all
  using (exists (select 1 from actions a where a.id = action_id and a.user_id = auth.uid()))
  with check (exists (select 1 from actions a where a.id = action_id and a.user_id = auth.uid()));

create policy "own action_context" on action_context for all
  using (exists (select 1 from actions a where a.id = action_id and a.user_id = auth.uid()))
  with check (exists (select 1 from actions a where a.id = action_id and a.user_id = auth.uid()));

create policy "own action_results" on action_results for all
  using (exists (select 1 from actions a where a.id = action_id and a.user_id = auth.uid()))
  with check (exists (select 1 from actions a where a.id = action_id and a.user_id = auth.uid()));

create policy "own action_projects" on action_projects for all
  using (exists (select 1 from actions a where a.id = action_id and a.user_id = auth.uid()))
  with check (exists (select 1 from actions a where a.id = action_id and a.user_id = auth.uid()));

create policy "own action_contacts" on action_contacts for all
  using (exists (select 1 from actions a where a.id = action_id and a.user_id = auth.uid()))
  with check (exists (select 1 from actions a where a.id = action_id and a.user_id = auth.uid()));

create policy "own related_actions" on related_actions for all
  using (exists (select 1 from actions a where a.id = action_id and a.user_id = auth.uid()))
  with check (exists (select 1 from actions a where a.id = action_id and a.user_id = auth.uid()));

-- ============================================================================
-- Триггер: создание профиля/настроек при регистрации пользователя
-- ============================================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, timezone, language)
  values (new.id, coalesce(new.raw_user_meta_data->>'timezone', 'UTC'), 'ru');

  insert into public.notification_settings (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
