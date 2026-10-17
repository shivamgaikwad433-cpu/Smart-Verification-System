const express     = require('express');
const router      = express.Router();
const ctrl        = require('../controllers/auth.controller');
const rateLimit   = require('express-rate-limit');
const otpRoutes   = require('./otp.routes');

const lim = rateLimit({ windowMs: 60_000, max: 15 });

router.use(otpRoutes);

// POST /api/v1/auth/register
router.post('/register',         lim, ctrl.register);
// POST /api/v1/auth/verify-otp
router.post('/verify-otp',       lim, ctrl.verifyOtp);
// POST /api/v1/auth/resend-otp
router.post('/resend-otp',       lim, ctrl.resendOtp);
// POST /api/v1/auth/login
router.post('/login',            lim, ctrl.login);
router.post('/lookup-email',     lim, ctrl.lookupEmail);
router.post('/verify-face-email', lim, ctrl.verifyFaceEmail);
// POST /api/v1/auth/refresh
router.post('/refresh',          lim, ctrl.refresh);
// POST /api/v1/auth/logout
router.post('/logout',           lim, ctrl.logout);
// POST /api/v1/auth/forgot-password
router.post('/forgot-password',  lim, ctrl.forgotPassword);
// POST /api/v1/auth/reset
router.post('/reset',            lim, ctrl.resetPassword);

module.exports = router;
