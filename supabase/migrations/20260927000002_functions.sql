-- Life Tracker: RPC functions called by the app.
-- All run as the calling user (security invoker), so RLS still applies to everything they touch.

-- ---------------------------------------------------------------------------
-- save_workout: create or replace a workout and all of its sets in one transaction.
-- Idempotent on workout id, so the phone can safely retry after a dropped connection.
--
-- p_workout: { id, workout_date, name, routine_id, started_at, ended_at, notes }
-- p_sets:    [{ exercise_id, exercise_position, set_number, reps, weight_kg,
--               duration_seconds, distance_m, is_warmup, is_pr }, ...]
-- ---------------------------------------------------------------------------
create or replace function public.save_workout(p_workout jsonb, p_sets jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  w record;
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  select * into w from jsonb_to_record(p_workout) as x(
    id uuid, workout_date date, name text, routine_id uuid,
    started_at timestamptz, ended_at timestamptz, notes text
  );

  if w.id is null or w.workout_date is null then
    raise exception 'Workout id and date are required' using errcode = '22023';
  end if;

  insert into public.workouts (id, user_id, workout_date, name, routine_id, started_at, ended_at, notes)
  values (
    w.id, me, w.workout_date, coalesce(nullif(trim(w.name), ''), 'Workout'), w.routine_id,
    w.started_at, w.ended_at, nullif(trim(w.notes), '')
  )
  on conflict (id) do update set
    workout_date = excluded.workout_date,
    name = excluded.name,
    routine_id = excluded.routine_id,
    started_at = excluded.started_at,
    ended_at = excluded.ended_at,
    notes = excluded.notes;

  delete from public.workout_sets where workout_id = w.id;

  insert into public.workout_sets (
    workout_id, user_id, exercise_id, exercise_position, set_number,
    reps, weight_kg, duration_seconds, distance_m, is_warmup, is_pr
  )
  select
    w.id, me, s.exercise_id, s.exercise_position, s.set_number,
    s.reps, s.weight_kg, s.duration_seconds, s.distance_m,
    coalesce(s.is_warmup, false), coalesce(s.is_pr, false)
  from jsonb_to_recordset(coalesce(p_sets, '[]'::jsonb)) as s(
    exercise_id uuid, exercise_position smallint, set_number smallint,
    reps smallint, weight_kg numeric, duration_seconds integer, distance_m numeric,
    is_warmup boolean, is_pr boolean
  );

  return w.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- save_routine: create or replace a routine and its exercise list in one transaction.
--
-- p_routine:   { id, name, notes }
-- p_exercises: [{ exercise_id, target_sets, target_reps, rest_seconds }, ...]  (in order)
-- ---------------------------------------------------------------------------
create or replace function public.save_routine(p_routine jsonb, p_exercises jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r record;
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  select * into r from jsonb_to_record(p_routine) as x(id uuid, name text, notes text);
  if r.id is null then
    r.id := gen_random_uuid();
  end if;

  insert into public.routines (id, user_id, name, notes)
  values (r.id, me, trim(r.name), nullif(trim(r.notes), ''))
  on conflict (id) do update set name = excluded.name, notes = excluded.notes;

  delete from public.routine_exercises where routine_id = r.id;

  insert into public.routine_exercises (routine_id, user_id, exercise_id, position, target_sets, target_reps, rest_seconds)
  select
    r.id, me,
    (e.item ->> 'exercise_id')::uuid,
    (e.ord - 1)::smallint,
    coalesce((e.item ->> 'target_sets')::smallint, 3),
    (e.item ->> 'target_reps')::smallint,
    coalesce((e.item ->> 'rest_seconds')::smallint, 90)
  from jsonb_array_elements(coalesce(p_exercises, '[]'::jsonb)) with ordinality as e(item, ord);

  return r.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- exercise_snapshot: for each exercise, what you did last time and your all-time bests.
-- Powers the "Last time: 80 x 5" hints and live PR detection in the workout logger.
-- Warm-up sets are ignored. Estimated 1RM uses the Epley formula for 1-12 rep sets and
-- must stay in sync with lib/training.ts.
-- ---------------------------------------------------------------------------
create or replace function public.exercise_snapshot(p_exercise_ids uuid[], p_exclude_workout uuid default null)
returns table (
  exercise_id uuid,
  last_date date,
  last_sets jsonb,
  best_weight_kg numeric,
  best_e1rm_kg numeric,
  best_reps integer,
  best_duration_seconds integer,
  best_distance_m numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with s as (
    select ws.*, w.workout_date, w.created_at as workout_created_at
    from public.workout_sets ws
    join public.workouts w on w.id = ws.workout_id
    where ws.exercise_id = any (p_exercise_ids)
      and ws.user_id = (select auth.uid())
      and not ws.is_warmup
      and (p_exclude_workout is null or ws.workout_id <> p_exclude_workout)
  ),
  last_workout as (
    select distinct on (s.exercise_id) s.exercise_id, s.workout_id, s.workout_date
    from s
    order by s.exercise_id, s.workout_date desc, s.workout_created_at desc
  ),
  bests as (
    select
      s.exercise_id,
      max(s.weight_kg) as best_weight_kg,
      max(
        case
          when s.weight_kg > 0 and s.reps = 1 then s.weight_kg
          when s.weight_kg > 0 and s.reps between 2 and 12 then s.weight_kg * (1 + s.reps / 30.0)
        end
      ) as best_e1rm_kg,
      max(s.reps)::integer as best_reps,
      max(s.duration_seconds) as best_duration_seconds,
      max(s.distance_m) as best_distance_m
    from s
    group by s.exercise_id
  )
  select
    b.exercise_id,
    lw.workout_date,
    (
      select jsonb_agg(
        jsonb_build_object(
          'reps', x.reps, 'weight_kg', x.weight_kg,
          'duration_seconds', x.duration_seconds, 'distance_m', x.distance_m
        ) order by x.exercise_position, x.set_number
      )
      from s x
      where x.workout_id = lw.workout_id and x.exercise_id = b.exercise_id
    ),
    b.best_weight_kg,
    round(b.best_e1rm_kg, 2),
    b.best_reps,
    b.best_duration_seconds,
    b.best_distance_m
  from bests b
  join last_workout lw on lw.exercise_id = b.exercise_id;
$$;

-- Only signed-in users may call these.
revoke execute on function public.save_workout(jsonb, jsonb) from public, anon;
revoke execute on function public.save_routine(jsonb, jsonb) from public, anon;
revoke execute on function public.exercise_snapshot(uuid[], uuid) from public, anon;
grant execute on function public.save_workout(jsonb, jsonb) to authenticated;
grant execute on function public.save_routine(jsonb, jsonb) to authenticated;
grant execute on function public.exercise_snapshot(uuid[], uuid) to authenticated;

-- Internal helpers are not part of the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
