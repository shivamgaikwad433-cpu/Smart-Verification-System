# Smart Verification System

React (Vite) frontend with a Node.js/Express API. The backend serves the built frontend when both are deployed as one Railway service. A separate frontend deployment can target the backend using `VITE_API_URL`.

## Local development

Copy `backend/.env.example` to `backend/.env` and `.env.example` to `.env.local`, fill in local credentials as needed, and run `npm install`, `npm --prefix backend install`, then `npm run dev`. The API listens on the Railway `PORT` value or port `8080` by default. Vite proxies `/api` to `http://localhost:8080` for local development.

## Railway deployment checklist

### Backend service variables

Set these in the Railway backend service. Keep all credentials in Railway Variables; do not commit them.

- `DATABASE_URL`: production database connection string (the current Prisma schema may require a compatible SQLite file and persistent volume).
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `OTP_SECRET`, `EMAIL_PROOF_SECRET`: long, unique random secrets.
- `EMAIL_DRIVER=resend`
- `RESEND_API_KEY`: your Resend API key.
- `RESEND_FROM_EMAIL=onboarding@resend.dev` for Resend testing, or a verified sender/domain for production.
- `FRONTEND_URL`: exact public frontend origin, such as `https://your-frontend.up.railway.app` (no trailing slash or path).
- `PORT`: let Railway inject this value. For a local `.env`, `8080` is the default.
- `APP_URL`: public frontend URL, used in approval email links.

`backend/.env.example` lists the backend variables. Railway must build and start from the repository root using the commands in `railway.json`.

### Frontend service variable

For the Netlify frontend, set `VITE_API_URL=/api/v1` (also shown in the root `.env.example`). Netlify forwards `/api/*` to the public Railway backend URL configured in `netlify.toml`, so the browser can use a same-origin path and does not need a hardcoded Railway hostname. If you deploy the frontend somewhere without this proxy, set `VITE_API_URL` to the backend public URL plus `/api/v1` and set backend `FRONTEND_URL` to that frontend's exact public origin.

Do not put secrets in frontend variables. The backend public host is configured in `netlify.toml`; change that redirect target if the Railway domain changes.

### Public domain and networking

In Railway, open the backend service's **Settings → Networking → Public Networking** and choose **Generate Domain**. Set `FRONTEND_URL` on the backend to the frontend's public origin. The server listens on `process.env.PORT` and binds to `0.0.0.0`; if Railway asks for a target port, set it to the same port value the service receives in `PORT` (use `8080` only when you explicitly configure `PORT=8080`).

### Deployment smoke checks

Replace `<backend-domain>` with the generated HTTPS domain. A successful health request returns JSON with `success: true`:

```sh
curl -i https://<backend-domain>/api/health
```

Send an OTP with POST and JSON. The canonical API route is `/api/v1/auth/otp/send`; `/api/auth/send-otp` is also available as a short compatibility path. A successful response includes `success: true`; delivery/configuration failures return JSON with `success: false` and a message.

```sh
curl -i -X POST https://<backend-domain>/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","purpose":"EMAIL_VERIFY"}'
```

Test password login with POST. The canonical path is `/api/v1/auth/login`; `/api/auth/login` is also supported. A valid account returns token data; invalid credentials return a JSON error response (typically HTTP 401), which confirms the route and method are reachable.

```sh
curl -i -X POST https://<backend-domain>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
```
