@AGENTS.md

# Project notes

- Life Tracker: Next.js 16 App Router + Supabase. Design and decisions: docs/DESIGN.md. Deployment: docs/SETUP.md.
- Checks: `npm run check` (typecheck + lint + vitest) and `npm run build`.
- Schema changes: add a new file in `supabase/migrations/` (never edit applied ones), then `npx supabase db reset` and `npm run db:types`.
- Every user table needs RLS + explicit grants; child tables use composite `(parent_id, user_id)` foreign keys.
- Store kg / metres / seconds; convert with `lib/units.ts` at the edges. Local dates are ISO strings in the profile's timezone (`lib/dates.ts`).
- Pure logic lives in `lib/` with tests in `tests/`; keep I/O out of `lib/reminders/engine.ts`.
- The secret-key client (`lib/supabase/admin.ts`) bypasses RLS: only use it for system work, scoped to a verified user id.
