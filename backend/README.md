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
