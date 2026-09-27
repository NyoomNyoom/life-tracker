# Setup guide

This takes about an hour the first time. Everything is on free tiers except the domain (~US$10–15 a year).

You'll create five things, in this order:

| # | Service | What it's for | Cost |
|---|---------|---------------|------|
| 1 | A domain (Cloudflare Registrar recommended) | The app's address, and the "from" address for emails | ~$10–15/yr |
| 2 | Resend | Sends reminder emails and sign-up/password emails | Free (3,000 emails/month, 100/day) |
| 3 | Cloudflare Turnstile | CAPTCHA on sign-up and sign-in | Free |
| 4 | Supabase | Database + authentication + the 5-minute reminder scheduler | Free |
| 5 | Vercel (Hobby) | Hosts the app | Free for non-commercial use |

> Free-tier limits change. The numbers above are what they were when this was written. Check each provider's pricing page if you're unsure.

Throughout this guide, replace `tracker.example.com` with your real domain (or a subdomain of it).

---

## 1. Domain

1. Buy a domain. [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) sells at cost, and keeping DNS on Cloudflare makes steps 2, 3 and 5 easier.
2. Decide the app's address. A subdomain like `tracker.yourname.com` works well: it leaves the root free for other things.

## 2. Resend (email)

1. Sign up at [resend.com](https://resend.com).
2. **Domains → Add domain**. Enter your domain (or a sending subdomain such as `mail.yourname.com`).
3. Add the DNS records Resend shows (DKIM `TXT`, SPF `MX` + `TXT`) in Cloudflare DNS. Resend offers a one-click Cloudflare setup if you log in to Cloudflare from their page. Wait until the domain shows **Verified**.
4. **API Keys → Create API key** with "Sending access". Copy it: this is `RESEND_API_KEY`.
5. Your sender will be something like `Life Tracker <reminders@yourname.com>`: this is `EMAIL_FROM`. It must use the verified domain.

## 3. Cloudflare Turnstile (CAPTCHA)

1. Cloudflare dashboard → **Turnstile → Add widget**.
2. Hostname: `tracker.example.com`. Widget mode: **Managed** (most people never see a challenge).
3. Copy the **Site key** (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, goes to Vercel) and the **Secret key** (goes to Supabase in step 4.6).

## 4. Supabase (database + auth)

### 4.1 Create the project
1. Sign up at [supabase.com](https://supabase.com) → **New project**. Pick the region closest to you and save the database password somewhere safe.

### 4.2 Create the tables
Either:

- **With the CLI (recommended):**
  ```bash
  npx supabase login
  npx supabase link --project-ref <your-project-ref>   # the ref is in the dashboard URL
  npx supabase db push                                  # applies supabase/migrations/*
  ```
- **Or by hand:** open **SQL Editor** and run every file in `supabase/migrations/`, in filename order.

When you pull a new version of the app later, run `npx supabase db push` again (or run just the new migration files) before or right after deploying.

### 4.3 Copy the API keys
**Project Settings → API Keys** (and **Data API** for the URL):

| Value | Env var |
|-------|---------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key (`sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Secret key (`sb_secret_…`) | `SUPABASE_SECRET_KEY` (never share this or put it in client code) |

Older projects show "anon" and "service_role" keys instead. Those work too: use them in the same two slots.

### 4.4 Auth URLs
**Authentication → URL Configuration**
- **Site URL:** `https://tracker.example.com`
- **Redirect URLs:** add `https://tracker.example.com/**` (and `http://localhost:3000/**` if you'll develop locally).

### 4.5 Email sign-in and templates
1. **Authentication → Sign In / Providers → Email**: enabled, **Confirm email: ON**. Set the minimum password length to 8.
2. **Authentication → Email Templates**:
   - **Confirm signup**: subject `Confirm your Life Tracker account`, body = contents of `supabase/templates/confirmation.html`.
   - **Reset password**: subject `Reset your Life Tracker password`, body = contents of `supabase/templates/recovery.html`.

   These templates send people to `/auth/confirm`, which is what makes confirmation work with server-side sessions.
3. **Authentication → Emails → SMTP Settings → Enable custom SMTP** (Supabase's built-in sender only allows a few emails an hour, which isn't enough once other people sign up):
   - Host `smtp.resend.com`, port `465`, username `resend`, password = your Resend API key
   - Sender email `no-reply@yourname.com` (your verified domain), sender name `Life Tracker`
4. **Authentication → Rate Limits**: raise "emails sent per hour" to something like 30.

### 4.6 CAPTCHA
**Authentication → Attack Protection → Enable CAPTCHA protection** → provider **Cloudflare Turnstile** → paste the Turnstile **secret key**.

(With this on, Supabase requires a CAPTCHA token for sign-up, sign-in and password resets. The app sends one automatically.)

## 5. Generate the app's own secrets

On your computer, in the repo:

```bash
npm install
npm run vapid            # prints a VAPID public + private key pair for push notifications
openssl rand -hex 32     # prints a random string for CRON_SECRET
```

## 6. Vercel (hosting)

1. Sign up at [vercel.com](https://vercel.com) with GitHub → **Add New → Project** → import this repository. Framework: Next.js (auto-detected).
2. Before deploying, open **Environment Variables** and add every variable from `.env.example`:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | from 4.3 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from 4.3 |
   | `SUPABASE_SECRET_KEY` | from 4.3 |
   | `NEXT_PUBLIC_SITE_URL` | `https://tracker.example.com` |
   | `CRON_SECRET` | from step 5 |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | from step 5 |
   | `VAPID_PRIVATE_KEY` | from step 5 |
   | `VAPID_SUBJECT` | `mailto:you@yourname.com` |
   | `RESEND_API_KEY` | from 2.4 |
   | `EMAIL_FROM` | e.g. `Life Tracker <reminders@yourname.com>` |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | from 3.3 |

3. **Deploy**.
4. **Settings → Domains → Add** `tracker.example.com`. Vercel shows a DNS record to create (usually a `CNAME` to Vercel). Add it in Cloudflare DNS with the proxy **off** (grey cloud, "DNS only"). Wait for the green check.

> `NEXT_PUBLIC_*` values are baked in at build time. If you change one later, redeploy.

## 7. Turn on the reminder scheduler

Vercel's Hobby plan only runs cron jobs once a day, so the app uses Supabase's scheduler instead (every 5 minutes, free).

1. Open `supabase/cron.sql`, replace `<APP_URL>` with `https://tracker.example.com` and `<CRON_SECRET>` with your secret.
2. Paste it into the Supabase **SQL Editor** and run it once.
3. Check it's working after 5 minutes:
   ```sql
   select status_code, content, created from net._http_response order by created desc limit 5;
   ```
   You want `200` and a JSON summary like `{"rules":0,"due":0,...}`. A `401` means `CRON_SECRET` doesn't match Vercel's.

## 8. Install it on your iPhone

1. In **Safari**, go to `https://tracker.example.com` → **Create account** → confirm the email (open the link on the phone).
2. Tap **Share → Add to Home Screen → Add**.
3. Open **Tracker** from the Home Screen and sign in. The Home Screen app keeps its own login, separate from Safari, so you sign in once more here.
4. **More → Settings → Turn on notifications → Allow**, then **Send test**.
5. **More → Reminders**: add a weigh-in reminder and your gym days. Add to-dos (with "Remind me") from the To-dos tab.

Push notifications on iPhone need iOS 16.4 or later and only work from the Home Screen app, not from a Safari tab.

---

## Local development

Needs Docker (for the local Supabase stack) and Node 20.9+.

```bash
npm install
npx supabase start                 # local Postgres + Auth + Mailpit, applies migrations
npx supabase status -o env         # shows the local URL and keys
cp .env.example .env.local         # fill in the local values; leave Turnstile/Resend empty
npm run dev                        # http://localhost:3000
```

- Emails (sign-up confirmations) are caught by Mailpit at <http://127.0.0.1:54324>.
- With `NEXT_PUBLIC_TURNSTILE_SITE_KEY` empty, the CAPTCHA widget is skipped. Local Supabase doesn't require one.
- Trigger reminders by hand: `curl -H "Authorization: Bearer $CRON_SECRET" -X POST http://localhost:3000/api/cron/reminders`
- After changing the schema: add a new file in `supabase/migrations/`, run `npx supabase db reset`, then `npm run db:types`.

Checks (the same ones CI runs): `npm run check` (typecheck, lint, unit tests) and `npm run build`.

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| No confirmation email | Supabase → Authentication → SMTP settings; Resend dashboard → Logs; spam folder |
| "The CAPTCHA check failed" | Turnstile widget hostname matches your domain; site key in Vercel; secret key in Supabase |
| Confirmation link says "invalid or expired" | The Site URL and Redirect URLs in 4.4; the email templates were pasted (4.5.2); links expire after 1 hour |
| Reminders never arrive | `select * from cron.job_run_details order by start_time desc limit 5;` and `net._http_response` (see step 7); Vercel → Logs for `/api/cron/reminders`; your timezone in Settings |
| Push notifications don't arrive | App opened from the Home Screen; iOS 16.4+; iPhone Settings → Notifications → Tracker is allowed; Focus mode isn't hiding them; Settings → Send test |
| Push-only reminders arrive as emails | That's the fallback: no device has notifications turned on for your account |
| Supabase project "paused" | Free projects pause after about a week with no activity. The 5-minute scheduler hits the app, which reads the database, and that should count as activity. If it ever pauses, restore it from the dashboard. |
