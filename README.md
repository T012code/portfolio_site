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
