# Notes

A single-user, dashboard-style notes app built to [SPEC.md](./SPEC.md):
mobile-first PWA, quick capture, pinned notes, todos with due dates,
full-text search and tag filtering. Next.js (App Router) + Tailwind CSS +
shadcn/ui-style components, Postgres via Drizzle ORM, deployable to Vercel
with Neon.

## Environment variables

All configuration lives in three variables (see [.env.example](./.env.example)):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (Neon in production) |
| `APP_PASSWORD` | The single shared password used to sign in |
| `SESSION_SECRET` | Secret that signs the long-lived session cookie (generate with `openssl rand -hex 32`) |

## Creating the Neon database

1. Sign up at [neon.tech](https://neon.tech) (free tier is enough) and create a project.
2. In the project dashboard, copy the **connection string** (it looks like
   `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
3. Use it as `DATABASE_URL`.

## Running migrations

Migrations live in `drizzle/` and are applied with drizzle-kit:

```bash
DATABASE_URL="postgresql://…" npm run db:migrate
```

Run this once against your Neon database before the first deploy, and again
whenever a new migration is added. (After changing `lib/db/schema.ts`,
generate a new migration with `npm run db:generate`.)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the three variables
npm run db:migrate           # apply migrations to the database in DATABASE_URL
npm run dev                  # http://localhost:3000
```

Any Postgres works locally — a local instance or a separate Neon branch/database.

## Deploying to Vercel

1. Push this repository to GitHub and import it in [Vercel](https://vercel.com)
   (framework preset: Next.js; no custom build settings needed).
2. In **Project → Settings → Environment Variables**, add `DATABASE_URL`,
   `APP_PASSWORD`, and `SESSION_SECRET`.
3. Make sure migrations have been applied to the Neon database
   (`npm run db:migrate` from your machine, see above).
4. Deploy. Visit the URL, sign in with `APP_PASSWORD`, and use your
   browser's **Add to Home Screen** to install it as a PWA.

## Notes on design decisions

- **Auth:** one shared password; a signed (HS256) httpOnly session cookie
  keeps each device logged in for 180 days. Failed logins are slowed with an
  escalating delay.
- **Online-only:** the service worker exists solely for installability —
  there is no offline caching or sync.
- **Hard delete:** deleting a note is permanent by design; the confirm
  dialog is the only safety net.
- **Todo auto-clear:** completed todos stay visible (struck through) until
  the end of the day in the device's local timezone, then drop out of the
  widget; unchecking within that window restores them.
