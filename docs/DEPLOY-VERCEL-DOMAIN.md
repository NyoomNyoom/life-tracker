# Deploy on a free vercel.app address (switch to your own domain later)

This gets the app live at `https://<your-project>.vercel.app` in about 30 minutes, with no domain to buy. Moving to your own domain later is a checklist at the end. Your data stays where it is.

## What works before you have a domain

| Works now | Waits for your own domain |
|-----------|---------------------------|
| Everything in the app, for **you** | Emails to **other people** (their sign-up confirmations and reminder emails) |
| Push notification reminders on your iPhone | Inviting friends to sign up |
| Sign-up confirmation and reminder emails **to your own address** (see below) | |

Supabase's built-in email sender only delivers to members of your Supabase team, a few emails an hour. Resend's shared test sender (`onboarding@resend.dev`) only delivers to the email you signed up to Resend with. So **use the same email address for your Supabase account, your Resend account (if you use one) and your app login.** Until you add a domain, the app is effectively just for you. Strangers can create an account, but they never receive the email to confirm it, so they can't sign in.

If you're in New Zealand or Australia, choose **Sydney** for both Supabase (step 2) and Vercel's function region (step 4.4). Every page load makes several database calls, so having both in the same region keeps the app quick.

---

## 1. Put the code on `main`

Vercel deploys your repository's `main` branch as the live site. On GitHub, open the pull request with this code and click **Merge pull request**.

## 2. Supabase

