-- Life Tracker: core schema
--
-- Conventions
--   * Every user-owned row carries user_id and is protected by row-level security (RLS).
--   * Child tables use composite foreign keys (parent_id, user_id) so a row can never point at
--     another user's parent, which keeps the RLS policies a simple "user_id = me" check.
--   * Weights are always stored in kilograms; the UI converts to the user's preferred unit.
--   * Dates that mean "a day in the user's life" (entry_date, workout_date, occurrence_date) are
--     plain `date` values in the user's own timezone, stored on their profile.
--   * Weekdays use ISO numbering: 1 = Monday ... 7 = Sunday.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user, created automatically on sign-up)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text check (char_length(display_name) <= 60),
  timezone text not null default 'UTC' check (public.is_valid_timezone(timezone)),
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  weekly_workout_goal smallint not null default 3 check (weekly_workout_goal between 1 and 14),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz text := coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC');
  u text := new.raw_user_meta_data ->> 'unit';
begin
  if not public.is_valid_timezone(tz) then
    tz := 'UTC';
  end if;
  insert into public.profiles (id, email, display_name, timezone, unit)
  values (
    new.id,
    new.email,
    left(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 60),
    tz,
    case when u in ('kg', 'lb') then u else 'kg' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Body weight
-- ---------------------------------------------------------------------------

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entry_date date not null,
  weight_kg numeric(6, 2) not null check (weight_kg > 0 and weight_kg < 1000),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create trigger weight_entries_touch before update on public.weight_entries
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Exercises: built-in library (user_id is null) plus each user's own
-- ---------------------------------------------------------------------------

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  muscle_group text not null check (
    muscle_group in ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core', 'full_body', 'cardio', 'other')
  ),
  -- What a set of this exercise records:
  --   weight_reps      weight x reps (bench press)
  --   bodyweight_reps  reps, with optional added weight (pull-up)
  --   duration         time held/performed (plank)
  --   distance_time    distance and time (treadmill run)
  kind text not null check (kind in ('weight_reps', 'bodyweight_reps', 'duration', 'distance_time')),
  created_at timestamptz not null default now()
);

create unique index exercises_name_per_owner
  on public.exercises (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- True when the current user may use the exercise (built-in or their own).
create or replace function public.can_use_exercise(p_exercise_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.exercises e
    where e.id = p_exercise_id and (e.user_id is null or e.user_id = (select auth.uid()))
  );
$$;

-- ---------------------------------------------------------------------------
-- Routines (workout templates)
-- ---------------------------------------------------------------------------

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create trigger routines_touch before update on public.routines
  for each row execute function public.touch_updated_at();

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null,
  user_id uuid not null default auth.uid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position smallint not null check (position >= 0),
  target_sets smallint not null default 3 check (target_sets between 1 and 20),
  target_reps smallint check (target_reps between 1 and 100),
  rest_seconds smallint not null default 90 check (rest_seconds between 0 and 900),
  foreign key (routine_id, user_id) references public.routines (id, user_id) on delete cascade,
  unique (routine_id, position)
);

-- ---------------------------------------------------------------------------
-- Workouts and sets
-- ---------------------------------------------------------------------------

create table public.workouts (
  -- Generated on the phone so a save can be retried after a dropped connection without
  -- creating duplicates (see save_workout).
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  workout_date date not null,
  name text not null default 'Workout' check (char_length(trim(name)) between 1 and 80),
  routine_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (routine_id, user_id) references public.routines (id, user_id) on delete set null (routine_id)
);

create index workouts_user_date on public.workouts (user_id, workout_date desc);

create trigger workouts_touch before update on public.workouts
  for each row execute function public.touch_updated_at();

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null,
  user_id uuid not null default auth.uid(),
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  exercise_position smallint not null check (exercise_position >= 0),
  set_number smallint not null check (set_number >= 1),
  reps smallint check (reps between 0 and 1000),
  weight_kg numeric(6, 2) check (weight_kg >= 0 and weight_kg < 1000),
  duration_seconds integer check (duration_seconds between 0 and 86400),
  distance_m numeric(9, 1) check (distance_m >= 0 and distance_m < 1000000),
  is_warmup boolean not null default false,
  is_pr boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (workout_id, user_id) references public.workouts (id, user_id) on delete cascade,
  unique (workout_id, exercise_position, set_number)
);

create index workout_sets_user_exercise on public.workout_sets (user_id, exercise_id);

-- ---------------------------------------------------------------------------
-- To-dos (one-off or recurring) and their completions
-- ---------------------------------------------------------------------------

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  notes text check (char_length(notes) <= 1000),
  schedule text not null check (schedule in ('once', 'daily', 'weekly', 'monthly')),
  due_date date,          -- required for 'once'
  weekdays smallint[],    -- required for 'weekly' (ISO 1..7)
  month_day smallint check (month_day between 1 and 31), -- required for 'monthly'; clamps to month end
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (schedule <> 'once' or due_date is not null),
  check (schedule <> 'weekly' or (cardinality(weekdays) between 1 and 7 and weekdays <@ '{1,2,3,4,5,6,7}')),
  check (schedule <> 'monthly' or month_day is not null)
);

