const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { loadConfig } = require('../src/config');
const { sendOtpEmail } = require('../src/services/email.service');
const { sendEmailOtp, verifyEmailOtp } = require('../src/services/otp.service');
const prisma = require('../src/lib/prisma');

test('console email driver is valid in development', () => {
  const config = loadConfig({ NODE_ENV: 'test', EMAIL_DRIVER: 'console' });
  assert.equal(config.EMAIL_DRIVER, 'console');
  assert.equal(config.OTP_TTL_SECONDS, 20);
});

test('production rejects missing SMTP credentials', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production', EMAIL_DRIVER: 'smtp', EMAIL_USER: '', EMAIL_PASS: '' }), /Missing/);
});

test('production rejects console email driver', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production', EMAIL_DRIVER: 'console' }), /console driver/);
});

test('missing email variables are named without exposing values', async () => {
  const password = 'do-not-print-this-password';
  const config = loadConfig({ NODE_ENV: 'test', EMAIL_DRIVER: 'smtp', EMAIL_USER: '', EMAIL_PASS: '' });
  assert.deepEqual(config.missingEmailVariables, ['EMAIL_USER', 'EMAIL_PASS']);
  await assert.rejects(
    () => sendOtpEmail('test@example.com', '123456', config),
    (error) => {
      assert.match(error.message, /Missing: EMAIL_USER, EMAIL_PASS/);
      assert.match(error.message, /exists: (true|false)/);
      assert.doesNotMatch(error.message, new RegExp(password));
      return error.code === 'EMAIL_NOT_CONFIGURED';
    },
  );
});

test('present email variables are not reported as missing', () => {
  const config = loadConfig({ NODE_ENV: 'test', EMAIL_DRIVER: 'smtp', EMAIL_USER: 'sender@example.com', EMAIL_PASS: 'secret-value' });
  assert.deepEqual(config.missingEmailVariables, []);
  assert.equal(config.EMAIL_USER, 'sender@example.com');
  assert.equal(config.EMAIL_PASS, 'secret-value');
});

test('email OTP creates a proof token with a defined expiry', async () => {
  const email = `otp-proof-${Date.now()}@example.com`;
  const config = {
    NODE_ENV: 'test',
    EMAIL_DRIVER: 'console',
    OTP_SECRET: 'test-otp-secret',
    EMAIL_PROOF_SECRET: 'test-proof-secret',
    EMAIL_PROOF_TTL_SECONDS: 900,
    OTP_TTL_SECONDS: 120,
    OTP_RESEND_COOLDOWN_SECONDS: 0,
    OTP_MAX_SENDS_PER_HOUR: 5,
  };

  try {
    const sent = await sendEmailOtp(email, 'EMAIL_VERIFY', { config });
    const proof = await verifyEmailOtp(email, sent.devOtp, 'EMAIL_VERIFY', { config });
    const payload = jwt.verify(proof, config.EMAIL_PROOF_SECRET);
    assert.equal(payload.email, email);
    assert.equal(payload.purpose, 'EMAIL_PROOF');
  } finally {
    await prisma.emailOtp.deleteMany({ where: { email } });
  }
});
