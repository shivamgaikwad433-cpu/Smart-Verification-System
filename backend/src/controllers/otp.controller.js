const { z } = require('zod');
const { sendEmailOtp, verifyEmailOtp } = require('../services/otp.service');
const { loadConfig } = require('../config');

function config() { return loadConfig(); }

const requestSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['EMAIL_VERIFY', 'PASSWORD_RESET']).default('EMAIL_VERIFY'),
});

async function sendOtp(req, res, next) {
  try {
    const { email, purpose } = requestSchema.parse(req.body);
    const result = await sendEmailOtp(email, purpose, { config: config() });
    res.json({
      success: true,
      ...result,
      message: (process.env.OTP_DEV_LOG === 'true' && process.env.NODE_ENV !== 'production') || config().EMAIL_DRIVER === 'console'
        ? 'Development mode: OTP is shown below and in the backend terminal.'
        : 'Verification code sent.',
    });
  } catch (error) {
    if (error.status === 429 && error.retryAfter) res.set('Retry-After', String(error.retryAfter));
    next(error);
  }
}

async function resendOtp(req, res, next) {
  return sendOtp(req, res, next);
}

async function verifyOtp(req, res, next) {
  try {
    const { email, purpose, code, otp } = z.object({ email: z.string().email(), purpose: z.enum(['EMAIL_VERIFY', 'LOGIN', 'PASSWORD_RESET']).default('EMAIL_VERIFY'), code: z.string().regex(/^\d{6}$/).optional(), otp: z.string().regex(/^\d{6}$/).optional() }).parse(req.body);
    const emailVerifyToken = await verifyEmailOtp(email, code || otp, purpose, { config: config() });
    if (purpose === 'EMAIL_VERIFY') await require('../lib/prisma').user.updateMany({ where: { email }, data: { emailVerifiedAt: new Date(), isVerified: true } });
    if (purpose === 'LOGIN') {
      const prisma = require('../lib/prisma');
      const { signAccess, signRefresh } = require('../utils/token');
      const user = await prisma.user.findUnique({ where: { email }, include: { studentProfile: true, staffProfile: true, department: true } });
      if (!user) return res.status(400).json({ success: false, code: 'OTP_INVALID', message: 'Invalid OTP.' });
      const accessToken = signAccess(user);
      const refreshToken = signRefresh(user);
      await prisma.refreshToken.create({ data: { hashed: refreshToken, expiry: new Date(Date.now() + 7 * 86400_000), userId: user.id } });
      return res.json({ success: true, token: accessToken, accessToken, refreshToken, user, message: 'Login OTP verified.' });
    }
    res.json({ success: true, emailVerifyToken, message: 'Email verified.', expiresInSeconds: config().OTP_TTL_SECONDS });
  } catch (error) { next(error); }
}

module.exports = { sendOtp, resendOtp, verifyOtp };