create trigger todos_touch before update on public.todos
  for each row execute function public.touch_updated_at();

create table public.todo_completions (
  todo_id uuid not null,
  user_id uuid not null default auth.uid(),
  occurrence_date date not null,
  completed_at timestamptz not null default now(),
  primary key (todo_id, occurrence_date),
  foreign key (todo_id, user_id) references public.todos (id, user_id) on delete cascade
);

create index todo_completions_user on public.todo_completions (user_id, occurrence_date);

-- ---------------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------------

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- weight:  fires if no weight entry for the day
  -- workout: fires if no workout logged for the day (weekdays = your gym days)
  -- todo:    fires if the linked to-do is due that day and not completed
  kind text not null check (kind in ('weight', 'workout', 'todo')),
  todo_id uuid,
  label text check (char_length(label) <= 80),
  time_of_day time not null,
  weekdays smallint[] not null default '{1,2,3,4,5,6,7}'
    check (cardinality(weekdays) between 1 and 7 and weekdays <@ '{1,2,3,4,5,6,7}'),
  channel text not null default 'push' check (channel in ('push', 'email', 'both')),
  follow_up_minutes smallint check (follow_up_minutes between 5 and 720),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (todo_id, user_id) references public.todos (id, user_id) on delete cascade,
  check ((kind = 'todo') = (todo_id is not null))
);

create unique index reminders_one_per_todo on public.reminders (todo_id) where todo_id is not null;
create index reminders_enabled on public.reminders (enabled) where enabled;

create trigger reminders_touch before update on public.reminders
  for each row execute function public.touch_updated_at();

-- One row per reminder, day and stage. The unique constraint is what stops two overlapping
-- dispatcher runs from sending the same notification twice.
create table public.reminder_events (
  id bigint generated always as identity primary key,
  reminder_id uuid not null references public.reminders (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  occurrence_date date not null,
  stage text not null check (stage in ('initial', 'follow_up', 'dismissed')),
  delivered_via text[] not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  unique (reminder_id, occurrence_date, stage)
);

create index reminder_events_user_date on public.reminder_events (user_id, occurrence_date);

-- ---------------------------------------------------------------------------
-- Web push subscriptions (one per installed device)
-- ---------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.weight_entries enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.todos enable row level security;
alter table public.todo_completions enable row level security;
alter table public.reminders enable row level security;
alter table public.reminder_events enable row level security;
alter table public.push_subscriptions enable row level security;

-- Profiles: read and edit your own. Email is synced from auth and not user-editable.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Plain owner-only tables.
create policy "weight_entries: owner" on public.weight_entries
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "routines: owner" on public.routines
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "workouts: owner" on public.workouts
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "todos: owner" on public.todos
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "todo_completions: owner" on public.todo_completions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "push_subscriptions: owner" on public.push_subscriptions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Exercises: everyone reads the built-in library; you manage only your own.
create policy "exercises: read library and own" on public.exercises
  for select to authenticated using (user_id is null or user_id = (select auth.uid()));
create policy "exercises: insert own" on public.exercises
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "exercises: update own" on public.exercises
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "exercises: delete own" on public.exercises
  for delete to authenticated using (user_id = (select auth.uid()));

-- Rows that reference an exercise may only use one you can see.
create policy "routine_exercises: owner" on public.routine_exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_use_exercise(exercise_id));
create policy "workout_sets: owner" on public.workout_sets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_use_exercise(exercise_id));

-- Reminders: owner-only. Events are written by the dispatcher (service role); users can read
-- their own and add a 'dismissed' marker for one of their own reminders.
create policy "reminders: owner" on public.reminders
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reminder_events: read own" on public.reminder_events
  for select to authenticated using (user_id = (select auth.uid()));
create policy "reminder_events: dismiss own" on public.reminder_events
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and stage = 'dismissed'
    and exists (select 1 from public.reminders r where r.id = reminder_id and r.user_id = (select auth.uid()))
  );
create policy "reminder_events: undo own dismiss" on public.reminder_events
  for delete to authenticated
  using (user_id = (select auth.uid()) and stage = 'dismissed');

-- ---------------------------------------------------------------------------
-- Grants. Explicit so the app works whether or not the project auto-exposes new tables.
-- Anonymous visitors get nothing.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated, service_role;

grant select on public.profiles to authenticated;
grant update (display_name, timezone, unit, weekly_workout_goal) on public.profiles to authenticated;

grant select, insert, update, delete on
  public.weight_entries, public.exercises, public.routines, public.routine_exercises,
  public.workouts, public.workout_sets, public.todos, public.todo_completions,
  public.reminders, public.push_subscriptions
  to authenticated;
grant select, insert, delete on public.reminder_events to authenticated;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