1. [supabase.com](https://supabase.com) → **New project**. Region: the closest to you (e.g. *Oceania (Sydney)*). Save the database password somewhere safe.
2. **Create the tables.** Open **SQL Editor**, then paste and run each file in `supabase/migrations/` one at a time, in filename order. (If you have Node: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`.)
3. **Copy three values** from **Project Settings → API Keys / Data API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Secret key (`sb_secret_…`) → `SUPABASE_SECRET_KEY` (keep this private)
4. **Authentication → Sign In / Providers → Email**: enabled, **Confirm email** on, minimum password length 8.
5. **Authentication → Email Templates**:
   - **Confirm signup**: subject `Confirm your Life Tracker account`, body = `supabase/templates/confirmation.html`
   - **Reset password**: subject `Reset your Life Tracker password`, body = `supabase/templates/recovery.html`

   Skip custom SMTP for now; it needs your own domain.

## 3. Generate the app's secrets

In the repository folder on your computer:

```bash
pip install cryptography
python scripts/generate_secrets.py
```

This prints `CRON_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Keep them somewhere safe and **don't regenerate the VAPID keys later**: that would switch off notifications on every device. (Node alternative: `npx web-push generate-vapid-keys` and `openssl rand -hex 32`.)

## 4. Vercel

1. [vercel.com](https://vercel.com) → sign up with GitHub → **Add New → Project** → import the repository.
2. **Project name** becomes your address: `https://<name>.vercel.app`. Pick something distinctive (e.g. `yourname-tracker`); if it's taken, Vercel adds a suffix.
3. Open **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | from 2.3 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from 2.3 |
   | `SUPABASE_SECRET_KEY` | from 2.3 |
   | `CRON_SECRET` | from step 3 |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | from step 3 |
   | `VAPID_PRIVATE_KEY` | from step 3 |
   | `VAPID_SUBJECT` | `mailto:` + your email, e.g. `mailto:you@gmail.com` |

   Leave the Resend and Turnstile variables out for now (see "Optional" below).
4. **Deploy.** When it's done, open **Settings → Domains** and note the production address, `https://<name>.vercel.app`. Use this one, not the long per-deployment URLs with random letters in them (those are private previews).
   - While you're in Settings, set **Functions → Function Region** to the same region as Supabase (e.g. Sydney, `syd1`), if your plan offers the choice.
5. Add one more environment variable, `NEXT_PUBLIC_SITE_URL` = `https://<name>.vercel.app` (no trailing slash). Then **Deployments → ⋯ on the latest → Redeploy**, because `NEXT_PUBLIC_*` values are baked in at build time.

## 5. Point Supabase at the app

Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://<name>.vercel.app`
- **Redirect URLs:** add `https://<name>.vercel.app/**`

## 6. Turn on the reminder scheduler

1. Open `supabase/cron.sql`. Replace `<APP_URL>` with `https://<name>.vercel.app` and `<CRON_SECRET>` with your secret from step 3.
2. Paste it into the Supabase **SQL Editor** and run it **once**.
3. After 5 minutes, check it's working:
   ```sql
   select status_code, content, created from net._http_response order by created desc limit 5;
   ```
   `200` with a JSON summary means it's working. `401` means `CRON_SECRET` differs between Supabase and Vercel.

## 7. Install it on your iPhone

1. In **Safari**, open `https://<name>.vercel.app` → **Create account** with the same email as your Supabase account → open the confirmation email on the phone.
2. **Share → Add to Home Screen → Add**.
3. Open **Tracker** from the Home Screen and sign in once more. The Home Screen app keeps its own login, separate from Safari.
4. **More → Settings → Turn on notifications → Allow → Send test.**
5. Set up reminders with **Send by: Notification**. Email reminders only reach you if you do the optional Resend step below.

## Optional now (both can wait for your domain)

- **Email reminders to yourself.** Sign up at [resend.com](https://resend.com) with the same email → **API Keys → Create**. Add `RESEND_API_KEY` and `EMAIL_FROM` = `Life Tracker <onboarding@resend.dev>` in Vercel, then redeploy.
- **CAPTCHA on sign-up/sign-in.** Cloudflare → **Turnstile → Add widget** with hostname `<name>.vercel.app`. Put the site key in Vercel as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and redeploy. Put the secret key in Supabase → **Authentication → Attack Protection → CAPTCHA (Turnstile)**. Set up both halves together, or sign-in will fail. It isn't essential yet, since strangers can't confirm accounts.

---

## Later: moving to your own domain

Nothing in the database changes. Do these in order:

1. **Buy the domain** (Cloudflare Registrar is at cost), e.g. `tracker.yourname.com`.
2. **Vercel → Settings → Domains → Add** your domain and create the DNS record Vercel shows. In Cloudflare, set the proxy to **DNS only** (grey cloud). You can also edit the old `<name>.vercel.app` entry to **redirect** to the new domain, so old links keep working.
3. **Vercel → Environment Variables:** set `NEXT_PUBLIC_SITE_URL` to `https://tracker.yourname.com`, then **Redeploy**.
4. **Supabase → Authentication → URL Configuration:** set **Site URL** to the new address and add `https://tracker.yourname.com/**` to Redirect URLs. Keep the old one until your phone has moved over.
5. **Point the scheduler at the new address**, in the SQL Editor:
   ```sql
   select vault.update_secret(
     (select id from vault.secrets where name = 'life_tracker_app_url'),
     'https://tracker.yourname.com'
   );
   ```
   Check `net._http_response` shows `200` again a few minutes later.
6. **Email for everyone.** Follow [SETUP.md](SETUP.md) step 2 (verify the domain in Resend) and step 4.5.3–4 (custom SMTP in Supabase, higher rate limit). Change `EMAIL_FROM` to your domain, e.g. `Life Tracker <reminders@yourname.com>`, and redeploy. Friends can sign up from here on.
7. **CAPTCHA.** Add the new hostname to your Turnstile widget, or set Turnstile up now ([SETUP.md](SETUP.md) steps 3 and 4.6).
8. **Move your phone.** The Home Screen app belongs to the old address. Delete it, open the new address in Safari, **Add to Home Screen**, sign in, and **turn on notifications** again. Everything you've logged is still there.

**Keep unchanged:** the Supabase keys, `CRON_SECRET` and both VAPID keys. They belong to the project, not the domain.
