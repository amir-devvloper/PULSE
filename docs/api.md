# PULSE API

All `/api/*` routes except `/api/auth/signup|login|logout|forgot|reset` need the login cookie. Responses are `{ success, ... }` (auth routes return `{ user }` or `{ error }`).

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/signup, /login, /logout | Session |
| GET / PUT | /api/auth/me | Current user; update `{name, email}` |
| POST | /api/auth/forgot | `{email}`. Emails a one-hour, single-use reset link. Always answers the same, whether or not the account exists (5 requests/min/IP) |
| POST | /api/auth/reset | `{token, password}`. Sets a new password and signs out every session |
| PUT | /api/auth/password | Change password `{currentPassword, newPassword}` (8–72 chars). Signs out all other devices |
| DELETE | /api/auth/me | Delete the account and all its data `{password}` |
| GET | /api/monitors | List (with last status, response time, 24h uptime) |
| POST | /api/monitors | Create `{monitorName, url, method, interval, expectedStatus, timeout}` |
| GET / PUT / DELETE | /api/monitors/:id | Read, update (partial, e.g. `{isActive:false}`), delete |
| GET | /api/incidents | All incidents, newest first |
| GET | /api/incidents/monitor/:monitorId | Incidents of one monitor |
| GET | /api/checks/monitor/:monitorId?limit=50 | Check history (max 500) |
| GET | /api/analytics/summary?hours=24 | Uptime, avg response, checks, incidents. `hours` = 24, 168 or 720 |
| GET | /api/notifications | Last 20 emails PULSE sent (or skipped/failed) for you |
| GET / PUT | /api/notifications/settings | `{emailAlerts, weeklyDigest}` booleans; GET also returns `emailConfigured` |
| GET | /api/analytics/series?hours=24 | 24 time buckets of uptime % and avg response for charts |

Rules: interval ≥ 10 s, timeout 1000–60000 ms, http(s) only. Private/localhost targets are rejected unless `ALLOW_PRIVATE_TARGETS=true` is set in `.env` (local dev only). Checks older than 30 days are deleted automatically.

Emails: when `emailAlerts` is on, an email goes out when a monitor goes down and when it recovers; `weeklyDigest` sends a 7-day summary. Set `SMTP_HOST` (and `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_URL`) in `.env` to actually send. Without SMTP each email is recorded as `skipped`.

Incidents: a monitor needs `FAILURE_THRESHOLD` failed checks in a row (default 2) before an incident opens and the alert email is sent. The first successful check resolves it.

Sessions: the JWT cookie carries the user's `token_version`; changing or resetting the password bumps it, so older tokens stop working immediately. Deleted users' tokens stop working too.

Deployment settings (`.env`): `NODE_ENV=production` (secure cookies), `TRUST_PROXY=1` behind a reverse proxy, `CORS_ORIGINS` only if another site must call the API (the bundled frontend is same-origin and needs nothing). Helmet adds security headers; the CSP allows only same-origin scripts, so don't add inline `<script>` blocks to the pages.
