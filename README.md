# Flair Flow Media

A cinematic single‑page marketing site with a custom backend for leads, admin dashboard, and production‑ready hardening.

## Features
- Animated landing experience with scroll‑synced effects
- Lead capture with validation, spam protection, and email delivery
- Admin dashboard with session auth + CSV export
- SQLite by default; Postgres via `DATABASE_URL`
- Optional SendGrid and Turnstile integrations
- Sentry and Plausible hooks

## Local Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and fill in values.
3. Generate admin password hash:
   ```bash
   node scripts/hash-password.js "your-password"
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
5. Open:
   - Site: `http://localhost:3000`
   - Admin: `http://localhost:3000/admin`

## Environment
Key variables (see `.env.example`):
- `ADMIN_USER`, `ADMIN_PASS_HASH`, `SESSION_SECRET`
- `SMTP_*` or `EMAIL_PROVIDER=sendgrid`
- `DATABASE_URL` for Postgres
- `TURNSTILE_SECRET`
- `SENTRY_DSN`

## Deployment
See `DEPLOY.md` for production guidance.
