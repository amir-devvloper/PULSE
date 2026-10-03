# PULSE frontend — React + Vite + Motion

```
cd frontend
npm install
npm run dev      # http://localhost:5173  (/api is proxied to the backend on :3000)
npm run build    # outputs frontend/dist
```

Routes: `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password?token=…`,
`/dashboard`, `/monitors`, `/monitors/:id`, `/incidents`, `/analytics`, `/settings`.

Production: the backend must serve `frontend/dist` (static) and send every non-`/api` path
back to `dist/index.html`. The CSP allows same-origin scripts only, which the build respects.
