-- ============================================================================
-- «Мой личный навигатор» — расширение схемы 0001_init.sql (Дополнение к ТЗ)
-- Сферы жизни, цели/подцели, входящие идеи, план дня, расширенная история.
-- Максимально переиспользует существующие сущности: actions = задачи,
-- action_history = task_history, reminders = task_reminders,
-- telegram_connections, notifications_log = notifications,
-- user_profiles/notification_settings = user_settings.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Новые ENUM-ы
-- ----------------------------------------------------------------------------

create type goal_type as enum ('one_time', 'long_term', 'recurring');
create type goal_metric_type as enum ('number', 'percent', 'money', 'action_count', 'score_0_10', 'text');
create type goal_status as enum ('active', 'completed', 'paused', 'cancelled');
create type subgoal_status as enum ('planned', 'in_progress', 'completed', 'cancelled');

create type idea_status as enum ('new', 'reviewing', 'planned', 'implemented', 'postponed', 'cancelled');
create type idea_source as enum ('text', 'voice', 'quick_add');

create type goal_event_type as enum ('created', 'updated', 'status_changed', 'progress_updated', 'archived', 'restored');
create type idea_event_type as enum ('created', 'updated', 'status_changed', 'converted_to_task', 'converted_to_goal', 'archived', 'restored', 'deleted');

create type daily_plan_status as enum ('proposed', 'accepted', 'modified');

-- Раздел 8: дополнительные статусы задач ("Пропущено", "Отложено").
-- "Перенесено" сознательно не статус — перенос отражается в task_history
-- (event_type='rescheduled'), а не как отдельное состояние задачи.
alter type action_status add value if not exists 'skipped';
alter type action_status add value if not exists 'deferred';

-- Раздел 22: недельный обзор в Telegram
alter type notification_type add value if not exists 'weekly_review';

-- ----------------------------------------------------------------------------
-- Раздел 3: сферы жизни
-- ----------------------------------------------------------------------------

create table life_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text default '#6366f1',
  icon text,
  sort_order int not null default 0,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_life_areas_user on life_areas(user_id);

create trigger trg_life_areas_updated_at
  before update on life_areas
  for each row execute function set_updated_at();

-- Раздел 3: история оценок сферы — append-only, старые оценки НИКОГДА не перезаписываются.
create table life_area_scores (
  id uuid primary key default gen_random_uuid(),
  life_area_id uuid not null references life_areas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score smallint not null check (score between 0 and 10),
  desired_score smallint check (desired_score between 0 and 10),
  scored_at date not null default current_date,
  comment text,
  created_at timestamptz not null default now()
);

create index idx_life_area_scores_area on life_area_scores(life_area_id, scored_at desc);

-- ----------------------------------------------------------------------------
-- Раздел 4-5: цели и подцели
-- ----------------------------------------------------------------------------

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references life_areas(id) on delete set null,
  title text not null,
  description text,
  goal_type goal_type not null default 'one_time',
  metric_type goal_metric_type not null default 'text',
  metric_unit text,
  current_value numeric,
  target_value numeric,
  start_date date not null default current_date,
  deadline date,
  priority action_priority not null default 'normal',
  status goal_status not null default 'active',
  criteria text,
  notes text,
  is_archived boolean not null default false,
  archived_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_goals_user on goals(user_id);
create index idx_goals_life_area on goals(life_area_id);

create trigger trg_goals_updated_at
  before update on goals
  for each row execute function set_updated_at();

-- История показателя цели (раздел 26: goal_scores) — снимки текущего значения во времени.
create table goal_scores (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value numeric not null,
  recorded_at date not null default current_date,
  comment text,
  created_at timestamptz not null default now()
);

create index idx_goal_scores_goal on goal_scores(goal_id, recorded_at desc);

create table subgoals (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  deadline date,
  status subgoal_status not null default 'planned',
  metric_value numeric,
  metric_target numeric,
  metric_unit text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_subgoals_goal on subgoals(goal_id);

create trigger trg_subgoals_updated_at
  before update on subgoals
  for each row execute function set_updated_at();

-- Раздел 27: отдельная история изменений цели.
create table goal_history (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type goal_event_type not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index idx_goal_history_goal on goal_history(goal_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Раздел 6: входящие идеи
-- ----------------------------------------------------------------------------

create table ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  status idea_status not null default 'new',
  source idea_source not null default 'text',
  life_area_id uuid references life_areas(id) on delete set null,
  goal_id uuid references goals(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  converted_action_id uuid references actions(id) on delete set null,
  converted_goal_id uuid references goals(id) on delete set null,
  notes text,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ideas_user on ideas(user_id, status);

create trigger trg_ideas_updated_at
  before update on ideas
  for each row execute function set_updated_at();

create table idea_history (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type idea_event_type not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index idx_idea_history_idea on idea_history(idea_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Связь задач со сферами/целями/подцелями (раздел 8, 19)
-- ----------------------------------------------------------------------------

alter table actions add column life_area_id uuid references life_areas(id) on delete set null;
alter table actions add column goal_id uuid references goals(id) on delete set null;
alter table actions add column subgoal_id uuid references subgoals(id) on delete set null;
alter table actions add column idea_id uuid references ideas(id) on delete set null;
alter table actions add column actual_minutes int;

create index idx_actions_goal on actions(goal_id) where goal_id is not null;
create index idx_actions_life_area on actions(life_area_id) where life_area_id is not null;

-- ----------------------------------------------------------------------------
-- Раздел 11-12: план дня
-- ----------------------------------------------------------------------------

create table daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  status daily_plan_status not null default 'proposed',
  generated_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create trigger trg_daily_plans_updated_at
  before update on daily_plans
  for each row execute function set_updated_at();

create table daily_plan_items (
  id uuid primary key default gen_random_uuid(),
  daily_plan_id uuid not null references daily_plans(id) on delete cascade,
  action_id uuid not null references actions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sort_order int not null default 0,
  is_required boolean not null default false,
  included boolean not null default true,
  created_at timestamptz not null default now(),
  unique (daily_plan_id, action_id)
);

create index idx_daily_plan_items_plan on daily_plan_items(daily_plan_id);

-- ----------------------------------------------------------------------------
-- Раздел 2, 34: рабочее время и статус онбординга (расширение user_profiles)
-- ----------------------------------------------------------------------------

alter table user_profiles add column work_start_time time not null default '09:00';
alter table user_profiles add column work_end_time time not null default '19:00';
alter table user_profiles add column onboarding_completed_at timestamptz;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table life_areas enable row level security;
alter table life_area_scores enable row level security;
alter table goals enable row level security;
alter table goal_scores enable row level security;
alter table subgoals enable row level security;
alter table goal_history enable row level security;
alter table ideas enable row level security;
alter table idea_history enable row level security;
alter table daily_plans enable row level security;
alter table daily_plan_items enable row level security;

create policy "own life_areas" on life_areas for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own goals" on goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own subgoals" on subgoals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own goal_history" on goal_history for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own ideas" on ideas for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own idea_history" on idea_history for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own daily_plans" on daily_plans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own daily_plan_items" on daily_plan_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own life_area_scores" on life_area_scores for all
  using (exists (select 1 from life_areas la where la.id = life_area_id and la.user_id = auth.uid()))
  with check (exists (select 1 from life_areas la where la.id = life_area_id and la.user_id = auth.uid()));

create policy "own goal_scores" on goal_scores for all
  using (exists (select 1 from goals g where g.id = goal_id and g.user_id = auth.uid()))
  with check (exists (select 1 from goals g where g.id = goal_id and g.user_id = auth.uid()));
