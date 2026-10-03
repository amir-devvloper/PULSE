# Architecture

- `app.js` builds the Express app (helmet, optional CORS, routes, static frontend); `server.js` loads `.env`, creates the database, listens and starts the worker. Tests import `createApp()` directly.
- `routes/` → `controllers/` (validation, HTTP) → `services/` (SQL) → `database/db.js`.
- `workers/monitorWorker.js` ticks every 10 s, picks monitors whose interval has elapsed and runs `workers/checkWorker.js`, which performs the HTTP check, stores it, and opens/resolves incidents. It also prunes old checks and sends due weekly digests hourly.
- `services/notificationService.js` sends the down/recovered emails (called by `checkWorker.js` when an incident opens or resolves) and the weekly digest, through SMTP via nodemailer, and logs every attempt in `notifications`.
- `utils/urlGuard.js` blocks private/localhost targets (SSRF) both when saving a monitor and on every check.
- Auth: bcrypt password hashes, JWT in an httpOnly cookie (`pulse_token`, 7 days) carrying `token_version`, checked against the database on every request. App pages redirect to `/login` without a session. `passwordResetService.js` handles forgot/reset (hashed single-use tokens); `mailService.js` is the shared SMTP sender.
- Frontend: React + Vite + Motion in `frontend/src` — `App.jsx` (routes, navbar, page transitions), `api.js` (fetch helper), `ui.jsx` (shared components), one file per page in `pages/`, styles in `styles.css`. Built to `frontend/dist`.
