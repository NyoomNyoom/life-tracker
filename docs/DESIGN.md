# Life Tracker: design

A private, installable web app for tracking gym sessions, body weight, teeth brushing and to-dos, with distance challenges and medals, which nudges you by push notification or email when you haven't done something by a set time.

## Decisions

These were settled up front. The reasoning is kept so future changes can revisit it deliberately.

| Question | Decision | Why |
|----------|----------|-----|
| Stack | Next.js 16 (App Router) + TypeScript on Vercel | One codebase for UI and API routes. First-class on Vercel. Supabase's SSR auth helpers target it. |
| Users | Open sign-up; each user's data is private | Row-level security on every table, so the same code serves one user or fifty |
| Scale | Free, friends-and-family | Fits Vercel Hobby (non-commercial), Supabase Free, Resend Free. Monetising means Vercel Pro. |
| Sign-in | Email + password, email confirmation, Cloudflare Turnstile CAPTCHA | Magic links open in Safari, not the Home Screen app, which has separate cookies. Passwords autofill with Face ID via iCloud Keychain. |
| Workouts | Exercises × sets × reps × weight, with routines (templates) | Progressive-overload tracking needs set-level data |
| Exercises | 95 built-in + private custom ones | New users can log immediately |
| Units | Per-user kg/lb (km/mi for distance); always stored in kg / metres / seconds | Switching units never corrupts history |
| Offline | Draft saved on the phone; retries automatically | Gyms have bad signal. Full offline-first sync isn't worth the complexity yet. |
| Reminder kinds | Weight not logged by a time · no workout on a gym day · to-do due | The three "nudge me" cases asked for |
| Nagging | One reminder + one optional follow-up; "skip today" | Useful without being spammy, and friendly to the email quota |
| Channels | Per reminder: push / email / both; push falls back to email | Nothing is silently lost if a phone never enabled notifications |
| Scheduler | Supabase `pg_cron` every 5 min → `POST /api/cron/reminders` | Vercel Hobby cron runs at most once a day, which is useless for "by 9:00" |
| Other trackers | Teeth brushing (added in round 2); others kept easy to add | Ship the core well first |
| Brushing | Morning + night check-ins, each with optional floss and mouthwash; a day is complete when both are brushed | Matches twice-a-day brushing, and lets a night reminder target the night slot |
| Distance challenges | Virtual journeys (Te Araroa, the Walk to Mordor, Milford Track, Tongariro Crossing, Marathon) with checkpoints and a finisher's medal | Like The Conqueror challenges: long goals broken into reachable ones |
| What counts | Every workout set with a distance (walk, hike, run, ride, row, swim) | "A workout that is done over a distance" |
| Joining | Join to start; distance from workouts dated that day onwards counts; several at once, each getting the full distance | A journey starts when you choose, and doesn't count old workouts |
| Incentives | Medals + checkpoints; brushing and flossing streak badges; workout-count, weekly-streak and first-PR badges; a push when you pass a checkpoint | Asked for in round 2 |
| Extras | Charts, PRs, weekly streaks, rest timer, CSV export, account deletion | Asked for in the design interview |

## Architecture

```mermaid
flowchart LR
  subgraph Phone["iPhone (Home Screen web app)"]
    UI["Next.js pages<br/>(React)"]
    SW["Service worker<br/>push + offline page"]
    LS[("localStorage<br/>workout draft")]
  end
  subgraph Vercel
    RSC["Server components<br/>+ server actions"]
    CRON["/api/cron/reminders"]
  end
  subgraph Supabase
    AUTH["Auth"]
    DB[("Postgres + RLS")]
    PGCRON["pg_cron (every 5 min)<br/>+ pg_net"]
  end
  RESEND["Resend"]
  APNS["Apple / web push service"]

  UI <--> RSC
  UI -- "save_workout RPC,<br/>exercise lookups" --> DB
  UI <--> LS
  RSC <--> AUTH
  RSC <--> DB
  PGCRON -- "POST + Bearer CRON_SECRET" --> CRON
  CRON -- "secret key" --> DB
  CRON --> APNS --> SW
  CRON --> RESEND
  AUTH -- "SMTP" --> RESEND
```

