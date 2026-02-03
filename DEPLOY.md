# Deployment Notes (Production)

1) Environment variables
- Set `NODE_ENV=production`
- Set `SESSION_SECRET` to a long random string.
- Set `ADMIN_USER` and `ADMIN_PASS_HASH` (use `node scripts/hash-password.js "your-pass"`).
- Configure database:
  - Use `DATABASE_URL` for Postgres.
  - Leave `DATABASE_URL` empty to use local SQLite.
- Configure email:
  - `EMAIL_PROVIDER=smtp` with SMTP credentials, or
  - `EMAIL_PROVIDER=sendgrid` with `SENDGRID_API_KEY`.
- Configure Turnstile (recommended):
  - Set `TURNSTILE_SECRET`.
  - Update `data-sitekey` in `index.html` with your site key.
- Configure analytics + error tracking:
  - Plausible: update `data-domain` in `index.html` and `admin.html`.
  - Sentry: set `SENTRY_DSN` and replace `YOUR_SENTRY_DSN` in both HTML files.

2) Database
- For Postgres, ensure the database is reachable via `DATABASE_URL`.
- The app auto-creates the `submissions` table on startup.
- Set up regular backups at the database provider level.

3) Email
- Verify sender domain for best deliverability.
- Use a transactional provider in production.

4) Security
- Run behind HTTPS (Render, Railway, Fly, etc.).
- Keep `.env` out of version control.

5) Runtime
- `npm install`
- `npm run start`
