const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter(config = {}) {
  if (transporter) return transporter;

  const user = (config.EMAIL_USER || '').trim();
  const pass = (config.EMAIL_PASS || '').trim();
  const hasCredentials = user && pass;

  if (hasCredentials) {
    transporter = nodemailer.createTransport({
      host: config.EMAIL_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(config.EMAIL_PORT || process.env.EMAIL_PORT) || 465,
      secure: config.EMAIL_SECURE ?? true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
      auth: {
        user,
        pass,
      },
    });
  } else {
    throw Object.assign(new Error(`Email service is not configured. Missing: ${config.missingEmailVariables?.join(', ') || 'EMAIL_USER, EMAIL_PASS'}. Checked: ${config.envPath || 'backend/.env'} (exists: ${config.envFileExists === true}).`), { status: 503, code: 'EMAIL_NOT_CONFIGURED' });
  }

  return transporter;
}

/**
 * Send an email via the Resend REST API (fast, reliable, no SMTP/port issues)
 */
async function sendViaResend(to, subject, html, config = {}) {
  const apiKey = (config.RESEND_API_KEY || process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    throw Object.assign(new Error('RESEND_API_KEY is not configured in backend/.env'), { status: 503, code: 'EMAIL_NOT_CONFIGURED' });
  }

  const from = config.EMAIL_FROM && !config.EMAIL_FROM.includes('@gmail.com')
    ? config.EMAIL_FROM
    : 'Smart Verification <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(`Resend email delivery failed: ${data.message || response.statusText}`), {
      status: 503,
      code: 'EMAIL_SEND_FAILED',
      details: data,
    });
  }

  return { messageId: data.id };
}

/**
 * Send an OTP email to the given address.
 */
async function sendOtpEmail(to, otp, config = {}) {
  // Always log to console when OTP_DEV_LOG is enabled (for debugging)
  if (process.env.OTP_DEV_LOG === 'true') {
    console.log(`[EMAIL OTP] To: ${to}\n[EMAIL OTP] Code: ${otp}`);
  }

  // Only skip real email when driver is explicitly 'console'
  if (config.EMAIL_DRIVER === 'console') {
    return { messageId: 'dev-log-' + Date.now(), devOtp: otp };
  }

  const html = `
    <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
      <div style="text-align:center;margin-bottom:20px;">
        <h2 style="color:#0f172a;margin:0;font-size:22px;">Smart Campus Verification</h2>
        <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Identity & Biometric Registration</p>
      </div>
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:20px;text-align:center;margin:16px 0;">
        <p style="color:#475569;font-size:13px;margin:0 0 10px;">Your 6-digit verification code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:10px;color:#4f46e5;font-family:monospace;padding:10px 0;">${otp}</div>
        <p style="color:#94a3b8;font-size:11px;margin:10px 0 0;">Valid for 5 minutes. Do not share this code.</p>
      </div>
      <p style="color:#64748b;font-size:12px;line-height:1.5;margin:16px 0 0;">
        Notice: This OTP was dispatched to your Email ID. Your registered mobile number has been linked to your profile for gate and biometric verification.
      </p>
    </div>
  `;

  // Resend driver
  if (config.EMAIL_DRIVER === 'resend') {
    return await sendViaResend(to, 'Your 6-Digit Verification OTP - Smart Verification System', html, config);
  }

  // SMTP driver
  const mailer = getTransporter(config);
  const sender = config.EMAIL_FROM || config.EMAIL_USER;

  try {
    return await mailer.sendMail({
      from: `"Smart Verification System" <${sender}>`,
      to,
      subject: 'Your 6-Digit Verification OTP - Smart Verification System',
      html,
    });
  } catch (error) {
    const host = config.EMAIL_HOST || 'SMTP Server';
    const message = error.code === 'EAUTH'
      ? `SMTP authentication failed for ${host} (${config.EMAIL_USER}). Please check your login credentials or SMTP key.`
      : `Email provider could not send the OTP: ${error.message}`;
    throw Object.assign(new Error(message), { status: 503, code: 'EMAIL_SEND_FAILED', cause: error });
  }
}

/**
 * Send a password-reset OTP.
 */
async function sendPasswordResetEmail(to, otp) {
  const config = require('../config').loadConfig();

  const html = `
    <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
      <h2 style="color:#0f172a;">Password Reset Code</h2>
      <p style="color:#475569;font-size:13px;">Use the OTP below to reset your password:</p>
      <h1 style="letter-spacing:8px;color:#ef4444;font-family:monospace;">${otp}</h1>
      <p style="color:#94a3b8;font-size:11px;">Valid for 5 minutes.</p>
    </div>
  `;

  if (config.EMAIL_DRIVER === 'resend') {
    return await sendViaResend(to, 'Password Reset OTP - Smart Verification System', html, config);
  }

  const mailer = getTransporter(config);
  const sender = config.EMAIL_FROM || config.EMAIL_USER;

  return await mailer.sendMail({
    from: `"Smart Verification System" <${sender}>`,
    to,
    subject: 'Password Reset OTP - Smart Verification System',
    html,
  });
}

async function verifyEmailService(config = {}) {
  if (config.EMAIL_DRIVER === 'console') {
    console.log('Email service ready (console driver — emails will only be logged to terminal)');
    return true;
  }
  if (config.EMAIL_DRIVER === 'resend') {
    const apiKey = (config.RESEND_API_KEY || process.env.RESEND_API_KEY || '').trim();
    if (apiKey) {
      console.log('Email service ready (Resend API driver)');
      return true;
    }
    console.error('Email service verification failed: RESEND_API_KEY is missing');
    return false;
  }

  const mailer = getTransporter(config);
  try {
    await mailer.verify();
    console.log('Email service ready');
    return true;
  } catch (error) {
    console.error(`Email service verification failed: ${error.message}`);
    return false;
  }
}

module.exports = { sendOtpEmail, sendPasswordResetEmail, verifyEmailService };
