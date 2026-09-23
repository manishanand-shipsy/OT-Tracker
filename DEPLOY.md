# Deploying on your company server

Everything (app + Postgres) runs via Docker Compose — no external services
required, no hosting account needed beyond a Linux box with Docker installed.

## Prerequisites on the server

- Docker + Docker Compose plugin installed (`docker compose version` should work).
- A Google OAuth client (Google Cloud Console → APIs & Services → Credentials
  → Create Credentials → OAuth client ID → Web application). Add an
  "Authorized redirect URI" of `https://<your-domain>/api/auth/callback/google`.
- A reverse proxy (nginx, Caddy, etc.) in front of this container handling
  TLS, if the server is reachable over the internet or your company network
  expects HTTPS. This app itself just listens on port 3000.

## First-time setup

1. Copy the repo to the server (git clone, rsync, whatever you have access to).
2. `cp .env.example .env` and fill in every value (see comments in the file):
   `POSTGRES_PASSWORD`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` (generate with
   `openssl rand -base64 32`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
3. Build and start everything:
   ```sh
   docker compose up --build -d
   ```
   This builds the app image, starts Postgres, waits for it to be healthy,
   then runs `prisma migrate deploy` automatically before the app starts.
4. Sign in at `NEXTAUTH_URL` with your `@shipsy.io` Google account. Anyone
   with a `@shipsy.io` email can sign in and gets auto-provisioned on first
   login (see `src/lib/auth.ts`) — **the very first person to ever sign in
   automatically becomes ADMIN**, so this step doubles as bootstrapping
   yourself as admin. No manual DB step needed.
   (The `prisma/seed.ts` script is for local development only — it creates
   fake `@example.com` users and should **not** be run against this
   database.)
5. From `/admin/employees`, assign the two approvers for each employee
   (everyone after you signs up as a plain EMPLOYEE and can't submit
   overtime until their approvers are set).

## Day-to-day

- **Deploying a new version:** pull the latest code, then
  `docker compose up --build -d` again. Migrations run automatically on
  every restart via `docker/entrypoint.sh`.
- **Logs:** `docker compose logs -f app`
- **Backups:** the `db_data` Docker volume holds all Postgres data. Back it
  up with `docker compose exec db pg_dump -U overtime overtime > backup.sql`
  on whatever schedule your company requires.
- **Restarting:** `docker compose restart app` (no need to touch `db`).
