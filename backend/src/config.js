const { z } = require('zod');
const path = require('path');
const fs = require('fs');

const ENV_PATH = path.join(__dirname, '../.env');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  EMAIL_DRIVER: z.enum(['smtp', 'console', 'resend']).default('resend'),
  RESEND_API_KEY: z.string().default(process.env.RESEND_API_KEY || ''),
  RESEND_FROM_EMAIL: z.string().transform((value) => value.trim()).optional(),
  EMAIL_HOST: z.string().default('smtp.gmail.com'),
  EMAIL_PORT: z.coerce.number().int().positive().default(465),
  EMAIL_SECURE: z.preprocess((val) => {
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return Boolean(val);
  }, z.boolean()).default(false),
  EMAIL_USER: z.string().transform((value) => value.trim()).default(''),
  EMAIL_PASS: z.string().transform((value) => value.trim()).default(''),
  EMAIL_FROM: z.string().transform((value) => value.trim()).optional(),
  OTP_SECRET: z.string().default(process.env.JWT_SECRET || 'dev-otp-secret'),
  EMAIL_PROOF_SECRET: z.string().transform((value) => value.trim()).default('dev-email-proof-secret'),
  EMAIL_PROOF_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative().default(15),
  OTP_MAX_SENDS_PER_HOUR: z.coerce.number().int().positive().default(5),
  REQUIRE_LOGIN_OTP: z.coerce.boolean().default(false),
});

function loadConfig(env = process.env) {
  const result = schema.safeParse(env);
  if (!result.success) throw new Error(`Invalid email/OTP configuration: ${result.error.message}`);
  const config = result.data;
  let missing = [];
  if (config.EMAIL_DRIVER === 'smtp') {
    missing = ['EMAIL_USER', 'EMAIL_PASS'].filter((name) => !config[name]);
  } else if (config.EMAIL_DRIVER === 'resend') {
    missing = ['RESEND_API_KEY'].filter((name) => !config[name]);
  }
  if (config.NODE_ENV === 'production' && (missing.length || config.EMAIL_DRIVER === 'console')) {
    throw new Error(`Email configuration invalid for production. Missing: ${missing.join(', ') || 'none'}; console driver is not allowed.`);
  }
  return {
    ...config,
    EMAIL_FROM: config.EMAIL_FROM || config.EMAIL_USER,
    RESEND_FROM_EMAIL: config.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    missingEmailVariables: missing,
    envPath: ENV_PATH,
    envFileExists: fs.existsSync(ENV_PATH),
  };
}

module.exports = { loadConfig };
