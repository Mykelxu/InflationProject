# Grocery Inflation Tracker

A full-stack starter for tracking grocery price movement, baskets, and inflation signals. It uses a Next.js App Router frontend, Prisma ORM, and Postgres, with authentication via Supabase Auth.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM
- Postgres (Docker Compose or Supabase Postgres)
- Supabase Auth
- Recharts
- Zod
- Vitest

## Local setup

1) Install dependencies:

```bash
pnpm install
```

2) Start Postgres (local):

```bash
docker compose up -d
```

3) Configure environment variables:

```bash
cp apps/web/.env.example apps/web/.env
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project. You can keep `DATABASE_URL` pointing at local Postgres, or swap it to Supabase Postgres.

Add Kroger credentials (certification environment) to `apps/web/.env`:

```
KROGER_CLIENT_ID=...
KROGER_CLIENT_SECRET=...
KROGER_BASE_URL=https://api-ce.kroger.com/v1
KROGER_LAT=33.7756
KROGER_LON=-84.3963
INGEST_SECRET=your-shared-secret
```

4) Run Prisma migrations:

```bash
pnpm -C apps/web prisma migrate dev
```

5) Start the app:

```bash
pnpm -C apps/web dev
```

Visit `http://localhost:3000`.

## Supabase setup (quick)

1) Create a Supabase project.
2) In Project Settings ? API, copy the Project URL and anon key into:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

3) In Authentication ? Providers, enable Email (for email/password sign-in).

If you want to use Supabase Postgres instead of local Docker Postgres, copy the connection string from Project Settings ? Database and replace `DATABASE_URL`.

## Kroger ingestion (planned)

This repo can ingest Kroger staples on demand. It uses client credentials to pull the nearest location to Georgia Tech (lat/lon default) and seeds 20 staple items.

Run Kroger ingestion after signing in:

```bash
curl -X POST http://localhost:3000/api/ingest/kroger \
  -H "Content-Type: application/json" \
  -d "{}"
```

To run automated daily ingestion, configure a Supabase scheduled job (or any cron) to call:

```
POST https://<your-app-domain>/api/ingest/kroger
Header: x-ingest-secret: <INGEST_SECRET>
```

## Supabase Edge Function (daily ingest)

If you want Supabase to ingest directly (no Next.js endpoint), use an Edge Function.

1) Install Supabase CLI (Windows recommended: winget or manual installer).
2) Login and link the project:

```bash
supabase login
supabase link --project-ref hkrlzrsndekjmcrbazux
```

3) Set secrets:

```bash
supabase secrets set \
  KROGER_CLIENT_ID=... \
  KROGER_CLIENT_SECRET=... \
  KROGER_BASE_URL=https://api-ce.kroger.com/v1 \
  KROGER_LAT=33.7756 \
  KROGER_LON=-84.3963 \
  INGEST_SECRET=your-secret
```

4) Deploy the function:

```bash
supabase functions deploy kroger-ingest
```

5) Schedule it daily at 11:50pm UTC:

```bash
supabase functions schedule kroger-ingest --cron "50 23 * * *"
```

Seed mock data after signing in:

```bash
curl -X POST http://localhost:3000/api/ingest/staples \
  -H "Content-Type: application/json" \
  -d "{ \"days\": 30, \"locationId\": \"atlanta-ga\", \"storeName\": \"Kroger (Mock)\" }"
```

## Folder structure

```
.
??? apps
?   ??? web
?       ??? app
?       ??? components
?       ??? lib
?       ??? prisma
?       ??? types
??? docker-compose.yml
??? package.json
??? pnpm-workspace.yaml
```

## Common scripts

From the repo root:

- `pnpm dev` - run the Next.js app
- `pnpm db:up` - start Postgres
- `pnpm db:down` - stop Postgres
- `pnpm prisma:migrate` - run Prisma migrations
- `pnpm prisma:studio` - open Prisma Studio

From `apps/web`:

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
