const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { sendOtpEmail } = require('./email.service');

const DEFAULT_CONFIG = {
  OTP_LENGTH: 6,
  OTP_TTL_SECONDS: 20,
  OTP_MAX_ATTEMPTS: 5,
  OTP_RESEND_COOLDOWN_SECONDS: 15,
  OTP_MAX_SENDS_PER_HOUR: 5,
  OTP_SECRET: process.env.OTP_SECRET || process.env.JWT_SECRET || 'dev-otp-secret',
  EMAIL_PROOF_SECRET: process.env.EMAIL_PROOF_SECRET || 'dev-email-proof-secret',
  EMAIL_PROOF_TTL_SECONDS: 900,
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getConfig(config = {}) {
  return { ...DEFAULT_CONFIG, ...config };
}

function hashOtp(email, purpose, otp, config = {}) {
  const active = getConfig(config);
  return crypto.createHmac('sha256', active.OTP_SECRET)
    .update(`${email}:${purpose}:${otp}`)
    .digest('hex');
}

function createOtpCode(config = {}) {
  const length = Number(getConfig(config).OTP_LENGTH);
  return crypto.randomInt(0, 10 ** length).toString().padStart(length, '0');
}

function safeEqualHex(left, right) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function sendEmailOtp(email, purpose = 'EMAIL_VERIFY', options = {}) {
  const config = getConfig(options.config);
  const normalized = normalizeEmail(email);
  const now = options.now ? options.now() : new Date();
  const recent = await prisma.emailOtp.findFirst({
    where: { email: normalized, purpose, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
    orderBy: { createdAt: 'desc' },
  });
  if (recent && now.getTime() - recent.createdAt.getTime() < config.OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    const retryAfter = Math.max(1, Math.ceil((config.OTP_RESEND_COOLDOWN_SECONDS * 1000 - (now.getTime() - recent.createdAt.getTime())) / 1000));
    throw Object.assign(new Error(`Please wait ${retryAfter} seconds before requesting another code.`), { status: 429, code: 'OTP_COOLDOWN', retryAfter });
  }
  const sendsThisHour = await prisma.emailOtp.count({ where: { email: normalized, purpose, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } } });
  if (sendsThisHour >= config.OTP_MAX_SENDS_PER_HOUR) throw Object.assign(new Error('OTP hourly limit reached. Please try again later.'), { status: 429, code: 'OTP_RATE_LIMITED', retryAfter: 3600 });

  const otp = createOtpCode(config);
  await prisma.emailOtp.deleteMany({ where: { email: normalized, purpose, consumedAt: null } });
  const entry = await prisma.emailOtp.create({
    data: { email: normalized, purpose, codeHash: hashOtp(normalized, purpose, otp, config), expiresAt: new Date(now.getTime() + config.OTP_TTL_SECONDS * 1000), userId: options.userId || null },
  });
  try {
    const delivery = await sendOtpEmail(normalized, otp, config);
    return {
      email: normalized,
      expiresInSeconds: config.OTP_TTL_SECONDS,
      resendInSeconds: config.OTP_RESEND_COOLDOWN_SECONDS,
      ...(config.EMAIL_DRIVER === 'console' ? { devOtp: delivery.devOtp } : {}),
    };
  } catch (error) {
    await prisma.emailOtp.delete({ where: { id: entry.id } }).catch(() => {});
    throw error;
  }
}

async function verifyEmailOtp(email, otp, purpose = 'EMAIL_VERIFY', options = {}) {
  const normalized = normalizeEmail(email);
  const config = getConfig(options.config);
  const now = options.now ? options.now() : new Date();
  const entry = await prisma.emailOtp.findFirst({ where: { email: normalized, purpose, consumedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!entry || entry.expiresAt < now || entry.attempts >= config.OTP_MAX_ATTEMPTS) {
    if (entry) await prisma.emailOtp.delete({ where: { id: entry.id } });
    throw Object.assign(new Error('Invalid or expired code.'), { status: 400 });
  }
  if (!safeEqualHex(hashOtp(normalized, purpose, String(otp), config), entry.codeHash)) {
    await prisma.emailOtp.update({ where: { id: entry.id }, data: { attempts: { increment: 1 } } });
    throw Object.assign(new Error('Invalid or expired code.'), { status: 400 });
  }
  const consumed = await prisma.emailOtp.updateMany({ where: { id: entry.id, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
  if (consumed.count !== 1) throw Object.assign(new Error('Invalid or expired code.'), { status: 400, code: 'OTP_EXPIRED' });
  return jwt.sign(
    { email: normalized, purpose: 'EMAIL_PROOF' },
    config.EMAIL_PROOF_SECRET,
    { expiresIn: config.EMAIL_PROOF_TTL_SECONDS },
  );
}

function assertEmailProof(token, email) {
  try {
    const payload = jwt.verify(token, DEFAULT_CONFIG.EMAIL_PROOF_SECRET);
    if (payload.purpose !== 'EMAIL_PROOF' || payload.email !== normalizeEmail(email)) throw new Error();
  } catch {
    throw Object.assign(new Error('Email not verified.'), { status: 403 });
  }
}

module.exports = { sendEmailOtp, verifyEmailOtp, assertEmailProof, normalizeEmail };
