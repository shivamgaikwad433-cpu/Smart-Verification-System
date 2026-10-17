const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/otp.controller');

const router = express.Router();
const sendLim = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });
const verifyLim = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post(['/otp/send', '/send-otp'], sendLim, ctrl.sendOtp);
router.post(['/otp/resend', '/resend-otp'], sendLim, ctrl.resendOtp);
router.post(['/otp/verify', '/verify-otp'], verifyLim, ctrl.verifyOtp);

module.exports = router;
