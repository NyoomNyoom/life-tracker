-- Life Tracker: teeth brushing, distance challenges and achievements.

-- ---------------------------------------------------------------------------
-- Teeth brushing: a morning and a night check-in per local day, with optional extras.
-- A row means "brushed"; deleting it un-ticks the slot.
-- ---------------------------------------------------------------------------

create table public.brushing_logs (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  log_date date not null,
  slot text not null check (slot in ('morning', 'night')),
  flossed boolean not null default false,
  mouthwash boolean not null default false,
  logged_at timestamptz not null default now(),
  primary key (user_id, log_date, slot)
);

alter table public.brushing_logs enable row level security;
create policy "brushing_logs: owner" on public.brushing_logs
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.brushing_logs to authenticated;
grant all on public.brushing_logs to service_role;

-- ---------------------------------------------------------------------------
-- Distance challenges. The routes and checkpoints live in code (lib/challenges.ts);
-- this table records which ones you've joined. Distance from workouts dated on or after
-- start_date counts toward the challenge.
-- ---------------------------------------------------------------------------

create table public.challenge_entries (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  challenge_slug text not null check (challenge_slug ~ '^[a-z0-9-]{1,40}$'),
  start_date date not null,
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, challenge_slug)
);

alter table public.challenge_entries enable row level security;
create policy "challenge_entries: owner" on public.challenge_entries
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.challenge_entries to authenticated;
grant all on public.challenge_entries to service_role;

-- Distance (metres) logged toward each challenge you've joined.
create or replace function public.challenge_distances()
returns table (challenge_slug text, start_date date, completed_at timestamptz, distance_m numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.challenge_slug,
    c.start_date,
    c.completed_at,
    coalesce((
      select sum(s.distance_m)
      from public.workout_sets s
      join public.workouts w on w.id = s.workout_id
      where s.user_id = c.user_id
        and w.workout_date >= c.start_date
        and s.distance_m > 0
    ), 0)
  from public.challenge_entries c
  where c.user_id = (select auth.uid());
$$;

revoke execute on function public.challenge_distances() from public, anon;
grant execute on function public.challenge_distances() to authenticated;

-- ---------------------------------------------------------------------------
-- Achievements: badges, checkpoints and medals you've earned. Keys are defined in code
-- (lib/achievements.ts). Earned once, kept forever.
-- ---------------------------------------------------------------------------

create table public.achievements (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9:_-]{1,80}$'),
  awarded_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.achievements enable row level security;
create policy "achievements: read own" on public.achievements
  for select to authenticated using (user_id = (select auth.uid()));
create policy "achievements: earn own" on public.achievements
  for insert to authenticated with check (user_id = (select auth.uid()));
grant select, insert on public.achievements to authenticated;
grant all on public.achievements to service_role;

-- ---------------------------------------------------------------------------
-- Profile: opt out of checkpoint / medal push notifications.
-- ---------------------------------------------------------------------------

alter table public.profiles add column notify_milestones boolean not null default true;
grant update (notify_milestones) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Reminders: a 'teeth' kind that targets the morning or night slot.
-- ---------------------------------------------------------------------------

alter table public.reminders drop constraint reminders_kind_check;
alter table public.reminders add constraint reminders_kind_check check (kind in ('weight', 'workout', 'todo', 'teeth'));
alter table public.reminders add column teeth_slot text check (teeth_slot in ('morning', 'night'));
alter table public.reminders add constraint reminders_teeth_needs_slot check ((kind = 'teeth') = (teeth_slot is not null));

-- ---------------------------------------------------------------------------
-- Library: hiking, for trail challenges.
-- ---------------------------------------------------------------------------

insert into public.exercises (name, muscle_group, kind) values ('Hike', 'cardio', 'distance_time') on conflict do nothing;
