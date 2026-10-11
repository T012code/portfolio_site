# layothedeveloper.com

Portfolio and admin for Laniya Molayoninujesu (Layò).

- **Next.js 16** (App Router, Cache Components), React 19, TypeScript
- **Supabase**: Postgres with row-level security, Auth (email + TOTP), Storage
- **Vercel** hosting

## Local setup

```bash
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm install
npm run dev
```

## How content flows

Public pages read through cached functions in `src/lib/content.ts`, tagged per table.
The admin writes with the signed-in session and calls `updateTag(...)`, so the live
site refreshes only what changed. Page copy is declared in `src/lib/blocks.ts`; the
same definitions drive the public pages and the admin forms.

## Database

Migrations live in `supabase/migrations`. Writes are allowed only for an email listed
in `public.admins` with an MFA-verified session (`aal2`). Public form submissions go
through `submit_enquiry` / `submit_message`, which validate input and rate-limit.

## Brand

`src/components/brand` holds the mark and wordmark as vector paths taken from the
business card artwork. Type is Archivo (variable width), self-hosted from `public/fonts`.

## Going live

1. **Vercel**: import this repository into the `portfolio_site` project and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (the live URL, no trailing slash)
2. **Supabase Auth**: add the admin user (Authentication → Users → Add user, auto-confirm),
   add the same email to the `public.admins` table, then turn off "Allow new users to sign
   up". The first sign-in at `/admin` sets up the authenticator app.
3. **Cal.com webhook**: in Cal.com → Settings → Developer → Webhooks, add
   `https://<project>.supabase.co/functions/v1/cal-webhook` with Booking Created, Rescheduled
   and Cancelled, and a long random secret. Save the same secret in Supabase as the Edge
   Function secret `CAL_WEBHOOK_SECRET`.
4. **Email (Zoho)**: once `hello@` exists, add `SMTP_HOST` (smtp.zoho.com, or smtp.zoho.eu for
   EU accounts), `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASSWORD` (a Zoho app password) and
   `NOTIFY_EMAIL` in Vercel. Until then, submissions still arrive in the admin inbox.
5. **Domain**: add `www.layothedeveloper.com` in Vercel, update `NEXT_PUBLIC_SITE_URL`, redeploy.

## Testing the 3D hero without a GPU

The hero falls back to the static mark on software-rendered WebGL. Append `?3d=force` to
the URL to render the 3D scene anyway.