- **Reads** happen in server components with the signed-in user's Supabase session, so RLS applies.
- **Writes** are server actions (weight, to-dos, reminders, settings), except the workout logger and routine editor. Those call Supabase RPCs straight from the browser, so the logger can retry saves after the connection comes back.
- **The secret (service-role) key** bypasses RLS, so it is only used for system work: the reminder dispatcher, the signed email dismiss link, saving push subscriptions (a device can move between accounts), and account deletion. That code is server-only.
- `proxy.ts` (Next 16's replacement for `middleware.ts`) refreshes the auth cookie on every request and sends signed-out visitors to `/login`.

## Data model

All weights are kg, distances metres, durations seconds. "Local" dates are `date` values in the user's timezone.

| Table | Purpose | Notes |
|-------|---------|-------|
| `profiles` | One per user: email, name, timezone, unit, weekly goal | Created by a trigger on sign-up from the form's metadata. Email isn't user-editable (column grants). |
| `weight_entries` | One weigh-in per local day | `unique (user_id, entry_date)`: logging twice updates |
| `exercises` | Built-in (`user_id is null`) + custom | `kind` decides what a set records: `weight_reps`, `bodyweight_reps`, `duration`, `distance_time` |
| `routines`, `routine_exercises` | Workout templates with target sets/reps/rest | Saved atomically by `save_routine()` |
| `workouts`, `workout_sets` | Logged sessions | `id` is generated on the phone, so `save_workout()` can be retried without duplicates. `is_pr` is stored at log time. |
| `todos`, `todo_completions` | One-off / daily / weekly / monthly tasks, and which days they were done | Monthly on the 29th–31st falls on the last day of shorter months |
| `reminders` | Rules: kind, local time, weekdays, channel, follow-up | `kind = 'todo'` links one-to-one to a to-do and follows its schedule |
| `reminder_events` | What was sent (or skipped) per reminder, day and stage | `unique (reminder_id, occurrence_date, stage)` is the lock that prevents double-sends |
| `push_subscriptions` | One per device with notifications on | Deleted automatically when the push service says the device is gone |
| `brushing_logs` | One row per brushed slot (`morning` / `night`) per local day, with `flossed` and `mouthwash` | Deleting the row un-ticks the slot |
| `challenge_entries` | Which challenges you've joined, from which local date, and when you finished | The routes themselves live in `lib/challenges.ts`; `challenge_distances()` sums distance per entry |
| `achievements` | Every badge, checkpoint and medal earned, with when | Insert-only for users (no updates or deletes), keyed by stable strings from `lib/achievements.ts` |

**Security model.** Every table has RLS: you can only see and change rows where `user_id` is you. Child tables use composite foreign keys (`(workout_id, user_id) → workouts(id, user_id)`), so a row can't point at another user's parent. Rows that reference an exercise also check you're allowed to use it. The anonymous role has no table access at all. These properties were tested by simulating two users in SQL (overwriting, reading, dismissing and referencing across accounts all fail).

## Reminder engine

Every 5 minutes, `pg_cron` calls `POST /api/cron/reminders` with `Authorization: Bearer CRON_SECRET`. The URL and secret come from Supabase Vault. `lib/reminders/dispatch.ts` then:

1. Loads every enabled reminder with its owner's timezone and email.
2. Uses the pure function `findDue()` in `lib/reminders/engine.ts` to decide, per reminder:
   - It **applies** on a local date if the weekday matches (or, for a to-do, if the to-do is due that day).
   - The **first notification** is due from the local time until 90 minutes after it (the grace window covers brief scheduler outages). Yesterday is also checked, so a 23:55 reminder still goes out if the run lands at 00:02.
   - The **follow-up** is due `follow_up_minutes` after the later of the scheduled time and the actual send.
   - A day that was **skipped** gets nothing. A reminder **created after its time** has passed starts tomorrow.
   - Daylight saving is handled by luxon. Times in the spring-forward gap move forward.
3. Drops anything **already done**: a weight entry that day, a workout that day, or the to-do ticked off.
4. **Claims** each send by inserting a `reminder_events` row with `ON CONFLICT DO NOTHING`. Only the run that gets the row back sends, so overlapping runs can't double-notify.
5. **Delivers**: push to every device, deleting dead subscriptions on 404/410. Then email if the channel asks for it, or as a fallback when a push-only reminder reached no device. Emails include a signed, 48-hour "dismiss for today" link. It needs a tap (a POST) so email link scanners can't trigger it.
6. Records `delivered_via` / `error` on the event, and returns a JSON summary that shows up in `net._http_response`.

## Teeth, challenges and achievements

- **Teeth.** The Today tab and `/teeth` have a morning and a night check-in, each with Floss and Mouthwash. Ticking an extra also ticks the brush. `lib/habits.ts` computes streaks: complete days in a row, counting today only once it's complete, so an unfinished evening never breaks the streak early. A `teeth` reminder targets one slot and is skipped if that slot is already ticked.
- **Challenges.** `lib/challenges.ts` holds each route: total distance, checkpoints (the last is the finish), medal colours, and whether distances are approximate. The Middle-earth and Te Araroa figures are estimates and are labelled as such in the app. Distance can come from any workout set with a distance, including the quick "log a walk, hike, run or ride" form on `/challenges`. Joining counts distance from workouts dated that day onwards. The finish estimate uses your pace since joining (up to the last 30 days) and only appears after a week.
- **Achievements.** `evaluateAchievements()` (`lib/achievements-server.ts`) runs after every workout save, quick log, brush tick and challenge join. It recomputes what you qualify for with the pure `qualifyingKeys()`, inserts anything new (the primary key makes it idempotent) and marks finished challenges complete. It sends up to three pushes for new checkpoints or medals, unless you've turned that off in Settings. New keys come back to the page, which shows a celebration. Achievements are never revoked, even if you delete the workout that earned them.

## Workout logging and offline

- The draft (`lib/workout-draft.ts`) is stored in `localStorage` on every keystroke, keyed per user (and per workout when editing). Inputs are kept as typed strings in your unit and converted only on save.
- "Last time" hints and all-time bests come from the `exercise_snapshot()` RPC. PRs are computed live against those bests, plus earlier sets in the same session, so repeating a PR weight doesn't count twice. The first time you do an exercise sets a baseline and isn't a PR.
- **Finish** marks the draft `pendingSync` before uploading. If the upload fails for network reasons, the app says so and retries on the browser's `online` event and every 30 seconds. The Today and Train tabs show a "waiting to upload" banner. `save_workout()` is idempotent on the phone-generated id.
- The service worker serves a small offline page for navigations with no connection. Personal pages are never cached.

## Design system

"Colour Block": every tracker owns one flat colour and an ink that sits on it, on a warm off-white ground. Light only.

| Tracker | Fill / ink | Tailwind |
|---------|------------|----------|
| Weight | `#2340D8` / white | `bg-weight text-weight-ink` |
| Training | `#FF6A3D` / ink | `bg-training text-training-ink` |
| Teeth | `#BFDDFF` / `#0B2745` | `bg-teeth text-teeth-ink` |
| Challenges | `#0F3B2C` / `#A6EBC6` | `bg-challenges text-challenges-ink` |
| To-dos | `#FFE27A` / ink | `bg-todos text-todos-ink` |
| Reminders | `#D9CCFF` / `#1E1440` | `bg-reminders text-reminders-ink` |
| Achievements | ink / `#FFE27A` | `bg-achievements text-achievements-ink` |

Surfaces are `ground` (`#F3F2EE`), `card` (white) and `field` (`#EEEDE8`); text is `ink` (`#17150F`), `muted` and `faint`; states are `done` (mint) and `danger`. Tokens live in `app/globals.css`; components never use raw colours.

- **Rules of thumb.** A tracker's colour fills its tile on Today and the hero of its own page; everything else stays white or ground. Primary actions are ink pills; coloured fills are for content, not buttons (except butter for the active tab). Lead each tile with one big number, explained underneath in plain words. Targets are at least 44px.
- **Type.** Bricolage Grotesque (with its optical-size axis) for everything, DM Mono for times, set weights and distances, tabular numerals throughout. Display 42/800 at -3%, page titles 38/800, tile numbers 52–64/800 at -4% (the `display` and `tile-number` utilities).
- **Layout.** Tiles sit 12px from the edges and 10px apart with a 28px radius; text sits 20px in. The tab bar floats 16px from the edges; `pb-tabbar` leaves 110px under content.
- **Components** (`components/ui.tsx`, `components/form-controls.tsx`): `Tile` (pass a `tone`), `TileHeader`, `Rows`, `ListRow`, `IconSquare`, `Badge` chips, `Notice`, pill `Button`/`LinkButton` variants (`bare` + your own colours for a tracker-coloured button), `Input`/`Select`/`Textarea` (`onTile` for a white field in a coloured tile), `Segmented` and `WeekdayPicker` (with a `tone` for the tile they sit on), and `Switch`. Size and colour go through props rather than `className` overrides, since two Tailwind classes for the same property don't reliably resolve by order.

Charts are dependency-free SVG (`components/line-chart.tsx`): 3px lines, hairline grid, mono axis labels (month starts over longer ranges), the latest point emphasised and labelled, a legend under the chart when there are two series, and a crosshair tooltip that also works with the arrow keys. Each chart uses its tracker's colour. The history lists double as the table view.

## Testing

- `npm test`: 64 unit tests for units, 1RM/PR logic, chart axis ticks, streaks, to-do schedules, the reminder engine (timezones, DST, grace window, follow-ups, brushing), brushing streaks, the challenge catalog and progress, achievement rules, signed links and CSV.
- The initial build was also checked end to end against a local Supabase stack (in a real browser at iPhone size):
  - Sign-up → confirmation email → routine → workout with PRs → reload survives → offline save → auto-upload → to-dos → reminders → CSV
  - The dispatcher with a fake push service and fake Resend: push payloads decrypted and checked, dead devices removed, email fallback, no duplicates, follow-up, dismiss link
  - `pg_cron` → `pg_net` → the app via Vault

## Extending

**Adding a tracker** (say, sleep):
1. Add a migration with a table shaped like `weight_entries` (`user_id`, `entry_date`, value, RLS policy, grants).
2. Add `app/(app)/sleep/` (page + `actions.ts`), reusing `LineChart` and the form components.
3. For reminders: add `'sleep'` to the `reminders.kind` check, a case in `buildMessage()`, and a "done today" query in `findAlreadyDone()`.
4. Link it from the More tab, or give it its own tab.

**Adding a challenge:** append an entry to `CHALLENGES` in `lib/challenges.ts` (checkpoint ids are permanent once shipped; the last checkpoint must be `finish` at the total distance). `tests/challenges.test.ts` checks the catalog's consistency and that long routes have a checkpoint at least every 350 km.

Ideas that fit the current design: passkey sign-in (Supabase now supports it), a home-screen widget-style summary, plate calculator, body-measurement tracking, and a weekly email digest.

## Map for Python developers

| Python / Django-ish idea | Here |
|--------------------------|------|
| `views.py` returning templates | `app/**/page.tsx` server components (async functions that query and return JSX) |
| Form POST handlers | `actions.ts` files with `"use server"` functions |
| `urls.py` | The folder structure under `app/` (`[id]` = path parameter; `(app)` = a group that doesn't change the URL) |
| Middleware | `proxy.ts` |
| Models + migrations | `supabase/migrations/*.sql` (plain SQL) + generated types in `lib/supabase/database.types.ts` |
| Permissions | Postgres row-level security policies, enforced by the database itself |
| Celery beat | Supabase `pg_cron` calling an HTTP endpoint |
| pytest | Vitest (`tests/*.test.ts`) |
