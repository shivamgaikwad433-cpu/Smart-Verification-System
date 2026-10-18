# Smart Verification System backend

## Email OTP setup

For local testing without an email account, set `EMAIL_DRIVER=console`. The server prints the OTP email to the backend terminal. Do not use the console driver in production.

For Gmail SMTP, enable 2-Step Verification, create a Google App Password, and set:

```env
EMAIL_DRIVER=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your-google-app-password
EMAIL_FROM=yourgmail@gmail.com
OTP_SECRET=long-random-secret
OTP_TTL_SECONDS=120
```

The normal Gmail password does not work. Mailtrap or another transactional provider is recommended for testing and deployment. Some hosting providers block SMTP ports, and Gmail has daily sending limits.

In development, missing SMTP credentials return `503 EMAIL_NOT_CONFIGURED`; in production the server refuses to start. OTPs are HMAC-hashed, expire on the server, are limited by attempts/cooldown, and are consumed atomically.

## Hosting the website and API together

The backend can serve the frontend build from the root `dist/` folder. Configure the host with the repository root as the project directory and use:

- Build command: `npm ci && npm --prefix backend ci && npm run build && cd backend && npx prisma generate --schema prisma/schema.prisma && npx prisma db push --schema prisma/schema.prisma`
- Start command: `npm --prefix backend start`

Set `DATABASE_URL` to a SQLite file on the host's persistent disk (for example, `file:/var/data/dev.db`), `APP_URL` to the public HTTPS site URL, and configure the email provider variables above. The host must preserve the mounted database file between restarts. `APP_URL` is used to add a direct link to the HOD approval dashboard in notification emails. The HOD approval email is stored in the `SystemSetting` table and defaults to the configured address in `approvalRouting.service.js`.

For a separate frontend and backend deployment, set the frontend build variable `VITE_API_URL` to the backend's public `/api/v1` URL and set backend `CORS_ORIGIN` to the frontend's public origin.
