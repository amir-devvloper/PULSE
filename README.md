# PULSE

Uptime monitoring: Express + SQLite + React (Vite + Motion) frontend.

```
PULSE/
  backend/    Express API, SQLite database, background check worker  (backend.zip)
  frontend/   React app (Vite); `npm run build` makes frontend/dist, served by the backend  (PULSE.zip)
  docs/       API, database and architecture notes                    (PULSE.zip)
```

Unzip both into the same folder so `backend/` and `frontend/` sit side by side.

## Run

```
cd backend
cp .env.example .env    # then set JWT_SECRET to a long random string
npm install
npm run dev             # http://localhost:3000
npm test
```

Behind a reverse proxy set `NODE_ENV=production` and `TRUST_PROXY=1`. An incident opens after 2 failed checks in a row (`FAILURE_THRESHOLD`).

Email alerts, the weekly digest and password-reset emails need an SMTP server: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` and `APP_URL` in `.env` (see `.env.example`). Users switch alerts on in Settings. Without SMTP nothing is sent: alerts are logged as `skipped`, and in development the reset link is printed in the server console.

The database file (`backend/database/pulse.db`) is created on first start.
To monitor `localhost` or private addresses while developing, add `ALLOW_PRIVATE_TARGETS=true` to `.env`.

See `docs/api.md` for the endpoints.

## Frontend

```
cd frontend
npm install
npm run dev     # http://localhost:5173, proxies /api to :3000
npm run build   # frontend/dist
```
