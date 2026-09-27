# Life Tracker

A private web app you install on your iPhone's Home Screen to track **gym sessions**, **body weight** and **to-dos**. It **reminds you by notification or email** when you haven't logged something by a time you choose.

Built with Next.js on Vercel's free Hobby tier and Supabase's free tier.

## What it does

- **Workouts:** log exercises, sets, reps and weight; save routines like "Push Day"; see what you did last time; automatic personal-record detection; rest timer; progress charts and estimated 1-rep max per exercise; weekly goal and streak.
- **Body weight:** one-tap daily logging, a 7-day moving-average trend chart, kg or lb.
- **To-dos:** one-off, daily, weekly or monthly tasks you tick off.
- **Reminders:**
  - "No weigh-in by 9:00", "no workout on a gym day by 19:00", or "to-do due"
  - Sent only if you haven't done it, with one optional follow-up and a "skip today" option
  - Push notification, email, or both; push falls back to email if no device has notifications on
- **Reliable at the gym:** an in-progress workout is kept on the phone and uploads itself when the signal comes back.
- **Accounts:** sign-up with email confirmation and CAPTCHA; everyone's data is private (row-level security); CSV export and account deletion.

## Docs

- **[docs/SETUP.md](docs/SETUP.md):** step-by-step deployment (domain, Resend, Turnstile, Supabase, Vercel, scheduler, iPhone install) and local development.
- **[docs/DESIGN.md](docs/DESIGN.md):** decisions, architecture, data model, the reminder engine, and how to add another tracker.

## Quick start (local)

```bash
npm install
npx supabase start            # needs Docker
cp .env.example .env.local    # fill in values from `npx supabase status -o env`
npm run dev
```

`npm run check` runs typecheck, lint and unit tests. `npm run build` does a production build.

## Project layout

```
app/(auth)/        sign-up, sign-in, password reset, welcome
app/(app)/         the signed-in app: Today, Train, Weight, To-dos, More
app/api/           reminder cron endpoint, CSV export
components/        UI (workout logger, charts, forms)
lib/               domain logic (units, training, to-dos, reminder engine), Supabase clients
supabase/          migrations, email templates, scheduler SQL
tests/             unit tests (Vitest)
public/sw.js       service worker (push notifications + offline page)
```
